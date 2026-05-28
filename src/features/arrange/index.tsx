import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useBooth } from '@/hooks/useBooth'
import { AppStep, PhotoData } from '@/types'
import {
  compositePhotosToTemplate,
  PhotoOffset,
} from '@/services/templateService'
import { FilterSidebar } from './components/FilterSidebar'
import { BottomBar } from './components/BottomBar'
import { ArrangeCanvas } from './components/ArrangeCanvas'
import { useArrangeInteractions } from './hooks/useArrangeInteractions'
import { EFFECTS } from '@/constants'

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



  // Trigger Tour when Arrange Step is active
  useEffect(() => {
    const t_tour = window.setTimeout(() => {
      import('@/services/tourService').then((m) => m.startTourArrange())
    }, 1000)
    return () => clearTimeout(t_tour)
  }, [])



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



      <BottomBar
        handleGenerate={handleGenerate}
        isGenerating={isGenerating}
      />
    </div>
  )
}
