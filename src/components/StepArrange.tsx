import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useBooth } from '../hooks/usePhotoBooth'
import { AppStep, PhotoData } from '../types'
import {
  compositePhotosToTemplate,
  PhotoOffset,
} from '../services/templateService'
import { syncRemoteStep } from '../services/tunnelService'
import { listen } from '@tauri-apps/api/event'

import { FilterSidebar } from './StepArrange/FilterSidebar'
import { SideMenu } from './StepArrange/SideMenu'
import { RemoteQRModal } from './StepArrange/RemoteQRModal'
import { BottomBar } from './StepArrange/BottomBar'
import { ArrangeCanvas } from './StepArrange/ArrangeCanvas'
import { useArrangeInteractions } from '../hooks/useArrangeInteractions'
import { EFFECTS } from '../constants'

interface PhotoDims {
  displayWidth: number
  displayHeight: number
  maxOffsetX: number
  maxOffsetY: number
}

interface PixelOffset {
  x: number
  y: number
}

export const StepArrange: React.FC = () => {
  const {
    photos,
    selectedTemplate,
    selectedEffect,
    selectEffect,
    setStep,
    setCompositeResult,
    ticketCode,
    selectedSequence,
  } = useBooth()

  // State for offsets in TEMPLATE PIXELS (not screen pixels)
  const [offsets, setOffsets] = useState<PixelOffset[]>(() =>
    photos.map(() => ({ x: 0, y: 0 })),
  )

  const [photoDims, setPhotoDims] = useState<(PhotoDims | null)[]>(() =>
    photos.map(() => null),
  )

  const [isGenerating, setIsGenerating] = useState(false)
  const [showRemoteQR, setShowRemoteQR] = useState(false)

  // Pinch-to-zoom states
  const [photoScales, setPhotoScales] = useState<number[]>(() =>
    photos.map(() => 1),
  )

  // Real-time preview using the same rendering engine as final result
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [isPreviewGenerating, setIsPreviewGenerating] = useState(false)
  const previewDebounceRef = useRef<NodeJS.Timeout | null>(null)

  // Ref to store latest previewDimensions for use in event listeners
  const previewDimsRef = useRef({ width: 0, height: 0, scaleX: 0, scaleY: 0 })

  const effects = EFFECTS

  // Get current effect class for CSS overlay
  const currentEffectClass =
    effects.find((e) => e.id === selectedEffect)?.class || ''

  // Helper: Get active image based on activeFlipIndex
  const getActiveImage = (photo: PhotoData | null): string => {
    if (!photo) return ''
    return photo.processed || photo.original
  }

  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    if (!containerRef.current) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        })
      }
    })

    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  // Sync step to backend for remote redirect
  useEffect(() => {
    if (ticketCode) {
      const doSync = () =>
        syncRemoteStep(
          ticketCode,
          'arrange',
          photos.filter(Boolean).length,
          photos
            .filter((p): p is PhotoData => p !== null)
            .map((p) => p.filename || ''),
        )

      // Sync immediately
      doSync()

      // Retry to ensure remote catches up (network/race condition mitigation)
      const t1 = setTimeout(doSync, 1000)
      const t2 = setTimeout(doSync, 3000)

      return () => {
        clearTimeout(t1)
        clearTimeout(t2)
      }
    }
  }, [ticketCode, photos])

  // Trigger Tour when Arrange Step is active
  useEffect(() => {
    const t_tour = window.setTimeout(() => {
      import('../services/tourService').then((m) => m.startTourArrange())
    }, 1000)
    return () => clearTimeout(t_tour)
  }, [])

  // Listen for remote offset/scale changes from phone
  useEffect(() => {
    let unlisten: (() => void) | undefined

    const setupListener = async () => {
      try {
        unlisten = await listen<{
          ticket_code: string
          photo_index: number
          x_ratio: number // -1.0 to 1.0 from remote
          y_ratio: number // -1.0 to 1.0 from remote
          scale?: number
        }>('remote-arrange-offset', (event) => {
          const { photo_index, x_ratio, y_ratio, scale } = event.payload
          const dims = photoDims[photo_index]
          const slot = selectedTemplate?.slots[photo_index]

          if (dims && slot) {
            setPhotoScales((prevScales) => {
              const currentScale = scale ?? prevScales[photo_index] ?? 1

              // Calculate max offset based on NEW scale
              const currentWidth = dims.displayWidth * currentScale
              const currentHeight = dims.displayHeight * currentScale

              const maxOffsetX = Math.max(0, (currentWidth - slot.width) / 2)
              const maxOffsetY = Math.max(0, (currentHeight - slot.height) / 2)

              // Clamp ratio
              const clampedXRatio = Math.max(-1, Math.min(1, x_ratio))
              const clampedYRatio = Math.max(-1, Math.min(1, y_ratio))

              const pixelX = clampedXRatio * maxOffsetX
              const pixelY = clampedYRatio * maxOffsetY

              setOffsets((prevOffsets) => {
                const newOffsets = [...prevOffsets]
                if (photo_index >= 0 && photo_index < newOffsets.length) {
                  newOffsets[photo_index] = { x: pixelX, y: pixelY }
                }
                return newOffsets
              })

              // Update scale if provided
              if (scale !== undefined) {
                const newScales = [...prevScales]
                if (photo_index >= 0 && photo_index < newScales.length) {
                  newScales[photo_index] = Math.max(1.0, Math.min(3.0, scale))
                }
                return newScales
              }

              return prevScales
            })
          }

          setActiveIndex(photo_index)
        })
      } catch (error) {
        console.error('Failed to setup remote offset listener:', error)
      }
    }

    setupListener()

    return () => {
      if (unlisten) {
        unlisten()
      }
    }
  }, [photoDims, selectedTemplate])

  const previewDimensions = useMemo(() => {
    if (
      !selectedTemplate ||
      containerSize.width === 0 ||
      containerSize.height === 0
    ) {
      return { width: 0, height: 0, scaleX: 0, scaleY: 0 }
    }

    const templateAspect =
      selectedTemplate.outputWidth / selectedTemplate.outputHeight

    let previewWidth, previewHeight

    const maxWidth = containerSize.width * 0.98
    const maxHeight = containerSize.height * 0.98

    if (maxWidth / maxHeight > templateAspect) {
      previewHeight = Math.floor(maxHeight)
      previewWidth = Math.floor(previewHeight * templateAspect)
    } else {
      previewWidth = Math.floor(maxWidth)
      previewHeight = Math.floor(previewWidth / templateAspect)
    }

    const result = {
      width: previewWidth,
      height: previewHeight,
      scaleX: previewWidth / selectedTemplate.outputWidth,
      scaleY: previewHeight / selectedTemplate.outputHeight,
    }

    previewDimsRef.current = result
    return result
  }, [selectedTemplate, containerSize])

  const calculatePhotoDims = useCallback(
    (
      naturalWidth: number,
      naturalHeight: number,
      slotWidth: number,
      slotHeight: number,
    ): PhotoDims => {
      const photoAspect = naturalWidth / naturalHeight
      const slotAspect = slotWidth / slotHeight

      let displayWidth: number
      let displayHeight: number

      if (photoAspect > slotAspect) {
        displayHeight = slotHeight
        displayWidth = slotHeight * photoAspect
      } else {
        displayWidth = slotWidth
        displayHeight = slotWidth / photoAspect
      }

      const maxOffsetX = Math.max(0, (displayWidth - slotWidth) / 2)
      const maxOffsetY = Math.max(0, (displayHeight - slotHeight) / 2)

      return { displayWidth, displayHeight, maxOffsetX, maxOffsetY }
    },
    [],
  )

  useEffect(() => {
    if (!selectedTemplate) return

    photos.forEach((photo, index) => {
      if (!photo || photoDims[index]) return

      const slot = selectedTemplate.slots[index]
      if (!slot) return

      const slotWidth = slot.width
      const slotHeight = slot.height

      const img = new Image()
      img.onload = () => {
        const dims = calculatePhotoDims(
          img.naturalWidth,
          img.naturalHeight,
          slotWidth,
          slotHeight,
        )
        setPhotoDims((prev) => {
          const next = [...prev]
          next[index] = dims
          return next
        })
      }
      img.src = getActiveImage(photo)
    })
  }, [photos, selectedTemplate, calculatePhotoDims])

  const {
    activeIndex,
    setActiveIndex,
    isDragging,
    isPinching,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleWheel,
    handleDoubleClick,
  } = useArrangeInteractions(
    photoScales,
    setPhotoScales,
    setOffsets,
    previewDimensions,
    photoDims,
    selectedTemplate,
  )

  const getOffsetRatios = (): PhotoOffset[] => {
    return offsets.map((offset, index) => {
      const dims = photoDims[index]
      const scale = photoScales[index] || 1
      const slot = selectedTemplate?.slots[index]

      if (!dims || !slot) {
        return { xRatio: 0, yRatio: 0, scale }
      }

      const currentWidth = dims.displayWidth * scale
      const currentHeight = dims.displayHeight * scale

      const maxOffsetX = Math.max(0, (currentWidth - slot.width) / 2)
      const maxOffsetY = Math.max(0, (currentHeight - slot.height) / 2)

      const xRatio = maxOffsetX > 0 ? offset.x / maxOffsetX : 0
      const yRatio = maxOffsetY > 0 ? offset.y / maxOffsetY : 0

      return { xRatio, yRatio, scale }
    })
  }

  // Generate preview image in real-time
  useEffect(() => {
    if (!selectedTemplate || photos.every((p) => !p)) return

    if (previewDebounceRef.current) {
      clearTimeout(previewDebounceRef.current)
    }

    const generatePreview = async () => {
      setIsPreviewGenerating(true)
      try {
        const effectClass =
          EFFECTS.find((e) => e.id === selectedEffect)?.class || ''
        const offsetRatios = getOffsetRatios()

        const result = await compositePhotosToTemplate(
          selectedTemplate,
          photos,
          effectClass,
          offsetRatios,
          selectedSequence,
        )

        setPreviewImage(result)
      } catch (error) {
        console.error('Preview generation failed:', error)
      } finally {
        setIsPreviewGenerating(false)
      }
    }

    const delay = isDragging || isPinching ? 50 : 0
    previewDebounceRef.current = setTimeout(generatePreview, delay)

    return () => {
      if (previewDebounceRef.current) {
        clearTimeout(previewDebounceRef.current)
      }
    }
  }, [
    selectedTemplate,
    photos,
    selectedEffect,
    offsets,
    photoScales,
    previewDimensions,
    isDragging,
    isPinching,
    selectedSequence,
  ])

  const handleGenerate = async () => {
    if (!selectedTemplate) return
    setIsGenerating(true)
    try {
      const effectClass =
        EFFECTS.find((e) => e.id === selectedEffect)?.class || ''
      const offsetRatios = getOffsetRatios()

      const result = await compositePhotosToTemplate(
        selectedTemplate,
        photos,
        effectClass,
        offsetRatios,
        selectedSequence,
      )

      setCompositeResult(result)
      setStep(AppStep.RESULT)
    } catch (error) {
      console.error('Failed to generate:', error)
      alert('Gagal memproses. Coba lagi.')
    } finally {
      setIsGenerating(false)
    }
  }

  if (!selectedTemplate) {
    return (
      <div className='p-8 text-white text-center font-display'>No template selected</div>
    )
  }

  return (
    <div
      ref={containerRef}
      className='flex flex-col justify-center items-center pt-20 pb-32 w-full h-full'
      onMouseMove={handleDragMove}
      onMouseUp={handleDragEnd}
      onMouseLeave={handleDragEnd}
      onTouchMove={handleDragMove}
      onTouchEnd={handleDragEnd}
    >
      <ArrangeCanvas
        previewDimensions={previewDimensions}
        previewImage={previewImage}
        isPreviewGenerating={isPreviewGenerating}
        selectedTemplate={selectedTemplate}
        photos={photos}
        offsets={offsets}
        photoDims={photoDims}
        photoScales={photoScales}
        selectedSequence={selectedSequence}
        activeIndex={activeIndex}
        isDragging={isDragging}
        isPinching={isPinching}
        currentEffectClass={currentEffectClass}
        getActiveImage={getActiveImage}
        handleDragStart={handleDragStart}
        handleWheel={handleWheel}
        handleDoubleClick={handleDoubleClick}
      />

      <FilterSidebar
        photos={photos}
        selectedSequence={selectedSequence}
        selectedEffect={selectedEffect}
        selectEffect={selectEffect}
      />

      <SideMenu
        ticketCode={ticketCode}
        showRemoteQR={showRemoteQR}
        setShowRemoteQR={setShowRemoteQR}
      />

      <RemoteQRModal
        showRemoteQR={showRemoteQR}
        setShowRemoteQR={setShowRemoteQR}
        ticketCode={ticketCode}
      />

      <BottomBar
        handleGenerate={handleGenerate}
        isGenerating={isGenerating}
      />
    </div>
  )
}
