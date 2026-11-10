// Between boards the camera leaves the company and looks at what it costs
// everyone else. A laptop sits in the middle of the screen with its price tag.
// Infinite Labs (small, off to the side, parked in front of its datacenter)
// pulls the RAM out of it stick by stick. Every stick it eats rolls the price
// up, the year forward, and greys out another person in the row of people who
// still own one. Then a stamp slams down on the laptop. The screen holds until
// the player presses CONTINUE: nothing here advances on its own.

import { ALERT, GLOW, ICE, ICE_HOT, VOID, theme } from './palette'
import { DISPLAY, MONO, clamp, fill, label } from './render'
import { frameFor } from './scenes'
import { button, drawBackdrop, hit, wrap, type Frame, type Hit, type View } from './screen'
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

// what lands on the laptop at the end of each transition, and what its screen says
const STAMPS: Record<number, { stamp: string; screen: string }> = {
  1: { stamp: 'PRICE HIKE', screen: 'LOW MEMORY' },
  2: { stamp: 'SOLD OUT', screen: 'BACKORDERED' },
  3: { stamp: 'RENT ONLY', screen: '' },
}

function money(n: number): string {
  return '$' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

interface Hooks {
  build(): void
  glitch(): void
  done(): void
}

// pacing, in seconds
const PULL_AT = 0.8
export const STICKS = 6
const PULL_GAP = 0.36
const RISE = 0.32
const FLY = 0.55
const STAMP_AT = PULL_AT + (STICKS - 1) * PULL_GAP + RISE + FLY + 0.25
const TYPE_AT = STAMP_AT + 0.35
const TYPE_RATE = 46
const READY = 5.0

// the row of people
const PEOPLE = 20

// laptop art, in art units: lid 60 wide, base flares to 72, 54 tall in all
export const LAP_W = 72
export const LAP_H = 54
const LID_X = 6
const LID_W = 60
const LID_H = 40
const SCR_X = 9
const SCR_Y = 3
const SCR_W = 54
const SCR_H = 33
const KEY_ROWS = [43, 45, 47, 49]

function ease(t: number): number {
  const u = clamp(t, 0, 1)
  return u * u * (3 - 2 * u)
}

function out(t: number): number {
  const u = clamp(t, 0, 1)
  return 1 - (1 - u) * (1 - u) * (1 - u)
}

// half width of the keyboard deck at art row y (the base flares toward the front)
function deckHalf(y: number): number {
  return 31 + ((y - LID_H) / (LAP_H - 1 - LID_H)) * 5
}

// key slots on one keyboard row: x of each 3-wide key
function keysOn(y: number): number[] {
  const half = deckHalf(y)
  const span = Math.floor((half - 5) * 2)
  const count = Math.floor((span + 1) / 4)
  const left = Math.round(LAP_W / 2 - (count * 4 - 1) / 2)
  return Array.from({ length: count }, (_, i) => left + i * 4)
}

// which keys the sticks are torn out of, spread across the keyboard
const TORN: Array<[number, number]> = [
  [1, 3],
  [0, 9],
  [2, 6],
  [1, 12],
  [3, 2],
  [2, 10],
]

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

interface Layout {
  portrait: boolean
  W: number
  H: number
  // laptop: centre and art-unit scale
  lx: number
  ly: number
  u: number
  // price tag: where it hangs, where the string ties on, and its size
  tag: { x: number; y: number; w: number; h: number; tieX: number; tieY: number }
  // the company and its datacenter
  pac: { x: number; y: number; size: number }
  year: { y: number; size: number }
  people: { y: number; cols: number; q: number; pitch: number; rowGap: number }
  caption: { y: number; size: number }
  cont: { y: number; w: number; h: number; size: number }
  head: number
  stick: number
}

function layoutOf(portrait: boolean): Layout {
  if (portrait) {
    const W = 800
    const u = 9.4
    const ly = 410 + (LAP_H * u) / 2
    return {
      portrait,
      W,
      H: 1700,
      lx: W / 2,
      ly,
      u,
      tag: { x: W / 2, y: ly + (LAP_H * u) / 2 + 90, w: 340, h: 124, tieX: W / 2, tieY: ly + (LAP_H * u) / 2 - 2 },
      pac: { x: 470, y: 292, size: 84 },
      year: { y: 150, size: 104 },
      people: { y: 1215, cols: 10, q: 6, pitch: 66, rowGap: 96 },
      caption: { y: 1440, size: 38 },
      cont: { y: 1515, w: 520, h: 100, size: 44 },
      head: 32,
      stick: 3.2,
    }
  }
  const W = 1240
  const u = 6.3
  const lx = 630
  const ly = 146 + (LAP_H * u) / 2
  return {
    portrait,
    W,
    H: 800,
    lx,
    ly,
    u,
    tag: { x: 230, y: 300, w: 250, h: 104, tieX: lx - (LID_W * u) / 2 + 2, tieY: ly - (LAP_H * u) / 2 + 6 },
    pac: { x: 1050, y: 270, size: 92 },
    year: { y: 96, size: 62 },
    people: { y: 585, cols: 20, q: 4.2, pitch: 38, rowGap: 0 },
    caption: { y: 657, size: 30 },
    cont: { y: 690, w: 380, h: 66, size: 30 },
    head: 24,
    stick: 2.2,
  }
}

// what the laptop looks like at one moment: the clock, how far the world has
// moved (0..1), which era it is going from and to, whether the pull has
// started and the stamp has landed, when each stick is torn out, and how hard
// it jolts right now (0..1)
export interface LaptopState {
  t: number
  k: number
  from: number
  to: number
  started: boolean
  stamped: boolean
  pulls: readonly number[]
  jolt: number
}

// the laptop, centred on (lx, ly), one art unit = u pixels
export function drawLaptop(ctx: CanvasRenderingContext2D, lx: number, ly: number, u: number, s: LaptopState): void {
  const t = s.t
  const ox = lx - (LAP_W * u) / 2
  const oy = ly - (LAP_H * u) / 2
  ctx.save()
  ctx.translate(ox, oy + s.jolt * u * 0.8)
  ctx.scale(u, u)
  const px = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c
    ctx.fillRect(x, y, w, h)
  }
  const out3 = s.to >= 3 && s.stamped

  // lid
  ctx.save()
  ctx.shadowColor = out3 ? 'rgba(255, 45, 111, 0.4)' : GLOW
  ctx.shadowBlur = 24
  px(LID_X, 0, LID_W, LID_H, '#9fc9e6')
  ctx.restore()
  px(LID_X + 1, 1, LID_W - 2, LID_H - 1, '#0a1c2e')
  px(LID_X + 1, 1, LID_W - 2, 1, '#163a5a')
  px(LAP_W / 2 - 1, 1, 2, 1, out3 ? ALERT : '#2c5878')
  drawScreen(ctx, px, s)

  // hinge
  px(LID_X + 2, LID_H - 1, LID_W - 4, 1, '#06111d')
  // deck, flaring toward the front
  for (let y = LID_H; y < LAP_H; y++) {
    const half = Math.round(deckHalf(y))
    const x0 = LAP_W / 2 - half
    const front = y === LAP_H - 1
    px(x0, y, half * 2, 1, front ? '#9fc9e6' : y === LID_H ? '#0f2a44' : '#163c5e')
    if (!front) {
      px(x0, y, 1, 1, '#9fc9e6')
      px(x0 + half * 2 - 1, y, 1, 1, '#9fc9e6')
    }
  }
  px(LAP_W / 2 - half0() + 1, LAP_H - 2, half0() * 2 - 2, 1, '#0c2a46')
  // keys
  const torn = new Map<string, number>()
  for (let i = 0; i < STICKS; i++) {
    const [row, idx] = TORN[i]!
    torn.set(`${row}:${idx}`, s.pulls[i] ?? Infinity)
  }
  for (const [row, y] of KEY_ROWS.entries()) {
    const keys = keysOn(y)
    for (const [i, kx] of keys.entries()) {
      const at = torn.get(`${row}:${Math.min(i, keys.length - 1)}`)
      if (at !== undefined && t >= at) {
        // a hole where the memory was, glowing hot for a moment
        const hot = clamp(1 - (t - at) / 0.6, 0, 1)
        px(kx - 1, y, 5, 1, hot > 0 ? ALERT : '#3a0d1e')
        px(kx, y, 3, 1, VOID)
        if (hot > 0) {
          ctx.globalAlpha = hot
          px(kx, y, 3, 1, ICE_HOT)
          ctx.globalAlpha = 1
        }
      } else px(kx, y, 3, 1, row === 3 && i > 2 && i < keys.length - 3 ? '#2a5576' : '#4d7fa3')
    }
  }
  // trackpad
  px(LAP_W / 2 - 7, 51, 14, 1, '#24496a')
  ctx.restore()

  function half0(): number {
    return Math.round(deckHalf(LAP_H - 2))
  }
}

