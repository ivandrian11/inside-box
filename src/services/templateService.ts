import { Template, PhotoData } from '../types'

export interface PhotoOffset {
  // Offset as RATIO of max possible offset (-1 to 1)
  // -1 = fully left/up, 0 = centered, 1 = fully right/down
  xRatio: number
  yRatio: number
  scale?: number // Zoom scale (1.0 = normal)
}

/**
 * Helper: Get active image based on activeFlipIndex
 * 0 = original/processed, 1+ = outfitResults[index-1]
 */
const getActiveImage = (photo: PhotoData): string => {
  return photo.processed || photo.original
}

/**
 * Composites photos onto a template frame
 */
export const compositePhotosToTemplate = async (
  template: Template,
  photos: (PhotoData | null)[],
  effectClass?: string,
  offsets?: PhotoOffset[],
  selectedSequence?: number[],
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!

    canvas.width = template.outputWidth
    canvas.height = template.outputHeight

    const frameImage = new Image()
    frameImage.crossOrigin = 'anonymous'

    frameImage.onload = async () => {
      try {
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // Draw photos to slots
        for (let i = 0; i < template.slots.length; i++) {
          const originalIndex = selectedSequence?.[i] ?? i
          const photo = photos[originalIndex]
          const slot = template.slots[i]
          const offset = offsets?.[originalIndex] || { xRatio: 0, yRatio: 0, scale: 1 }

          if (photo) {
            // Gunakan getActiveImage untuk mendapatkan gambar yang benar
            const photoSrc = getActiveImage(photo)
            await drawPhotoToSlot(ctx, photoSrc, slot, offset)
          }
        }

        // Apply filter to photos BEFORE drawing frame overlay
        // This way filter only affects photos, not the template frame
        if (effectClass) {
          applyFilterEffect(ctx, canvas.width, canvas.height, effectClass)
        }

        // Draw frame overlay AFTER filter is applied
        await drawFrameOverlay(ctx, frameImage, canvas.width, canvas.height)

        resolve(canvas.toDataURL('image/png', 1.0))
      } catch (error) {
        reject(error)
      }
    }

    frameImage.onerror = () =>
      reject(new Error('Failed to load template frame'))
    frameImage.src = template.frameUrl
  })
}

/**
 * Draw photo to slot with offset ratio and scale
 */
const drawPhotoToSlot = (
  ctx: CanvasRenderingContext2D,
  photoSrc: string,
  slot: { x: number; y: number; width: number; height: number },
  offset: PhotoOffset,
): Promise<void> => {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      const { x: slotX, y: slotY, width: slotWidth, height: slotHeight } = slot
      const scale = offset.scale || 1

      // Calculate display size for COVER mode
      const imgAspect = img.width / img.height
      const slotAspect = slotWidth / slotHeight

      let drawWidth: number
      let drawHeight: number

      if (imgAspect > slotAspect) {
        drawHeight = slotHeight
        drawWidth = slotHeight * imgAspect
      } else {
        drawWidth = slotWidth
        drawHeight = slotWidth / imgAspect
      }

      // Apply zoom to dimensions
      drawWidth *= scale
      drawHeight *= scale

      // Calculate max offset (how much larger is the image than the slot)
      // Positive value means we can move around
      const maxOffsetX = (drawWidth - slotWidth) / 2
      const maxOffsetY = (drawHeight - slotHeight) / 2

      // Apply offset ratio to get actual offset from CENTER
      // xRatio -1 -> move left -> image center moves right -> content moves right?
      // User drag logic used: offset.x defined shift from center.
      // If we used ratio in UI (offset / maxOffset), then we just multiply back.
      const actualOffsetX = offset.xRatio * maxOffsetX
      const actualOffsetY = offset.yRatio * maxOffsetY

      // Calculate draw position
      // Center of slot - half of image size + offset
      const drawX = slotX + (slotWidth - drawWidth) / 2 + actualOffsetX
      const drawY = slotY + (slotHeight - drawHeight) / 2 + actualOffsetY

      console.log('=== COMPOSITE DEBUG ===')
      console.log(
        'Image:',
        img.width,
        'x',
        img.height,
        'aspect:',
        imgAspect.toFixed(3),
      )
      console.log(
        'Slot:',
        slotWidth,
        'x',
        slotHeight,
        'aspect:',
        slotAspect.toFixed(3),
      )
      console.log(
        'Draw size:',
        drawWidth.toFixed(0),
        'x',
        drawHeight.toFixed(0),
      )
      console.log('Max offset:', maxOffsetX.toFixed(0), maxOffsetY.toFixed(0))
      console.log(
        'Offset ratio:',
        offset.xRatio.toFixed(3),
        offset.yRatio.toFixed(3),
      )
      console.log(
        'Actual offset:',
        actualOffsetX.toFixed(0),
        actualOffsetY.toFixed(0),
      )
      console.log('Draw position:', drawX.toFixed(0), drawY.toFixed(0))

      // Clip to slot
      ctx.save()
      ctx.beginPath()
      ctx.rect(slotX, slotY, slotWidth, slotHeight)
      ctx.clip()

      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight)

      ctx.restore()
      resolve()
    }

    img.onerror = (err) => {
      console.error('ERR_LOAD: ', photoSrc, err)
      resolve()
    }

    // Check if the image resolves to local dev or file:// protocols avoiding crossOrigin for it
    if (photoSrc.startsWith('data:')) {
      img.removeAttribute('crossOrigin')
      img.src = photoSrc
    } else {
      // Prevent caching issues where a non-CORS cached image breaks the canvas CORS request
      const cacheBuster = photoSrc.includes('?')
        ? '&cb=' + Date.now()
        : '?cb=' + Date.now()
      img.src = photoSrc + cacheBuster
    }
  })
}

