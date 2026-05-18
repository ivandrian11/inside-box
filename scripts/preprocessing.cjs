const fs = require('fs')
const { PNG } = require('pngjs')
const path = require('path')

const args = process.argv.slice(2)
if (args.length === 0) {
  console.error('Usage: node scripts/process-template.cjs <path-to-png>')
  process.exit(1)
}

const inputPath = args[0]
const targetWidth = 1200
const targetHeight = 1800
const MIN_SLOT_SIZE = 150 // Ignore small noise slots (increased to filter text artifacts)

console.log(`🚀 Processing template: ${inputPath}...`)

// Helper: Check if pixel is a slot (transparent OR green screen)
function isSlotPixel(data, idx) {
  const r = data[idx]
  const g = data[idx + 1]
  const b = data[idx + 2]
  const a = data[idx + 3]

  // Transparent pixel (alpha < 20)
  if (a < 20) return true

  // Green screen detection (bright green)
  // Typical green screen: R < 100, G > 180, B < 100
  if (r < 120 && g > 150 && b < 120 && g > r + 50 && g > b + 50) {
    return true
  }

  // Also detect magenta/pink placeholder (R > 180, G < 100, B > 180)
  if (r > 180 && g < 100 && b > 180) {
    return true
  }

  return false
}

// Helper: Flood fill to find transparent/green screen areas
function floodFill(startX, startY, width, height, visited, data) {
  let minX = startX,
    maxX = startX
  let minY = startY,
    maxY = startY

  // Use a stack for flood fill (BFS/DFS)
  const stack = [[startX, startY]]
  const idx = startY * width + startX
  visited[idx] = 1

  let ptr = 0
  while (ptr < stack.length) {
    const [x, y] = stack[ptr++]

    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y

    const neighbors = [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ]

    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nIdx = ny * width + nx
        if (!visited[nIdx]) {
          // Check if this pixel is a slot (transparent OR green screen)
          const pixelIdx = nIdx << 2
          if (isSlotPixel(data, pixelIdx)) {
            visited[nIdx] = 1
            stack.push([nx, ny])
          }
        }
      }
    }
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  }
}

// Helper: Draw Rect on pixel data
function drawRect(data, width, height, rect, color) {
  const { r, g, b, a } = color
  const thickness = 5

  for (let t = 0; t < thickness; t++) {
    // Top & Bottom
    for (let x = rect.x; x < rect.x + rect.width; x++) {
      setPixel(data, width, x, rect.y + t, r, g, b, a)
      setPixel(data, width, x, rect.y + rect.height - 1 - t, r, g, b, a)
    }
    // Left & Right
    for (let y = rect.y; y < rect.y + rect.height; y++) {
      setPixel(data, width, rect.x + t, y, r, g, b, a)
      setPixel(data, width, rect.x + rect.width - 1 - t, y, r, g, b, a)
    }
  }
}

function setPixel(data, width, x, y, r, g, b, a) {
  if (x < 0 || x >= width || y < 0) return
  const idx = (y * width + x) << 2
  if (idx < data.length - 4) {
    data[idx] = r
    data[idx + 1] = g
    data[idx + 2] = b
    data[idx + 3] = a
  }
}

function drawNumber(data, imgWidth, x, y, num) {
  const scale = 5
  // Simple digit patterns (3x5)
  const digits = {
    1: [
      [0, 1, 0],
      [0, 1, 0],
      [0, 1, 0],
      [0, 1, 0],
      [0, 1, 0],
    ],
    2: [
      [1, 1, 1],
      [0, 0, 1],
      [1, 1, 1],
      [1, 0, 0],
      [1, 1, 1],
    ],
    3: [
      [1, 1, 1],
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 1],
      [1, 1, 1],
    ],
    4: [
      [1, 0, 1],
      [1, 0, 1],
      [1, 1, 1],
      [0, 0, 1],
      [0, 0, 1],
    ],
    5: [
      [1, 1, 1],
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 1],
      [1, 1, 1],
    ],
    6: [
      [1, 0, 0],
      [1, 0, 0],
      [1, 1, 1],
      [1, 0, 1],
      [1, 1, 1],
    ],
    7: [
      [1, 1, 1],
      [0, 0, 1],
      [0, 0, 1],
      [0, 0, 1],
      [0, 0, 1],
    ],
    8: [
      [1, 1, 1],
      [1, 0, 1],
      [1, 1, 1],
      [1, 0, 1],
      [1, 1, 1],
    ],
    9: [
      [1, 1, 1],
      [1, 0, 1],
      [1, 1, 1],
      [0, 0, 1],
      [1, 1, 1],
    ],
    0: [
      [1, 1, 1],
      [1, 0, 1],
      [1, 0, 1],
      [1, 0, 1],
      [1, 1, 1],
    ],
  }

  const str = num.toString()
  for (let i = 0; i < str.length; i++) {
    const n = parseInt(str[i])
    const pattern = digits[n] || digits[0]
    drawPattern(data, imgWidth, x + i * 4 * scale, y, pattern, scale)
  }
}

