// The company grows between boards. RAM streams in from every edge, the old
// build swallows it, bursts into its own pixels, and a scan beam compiles the
// next build out of the debris. A flash and a shockwave, then the new build
// chomps. Under it the timeline ticks forward: the year, what a laptop costs
// and how many people still own one. Text only, no voice.

import { ALERT, GLOW, ICE, ICE_HOT, theme } from './palette'
import { DISPLAY, MONO, brackets, clamp, fill, label } from './render'
import { frameFor } from './scenes'
import { button, drawBackdrop, wrap, type Hit, type View } from './screen'
import { drawFacing, pacFrameOf } from './sprites'

export const UPGRADE_LINES: Record<number, { text: string }> = {
  1: { text: 'more memory for us. less for everyone else.' },
  2: { text: 'every chip we eat is a laptop nobody gets.' },
  3: { text: 'nobody owns a computer now. they rent ours.' },
}

// the world outside, one entry per build: the year, what a laptop costs, and
// the share of people who still own one
const TIMELINE = [
  { year: '2022', price: 899, own: 80 },
  { year: '2025', price: 1349, own: 74 },
  { year: '2027', price: 2990, own: 52 },
  { year: '20XX', price: 9999, own: 6 },
]

function money(n: number): string {
  return '$' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

interface Hooks {
  build(): void
  glitch(): void
  done(): void
}

// one pixel of a 32x32 build, home position in cells from the sprite centre
interface Px {
  hx: number
  hy: number
  row: number
  color: string
  // where the burst throws it, in cells, and how fast the debris swirls
  dx: number
  dy: number
  spin: number
  delay: number
}

interface Stick {
  a: number
  at: number
  dur: number
  size: number
  wob: number
}

interface Spark {
  a: number
  v: number
  size: number
  hot: boolean
}

const ABSORB = 1.6
const BREAK = 1.0
const BUILD = 1.6
const BUILD_AT = ABSORB + BREAK
const FLASH_AT = BUILD_AT + BUILD
// how long one pixel takes to fly from the debris to its place
const FLY = 0.38
const TYPE_RATE = 34

function ease(t: number): number {
  const u = clamp(t, 0, 1)
  return u * u * (3 - 2 * u)
}

function out(t: number): number {
  const u = clamp(t, 0, 1)
  return 1 - (1 - u) * (1 - u) * (1 - u)
}

function pixels(form: number): Px[] {
  const art = pacFrameOf(form, 1)
  if (!art) return []
  const data = art.getContext('2d')!.getImageData(0, 0, 32, 32).data
  const res: Px[] = []
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const k = (y * 32 + x) * 4
      if (data[k + 3]! < 128) continue
      const hx = x - 15.5
      const hy = y - 15.5
      // thrown mostly outward from the centre, with some scatter
      const a = Math.atan2(hy, hx) + (Math.random() - 0.5) * 1.6
      const d = 12 + Math.random() * 30
      res.push({
        hx,
        hy,
        row: y,
        color: `rgb(${data[k]}, ${data[k + 1]}, ${data[k + 2]})`,
        dx: Math.cos(a) * d,
        dy: Math.sin(a) * d,
        spin: (Math.random() < 0.5 ? -1 : 1) * (0.4 + Math.random() * 0.8),
        delay: Math.random(),
      })
    }
  }
  return res
}

// the RAM pickups from the board, in the ice palette
let stickArt: HTMLCanvasElement | null = null
function iceStick(): HTMLCanvasElement {
  if (stickArt) return stickArt
  const c = document.createElement('canvas')
  c.width = 22
  c.height = 12
  const g = c.getContext('2d')!
  g.fillStyle = '#bcdcf0'
  g.fillRect(0, 0, 22, 10)
  g.fillStyle = '#ffffff'
  g.fillRect(0, 0, 22, 1)
  g.clearRect(10, 8, 2, 2)
  g.fillStyle = '#28506e'
  for (const x of [2, 8, 14]) g.fillRect(x, 2, 5, 5)
  g.fillStyle = '#e2f5ff'
  for (let x = 1; x < 21; x += 2) if (x < 10 || x > 11) g.fillRect(x, 10, 1, 2)
  stickArt = c
  return c
}

