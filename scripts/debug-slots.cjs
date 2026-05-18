/**
 * DEBUG SCRIPT: Visualize slots on template
 * Usage: node scripts/debug-slots.cjs 06b
 *    or: node scripts/debug-slots.cjs ram-06b
 *
 * This will create a debug image with red rectangles showing where slots are positioned
 */

const fs = require('fs')
const path = require('path')
const { PNG } = require('pngjs')

const templateId = process.argv[2]
if (!templateId) {
  console.error('Usage: node scripts/debug-slots.cjs <template-id>')
  console.error('Example: node scripts/debug-slots.cjs 06b')
  process.exit(1)
}

const normalizedRamadhanId = templateId.startsWith('ram-')
  ? templateId.replace('ram-', '')
  : templateId

// Try output JSON first (useful for ram-* templates)
const outputJsonPath = path.join(
  __dirname,
  `output-${normalizedRamadhanId}.json`,
)

// Read categorized template constants and find the requested template as fallback
const templateFiles = [
  path.join(
    __dirname,
    '..',
    'src',
    'constants',
    'templates',
    'standardTemplates.ts',
  ),
  path.join(
    __dirname,
    '..',
    'src',
    'constants',
    'templates',
    'ramadhanTemplates.ts',
  ),
  path.join(
    __dirname,
    '..',
    'src',
    'constants',
    'templates',
    'valentineTemplates.ts',
  ),
]

let slots = []

if (fs.existsSync(outputJsonPath)) {
  const json = JSON.parse(fs.readFileSync(outputJsonPath, 'utf-8'))
  const validIds = new Set([templateId, normalizedRamadhanId])
  if (validIds.has(json.id) && Array.isArray(json.slots)) {
    slots = json.slots.map((slot) => ({
      x: Number(slot.x),
      y: Number(slot.y),
      width: Number(slot.width),
      height: Number(slot.height),
    }))
  }
}

if (slots.length === 0) {
  const templateRegex = new RegExp(
    `id:\\s*['"]${templateId}['"][\\s\\S]*?slots:\\s*\\[([\\s\\S]*?)\\]`,
    'm',
  )

  let match = null
  for (const templateFile of templateFiles) {
    if (!fs.existsSync(templateFile)) continue
    const content = fs.readFileSync(templateFile, 'utf-8')
    const found = content.match(templateRegex)
    if (found) {
      match = found
      break
    }
  }

  if (!match) {
    console.error(
      `Template "${templateId}" not found in output JSON or constants templates.`,
    )
    process.exit(1)
  }

  const slotsStr = match[1]
  const slotRegex =
    /\{\s*x:\s*(\d+),\s*y:\s*(\d+),\s*width:\s*(\d+),\s*height:\s*(\d+)\s*\}/g
  let slotMatch
  while ((slotMatch = slotRegex.exec(slotsStr)) !== null) {
    slots.push({
      x: parseInt(slotMatch[1]),
      y: parseInt(slotMatch[2]),
      width: parseInt(slotMatch[3]),
      height: parseInt(slotMatch[4]),
    })
  }
}

console.log(`Found ${slots.length} slots for template ${templateId}:`)
slots.forEach((s, i) =>
  console.log(
    `  Slot ${i + 1}: x=${s.x}, y=${s.y}, w=${s.width}, h=${s.height}`,
  ),
)

// Load template image
const templateRelativePath = templateId.startsWith('val-')
  ? path.join('templates', 'valentine', `${templateId.replace('val-', '')}.png`)
  : templateId.startsWith('ram-')
    ? path.join('templates', 'ramadhan', `${normalizedRamadhanId}.png`)
    : path.join('templates', `${templateId}.png`)
const templatePath = path.join(__dirname, '..', 'public', templateRelativePath)
if (!fs.existsSync(templatePath)) {
  console.error(`Template file not found: ${templatePath}`)
  process.exit(1)
}

const templateData = fs.readFileSync(templatePath)
const png = PNG.sync.read(templateData)

console.log(`\nTemplate size: ${png.width}x${png.height}`)

// Draw red rectangles on each slot
const RED = { r: 255, g: 0, b: 0, a: 200 }
const GREEN = { r: 0, g: 255, b: 0, a: 255 }

function drawRect(png, x, y, width, height, color, thickness = 3) {
  for (let t = 0; t < thickness; t++) {
    // Top edge
    for (let px = x; px < x + width && px < png.width; px++) {
      setPixel(png, px, y + t, color)
    }
    // Bottom edge
    for (let px = x; px < x + width && px < png.width; px++) {
      setPixel(png, px, y + height - 1 - t, color)
    }
    // Left edge
    for (let py = y; py < y + height && py < png.height; py++) {
      setPixel(png, x + t, py, color)
    }
    // Right edge
    for (let py = y; py < y + height && py < png.height; py++) {
      setPixel(png, x + width - 1 - t, py, color)
    }
  }
}

function setPixel(png, x, y, color) {
  if (x < 0 || x >= png.width || y < 0 || y >= png.height) return
  const idx = (png.width * y + x) << 2
  png.data[idx] = color.r
  png.data[idx + 1] = color.g
  png.data[idx + 2] = color.b
  png.data[idx + 3] = color.a
}

function drawNumber(png, x, y, num, color) {
  // Simple 5x7 font for digits
  const digits = {
    1: ['  #  ', '  #  ', '  #  ', '  #  ', '  #  '],
    2: [' ### ', '    #', ' ### ', '#    ', ' ### '],
    3: [' ### ', '    #', ' ### ', '    #', ' ### '],
    4: ['#   #', '#   #', ' ### ', '    #', '    #'],
    5: [' ### ', '#    ', ' ### ', '    #', ' ### '],
    6: [' ### ', '#    ', ' ### ', '#   #', ' ### '],
  }
  const pattern = digits[num] || digits[1]
  const scale = 4
  pattern.forEach((row, dy) => {
    for (let dx = 0; dx < row.length; dx++) {
      if (row[dx] === '#') {
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            setPixel(png, x + dx * scale + sx, y + dy * scale + sy, color)
          }
        }
      }
    }
  })
}

// Draw each slot
slots.forEach((slot, index) => {
  drawRect(png, slot.x, slot.y, slot.width, slot.height, RED, 4)
  drawNumber(png, slot.x + 10, slot.y + 10, index + 1, GREEN)
})

// Save output
const outputPath = path.join(__dirname, `debug-${templateId}.png`)
const buffer = PNG.sync.write(png)
fs.writeFileSync(outputPath, buffer)

console.log(`\n✅ Debug image saved to: ${outputPath}`)
console.log(
  'Open this image to verify if red rectangles match the transparent slot areas.',
)