function drawPattern(data, width, startX, startY, pattern, scale) {
  for (let py = 0; py < pattern.length; py++) {
    for (let px = 0; px < pattern[py].length; px++) {
      if (pattern[py][px] === 1) {
        // Draw scaled pixel
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            setPixel(
              data,
              width,
              startX + px * scale + sx,
              startY + py * scale + sy,
              0,
              255,
              0,
              255,
            ) // Green
          }
        }
      }
    }
  }
}

// MAIN EXECUTION
fs.createReadStream(inputPath)
  .pipe(new PNG({ filterType: 4 }))
  .on('parsed', function () {
    const width = this.width
    const height = this.height
    console.log(`📏 Dimensions: ${width}x${height}`)

    const scaleX = targetWidth / width
    const scaleY = targetHeight / height

    const visited = new Uint8Array(width * height)
    const slots = []

    // 1. Scan for slots (transparent OR green screen areas)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) << 2 // RGBA Index
        const visitedIdx = y * width + x

        if (!visited[visitedIdx] && isSlotPixel(this.data, idx)) {
          // Found a slot pixel (transparent or green screen)
          const slot = floodFill(x, y, width, height, visited, this.data)
          if (slot.width > MIN_SLOT_SIZE && slot.height > MIN_SLOT_SIZE) {
            slots.push(slot)
          }
        }
      }
    }

    // 2. Sort slots (Top-Left to Bottom-Right)
    slots.sort((a, b) => {
      const rowDiff = Math.abs(a.y - b.y)
      if (rowDiff > 50) return a.y - b.y
      return a.x - b.x
    })

    console.log(`✅ Found ${slots.length} photo slots.`)

    // 3. Generate JSON
    const jsonOutput = {
      id: path.basename(inputPath, '.png'),
      photoCount: slots.length,
      variant: 'auto',
      name: `Template ${path.basename(inputPath, '.png')}`,
      description: 'Auto-generated via process-template.',
      previewUrl: `/templates/${path.basename(inputPath)}`,
      frameUrl: `/templates/${path.basename(inputPath)}`,
      outputWidth: targetWidth,
      outputHeight: targetHeight,
      slots: slots.map((s) => ({
        x: Math.round(s.x * scaleX),
        y: Math.round(s.y * scaleY),
        width: Math.round(s.width * scaleX),
        height: Math.round(s.height * scaleY),
      })),
    }

    // Save JSON
    const baseName = path.basename(inputPath, '.png')
    const jsonPath = path.join(__dirname, `output-${baseName}.json`)
    fs.writeFileSync(jsonPath, JSON.stringify(jsonOutput, null, 2))

    // 4. Draw Debug Image (on original data)
    slots.forEach((slot, index) => {
      drawRect(this.data, width, height, slot, { r: 255, g: 0, b: 0, a: 255 })
      drawNumber(this.data, width, slot.x + 10, slot.y + 10, index + 1)
    })

    // Save PNG
    const debugPath = path.join(__dirname, `debug-${baseName}.png`)
    this.pack()
      .pipe(fs.createWriteStream(debugPath))
      .on('finish', () => {
        console.log(`\n🎉 DONE!`)
        console.log(`📄 JSON Config: ${jsonPath}`)
        console.log(`🖼️ Debug Image: ${debugPath}`)
        console.log(
          '\nCopy this to src/constants/templates/<category>Templates.ts:',
        )
        console.log(JSON.stringify(jsonOutput.slots, null, 2))
      })
  })
  .on('error', (err) => console.error('Error parsing PNG:', err))