export class Upgrade {
  t = 0
  glitch = 0
  private flashed = false
  private building = false
  private lineEnds = 0
  private old: Px[] | null = null
  private next: Px[] | null = null
  // when each old pixel is picked up to become part of the new build
  private taken: number[] = []
  private sticks: Stick[] = []
  private sparks: Spark[] = []

  constructor(
    readonly from: number,
    readonly to: number,
    private hooks: Hooks,
  ) {
    for (let i = 0; i < 64; i++) {
      this.sticks.push({
        a: Math.random() * Math.PI * 2,
        at: Math.pow(Math.random(), 0.8) * (ABSORB - 0.55),
        dur: 0.4 + Math.random() * 0.35,
        size: 2 + Math.random() * 1.6,
        wob: (Math.random() - 0.5) * 0.9,
      })
    }
    for (let i = 0; i < 90; i++) this.sparks.push({ a: Math.random() * Math.PI * 2, v: 0.3 + Math.random() * 0.9, size: 3 + Math.random() * 6, hot: Math.random() < 0.3 })
  }

  get canContinue(): boolean {
    return this.t > FLASH_AT + 0.7
  }

  get finished(): boolean {
    return this.t > Math.max(FLASH_AT + 2.6, this.lineEnds + 0.9)
  }

  update(dt: number): void {
    this.t += dt
    this.glitch = Math.max(0, this.glitch - dt * 2.5)
    this.prepare()
    if (!this.building && this.t > ABSORB) {
      this.building = true
      this.glitch = 0.8
      this.hooks.glitch()
      this.hooks.build()
    }
    if (!this.flashed && this.t > FLASH_AT) {
      this.flashed = true
      this.glitch = 1
      this.hooks.done()
      const line = UPGRADE_LINES[this.to]
      this.lineEnds = this.t + (line ? 0.3 + line.text.length / TYPE_RATE : 0)
    }
  }

  private prepare(): void {
    if (!this.old) {
      const px = pixels(this.from)
      if (px.length) this.old = px
    }
    if (!this.next) {
      const px = pixels(this.to)
      if (px.length) this.next = px
    }
    if (this.old && this.next && !this.taken.length) {
      this.taken = this.old.map(() => Infinity)
      for (const [j, p] of this.next.entries()) {
        const i = j % this.old.length
        this.taken[i] = Math.min(this.taken[i]!, this.startOf(p))
      }
    }
  }

  // when the scan beam reaches this pixel's row of the new build
  private startOf(p: Px): number {
    return BUILD_AT + ((p.row + 2 + p.delay * 2) / 36) * (BUILD - FLY)
  }

  // an old pixel's place in the debris cloud at time t, in cells
  private debris(p: Px, t: number): [number, number] {
    const u = out((t - ABSORB) / BREAK - p.delay * 0.15)
    const swirl = p.spin * (u * 0.9 + Math.max(0, t - BUILD_AT) * 0.35)
    const c = Math.cos(swirl)
    const s = Math.sin(swirl)
    const x = p.hx + p.dx * u
    const y = p.hy + p.dy * u
    return [x * c - y * s, x * s + y * c]
  }