// what the laptop shows: a desktop that glitches as it loses its memory,
// then the verdict for this year
function drawScreen(ctx: CanvasRenderingContext2D, px: (x: number, y: number, w: number, h: number, c: string) => void, s: LaptopState): void {
  const { t, k } = s
  const X = SCR_X
  const Y = SCR_Y
  const off = s.to >= 3 && s.stamped
  // brightness falls era by era
  const era = s.stamped ? s.to : s.from
  const dim = [1, 0.85, 0.6, 0.15][Math.min(3, era)]!

  if (off) {
    // powered down: dark glass, a faint reflection and a lock
    px(X, Y, SCR_W, SCR_H, '#03070d')
    ctx.globalAlpha = 0.08
    for (let i = 0; i < 12; i++) px(X + 30 + i, Y + i, 3, 1, ICE)
    ctx.globalAlpha = 1
    const lx = X + SCR_W / 2 - 5
    const ly = Y + 9
    const lock = ALERT
    // shackle
    px(lx + 2, ly, 6, 1, lock)
    px(lx + 1, ly + 1, 1, 4, lock)
    px(lx + 8, ly + 1, 1, 4, lock)
    // body
    px(lx, ly + 5, 10, 8, lock)
    px(lx + 4, ly + 7, 2, 2, '#03070d')
    px(lx + 4, ly + 9, 2, 2, '#03070d')
    return
  }

  // wallpaper
  ctx.globalAlpha = dim
  px(X, Y, SCR_W, SCR_H, '#0f3d63')
  px(X, Y + 18, SCR_W, SCR_H - 18, '#0b2e4c')
  for (let i = 0; i < 4; i++) px(X, Y + 20 + i * 3, SCR_W, 1, 'rgba(150, 214, 255, 0.18)')
  // a sun on the horizon
  px(X + 38, Y + 12, 8, 1, '#ff7aa6')
  px(X + 37, Y + 13, 10, 2, '#ff5d8f')
  px(X + 36, Y + 15, 12, 3, '#ff2d6f')
  // desktop icons
  for (let i = 0; i < 3; i++) px(X + 2, Y + 3 + i * 6, 4, 4, i === 0 ? '#ffd66b' : '#9fd4ff')
  // a window
  px(X + 9, Y + 4, 26, 17, '#dff4ff')
  px(X + 9, Y + 4, 26, 2, '#4d9fdc')
  px(X + 31, Y + 4, 2, 2, ALERT)
  px(X + 10, Y + 6, 24, 14, '#f5fbff')
  const lines = [18, 12, 20, 9, 15]
  for (const [i, w] of lines.entries()) px(X + 12, Y + 8 + i * 2, w, 1, '#7aa6c6')
  // taskbar and a clock
  px(X, Y + SCR_H - 3, SCR_W, 3, '#08192a')
  px(X + 1, Y + SCR_H - 2, 3, 1, ICE)
  px(X + SCR_W - 7, Y + SCR_H - 2, 5, 1, GLOW)
  // the cursor, drifting
  const cx = Math.round(X + 40 + Math.sin(t * 1.3) * 4)
  const cy = Math.round(Y + 22 + Math.cos(t * 1.7) * 2)
  px(cx, cy, 1, 4, '#ffffff')
  px(cx + 1, cy + 1, 1, 2, '#ffffff')
  px(cx + 2, cy + 2, 1, 1, '#ffffff')
  ctx.globalAlpha = 1

  // tearing while the memory is pulled
  if (s.started && !s.stamped) {
    const n = Math.floor(2 + k * 8)
    for (let i = 0; i < n; i++) {
      if (Math.random() < 0.5) continue
      const gy = Y + Math.floor(Math.random() * SCR_H)
      const gx = X + Math.floor(Math.random() * 20)
      px(gx, gy, Math.min(SCR_W - (gx - X), 6 + Math.floor(Math.random() * 30)), 1, Math.random() < 0.5 ? ALERT : '#9fd4ff')
    }
  }

  // a warning dialog: low memory while it goes, the verdict after
  const verdict = STAMPS[s.to]?.screen ?? ''
  const showWarn = (s.started && k > 0.25) || s.stamped
  if (showWarn && verdict) {
    const blink = s.stamped || Math.floor(t * 4) % 2 === 0
    if (blink) {
      px(X + 7, Y + 4, 40, 14, ALERT)
      px(X + 8, Y + 5, 38, 12, '#2a0612')
      px(X + 8, Y + 5, 38, 2, ALERT)
      px(X + 9, Y + 5, 1, 2, '#ffd6e2')
      const text = s.stamped ? verdict : 'LOW MEMORY'
      ctx.save()
      ctx.font = `8px ${MONO}`
      const tw = ctx.measureText(text).width
      if (tw > 34) ctx.font = `${(8 * 34) / tw}px ${MONO}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#ffd6e2'
      ctx.fillText(text, X + 27, Y + 12)
      ctx.restore()
    }
  }
  // the screen fades out on the last, ahead of the lock
  if (!s.stamped && s.to >= 3 && k > 0.6) {
    ctx.globalAlpha = clamp((k - 0.6) / 0.4, 0, 1) * 0.8
    px(X, Y, SCR_W, SCR_H, '#000000')
    ctx.globalAlpha = 1
  }
}

// where a price tag hangs: its centre and size, and where its string ties on
// to the laptop. Portrait tags hang below with the hole on top; landscape
// tags hang to the side with the hole on the right.
export interface TagPlace {
  x: number
  y: number
  w: number
  h: number
  tieX: number
  tieY: number
  portrait: boolean
}

// what a price tag says and how it looks right now
export interface TagState {
  title: string
  price: string
  line: string
  bg: string
  ink: string
  glow: string
  // a stronger glow once prices are moving
  hot: boolean
  // swing of the spring, and the 0..1 bump of the last price jump
  swing: number
  bump: number
  // the widest price the tag has to fit (defaults to $9,999)
  widest?: string
}

// the price tag on its string
export function drawPriceTag(ctx: CanvasRenderingContext2D, g: TagPlace, s: TagState): void {
  const { x, y, w, h, tieX, tieY, portrait } = g
  // string
  ctx.save()
  ctx.strokeStyle = 'rgba(226, 245, 255, 0.75)'
  ctx.lineWidth = 2
  ctx.beginPath()
  const holeX = portrait ? x : x + w / 2 - 22
  const holeY = portrait ? y - h / 2 + 12 : y
  ctx.moveTo(tieX, tieY)
  ctx.quadraticCurveTo((tieX + holeX) / 2, Math.max(tieY, holeY) + 30, holeX, holeY)
  ctx.stroke()
  ctx.restore()

  ctx.save()
  ctx.translate(holeX, holeY)
  ctx.rotate(s.swing * 0.05 + (portrait ? 0.03 : -0.06))
  ctx.translate(-holeX, -holeY)
  const left = x - w / 2
  const top = y - h / 2
  const notch = h * 0.32
  // tag body, notched on the string end
  ctx.beginPath()
  if (portrait) {
    ctx.moveTo(left, top + notch)
    ctx.lineTo(x - notch, top)
    ctx.lineTo(x + notch, top)
    ctx.lineTo(left + w, top + notch)
    ctx.lineTo(left + w, top + h)
    ctx.lineTo(left, top + h)
  } else {
    ctx.moveTo(left, top)
    ctx.lineTo(left + w - notch, top)
    ctx.lineTo(left + w, y - notch)
    ctx.lineTo(left + w, y + notch)
    ctx.lineTo(left + w - notch, top + h)
    ctx.lineTo(left, top + h)
  }
  ctx.closePath()
  ctx.save()
  ctx.shadowColor = s.glow
  ctx.shadowBlur = s.hot ? 26 : 14
  ctx.fillStyle = s.bg
  ctx.fill()
  ctx.restore()
  ctx.strokeStyle = ICE_HOT
  ctx.lineWidth = 2
  ctx.stroke()
  // the hole
  ctx.fillStyle = VOID
  ctx.beginPath()
  ctx.arc(holeX, holeY, 6, 0, Math.PI * 2)
  ctx.fill()

  // content, centred on the body away from the hole
  const cx = portrait ? x : left + (w - notch) / 2
  const cy = portrait ? y + 16 : y
  const small = Math.round(h * 0.18)
  label(ctx, s.title, cx, cy - h * 0.3, small, s.ink)
  let size = Math.round(h * 0.42)
  ctx.font = `italic 900 ${size}px ${DISPLAY}`
  const pw = ctx.measureText(s.widest ?? money(9999)).width
  const room = (portrait ? w : w - notch) - 24
  if (pw > room) size = Math.floor((size * room) / pw)
  ctx.save()
  ctx.translate(cx, cy + h * (portrait ? -0.05 : 0.03))
  ctx.scale(1 + s.bump * 0.18, 1 + s.bump * 0.18)
  ctx.font = `italic 900 ${size}px ${DISPLAY}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = s.ink
  ctx.fillText(s.price, 0, 0)
  ctx.restore()
  // was / change line
  ctx.font = `${small}px ${MONO}`
  const lw = ctx.measureText(s.line).width
  label(ctx, s.line, cx, cy + h * (portrait ? 0.27 : 0.33), lw > room ? Math.floor((small * room) / lw) : small, s.ink)
  ctx.restore()
}

// a stamp slammed down at (cx, cy), `since` seconds after it was let go
export function drawStamp(ctx: CanvasRenderingContext2D, stamp: string, cx: number, cy: number, size: number, since: number, color = ALERT): void {
  const u = clamp(since / 0.12, 0, 1)
  const scale = 2.6 - 1.6 * u * u
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(-0.16)
  ctx.scale(scale, scale)
  ctx.globalAlpha *= 0.3 + 0.7 * u
  ctx.font = `italic 900 ${size}px ${DISPLAY}`
  const tw = ctx.measureText(stamp).width
  const bw = tw + size * 0.9
  const bh = size * 1.5
  ctx.fillStyle = 'rgba(20, 2, 8, 0.82)'
  ctx.fillRect(-bw / 2, -bh / 2, bw, bh)
  ctx.strokeStyle = color
  ctx.lineWidth = size * 0.09
  ctx.shadowColor = color
  ctx.shadowBlur = 24
  ctx.strokeRect(-bw / 2, -bh / 2, bw, bh)
  ctx.lineWidth = size * 0.04
  ctx.strokeRect(-bw / 2 + size * 0.14, -bh / 2 + size * 0.14, bw - size * 0.28, bh - size * 0.28)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = color
  ctx.fillText(stamp, 0, size * 0.04)
  ctx.restore()
}

// one of the people, standing on (x, y) with pixel size q: holding a little
// laptop if they still own one, flashing as it is taken away
export function drawFigure(ctx: CanvasRenderingContext2D, x: number, y: number, q: number, owns: boolean, flash: number, phase: number): void {
  const body = flash > 0 ? ALERT : owns ? ICE : 'rgba(150, 214, 255, 0.22)'
  const px = (dx: number, dy: number, w: number, h: number, c: string) => fill(ctx, c, x + (dx - 3) * q, y + (dy - 7) * q, w * q, h * q)
  // head, body, arms, legs
  px(2, 0, 3, 3, body)
  px(1, 4, 5, 5, body)
  px(0, 5, 1, 3, body)
  px(6, 5, 1, 3, body)
  px(1, 9, 2, 4, body)
  px(4, 9, 2, 4, body)
  if (owns) {
    // a little open laptop held in front, its screen glowing
    const bob = Math.sin(phase * 2) > 0.92 ? 1 : 0
    px(1, 5 - bob, 5, 3, GLOW)
    px(2, 6 - bob, 3, 1, ICE_HOT)
    px(0, 8 - bob, 7, 1, '#4d7fa3')
  } else if (flash > 0) {
    // the laptop leaving their hands
    ctx.globalAlpha = flash
    px(1, 5 - (1 - flash) * 8, 5, 3, ALERT)
    ctx.globalAlpha = 1
  }
}

export class Upgrade {
  t = 0
  glitch = 0
  private started = false
  private stamped = false
  // swing of the price tag, kicked each time a stick lands
  private swing = 0
  private swingV = 0
  private landed = 0

  constructor(
    readonly from: number,
    readonly to: number,
    private hooks: Hooks,
  ) {}

  get canContinue(): boolean {
    return this.t > READY
  }

  // the screen never leaves on its own: main finishes it on CONTINUE or SKIP
  get finished(): boolean {
    return false
  }

  update(dt: number): void {
    this.t += dt
    this.glitch = Math.max(0, this.glitch - dt * 2.5)
    if (!this.started && this.t > PULL_AT) {
      this.started = true
      this.hooks.build()
    }
    const landed = Array.from({ length: STICKS }, (_, i) => this.landAt(i)).filter((at) => this.t >= at).length
    if (landed > this.landed) {
      this.landed = landed
      this.swingV += 3.2 * (landed % 2 ? 1 : -1)
      this.glitch = Math.max(this.glitch, 0.25)
    }
    // a damped spring for the tag
    this.swingV += (-this.swing * 60 - this.swingV * 5) * dt
    this.swing += this.swingV * dt
    if (!this.stamped && this.t > STAMP_AT) {
      this.stamped = true
      this.glitch = 1
      this.hooks.glitch()
      this.hooks.done()
      this.swingV += 4
    }
  }

  private pullAt(i: number): number {
    return PULL_AT + i * PULL_GAP
  }

  private landAt(i: number): number {
    return this.pullAt(i) + RISE + FLY
  }

  // how far the world has moved, 0..1: a step for every stick that lands
  private get progress(): number {
    return this.progressAt(this.t)
  }

  private progressAt(t: number): number {
    let k = 0
    for (let i = 0; i < STICKS; i++) k += ease((t - this.landAt(i)) / 0.3)
    return k / STICKS
  }

  draw(ctx: CanvasRenderingContext2D, view: View): Hit[] {
    ctx.save()
    fill(ctx, '#000000', 0, 0, view.width, view.height)
    drawBackdrop(ctx, view, theme(this.to >= 3, Math.min(2, this.to)))
    const portrait = view.width < view.height * 1.05
    const L = layoutOf(portrait)
    const frame = frameFor(ctx, view, L.W, L.H)
    const t = this.t
    const k = this.progress

    this.drawHeader(ctx, L)
    this.drawYear(ctx, L)

    // shake when the stamp lands
    const slam = this.stamped ? Math.max(0, 1 - (t - STAMP_AT - 0.12) / 0.4) : 0
    const shake = t > STAMP_AT + 0.12 ? slam * 14 : 0
    ctx.save()
    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake)
    this.drawSpotlight(ctx, L)
    this.drawDatacenter(ctx, L)
    this.drawLaptop(ctx, L, k)
    this.drawTag(ctx, L, k)
    this.drawSticks(ctx, L)
    this.drawStamp(ctx, L)
    ctx.restore()

    this.drawPeople(ctx, L, k)
    this.drawCaption(ctx, L)
    this.drawControls(ctx, L, frame, view)

    // a short white flash as the stamp lands, over the whole canvas
    const flash = this.stamped ? Math.max(0, 1 - (t - STAMP_AT - 0.1) / 0.35) : 0
    if (flash > 0 && t > STAMP_AT + 0.1) {
      ctx.globalAlpha = flash * flash * 0.45
      fill(ctx, ICE_HOT, -frame.ox / frame.s, -frame.oy / frame.s, view.width / frame.s, view.height / frame.s)
      ctx.globalAlpha = 1
    }
    ctx.restore()
    return frame.hits
  }

  private drawHeader(ctx: CanvasRenderingContext2D, L: Layout): void {
    const t = this.t
    const y = L.portrait ? 50 : 38
    const status = t < PULL_AT ? 'MARKET REPORT' : !this.stamped ? 'BUYING UP ALL THE RAM' : 'SUPPLY SECURED'
    ctx.font = `${L.head}px ${MONO}`
    const full = ctx.measureText(`INFINITE LABS // ${status}`).width
    const hs = full > L.W - 80 ? Math.floor((L.head * (L.W - 80)) / full) : L.head
    label(ctx, 'INFINITE LABS //', 40, y, hs, GLOW, 'left')
    ctx.font = `${hs}px ${MONO}`
    label(ctx, status, 40 + ctx.measureText('INFINITE LABS // ').width, y, hs, this.stamped ? ICE : ALERT, 'left')
    fill(ctx, 'rgba(150, 214, 255, 0.25)', 40, y + 22, L.W - 80, 1)
    fill(ctx, ICE, 40, y + 21, (L.W - 80) * clamp(t / READY, 0, 1), 3)
  }

  // big display text that pops and splits when the stamp lands
  private shout(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign): void {
    const t = this.t
    const since = t - STAMP_AT - 0.1
    const pop = this.stamped && since > 0 ? 1 + 0.3 * Math.max(0, 1 - since / 0.35) ** 2 : 1
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(pop, pop)
    ctx.font = `italic 900 ${size}px ${DISPLAY}`
    ctx.textAlign = align
    ctx.textBaseline = 'middle'
    if (this.stamped) {
      const split = 2 + 9 * Math.max(0, 1 - since / 0.8)
      ctx.globalAlpha = 0.7
      ctx.fillStyle = ALERT
      ctx.fillText(text, -split, 0)
      ctx.fillStyle = GLOW
      ctx.fillText(text, split, 0)
      ctx.globalAlpha = 1
      ctx.shadowColor = GLOW
      ctx.shadowBlur = 20
    }
    ctx.fillStyle = color
    ctx.fillText(text, 0, 0)
    ctx.restore()
  }

  // the year: the old one sits small, the new one scrambles in while the RAM goes
  private drawYear(ctx: CanvasRenderingContext2D, L: Layout): void {
    const t = this.t
    const from = TIMELINE[Math.min(this.from, TIMELINE.length - 1)]!.year
    const to = TIMELINE[Math.min(this.to, TIMELINE.length - 1)]!.year
    const rand = () => String(Math.floor(Math.random() * 10))
    let year = to
    let color = ICE
    if (t < PULL_AT) {
      year = from
      color = 'rgba(226, 245, 255, 0.5)'
    } else if (!this.stamped) {
      const k = clamp((t - PULL_AT) / (STAMP_AT - PULL_AT), 0, 1)
      year = to.replace(/./g, (ch, i: number) => ((i + 1) / (to.length + 1) < k ? ch : rand()))
      color = 'rgba(226, 245, 255, 0.8)'
    }
    let size = L.year.size
    const small = Math.round(size * 0.42)
    ctx.font = `${small}px ${MONO}`
    const prefix = `${from}  ▸  `
    const pw = ctx.measureText(prefix).width
    ctx.font = `italic 900 ${size}px ${DISPLAY}`
    const yw = ctx.measureText('2088').width
    const max = L.W - 120
    if (pw + yw > max) size = Math.floor((size * (max - pw)) / yw)
    const x = L.W / 2 - (pw + yw) / 2
    const y = L.year.y
    if (t >= PULL_AT) {
      ctx.font = `${small}px ${MONO}`
      const fw = ctx.measureText(from).width
      label(ctx, from, x, y, small, 'rgba(150, 214, 255, 0.7)', 'left')
      fill(ctx, 'rgba(255, 45, 111, 0.85)', x - 4, y - 1, (fw + 8) * clamp((t - PULL_AT) / 0.4, 0, 1), 3)
      label(ctx, '▸', x + ctx.measureText(`${from}  `).width, y, small, ALERT, 'left')
      this.shout(ctx, year, x + pw + yw / 2, y, size, color, 'center')
    } else this.shout(ctx, year, L.W / 2, y, size, color, 'center')
  }

  // a soft pool of light under the laptop: it is the thing on display
  private drawSpotlight(ctx: CanvasRenderingContext2D, L: Layout): void {
    const r = LAP_W * L.u * 0.85
    const dim = this.to >= 3 && this.stamped ? 0.6 : 1
    const g = ctx.createRadialGradient(L.lx, L.ly, 0, L.lx, L.ly, r)
    g.addColorStop(0, `rgba(150, 214, 255, ${0.16 * dim})`)
    g.addColorStop(1, 'rgba(150, 214, 255, 0)')
    ctx.fillStyle = g
    ctx.fillRect(L.lx - r, L.ly - r, r * 2, r * 2)
    // a floor line it stands on
    const fy = L.ly + (LAP_H * L.u) / 2 + 4
    const fw = LAP_W * L.u * 1.25
    const fg = ctx.createLinearGradient(L.lx - fw / 2, 0, L.lx + fw / 2, 0)
    fg.addColorStop(0, 'rgba(150, 214, 255, 0)')
    fg.addColorStop(0.5, 'rgba(150, 214, 255, 0.55)')
    fg.addColorStop(1, 'rgba(150, 214, 255, 0)')
    ctx.fillStyle = fg
    ctx.fillRect(L.lx - fw / 2, fy, fw, 2)
  }

  // the company, small, in front of the racks it fills with everyone's memory
  private drawDatacenter(ctx: CanvasRenderingContext2D, L: Layout): void {
    const t = this.t
    const { x, y, size } = L.pac
    // racks
    const rw = size * 0.62
    const rh = size * 1.55
    const base = y + size * 0.62
    for (let r = 0; r < 3; r++) {
      const rx = x - rw * 0.2 + (r - 0.5) * (rw + 6)
      const ry = base - rh + (r === 1 ? -size * 0.18 : 0)
      const h = base - ry
      fill(ctx, 'rgba(12, 42, 70, 0.75)', rx, ry, rw, h)
      ctx.strokeStyle = 'rgba(150, 214, 255, 0.45)'
      ctx.lineWidth = 1
      ctx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, h - 1)
      const units = Math.floor(h / 11)
      for (let i = 0; i < units; i++) {
        const uy = ry + 5 + i * 11
        fill(ctx, 'rgba(150, 214, 255, 0.16)', rx + 4, uy, rw - 8, 6)
        const on = (Math.floor(t * 6 + i * 3.7 + r * 5) % 5) < 2 + Math.min(3, this.landed / 2)
        fill(ctx, on ? (i % 3 === 0 ? ALERT : ICE) : 'rgba(150, 214, 255, 0.25)', rx + rw - 10, uy + 1, 4, 4)
      }
    }
    // the company, chomping while it eats
    const eating = this.started && t < STAMP_AT + 0.4
    const form = this.stamped ? this.to : this.from
    const art = pacFrameOf(form, eating ? t * 11 : 1)
    const since = t - STAMP_AT
    const grow = 1 + this.landed * 0.03 + (this.stamped ? 0.12 + 0.25 * Math.max(0, 1 - since / 0.3) : 0)
    if (art) {
      ctx.save()
      ctx.shadowColor = this.to >= 2 ? ALERT : GLOW
      ctx.shadowBlur = 18
      drawFacing(ctx, art, x - size * 0.55, y + size * 0.1, size * grow, 'left', 'right')
      ctx.restore()
    }
    if (this.stamped && since < 0.7) {
      const u = out(since / 0.7)
      ctx.save()
      ctx.globalAlpha = 1 - u
      ctx.strokeStyle = ICE
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(x - size * 0.55, y + size * 0.1, size * (0.4 + u * 0.9), 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }
    label(ctx, 'INFINITE LABS DATACENTER', x, base + (L.portrait ? 22 : 18), L.portrait ? 20 : 16, 'rgba(150, 214, 255, 0.7)')
  }

  // where a stick sits in the keyboard, in frame coordinates (its key's centre)
  private keyAt(L: Layout, i: number): [number, number] {
    const [row, idx] = TORN[i % TORN.length]!
    const y = KEY_ROWS[row]!
    const keys = keysOn(y)
    const kx = keys[Math.min(idx, keys.length - 1)]!
    const ox = L.lx - (LAP_W * L.u) / 2
    const oy = L.ly - (LAP_H * L.u) / 2
    return [ox + (kx + 1.5) * L.u, oy + (y + 0.5) * L.u]
  }

  private drawLaptop(ctx: CanvasRenderingContext2D, L: Layout, k: number): void {
    const t = this.t
    // jolt as each stick is torn out
    let jolt = 0
    for (let i = 0; i < STICKS; i++) {
      const d = t - this.pullAt(i)
      if (d > 0 && d < 0.15) jolt = Math.max(jolt, 1 - d / 0.15)
    }
    const pulls = Array.from({ length: STICKS }, (_, i) => this.pullAt(i))
    drawLaptop(ctx, L.lx, L.ly, L.u, { t, k, from: this.from, to: this.to, started: this.started, stamped: this.stamped, pulls, jolt })
  }

  // the price tag, tied to the laptop, swinging every time the price jumps
  private drawTag(ctx: CanvasRenderingContext2D, L: Layout, k: number): void {
    const t = this.t
    const was = TIMELINE[Math.min(this.from, TIMELINE.length - 1)]!.price
    const now = TIMELINE[Math.min(this.to, TIMELINE.length - 1)]!.price
    const v = was + (now - was) * k
    const hot = this.started
    // the price, bumping on every jump
    let bump = 0
    for (let i = 0; i < STICKS; i++) {
      const d = t - this.landAt(i)
      if (d > 0 && d < 0.25) bump = Math.max(bump, 1 - d / 0.25)
    }
    drawPriceTag(ctx, { ...L.tag, portrait: L.portrait }, {
      title: this.stamped && this.to >= 3 ? 'LAPTOP · TO OWN' : 'LAPTOP',
      price: money(v),
      line: this.started ? `WAS ${money(was)}  ▲ +${Math.round(((v - was) / was) * 100)}%` : 'IN STOCK',
      bg: hot ? (this.stamped ? ALERT : '#ffd6e2') : ICE,
      ink: hot && this.stamped ? ICE_HOT : VOID,
      glow: hot ? ALERT : GLOW,
      hot,
      swing: this.swing,
      bump,
    })
  }

  // sticks torn up out of the keyboard and thrown to the company
  private drawSticks(ctx: CanvasRenderingContext2D, L: Layout): void {
    const t = this.t
    const art = iceStick()
    const mouthX = L.pac.x - L.pac.size * 0.55
    const mouthY = L.pac.y + L.pac.size * 0.1
    const k = L.stick
    ctx.save()
    ctx.imageSmoothingEnabled = false
    for (let i = 0; i < STICKS; i++) {
      const at = this.pullAt(i)
      const d = t - at
      if (d < 0 || d > RISE + FLY) continue
      const [sx, sy] = this.keyAt(L, i)
      const lift = L.u * 9
      let x: number
      let y: number
      let rot = 0
      let scale = 1
      if (d < RISE) {
        // wrenched straight up out of the deck
        const e = out(d / RISE)
        x = sx + (Math.random() - 0.5) * 3 * (1 - e)
        y = sy - lift * e
        rot = Math.PI / 2
        scale = 0.6 + 0.4 * e
      } else {
        const e = ease((d - RISE) / FLY)
        const px0 = sx
        const py0 = sy - lift
        const cx = (px0 + mouthX) / 2
        const cy = Math.min(py0, mouthY) - (L.portrait ? 120 : 160)
        x = (1 - e) * (1 - e) * px0 + 2 * (1 - e) * e * cx + e * e * mouthX
        y = (1 - e) * (1 - e) * py0 + 2 * (1 - e) * e * cy + e * e * mouthY
        rot = Math.PI / 2 + e * Math.PI * 1.5
        scale = 1 - e * 0.45
        // a fading trail
        ctx.globalAlpha = 0.35
        ctx.strokeStyle = ICE
        ctx.lineWidth = 2
        ctx.beginPath()
        const e0 = Math.max(0, e - 0.18)
        ctx.moveTo((1 - e0) * (1 - e0) * px0 + 2 * (1 - e0) * e0 * cx + e0 * e0 * mouthX, (1 - e0) * (1 - e0) * py0 + 2 * (1 - e0) * e0 * cy + e0 * e0 * mouthY)
        ctx.quadraticCurveTo(x, y, x, y)
        ctx.stroke()
        ctx.globalAlpha = 1
      }
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(rot)
      ctx.shadowColor = ICE
      ctx.shadowBlur = 14
      ctx.drawImage(art, -11 * k * scale, -6 * k * scale, 22 * k * scale, 12 * k * scale)
      ctx.restore()
      // what each stick costs the laptop
      if (d < RISE + 0.5) {
        ctx.globalAlpha = clamp(1 - (d - RISE) / 0.5, 0, 1)
        label(ctx, '-8 GB', sx, sy - lift * 1.6 - d * 30, L.portrait ? 26 : 20, ALERT)
        ctx.globalAlpha = 1
      }
    }
    ctx.restore()
  }

  // the verdict stamped across the laptop
  private drawStamp(ctx: CanvasRenderingContext2D, L: Layout): void {
    if (!this.stamped) return
    const stamp = STAMPS[this.to]?.stamp
    if (!stamp) return
    drawStamp(ctx, stamp, L.lx, L.ly + L.u * 7, L.portrait ? 84 : 58, this.t - STAMP_AT)
  }

  // the people who still own one: twenty figures, each holding a little laptop
  private drawPeople(ctx: CanvasRenderingContext2D, L: Layout, k: number): void {
    const t = this.t
    const was = TIMELINE[Math.min(this.from, TIMELINE.length - 1)]!.own
    const now = TIMELINE[Math.min(this.to, TIMELINE.length - 1)]!.own
    const nFrom = Math.round(was / (100 / PEOPLE))
    const nTo = Math.round(now / (100 / PEOPLE))
    const { y, cols, q, pitch, rowGap } = L.people
    const rows = Math.ceil(PEOPLE / cols)
    const pct = Math.round(was + (now - was) * k)

    // heading: PEOPLE WHO OWN ONE  80% ▸ 74%
    const hs = L.portrait ? 30 : 22
    const head = 'PEOPLE WHO OWN A LAPTOP'
    ctx.font = `${hs}px ${MONO}`
    const big = Math.round(hs * 1.6)
    const hw = ctx.measureText(head + '   ').width
    ctx.font = `italic 900 ${big}px ${DISPLAY}`
    const nw = ctx.measureText('100%').width
    const hx = L.W / 2 - (hw + nw) / 2
    const hy = y - (L.portrait ? 62 : 44)
    label(ctx, head, hx, hy, hs, GLOW, 'left')
    ctx.save()
    ctx.font = `italic 900 ${big}px ${DISPLAY}`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = this.started ? ALERT : ICE
    ctx.fillText(`${pct}%`, hx + hw, hy)
    ctx.restore()

    const lost = Math.floor((nFrom - nTo) * k + 1e-6)
    const owners = nFrom - lost
    const total = (cols - 1) * pitch
    for (let i = 0; i < PEOPLE; i++) {
      const r = Math.floor(i / cols)
      const c = i % cols
      const fx = L.W / 2 - total / 2 + c * pitch
      const fy = y + r * rowGap - ((rows - 1) * rowGap) / 2 + (rows > 1 ? rowGap / 2 : 0)
      const owns = i < owners
      // the moment it is taken away
      let flash = 0
      if (i >= nTo && i < nFrom && owns === false) {
        // seconds since this one lost theirs
        const at = (nFrom - i) / (nFrom - nTo)
        let d = 0
        while (d < 0.5 && this.progressAt(t - d - 0.02) >= at - 1e-6) d += 0.02
        if (d < 0.5) flash = 1 - d / 0.5
      }
      drawFigure(ctx, fx, fy, q, owns, flash, t + i * 0.37)
    }
  }

  private drawCaption(ctx: CanvasRenderingContext2D, L: Layout): void {
    const line = UPGRADE_LINES[this.to]
    if (!line || this.t < TYPE_AT) return
    const t = this.t
    const shown = Math.max(0, Math.floor((t - TYPE_AT) * TYPE_RATE))
    const size = L.caption.size
    ctx.font = `${size}px ${MONO}`
    const lines = wrap(ctx, `> ${line.text}`, L.W - 120)
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width))
    let ly = L.caption.y - ((lines.length - 1) * size * 1.15) / 2
    let left = shown + 2
    for (const row of lines) {
      const part = row.slice(0, Math.max(0, left))
      left -= row.length + 1
      const cursor = left < 0 && left > -row.length - 1 && Math.floor(t * 3) % 2 === 0 ? '_' : ''
      label(ctx, part + cursor, L.W / 2 - widest / 2, ly, size, ICE, 'left')
      ly += size * 1.15
    }
  }

  private drawControls(ctx: CanvasRenderingContext2D, L: Layout, frame: Frame, view: View): void {
    const t = this.t
    const { y, w, h, size } = L.cont
    const x = L.W / 2 - w / 2
    if (!this.canContinue) {
      // small skip, out of the way
      const sw = L.portrait ? 190 : 140
      const sh = L.portrait ? 60 : 38
      button(ctx, frame, 'skip', 'SKIP ▸▸', L.W - 40 - sw, L.H - (L.portrait ? 40 : 18) - sh, sw, sh, 'rgba(150, 214, 255, 0.7)', L.portrait ? 20 : 13)
      return
    }
    // the big continue: fades in, then breathes until it is pressed
    const since = t - READY
    const appear = out(since / 0.35)
    const pulse = 0.5 + 0.5 * Math.sin(since * 5)
    const lit = view.hover === 'action' || view.held.has('action')
    ctx.save()
    ctx.globalAlpha = appear
    const grow = (1 - appear) * 0.2 + (lit ? 0.03 : 0)
    const gx = x - (w * grow) / 2
    const gy = y - (h * grow) / 2
    const gw = w * (1 + grow)
    const gh = h * (1 + grow)
    // outer pulse ring
    ctx.strokeStyle = ALERT
    ctx.lineWidth = 2
    ctx.globalAlpha = appear * (0.25 + 0.6 * pulse)
    const ring = 6 + pulse * 8
    ctx.strokeRect(gx - ring, gy - ring, gw + ring * 2, gh + ring * 2)
    ctx.globalAlpha = appear
    ctx.shadowColor = lit ? ICE_HOT : GLOW
    ctx.shadowBlur = 18 + pulse * 22
    fill(ctx, lit ? ICE_HOT : ICE, gx, gy, gw, gh)
    ctx.shadowBlur = 0
    fill(ctx, ALERT, gx, gy, 8, gh)
    ctx.font = `italic 900 ${size}px ${DISPLAY}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = VOID
    ctx.fillText('CONTINUE ▸', gx + gw / 2 + 4, gy + gh / 2 + 2)
    ctx.restore()
    hit(frame, 'action', x, y, w, h)
    // the hint under it
    const hs = L.portrait ? 26 : 18
    const blink = Math.floor(t * 2) % 2 === 0
    label(ctx, view.touch ? 'TAP CONTINUE' : 'PRESS ENTER', L.W / 2, y + h + (L.portrait ? 44 : 26), hs, blink ? ICE : 'rgba(150, 214, 255, 0.45)')
  }
}