/**
 * Draw frame overlay directly (respecting original PNG transparency)
 */
const drawFrameOverlay = async (
  ctx: CanvasRenderingContext2D,
  frameImage: HTMLImageElement,
  canvasWidth: number,
  canvasHeight: number,
): Promise<void> => {
  // Simply draw the frame image on top
  // The PNG should already have transparency in the photo slots
  ctx.drawImage(frameImage, 0, 0, canvasWidth, canvasHeight)
}

/**
 * Convert Tailwind filter class to CSS filter string
 */
const tailwindToCssFilter = (effectClass: string): string => {
  let filters: string[] = []

  // Parse Tailwind classes to CSS filter
  // sepia-[0.3] -> sepia(0.3)
  const sepiaMatch = effectClass.match(/sepia-\[([0-9.]+)\]/)
  if (sepiaMatch) {
    filters.push(`sepia(${sepiaMatch[1]})`)
  } else if (effectClass.includes('sepia')) {
    filters.push('sepia(1)')
  }

  // grayscale -> grayscale(1)
  if (effectClass.includes('grayscale')) {
    filters.push('grayscale(1)')
  }

  // contrast-110 -> contrast(1.1)
  const contrastMatch = effectClass.match(/contrast-(\d+)/)
  if (contrastMatch) {
    filters.push(`contrast(${parseInt(contrastMatch[1]) / 100})`)
  }

  // brightness-110 -> brightness(1.1)
  const brightnessMatch = effectClass.match(/brightness-(\d+)/)
  if (brightnessMatch) {
    filters.push(`brightness(${parseInt(brightnessMatch[1]) / 100})`)
  }

  // saturate-125 -> saturate(1.25)
  const saturateMatch = effectClass.match(/saturate-(\d+)/)
  if (saturateMatch) {
    filters.push(`saturate(${parseInt(saturateMatch[1]) / 100})`)
  }

  // hue-rotate-[-10deg] -> hue-rotate(-10deg)
  const hueMatch = effectClass.match(/hue-rotate-\[(-?\d+)deg\]/)
  if (hueMatch) {
    filters.push(`hue-rotate(${hueMatch[1]}deg)`)
  }

  return filters.join(' ') || 'none'
}

/**
 * Apply filter effects using CSS filter (same as preview)
 */
const applyFilterEffect = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  effectClass: string,
) => {
  if (!effectClass) return

  // Convert Tailwind class to CSS filter
  const cssFilter = tailwindToCssFilter(effectClass)
  if (cssFilter === 'none') return

  console.log('Applying CSS filter:', cssFilter)

  // Create temp canvas to apply filter
  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = width
  tempCanvas.height = height
  const tempCtx = tempCanvas.getContext('2d')!

  // Copy current canvas content
  tempCtx.drawImage(ctx.canvas, 0, 0)

  // Clear original and redraw with filter
  ctx.clearRect(0, 0, width, height)
  ctx.filter = cssFilter
  ctx.drawImage(tempCanvas, 0, 0)
  ctx.filter = 'none' // Reset filter
}

export const downloadImage = (dataUrl: string, filename: string) => {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