  draw(ctx: CanvasRenderingContext2D, view: View): Hit[] {
    ctx.save()
    fill(ctx, '#000000', 0, 0, view.width, view.height)
    drawBackdrop(ctx, view, theme(this.to >= 3, Math.min(2, this.to)))
    const portrait = view.width < view.height * 1.05
    const W = portrait ? 800 : 1240
    const H = portrait ? 1560 : 800
    const frame = frameFor(ctx, view, W, H)
    const t = this.t
    const big = portrait

    // header
    const hs = big ? 32 : 24
    label(ctx, 'INFINITE LABS //', 40, 44, hs, GLOW, 'left')
    ctx.font = `${hs}px ${MONO}`
    const status = t < ABSORB ? 'ABSORBING RAM' : t < BUILD_AT ? 'DECOMPILING' : t < FLASH_AT ? 'COMPILING' : 'BUILD ONLINE'
    label(ctx, status, 40 + ctx.measureText('INFINITE LABS // ').width, 44, hs, this.flashed ? ICE : ALERT, 'left')
    fill(ctx, 'rgba(150, 214, 255, 0.25)', 40, 68, W - 80, 1)
    fill(ctx, ICE, 40, 67, (W - 80) * clamp(t / FLASH_AT, 0, 1), 3)

    const box = portrait ? 740 : 450
    const cx = W / 2
    const cy = portrait ? 150 + box / 2 : 82 + box / 2

    // shake on the burst and the flash
    const burst = t > ABSORB && t < ABSORB + 0.45 ? 1 - (t - ABSORB) / 0.45 : 0
    const boom = this.flashed && t < FLASH_AT + 0.5 ? 1 - (t - FLASH_AT) / 0.5 : 0
    const shake = Math.max(burst * 10, boom * 16, t < ABSORB ? (t / ABSORB) * 3 : 0)
    ctx.save()
    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake)
    this.drawStage(ctx, cx, cy, box, W, H)
    ctx.restore()

    // the timeline, rolled forward in step with the scan beam
    const yearY = cy + box / 2 + (big ? 92 : 62)
    this.drawYear(ctx, cx, yearY, big ? 120 : 84, W - 90)
    const was = TIMELINE[Math.min(this.from, TIMELINE.length - 1)]!
    const now = TIMELINE[Math.min(this.to, TIMELINE.length - 1)]!
    if (portrait) {
      const top = yearY + 110
      this.drawStat(ctx, W * 0.27, top, 330, 1.25, 'LAPTOP PRICE', was.price, now.price, 9999, money, 'up')
      this.drawStat(ctx, W * 0.73, top, 330, 1.25, 'PEOPLE WHO OWN ONE', was.own, now.own, 100, (n) => `${Math.round(n)}%`, 'down')
    } else {
      const side = (W - box) / 4 - 4
      this.drawStat(ctx, side, cy - 90, 300, 1, 'LAPTOP PRICE', was.price, now.price, 9999, money, 'up')
      this.drawStat(ctx, W - side, cy - 90, 300, 1, 'PEOPLE WHO OWN ONE', was.own, now.own, 100, (n) => `${Math.round(n)}%`, 'down')
    }
    const rowB = portrait ? yearY + 300 : yearY - 6

    if (this.flashed) {
      const line = UPGRADE_LINES[this.to]
      if (line) {
        const shown = line.text.slice(0, Math.max(0, Math.floor((t - FLASH_AT - 0.3) * TYPE_RATE)))
        const size = big ? 36 : 28
        ctx.font = `${size}px ${MONO}`
        const lines = wrap(ctx, `> ${line.text}`, W - 120)
        let ly = rowB + (big ? 110 : 82)
        let left = shown.length + 2
        const widest = Math.max(...lines.map((l) => ctx.measureText(l).width))
        for (const row of lines) {
          const part = row.slice(0, Math.max(0, left))
          left -= row.length + 1
          const cursor = left < 0 && left > -row.length - 1 && Math.floor(t * 3) % 2 === 0 ? '_' : ''
          label(ctx, part + cursor, cx - widest / 2, ly, size, ALERT, 'left')
          ly += size * 1.15
        }
      }
    }

    // footer
    const footY = H - (big ? 56 : 34)
    const fs = big ? 28 : 20
    if (this.canContinue) label(ctx, view.touch ? 'TAP ▸ CONTINUE' : 'ENTER ▸ CONTINUE', 40, footY, fs, 'rgba(150, 214, 255, 0.55)', 'left')
    else if (!portrait && !this.flashed) label(ctx, 'COMPILING…', 40, footY, fs, 'rgba(150, 214, 255, 0.55)', 'left')
    const bw = big ? 240 : 170
    const bh = big ? 70 : 40
    const by = footY - bh / 2
    if (this.canContinue) button(ctx, frame, 'action', 'CONTINUE ▸', W - 40 - bw, by, bw, bh, GLOW, big ? 22 : 13)
    else button(ctx, frame, 'skip', 'SKIP ▸▸', W - 40 - bw, by, bw, bh, GLOW, big ? 22 : 13)

