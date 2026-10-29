import type { Dir } from './sim'

export type GhostLook = 'body' | 'blue' | 'flash' | 'eyes'

interface GhostSet {
  body: HTMLCanvasElement
  blue: HTMLCanvasElement
  flash: HTMLCanvasElement
  eyes: HTMLCanvasElement
}

const pac: HTMLCanvasElement[] = []
const laws: GhostSet[] = []
let ready = false

export function spritesReady(): boolean {
  return ready
}

function asset(name: string): string {
  return `${import.meta.env.BASE_URL}sprites/${name}`
}

function loadImage(name: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`sprite failed: ${name}`))
    image.src = asset(name)
  })
}

function hex(color: string): [number, number, number] {
  const value = color.replace('#', '')
  return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)]
}

function paint(
  source: CanvasImageSource,
  tint: string | null,
  mode: 'body' | 'eyes',
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 32
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(source, 0, 0)
  const image = ctx.getImageData(0, 0, 32, 32)
  const data = image.data
  const corner = 0
  const key =
    data[corner + 3]! > 200 &&
    Math.max(data[corner]!, data[corner + 1]!, data[corner + 2]!) -
      Math.min(data[corner]!, data[corner + 1]!, data[corner + 2]!) <
      18
      ? [data[corner]!, data[corner + 1]!, data[corner + 2]!]
      : null
  const tintRgb = tint ? hex(tint) : null
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i]!
    let g = data[i + 1]!
    let b = data[i + 2]!
    let a = data[i + 3]!
    if (key) {
      const spread = Math.max(r, g, b) - Math.min(r, g, b)
      const dist = Math.hypot(r - key[0]!, g - key[1]!, b - key[2]!)
      if (spread < 22 && dist < 38) a = 0
    }
    if (a < 8) {
      data[i + 3] = 0
      continue
    }
    if (mode === 'eyes') {
      const light = Math.min(r, g, b)
      data[i + 3] = light > 190 ? a : 0
      continue
    }
    if (tintRgb) {
      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      if (max >= 28 && !(min > 210 && max - min < 28)) {
        const tone = Math.min(1, ((r + g + b) / 3 / 255) * 1.35)
        r = Math.round(tintRgb[0] * tone)
        g = Math.round(tintRgb[1] * tone)
        b = Math.round(tintRgb[2] * tone)
      }
    }
    data[i] = r
    data[i + 1] = g
    data[i + 2] = b
    data[i + 3] = a
  }
  ctx.putImageData(image, 0, 0)
  return canvas
}

function ghostSet(source: CanvasImageSource, tint: string | null): GhostSet {
  const body = paint(source, tint, 'body')
  return {
    body,
    blue: paint(body, '#2f7bff', 'body'),
    flash: paint(body, '#f4f0e6', 'body'),
    eyes: paint(body, null, 'eyes'),
  }
}

export function loadSprites(): Promise<void> {
  return Promise.all([
    loadImage('pac-closed.png'),
    loadImage('pac-half.png'),
    loadImage('pac-open.png'),
    loadImage('ghost-law.png'),
    loadImage('ghost-law-2.png'),
    loadImage('ghost-lawyer.png'),
  ]).then(([closed, half, open, law, law2, lawyer]) => {
    pac.splice(0, pac.length, paint(closed, null, 'body'), paint(half, null, 'body'), paint(open, null, 'body'))
    const plain = ghostSet(law, null)
    const scroll = ghostSet(law2, '#ffe14a')
    const counsel = ghostSet(lawyer, null)
    const repeat = ghostSet(law, '#ff5fd2')
    laws.splice(0, laws.length, plain, scroll, counsel, repeat)
    ready = true
  })
}

void loadSprites().catch(() => {
  ready = false
})

export function pacFrame(open: number): HTMLCanvasElement | null {
  if (!ready) return null
  const step = Math.floor(open) % 4
  const index = step === 3 ? 1 : step
  return pac[index] ?? null
}

export function lawSprite(index: number, look: GhostLook): HTMLCanvasElement | null {
  if (!ready) return null
  const set = laws[index] ?? laws[index % laws.length]
  return set ? set[look] : null
}

const TURN: Record<Dir, number> = { right: 0, down: 1, left: 2, up: 3 }

export function drawFacing(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  x: number,
  y: number,
  size: number,
  dir: Dir,
  forward: 'right' | 'up',
): void {
  const zero = forward === 'right' ? 0 : 3
  const turns = (TURN[dir] - zero + 4) % 4
  ctx.save()
  ctx.translate(Math.round(x), Math.round(y))
  ctx.rotate((turns * Math.PI) / 2)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(source, Math.round(-size / 2), Math.round(-size / 2), Math.round(size), Math.round(size))
  ctx.restore()
}
