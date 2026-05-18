const fs = require('fs')
const { PNG } = require('pngjs')
const path = require('path')

const args = process.argv.slice(2)
if (args.length < 2) {
  console.error(
    'Usage: node scripts/debug-from-json.cjs <path-to-png> <path-to-json>'
  )
  process.exit(1)
}

const imagePath = args[0]
const jsonPath = args[1]

console.log(`🚀 Generating debug image from JSON config...`)
console.log(`   Image: ${imagePath}`)
console.log(`   Config: ${jsonPath}`)

// Load JSON config
const config = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
const targetWidth = config.outputWidth || 1200
const targetHeight = config.outputHeight || 1800

// Helper: Set pixel color
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

// Helper: Draw rectangle
function drawRect(data, width, height, rect, color, thickness = 5) {
  const { r, g, b, a } = color

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

// Helper: Draw number
function drawNumber(data, imgWidth, x, y, num) {
  const scale = 5
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
    for (let py = 0; py < pattern.length; py++) {
      for (let px = 0; px < pattern[py].length; px++) {
        if (pattern[py][px] === 1) {
          for (let sy = 0; sy < scale; sy++) {
            for (let sx = 0; sx < scale; sx++) {
              setPixel(
                data,
                imgWidth,
                x + i * 4 * scale + px * scale + sx,
                y + py * scale + sy,
                0,
                255,
                0,
                255
              )
            }
          }
        }
      }
    }
  }
}

// Process image
fs.createReadStream(imagePath)
  .pipe(new PNG({ filterType: 4 }))
  .on('parsed', function () {
    const width = this.width
    const height = this.height
    console.log(`📏 Image dimensions: ${width}x${height}`)

    // Calculate scale factors
    const scaleX = width / targetWidth
    const scaleY = height / targetHeight

    console.log(`📐 Scale factors: ${scaleX.toFixed(3)} x ${scaleY.toFixed(3)}`)
    console.log(`✅ Found ${config.slots.length} slots in config.`)

    // Draw each slot
    config.slots.forEach((slot, index) => {
      // Scale slot coordinates to image dimensions
      const scaledSlot = {
        x: Math.round(slot.x * scaleX),
        y: Math.round(slot.y * scaleY),
        width: Math.round(slot.width * scaleX),
        height: Math.round(slot.height * scaleY),
      }

      console.log(
        `   Slot ${index + 1}: (${scaledSlot.x}, ${scaledSlot.y}) ${
          scaledSlot.width
        }x${scaledSlot.height}`
      )

      // Draw rectangle
      drawRect(this.data, width, height, scaledSlot, {
        r: 255,
        g: 0,
        b: 0,
        a: 255,
      })

      // Draw number
      drawNumber(
        this.data,
        width,
        scaledSlot.x + 10,
        scaledSlot.y + 10,
        index + 1
      )
    })

    // Save debug image
    const baseName = path.basename(imagePath, '.png')
    const debugPath = path.join(path.dirname(jsonPath), `debug-${baseName}.png`)

    this.pack()
      .pipe(fs.createWriteStream(debugPath))
      .on('finish', () => {
        console.log(`\n🎉 DONE!`)
        console.log(`🖼️ Debug Image: ${debugPath}`)
      })
  })
  .on('error', (err) => console.error('Error parsing PNG:', err))