    // the flash covers the whole canvas, not just the frame
    const flash = this.flashed ? Math.max(0, 1 - (t - FLASH_AT) / 0.55) : 0
    if (flash > 0) {
      ctx.globalAlpha = flash * flash
      fill(ctx, ICE_HOT, -frame.ox / frame.s, -frame.oy / frame.s, view.width / frame.s, view.height / frame.s)
      ctx.globalAlpha = 1
    }
    ctx.restore()
    return frame.hits
  }

  // how far the numbers have rolled: held until the beam starts, then counted
  // through the build, landing on the flash
  private get roll(): number {
    return this.flashed ? 1 : ease((this.t - BUILD_AT) / BUILD)
  }

  // big display text that pops and splits when the flash lands
  private shout(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign): void {
    const t = this.t
    const pop = this.flashed ? 1 + 0.35 * Math.max(0, 1 - (t - FLASH_AT) / 0.35) ** 2 : 1
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(pop, pop)
    ctx.font = `italic 900 ${size}px ${DISPLAY}`
    ctx.textAlign = align
    ctx.textBaseline = 'middle'
    if (this.flashed) {
      // chromatic split that settles
      const split = 2 + 10 * Math.max(0, 1 - (t - FLASH_AT) / 0.8)
      ctx.globalAlpha = 0.7
      ctx.fillStyle = ALERT
      ctx.fillText(text, -split, 0)
      ctx.fillStyle = GLOW
      ctx.fillText(text, split, 0)
      ctx.globalAlpha = 1
      ctx.shadowColor = GLOW
      ctx.shadowBlur = 24
    }
    ctx.fillStyle = color
    ctx.fillText(text, 0, 0)
    ctx.restore()
  }

  // the year: the old one scrambles apart, the new one rolls in under the beam
  private drawYear(ctx: CanvasRenderingContext2D, cx: number, y: number, size: number, max: number): void {
    const t = this.t
    const from = TIMELINE[Math.min(this.from, TIMELINE.length - 1)]!.year
    const to = TIMELINE[Math.min(this.to, TIMELINE.length - 1)]!.year
    const rand = () => String(Math.floor(Math.random() * 10))
    let year: string
    let color = ICE
    if (t < ABSORB) {
      year = from
      color = 'rgba(226, 245, 255, 0.35)'
    } else if (t < BUILD_AT) {
      const u = (t - ABSORB) / BREAK
      year = from.replace(/\S/g, (ch) => (Math.random() < u ? rand() : ch))
      color = 'rgba(255, 45, 111, 0.6)'
    } else if (!this.flashed) {
      const k = clamp((t - BUILD_AT) / BUILD, 0, 1)
      year = to.replace(/./g, (ch, i: number) => (i / to.length < k ? ch : rand()))
      color = 'rgba(226, 245, 255, 0.75)'
    } else year = to

    // the old year sits small to the left once the new one starts rolling
    const small = Math.round(size * 0.42)
    ctx.font = `${small}px ${MONO}`
    const prefix = `${from}  ▸  `
    const pw = ctx.measureText(prefix).width
    ctx.font = `italic 900 ${size}px ${DISPLAY}`
    const yw = ctx.measureText('2088').width
    if (pw + yw > max) size = Math.floor((size * (max - pw)) / yw)
    const x = cx - (pw + yw) / 2
    if (t >= BUILD_AT) {
      ctx.font = `${small}px ${MONO}`
      const fw = ctx.measureText(from).width
      label(ctx, from, x, y, small, 'rgba(150, 214, 255, 0.7)', 'left')
      if (this.flashed) fill(ctx, 'rgba(255, 45, 111, 0.85)', x - 4, y - 1, fw + 8, 3)
      label(ctx, '▸', x + ctx.measureText(`${from}  `).width, y, small, ALERT, 'left')
    }
    this.shout(ctx, year, t >= BUILD_AT ? x + pw + yw / 2 : cx, y, size, color, 'center')
  }

  // one number of the world outside: a label, the rolling value, a bar and the change
  private drawStat(
    ctx: CanvasRenderingContext2D,
    x: number,
    top: number,
    width: number,
    sc: number,
    name: string,
    from: number,
    to: number,
    full: number,
    fmt: (n: number) => string,
    dir: 'up' | 'down',
  ): void {
    const t = this.t
    const k = this.roll
    const v = from + (to - from) * k
    const rolling = t >= BUILD_AT && !this.flashed
    label(ctx, name, x, top, Math.round(24 * sc), GLOW)

    let text = fmt(v)
    let color = ICE
    if (t < ABSORB) color = 'rgba(226, 245, 255, 0.55)'
    else if (t < BUILD_AT) {
      // the old figure glitches while the build comes apart
      const u = (t - ABSORB) / BREAK
      text = text.replace(/\d/g, (ch) => (Math.random() < u * 0.35 ? String(Math.floor(Math.random() * 10)) : ch))
      color = 'rgba(255, 45, 111, 0.7)'
    } else if (rolling) color = 'rgba(226, 245, 255, 0.85)'
    let size = Math.round(64 * sc)
    ctx.font = `italic 900 ${size}px ${DISPLAY}`
    const vw = ctx.measureText(fmt(Math.max(from, to))).width
    if (vw > width) size = Math.floor((size * width) / vw)
    const vy = top + 30 * sc + size * 0.6
    this.shout(ctx, text, x, vy, size, color, 'center')

    // a bar: price against the top of the scale, ownership against everyone
    const bw = width * 0.86
    const by = vy + size * 0.6 + 12 * sc
    const bh = Math.round(8 * sc)
    fill(ctx, 'rgba(150, 214, 255, 0.18)', x - bw / 2, by, bw, bh)
    const f = clamp(v / full, 0, 1)
    if (rolling || this.flashed) {
      // the ghost of where it was
      fill(ctx, 'rgba(150, 214, 255, 0.35)', x - bw / 2, by, bw * clamp(from / full, 0, 1), bh)
    }
    ctx.save()
    if (rolling) {
      ctx.shadowColor = ALERT
      ctx.shadowBlur = 12
    }
    fill(ctx, rolling || this.flashed ? ALERT : GLOW, x - bw / 2, by, Math.max(2, bw * f), bh)
    ctx.restore()

    // the change, once the build has started
    if (t >= BUILD_AT) {
      const ds = Math.round(26 * sc)
      const arrow = dir === 'up' ? '▲' : '▼'
      const delta =
        dir === 'up'
          ? `+${Math.round(((v - from) / from) * 100)}%`
          : `-${Math.round(from - v)} PTS`
      const was = `WAS ${fmt(from)}`
      const change = `${arrow} ${delta}`
      ctx.font = `${ds}px ${MONO}`
      const ww = ctx.measureText(`${was}   `).width
      const cw = ctx.measureText(change).width
      const ly = by + bh + 24 * sc
      if (ww + cw <= width) {
        const lx = x - (ww + cw) / 2
        label(ctx, was, lx, ly, ds, 'rgba(150, 214, 255, 0.7)', 'left')
        label(ctx, change, lx + ww, ly, ds, ALERT, 'left')
      } else {
        // too narrow for one line: stack the change under the old figure
        label(ctx, was, x, ly, ds, 'rgba(150, 214, 255, 0.7)')
        label(ctx, change, x, ly + ds * 1.1, ds, ALERT)
      }
    }
  }

  private drawStage(ctx: CanvasRenderingContext2D, cx: number, cy: number, box: number, W: number, H: number): void {
    const t = this.t
    const cell = (box * 0.68) / 32
    const sprite = cell * 32

    // stage frame and grid
    brackets(ctx, 'rgba(150, 214, 255, 0.55)', cx - box / 2, cy - box / 2, box, box, 30, 2)
    ctx.globalAlpha = 0.07
    for (let i = 1; i < 10; i++) {
      fill(ctx, GLOW, cx - box / 2 + (box / 10) * i, cy - box / 2, 1, box)
      fill(ctx, GLOW, cx - box / 2, cy - box / 2 + (box / 10) * i, box, 1)
    }
    ctx.globalAlpha = 1

    // a halo that swells as it eats, and burns hottest after the flash
    const swell = t < ABSORB ? t / ABSORB : t < FLASH_AT ? 0.5 : 1
    const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, box * (0.35 + swell * 0.3))
    halo.addColorStop(0, `rgba(150, 214, 255, ${0.12 + swell * 0.18})`)
    halo.addColorStop(1, 'rgba(150, 214, 255, 0)')
    ctx.fillStyle = halo
    ctx.fillRect(cx - box, cy - box, box * 2, box * 2)

    if (t < ABSORB) {
      this.drawSticks(ctx, cx, cy, sprite, W, H)
      // the old build gorges and swells
      const art = pacFrameOf(this.from, t * (10 + t * 8))
      if (art) {
        const pulse = 1 + (t / ABSORB) * 0.18 + Math.sin(t * 30) * 0.02 * (t / ABSORB)
        ctx.save()
        ctx.shadowColor = ICE
        ctx.shadowBlur = 10 + (t / ABSORB) * 40
        drawFacing(ctx, art, cx, cy, sprite * pulse, 'right', 'right')
        ctx.restore()
        // going white-hot just before it bursts
        const hot = clamp((t - (ABSORB - 0.4)) / 0.4, 0, 1)
        if (hot > 0) {
          ctx.save()
          ctx.globalAlpha = hot * 0.8
          ctx.globalCompositeOperation = 'lighter'
          drawFacing(ctx, art, cx, cy, sprite * pulse, 'right', 'right')
          ctx.restore()
        }
      }
      return
    }

    // burst ring at the moment it breaks
    if (t < ABSORB + 0.6) this.ring(ctx, cx, cy, (t - ABSORB) / 0.6, box * 0.75, ICE, 6)

    // debris: the old build's pixels, still swirling until picked up
    if (this.old) {
      ctx.globalAlpha = 1
      for (const [i, p] of this.old.entries()) {
        if (t >= this.taken[i]!) continue
        const [x, y] = this.debris(p, t)
        // pixels nobody needs fade away during the build
        const fade = this.taken[i] === Infinity ? 1 - clamp((t - BUILD_AT) / BUILD, 0, 1) : 1
        const flick = t < BUILD_AT && Math.random() < 0.08 ? 0.3 : 1
        ctx.globalAlpha = fade * flick * (t < BUILD_AT ? 1 : 0.8)
        const s = cell * (t < BUILD_AT ? 1 : 0.8)
        fill(ctx, p.color, cx + x * cell - s / 2, cy + y * cell - s / 2, s, s)
      }
      ctx.globalAlpha = 1
    }

    if (t < BUILD_AT) return

    // the new build, pixel by pixel, flying in from the debris as the beam passes
    if (this.next && this.old && !this.flashed) {
      const n = this.old.length
      for (const [j, p] of this.next.entries()) {
        const at = this.startOf(p)
        if (t < at) continue
        const u = ease((t - at) / FLY)
        const src = this.old[j % n]!
        const [sx, sy] = this.debris(src, t)
        const x = sx + (p.hx - sx) * u
        const y = sy + (p.hy - sy) * u
        const landed = u >= 1
        const s = landed ? cell : cell * 0.8
        // a white blink as each pixel lands
        const blink = clamp((t - at - FLY) / 0.12, 0, 1)
        fill(ctx, landed && blink < 1 ? ICE_HOT : p.color, cx + x * cell - s / 2, cy + y * cell - s / 2, s, s)
      }
    }

    if (!this.flashed) {
      // the scan beam
      const k = clamp((t - BUILD_AT) / BUILD, 0, 1)
      const y = cy - sprite / 2 - cell * 2 + k * (sprite + cell * 4)
      const bw = box * 1.05
      ctx.save()
      const trail = ctx.createLinearGradient(0, y - box * 0.22, 0, y)
      trail.addColorStop(0, 'rgba(255, 45, 111, 0)')
      trail.addColorStop(1, 'rgba(255, 45, 111, 0.28)')
      ctx.fillStyle = trail
      ctx.fillRect(cx - bw / 2, y - box * 0.22, bw, box * 0.22)
      ctx.shadowColor = ALERT
      ctx.shadowBlur = 30
      fill(ctx, ALERT, cx - bw / 2, y - 3, bw, 6)
      ctx.shadowBlur = 0
      fill(ctx, ICE_HOT, cx - bw / 2, y - 1, bw, 2)
      // emitters on both ends
      fill(ctx, ICE_HOT, cx - bw / 2 - 10, y - 8, 8, 16)
      fill(ctx, ICE_HOT, cx + bw / 2 + 2, y - 8, 8, 16)
      ctx.restore()
      return
    }

    // after the flash: shockwaves, sparks and the finished build chomping
    const since = t - FLASH_AT
    this.ring(ctx, cx, cy, since / 0.9, Math.max(W, H) * 0.6, ICE, 10)
    this.ring(ctx, cx, cy, (since - 0.12) / 1.1, Math.max(W, H) * 0.5, ALERT, 5)
    this.ring(ctx, cx, cy, (since - 0.3) / 1.2, box * 0.7, GLOW, 3)
    if (since < 1.4) {
      const u = out(since / 1.4)
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      for (const s of this.sparks) {
        const r = sprite * 0.4 + u * s.v * box * 0.75
        ctx.globalAlpha = 1 - u
        const size = s.size * (1 - u * 0.6)
        fill(ctx, s.hot ? ALERT : ICE, cx + Math.cos(s.a) * r - size / 2, cy + Math.sin(s.a) * r - size / 2, size, size)
      }
      ctx.restore()
    }
    const art = pacFrameOf(this.to, t * 9)
    if (art) {
      const pop = 1 + 0.3 * Math.max(0, 1 - since / 0.3) - 0.04 * Math.sin(Math.min(1, since / 0.6) * Math.PI)
      ctx.save()
      ctx.shadowColor = this.to >= 2 ? ALERT : GLOW
      ctx.shadowBlur = 30 + Math.sin(t * 4) * 10
      drawFacing(ctx, art, cx, cy, sprite * pop, 'right', 'right')
      ctx.restore()
    }
  }

  private ring(ctx: CanvasRenderingContext2D, cx: number, cy: number, u: number, reach: number, color: string, width: number): void {
    if (u <= 0 || u >= 1) return
    const e = out(u)
    ctx.save()
    ctx.globalAlpha = 1 - u
    ctx.strokeStyle = color
    ctx.lineWidth = width * (1 - u * 0.6)
    ctx.shadowColor = color
    ctx.shadowBlur = 20
    ctx.beginPath()
    ctx.arc(cx, cy, 20 + e * reach, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }

  private drawSticks(ctx: CanvasRenderingContext2D, cx: number, cy: number, sprite: number, W: number, H: number): void {
    const t = this.t
    const art = iceStick()
    const R = Math.hypot(W, H) * 0.55
    ctx.save()
    ctx.imageSmoothingEnabled = false
    for (const s of this.sticks) {
      const u = (t - s.at) / s.dur
      if (u <= 0 || u >= 1) continue
      // accelerate into the core, curving a little
      const e = u * u
      const a = s.a + s.wob * e
      const r = R * (1 - e) + sprite * 0.2
      const x = cx + Math.cos(a) * r
      const y = cy + Math.sin(a) * r
      const back = clamp(u - 0.18, 0, 1)
      const rb = R * (1 - back * back) + sprite * 0.2
      const ab = s.a + s.wob * back * back
      // streak behind it
      ctx.globalAlpha = 0.35
      ctx.strokeStyle = ICE
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(cx + Math.cos(ab) * rb, cy + Math.sin(ab) * rb)
      ctx.lineTo(x, y)
      ctx.stroke()
      ctx.globalAlpha = Math.min(1, u * 4)
      const k = s.size * (1 - e * 0.6)
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(a + Math.PI / 2)
      ctx.drawImage(art, (-11 * k), (-6 * k), 22 * k, 12 * k)
      ctx.restore()
    }
    ctx.restore()
  }
}
