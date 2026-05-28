import React, { useState } from 'react'

export const useArrangeInteractions = (
  photoScales: number[],
  setPhotoScales: React.Dispatch<React.SetStateAction<number[]>>,
  setOffsets: React.Dispatch<React.SetStateAction<{ x: number; y: number }[]>>,
  previewDimensions: { scaleX: number; scaleY: number },
  photoDims: (any | null)[],
  selectedTemplate: any,
) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isPinching, setIsPinching] = useState(false)
  const [initialPinchDistance, setInitialPinchDistance] = useState<
    number | null
  >(null)
  const [initialScale, setInitialScale] = useState(1)

  // Helper: Calculate distance between two touch points
  const getTouchDistance = (touches: React.TouchList): number => {
    if (touches.length < 2) return 0
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  const handleDragStart = (
    e: React.MouseEvent | React.TouchEvent,
    index: number,
  ) => {
    e.preventDefault()
    setActiveIndex(index)

    if ('touches' in e && e.touches.length >= 2) {
      // Start pinch gesture
      setIsPinching(true)
      setIsDragging(false)
      const dist = getTouchDistance(e.touches)
      setInitialPinchDistance(dist)
      setInitialScale(photoScales[index])
    } else {
      // Start drag gesture
      setIsDragging(true)
      setIsPinching(false)
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
      setDragStart({ x: clientX, y: clientY })
    }
  }

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (activeIndex === null) return

    if (
      'touches' in e &&
      e.touches.length >= 2 &&
      isPinching &&
      initialPinchDistance
    ) {
      // Handle pinch zoom
      const currentDistance = getTouchDistance(e.touches)
      const scaleChange = currentDistance / initialPinchDistance
      const newScale = Math.max(1, Math.min(3, initialScale * scaleChange)) // Min 1x to always cover slot

      setPhotoScales((prev) => {
        const next = [...prev]
        next[activeIndex] = newScale
        return next
      })
    } else if (isDragging) {
      // Handle drag pan
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

      const deltaX_Screen = clientX - dragStart.x
      const deltaY_Screen = clientY - dragStart.y

      // Convert Screen Delta -> Template Delta
      const scaleFactorX = previewDimensions.scaleX || 1
      const scaleFactorY = previewDimensions.scaleY || 1

      const deltaX = deltaX_Screen / scaleFactorX
      const deltaY = deltaY_Screen / scaleFactorY

      const dims = photoDims[activeIndex]
      const scale = photoScales[activeIndex] || 1
      const slot = selectedTemplate?.slots[activeIndex]

      if (!dims || !slot) return

      setOffsets((prev) => {
        const next = [...prev]
        let newX = next[activeIndex].x + deltaX
        let newY = next[activeIndex].y + deltaY

        // Calculate Max Offset in Template Pixels
        const currentWidth = dims.displayWidth * scale
        const currentHeight = dims.displayHeight * scale

        // Allowed overflow (positive value)
        const maxOffsetX = Math.max(0, (currentWidth - slot.width) / 2)
        const maxOffsetY = Math.max(0, (currentHeight - slot.height) / 2)

        // Clamp
        newX = Math.max(-maxOffsetX, Math.min(maxOffsetX, newX))
        newY = Math.max(-maxOffsetY, Math.min(maxOffsetY, newY))

        next[activeIndex] = { x: newX, y: newY }
        return next
      })

      // Update drag start for incremental movement
      setDragStart({ x: clientX, y: clientY })
    }
  }

  const handleDragEnd = () => {
    setIsDragging(false)
    setIsPinching(false)
    setActiveIndex(null)
    setInitialPinchDistance(null)
  }

  // Mouse wheel zoom for desktop
  const handleWheel = (e: React.WheelEvent, index: number) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1 // Scroll down = zoom out, scroll up = zoom in

    setPhotoScales((prev) => {
      const next = [...prev]
      const newScale = Math.max(1, Math.min(3, (next[index] || 1) + delta)) // Min 1x to always cover slot
      next[index] = newScale
      return next
    })
  }

  // Double-click to reset position and zoom
  const handleDoubleClick = (index: number) => {
    setOffsets((prev) => {
      const next = [...prev]
      next[index] = { x: 0, y: 0 }
      return next
    })
    setPhotoScales((prev) => {
      const next = [...prev]
      next[index] = 1
      return next
    })
  }

  return {
    activeIndex,
    setActiveIndex,
    isDragging,
    isPinching,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleWheel,
    handleDoubleClick,
  }
}
