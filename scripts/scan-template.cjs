const fs = require('fs')
const pngjs = require('pngjs').PNG
const path = require('path')

const args = process.argv.slice(2)
if (args.length === 0) {
  console.error('Usage: node scripts/scan-template.cjs <path-to-png>')
  process.exit(1)
}

const inputPath = args[0]
const targetWidth = 1200 // Target output width app
const targetHeight = 1800 // Target output height app

console.log(`🔍 Scanning template: ${inputPath}`)

// Create stream and handle error
const stream = fs.createReadStream(inputPath)
stream.on('error', (err) => {
  console.error(`❌ Failed to read file: ${inputPath}`)
  console.error(err.message)
  process.exit(1)
})

stream
  .pipe(new pngjs({ filterType: 4 }))
  .on('parsed', function () {
    const width = this.width
    const height = this.height
    const data = this.data

    console.log(`📏 Original Size: ${width}x${height}`)

    const scaleX = targetWidth / width
    const scaleY = targetHeight / height

    const visited = new Uint8Array(width * height)
    const slots = []

    // Helper to check transparency
    const isTransparent = (idx) => {
      return data[idx + 3] < 20 // Alpha < 20 (tolerance)
    }

    // Scan pixels
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (width * y + x) << 2
        const pixIndex = y * width + x

        if (!visited[pixIndex] && isTransparent(idx)) {
          // Start Flood Fill to find rectangle
          const slot = floodFill(x, y, width, height, visited, isTransparent)
          if (slot.width > 20 && slot.height > 20) {
            // Filter noise
            slots.push(slot)
          }
        }
      }
    }

    // Sort slots: Top-to-bottom, then Left-to-right
    slots.sort((a, b) => {
      const rowDiff = Math.abs(a.y - b.y)
      if (rowDiff > 50) return a.y - b.y // Different rows
      return a.x - b.x // Same row
    })

    // Generate Config
    console.log('\n=======================================')
    console.log('✅ FOUND ' + slots.length + ' SLOTS!')
    console.log('=======================================\n')

    // Output Scaled Config
    const scaledSlots = slots.map((s) => ({
      x: Math.round(s.x * scaleX),
      y: Math.round(s.y * scaleY),
      width: Math.round(s.width * scaleX),
      height: Math.round(s.height * scaleY),
    }))

    const result = {
      id: path.basename(inputPath, '.png'),
      photoCount: slots.length,
      variant: 'a', // Default variant
      name: 'New Template (' + slots.length + ' Photos)',
      description: 'Auto-generated configuration',
      previewUrl: `/templates/${path.basename(inputPath)}`,
      frameUrl: `/templates/${path.basename(inputPath)}`,
      outputWidth: targetWidth,
      outputHeight: targetHeight,
      slots: scaledSlots,
    }

    const outputFilename = path.basename(inputPath, '.png')
    const outputPath = path.join(__dirname, `output-${outputFilename}.json`)

    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2))
    console.log(`✅ Success! Result written to ${outputPath}`)
    console.log(JSON.stringify(result, null, 2))
  })
  .on('error', (err) => {
    console.error('❌ PNG Parse Error:', err)
  })

function floodFill(startX, startY, width, height, visited, isTransparent) {
  let minX = startX,
    maxX = startX
  let minY = startY,
    maxY = startY

  // Iterative flood fill to avoid stack overflow
  const stack = [[startX, startY]]
  visited[startY * width + startX] = 1

  let ptr = 0
  while (ptr < stack.length) {
    const [x, y] = stack[ptr++] // Simple Queue using array (BFS effectively)

    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y

    // Check 4 neighbors
    const neighbors = [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ]

    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nIdx = ny * width + nx
        const pixIdx = nIdx << 2

        if (!visited[nIdx] && isTransparent(pixIdx)) {
          visited[nIdx] = 1
          stack.push([nx, ny])
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
