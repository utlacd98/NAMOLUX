import { deflateSync } from "node:zlib"
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"

const root = resolve(import.meta.dirname, "..")

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type)
  const result = Buffer.alloc(data.length + 12)
  result.writeUInt32BE(data.length, 0)
  typeBytes.copy(result, 4)
  data.copy(result, 8)
  result.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), data.length + 8)
  return result
}

function png(size) {
  // Render at the target resolution. The softened edges below provide anti-aliasing
  // without accidentally shipping a 4× oversized PNG to every device.
  const scale = 1
  const high = size * scale
  const pixels = new Uint8ClampedArray(high * high * 4)
  const mix = (a, b, amount) => Math.round(a + (b - a) * amount)
  const smooth = (edge0, edge1, value) => {
    const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)))
    return t * t * (3 - 2 * t)
  }
  const distanceToLine = (x, y, ax, ay, bx, by) => {
    const dx = bx - ax
    const dy = by - ay
    const length = dx * dx + dy * dy
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / length))
    return Math.hypot(x - (ax + dx * t), y - (ay + dy * t))
  }
  const put = (x, y, red, green, blue, alpha) => {
    const index = (y * high + x) * 4
    const under = pixels[index + 3] / 255
    const over = alpha / 255
    const out = over + under * (1 - over)
    pixels[index] = Math.round((red * over + pixels[index] * under * (1 - over)) / out)
    pixels[index + 1] = Math.round((green * over + pixels[index + 1] * under * (1 - over)) / out)
    pixels[index + 2] = Math.round((blue * over + pixels[index + 2] * under * (1 - over)) / out)
    pixels[index + 3] = Math.round(out * 255)
  }
  const radius = high * 0.211
  const stroke = high * 0.102
  const left = high * 0.277
  const right = high * 0.723
  const top = high * 0.266
  const bottom = high * 0.734

  for (let y = 0; y < high; y += 1) {
    for (let x = 0; x < high; x += 1) {
      const edge = Math.min(x, y, high - 1 - x, high - 1 - y)
      const cornerX = x < radius ? radius - x : x > high - radius ? x - (high - radius) : 0
      const cornerY = y < radius ? radius - y : y > high - radius ? y - (high - radius) : 0
      const outside = cornerX && cornerY ? Math.hypot(cornerX, cornerY) - radius : -edge
      if (outside > 0.8) continue
      const radial = Math.max(0, 1 - Math.hypot(x - high / 2, y - high * 0.22) / (high * 0.9))
      put(x, y, mix(8, 30, radial), mix(8, 24, radial), mix(7, 15, radial), 255)

      const border = Math.min(
        Math.abs(Math.hypot(Math.max(radius - x, 0, x - (high - radius)), Math.max(radius - y, 0, y - (high - radius))) - radius),
        edge,
      )
      if (border < high * 0.006) put(x, y, 130, 89, 39, Math.round(105 * (1 - border / (high * 0.006))))

      const distance = Math.min(
        distanceToLine(x, y, left, bottom, left, top),
        distanceToLine(x, y, left, top, right, bottom),
        distanceToLine(x, y, right, bottom, right, top),
      )
      const coverage = 1 - smooth(stroke / 2 - 1.5 * scale, stroke / 2 + 1.5 * scale, distance)
      if (coverage > 0) {
        const shimmer = Math.max(0, Math.min(1, 0.35 + (x + y) / (high * 1.7)))
        put(x, y, mix(169, 255, shimmer), mix(102, 222, shimmer), mix(35, 128, shimmer), Math.round(coverage * 255))
      }
    }
  }

  const raw = Buffer.alloc((high * 4 + 1) * high)
  for (let y = 0; y < high; y += 1) {
    raw[y * (high * 4 + 1)] = 0
    Buffer.from(pixels.buffer, y * high * 4, high * 4).copy(raw, y * (high * 4 + 1) + 1)
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(high, 0)
  header.writeUInt32BE(high, 4)
  header[8] = 8
  header[9] = 6
  header[10] = 0
  header[11] = 0
  header[12] = 0
  return Buffer.concat([Buffer.from("89504e470d0a1a0a", "hex"), chunk("IHDR", header), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))])
}

function write(path, contents) {
  const destination = resolve(root, path)
  mkdirSync(dirname(destination), { recursive: true })
  writeFileSync(destination, contents)
}

const assets = new Map([
  ["app/icon.png", png(512)],
  ["app/apple-icon.png", png(180)],
  ["public/icon-192.png", png(192)],
  ["public/icon-512.png", png(512)],
])

for (const [path, contents] of assets) write(path, contents)

const icoImages = [16, 32, 48, 64, 128, 256].map((size) => ({ size, contents: png(size) }))
const icoHeader = Buffer.alloc(6 + icoImages.length * 16)
icoHeader.writeUInt16LE(0, 0)
icoHeader.writeUInt16LE(1, 2)
icoHeader.writeUInt16LE(icoImages.length, 4)
let offset = icoHeader.length
for (const [index, image] of icoImages.entries()) {
  const entry = 6 + index * 16
  icoHeader[entry] = image.size === 256 ? 0 : image.size
  icoHeader[entry + 1] = image.size === 256 ? 0 : image.size
  icoHeader[entry + 2] = 0
  icoHeader[entry + 3] = 0
  icoHeader.writeUInt16LE(1, entry + 4)
  icoHeader.writeUInt16LE(32, entry + 6)
  icoHeader.writeUInt32LE(image.contents.length, entry + 8)
  icoHeader.writeUInt32LE(offset, entry + 12)
  offset += image.contents.length
}
write("app/favicon.ico", Buffer.concat([icoHeader, ...icoImages.map((image) => image.contents)]))

console.log("Generated NamoLux favicon, Apple touch icon and web-app icons.")
