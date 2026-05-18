import React from 'react'
import { Loader2 } from 'lucide-react'
import { PhotoData, Template } from '../../types'

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

interface ArrangeCanvasProps {
  previewDimensions: {
    width: number
    height: number
    scaleX: number
    scaleY: number
  }
  previewImage: string | null
  isPreviewGenerating: boolean
  selectedTemplate: Template
  photos: (PhotoData | null)[]
  offsets: PixelOffset[]
  photoDims: (PhotoDims | null)[]
  photoScales: number[]
  selectedSequence: number[]
  activeIndex: number | null
  isDragging: boolean
  isPinching: boolean
  currentEffectClass: string
  getActiveImage: (photo: PhotoData | null) => string
  handleDragStart: (
    e: React.MouseEvent | React.TouchEvent,
    index: number,
  ) => void
  handleWheel: (e: React.WheelEvent, index: number) => void
  handleDoubleClick: (index: number) => void
}

export const ArrangeCanvas: React.FC<ArrangeCanvasProps> = ({
  previewDimensions,
  previewImage,
  isPreviewGenerating,
  selectedTemplate,
  photos,
  offsets,
  photoDims,
  photoScales,
  selectedSequence,
  activeIndex,
  isDragging,
  isPinching,
  currentEffectClass,
  getActiveImage,
  handleDragStart,
  handleWheel,
  handleDoubleClick,
}) => {
  return (
    <div
      id='tour-arrange-drag'
      className='relative shadow-2xl rounded-lg overflow-hidden shrink-0'
      style={{
        width: previewDimensions.width,
        height: previewDimensions.height,
        backgroundColor: '#000',
      }}
    >
      {/* Canvas-generated preview image (WYSIWYG) */}
      {previewImage && (
        <img
          src={previewImage}
          alt='Preview'
          className='absolute inset-0 w-full h-full pointer-events-none'
          style={{ objectFit: 'fill' }}
        />
      )}

      {/* Loading indicator while generating preview */}
      {isPreviewGenerating && !previewImage && (
        <div className='absolute inset-0 flex justify-center items-center bg-studio-bg'>
          <Loader2 className='w-10 h-10 text-studio-primary animate-spin' />
        </div>
      )}

      {/* Invisible interaction zones for drag/zoom */}
      {selectedTemplate.slots.map((slot, index) => {
        const originalIndex = selectedSequence[index] ?? index
        const photo = photos[originalIndex]
        if (!photo) return null

        const slotLeft = slot.x * previewDimensions.scaleX
        const slotTop = slot.y * previewDimensions.scaleY
        const slotWidth = slot.width * previewDimensions.scaleX
        const slotHeight = slot.height * previewDimensions.scaleY

        const offset = offsets[originalIndex] || { x: 0, y: 0 }
        const dims = photoDims[originalIndex]
        const scale = photoScales[originalIndex] || 1

        const baseDisplayW =
          (dims?.displayWidth ?? slot.width) * previewDimensions.scaleX
        const baseDisplayH =
          (dims?.displayHeight ?? slot.height) * previewDimensions.scaleY

        const displayW = baseDisplayW * scale
        const displayH = baseDisplayH * scale

        // Convert template offset to screen offset for display
        const screenOffsetX = offset.x * previewDimensions.scaleX
        const screenOffsetY = offset.y * previewDimensions.scaleY

        const photoLeft = (slotWidth - displayW) / 2 + screenOffsetX
        const photoTop = (slotHeight - displayH) / 2 + screenOffsetY

        const isActiveSlot = activeIndex === originalIndex && (isDragging || isPinching)

        return (
          <div
            key={index}
            className='absolute overflow-hidden cursor-move'
            style={{
              left: slotLeft,
              top: slotTop,
              width: slotWidth,
              height: slotHeight,
              zIndex: isActiveSlot ? 70 : 60, // Bring active slot to front
              background: 'transparent',
            }}
            onMouseDown={(e) => handleDragStart(e, originalIndex)}
            onTouchStart={(e) => handleDragStart(e, originalIndex)}
            onWheel={(e) => handleWheel(e, originalIndex)}
            onDoubleClick={() => handleDoubleClick(originalIndex)}
          >
            {/* Real-time CSS overlay for instant visual feedback (always visible) */}
            <div
              className='absolute pointer-events-none'
              style={{
                width: displayW,
                height: displayH,
                left: photoLeft,
                top: photoTop,
              }}
            >
              <img
                src={getActiveImage(photo)}
                alt={`Photo ${originalIndex + 1}`}
                className={`w-full h-full ${currentEffectClass}`}
                style={{ objectFit: 'cover' }}
                draggable={false}
              />
            </div>
          </div>
        )
      })}

      <img
        src={`${selectedTemplate.frameUrl}?t=${new Date().getTime()}`}
        alt='Template Frame'
        className='absolute inset-0 w-full h-full pointer-events-none shrink-0'
        style={{ zIndex: 80, objectFit: 'fill' }}
      />

      {/* UI Overlay: Borders & Badges (Always on top) */}
      {selectedTemplate.slots.map((slot, index) => {
        const slotLeft = slot.x * previewDimensions.scaleX
        const slotTop = slot.y * previewDimensions.scaleY
        const slotWidth = slot.width * previewDimensions.scaleX
        const slotHeight = slot.height * previewDimensions.scaleY

        const originalIndex = selectedSequence[index] ?? index
        const isActive = activeIndex === originalIndex

        return (
          <div
            key={`overlay-${index}`}
            className='absolute pointer-events-none'
            style={{
              left: slotLeft,
              top: slotTop,
              width: slotWidth,
              height: slotHeight,
              zIndex: 90,
            }}
          >
            {/* Slot Border Indicator */}
            <div
              className={`w-full h-full transition-all duration-300 ${
                isActive
                  ? 'ring-4 ring-studio-primary ring-inset shadow-inner'
                  : 'ring-2 ring-studio-border/50 ring-inset'
              }`}
            />

            {/* Photo number badge - Floats on top corner */}
            <div className='top-2 left-2 absolute flex justify-center items-center bg-studio-primary shadow-xl shadow-studio-primary/20 ring-2 ring-white rounded-full w-6 h-6 font-display font-bold text-xs text-white italic'>
              {index + 1}
            </div>
          </div>
        )
      })}
    </div>
  )
}
