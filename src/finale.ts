// The finale. Every bit of RAM on the last board is taken, the resistance is
// beaten and the consumers have nothing left. Infinite Labs is still hungry,
// so it eats the market itself: the whole interface is frozen into one image
// and cut into chunks. The pac eats the maze, then the stock ticker and the
// rest of the screen, and finally reaches the glass. Behind the glass is the
// player's own computer, and its memory is next: cracking the glass hands
// over to the ending, where that computer gets its collection notice.

import { ALERT, ICE } from './palette'
import { MONO, fill, label } from './render'
import type { Layout } from './screen'
import type { Dir } from './sim'
import type { Bed } from './audio'
import { drawFacing, pacFrame } from './sprites'

const CHUNK = 20
const VEC: Record<Dir, [number, number]> = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }

export type FinalePhase = 'maze' | 'pause' | 'ui' | 'vacuum' | 'glass' | 'gone'

// How long the world holds still after the maze is gone, before the rest opens up.
const PAUSE = 4.2
// The glass: the pac comes to the middle, the line is read, it knocks, it breaks through.
const KNOCKS = [3.0, 3.8, 4.5]
const BREAK = 5.3
const GLASS_END = 6.6

// Captions, in story order. Short enough for one line on a phone held upright.
export const FINALE_LINES = {
  empty: 'there’s no more RAM to buy.',
  board: 'so we’ll take the board.',
  hungry: 'still hungry.',
  market: 'the market is ours now.',
  out: 'there’s still memory out there.',
  yours: 'in your computer.',
} as const
type LineKey = keyof typeof FINALE_LINES

interface Bit {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  color: string
}

interface Crack {
  pts: Array<[number, number]>
  width: number
}

interface Caption {
  text: string
  // an optional second line, shown in alert red once it is due
  more: string
  moreAt: number
  age: number
  life: number
}

export interface FinaleHooks {
  chomp(): void
  shatter(): void
  glitch(): void
  rumble(): void
  caption(): void
}

export class Finale {
  phase: FinalePhase = 'maze'
  t = 0
  phaseT = 0
  x: number
  y: number
  dir: Dir = 'left'
  size = 46
  gained = 0
  power = 1
  glitch = 0
  // true while the pac steers itself because the player is not steering it
  auto = false
  private remaining: HTMLCanvasElement
  private rctx: CanvasRenderingContext2D
  private cols: number
  private rows: number
  private ink: Uint8Array
  private eaten: Uint8Array
  private colors: string[]
  private inBoard: Uint8Array
  private boardInk = 0
  private boardEaten = 0
  private totalInk = 0
  private totalEaten = 0
  private bits: Bit[] = []
  private cracks: Crack[] = []
  private said = new Set<LineKey>()
  private caption: Caption | null = null
  private captionY = 0
  private rumbled = false
  private knocked = 0
  private shattered = false
  // input tracking for the auto-steer fallback
  private lastInput: Dir | null = null
  private idle = 0
  private stuck = 0
  private hungry = 0
  private target: number = -1
  private retarget = 0

  // The music each phase wants: a quiet pulse while eating the maze, silence
  // when the maze is gone and again at the glass, the full track in between.
  get bed(): Bed {
    if (this.phase === 'maze') return this.phaseT < 1.2 ? 'hush' : 'tense'
    if (this.phase === 'ui' || this.phase === 'vacuum') return 'finale'
    return 'hush'
  }

  // How hard the frozen interface shakes, 0 to 1.
  get tremor(): number {
    if (this.phase === 'pause') return Math.max(0, (this.phaseT - 2.4) / (PAUSE - 2.4)) ** 2
    if (this.phase === 'glass') {
      const since = KNOCKS.filter((k) => this.phaseT >= k).map((k) => this.phaseT - k)
      const last = since.length ? Math.min(...since) : 9
      return Math.max(0, 1 - last * 4) * (0.5 + since.length * 0.25)
    }
    return 0
  }

  get done(): boolean {
    return this.phase === 'gone'
  }

  get progress(): number {
    return this.totalInk ? this.totalEaten / this.totalInk : 1
  }

  constructor(
    snap: HTMLCanvasElement,
    readonly lay: Layout,
    private scale: number,
    start: { x: number; y: number },
    private hooks: FinaleHooks,
  ) {
    this.x = start.x
    this.y = start.y
    this.captionY = lay.H - 170
    this.remaining = document.createElement('canvas')
    this.remaining.width = snap.width
    this.remaining.height = snap.height
    this.rctx = this.remaining.getContext('2d', { willReadFrequently: true })!
    this.rctx.drawImage(snap, 0, 0)
    this.cols = Math.ceil(lay.W / CHUNK)
    this.rows = Math.ceil(lay.H / CHUNK)
    const n = this.cols * this.rows
    this.ink = new Uint8Array(n)
    this.eaten = new Uint8Array(n)
    this.inBoard = new Uint8Array(n)
    this.colors = new Array<string>(n).fill(ICE)
    const data = this.rctx.getImageData(0, 0, snap.width, snap.height).data
    const b = lay.board
    const span = CHUNK * scale
    const step = Math.max(1, Math.floor(span / 5))
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const i = r * this.cols + c
        const cx = c * CHUNK + CHUNK / 2
        const cy = r * CHUNK + CHUNK / 2
        this.inBoard[i] = cx > b.x && cx < b.x + b.size && cy > b.y && cy < b.y + b.size ? 1 : 0
        let sr = 0
        let sg = 0
        let sb = 0
        let lit = 0
        for (let yy = 0; yy < span; yy += step) {
          for (let xx = 0; xx < span; xx += step) {
            const px = Math.min(snap.width - 1, Math.floor(c * span + xx))
            const py = Math.min(snap.height - 1, Math.floor(r * span + yy))
            const k = (py * snap.width + px) * 4
            const lum = data[k]! + data[k + 1]! + data[k + 2]!
            if (lum > 90) {
              lit++
              sr += data[k]!
              sg += data[k + 1]!
              sb += data[k + 2]!
            }
          }
        }
        if (lit > 0) {
          this.ink[i] = 1
          this.colors[i] = `rgb(${Math.round(sr / lit)}, ${Math.round(sg / lit)}, ${Math.round(sb / lit)})`
          this.totalInk++
          if (this.inBoard[i]) this.boardInk++
        }
      }
    }
  }

  private line(key: LineKey, more?: LineKey): void {
    if (this.said.has(key)) return
    this.said.add(key)
    if (more) this.said.add(more)
    const text = FINALE_LINES[key]
    this.caption = { text, more: more ? FINALE_LINES[more] : '', moreAt: text.length / 32 + 0.9, age: 0, life: more ? 99 : Math.max(3.2, text.length / 32 + 2.4) }
    this.hooks.caption()
  }

  private setPhase(phase: FinalePhase): void {
    this.phase = phase
    this.phaseT = 0
    this.target = -1
  }

  update(dt: number, dir: Dir | null): void {
    this.t += dt
    this.phaseT += dt
    this.glitch = Math.max(0, this.glitch - dt * 2)
    if (this.caption) {
      const before = this.caption.age
      this.caption.age += dt
      if (this.caption.more && before < this.caption.moreAt && this.caption.age >= this.caption.moreAt) this.hooks.caption()
      if (this.caption.age > this.caption.life) this.caption = null
    }

    // A new direction from the player always takes over from the auto-steer.
    if (dir && dir !== this.lastInput) {
      this.lastInput = dir
      this.dir = dir
      this.idle = 0
      this.stuck = 0
      this.auto = false
    } else this.idle += dt

    if (this.phase === 'maze' || this.phase === 'ui') {
      this.steer(dt)
      const boardDone = this.boardInk ? this.boardEaten / this.boardInk : 1
      if (this.phase === 'maze') {
        if (this.phaseT > 0.6) this.line('empty')
        const readEmpty = this.said.has('empty') && (!this.caption || this.caption.age > 2.4)
        if (readEmpty && (boardDone > 0.2 || this.phaseT > 4.2)) this.line('board')
        if (boardDone > 0.72 || this.phaseT > 22) {
          this.setPhase('pause')
          this.rumbled = false
        }
      } else {
        const outside = this.totalInk - this.boardInk
        const outEaten = this.totalEaten - this.boardEaten
        if ((outside && outEaten / outside > 0.3) || this.phaseT > 9) this.line('market')
        if (this.progress > 0.9 || this.phaseT > 30) this.setPhase('vacuum')
      }
    } else if (this.phase === 'pause') {
      // The maze is gone. Nothing moves. Then the screen around it starts to give.
      if (this.phaseT > 1.0) this.line('hungry')
      if (this.phaseT > 2.4 && !this.rumbled) {
        this.rumbled = true
        this.hooks.rumble()
      }
      this.glitch = Math.max(this.glitch, this.tremor * 0.5)
      if (this.phaseT > PAUSE) {
        this.setPhase('ui')
        this.glitch = 1
        this.hooks.glitch()
        this.idle = 0
        this.stuck = 0
      }
    } else if (this.phase === 'vacuum') {
      // The rest of the screen falls into the mouth on its own.
      const per = Math.ceil((this.cols * this.rows) / 60)
      let n = 0
      for (let i = 0; i < this.eaten.length && n < per; i++) {
        if (this.eaten[i]) continue
        this.eatChunk(i, 0.3)
        n++
      }
      if (n === 0 && this.phaseT > 0.6) {
        this.setPhase('glass')
        this.line('out', 'yours')
      }
    } else if (this.phase === 'glass') {
      this.glassStep(dt)
    }

    for (const bit of this.bits) {
      const dx = this.x - bit.x
      const dy = this.y - bit.y
      bit.vx += dx * dt * 9
      bit.vy += dy * dt * 9
      bit.vx *= 0.9
      bit.vy *= 0.9
      bit.x += bit.vx * dt
      bit.y += bit.vy * dt
      bit.life -= dt
    }
    this.bits = this.bits.filter((b) => b.life > 0)
  }

  // Player steering, with a fallback: when the pac is pinned against the edge
  // or has gone a while without eating anything, it heads for the nearest
  // food on its own until the player picks a new direction.
  private steer(dt: number): void {
    const speed = 250 + this.size * 0.9
    const half = this.size * 0.3
    const area = this.phase === 'maze' ? this.lay.board : { x: 0, y: 0, size: 0 }
    const minX = this.phase === 'maze' ? area.x + half : half
    const maxX = this.phase === 'maze' ? area.x + area.size - half : this.lay.W - half
    const minY = this.phase === 'maze' ? area.y + half : half
    const maxY = this.phase === 'maze' ? area.y + area.size - half : this.lay.H - half
    const ox = this.x
    const oy = this.y

    if (!this.auto && (this.stuck > 0.35 || (this.idle > 2.5 && this.hungry > 0.8) || (this.lastInput === null && this.t > 1.2))) this.auto = true

    if (this.auto) {
      this.retarget -= dt
      if (this.target < 0 || this.eaten[this.target] || this.retarget <= 0) {
        this.target = this.nearestFood()
        this.retarget = 0.3
      }
      if (this.target >= 0) {
        const tx = (this.target % this.cols) * CHUNK + CHUNK / 2
        const ty = Math.floor(this.target / this.cols) * CHUNK + CHUNK / 2
        const dx = tx - this.x
        const dy = ty - this.y
        const d = Math.hypot(dx, dy)
        if (d > 1) {
          const k = Math.min(d, speed * dt) / d
          this.x += dx * k
          this.y += dy * k
          // face along the bigger axis, with a little hysteresis so it does not flicker
          const horiz = Math.abs(dx) > Math.abs(dy) * (this.dir === 'left' || this.dir === 'right' ? 0.7 : 1.4)
          this.dir = horiz ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down'
        }
      }
    } else {
      const [vx, vy] = VEC[this.dir]
      this.x += vx * speed * dt
      this.y += vy * speed * dt
    }
    this.x = Math.max(minX, Math.min(maxX, this.x))
    this.y = Math.max(minY, Math.min(maxY, this.y))
    const moved = Math.hypot(this.x - ox, this.y - oy)
    this.stuck = moved < speed * dt * 0.25 ? this.stuck + dt : 0
    const before = this.totalEaten
    this.eatAround()
    this.hungry = this.totalEaten > before ? 0 : this.hungry + dt
  }

  private nearestFood(): number {
    let best = -1
    let bestD = Infinity
    for (let i = 0; i < this.ink.length; i++) {
      if (!this.ink[i] || this.eaten[i]) continue
      if (this.phase === 'maze' && !this.inBoard[i]) continue
      const cx = (i % this.cols) * CHUNK + CHUNK / 2
      const cy = Math.floor(i / this.cols) * CHUNK + CHUNK / 2
      const d = (cx - this.x) ** 2 + (cy - this.y) ** 2
      if (d < bestD) {
        bestD = d
        best = i
      }
    }
    return best
  }

  private glassStep(dt: number): void {
    const t = this.phaseT
    const { W, H } = this.lay
    // come to the middle and press up against the glass
    this.x += (W / 2 - this.x) * Math.min(1, dt * 3)
    this.y += (H / 2 - this.y) * Math.min(1, dt * 3)
    this.dir = 'right'
    const lean = Math.min(1, t / KNOCKS[0]!)
    let size = 140 + lean * lean * 120
    for (let k = 0; k < KNOCKS.length; k++) {
      const at = KNOCKS[k]!
      if (t >= at && this.knocked <= k) {
        this.knocked = k + 1
        this.addCracks(k)
        this.glitch = Math.max(this.glitch, 0.5 + k * 0.2)
        if (k === 0) this.hooks.rumble()
        else this.hooks.glitch()
      }
      // each knock: a quick lunge towards the viewer
      if (t >= at) size += 70 * Math.max(0, 1 - (t - at) * 5) * (1 + k * 0.4)
    }
    size += this.knocked * 18
    if (t >= BREAK) {
      if (!this.shattered) {
        this.shattered = true
        this.hooks.shatter()
        this.caption = null
      }
      const g = Math.min(1, (t - BREAK) / 0.9)
      size += g * g * Math.max(W, H) * 2.6
      this.glitch = Math.max(this.glitch, 0.8)
      this.power = Math.max(0, 1 - (t - BREAK - 0.3) / 0.9)
    }
    this.size = size
    if (t > GLASS_END) this.setPhase('gone')
  }

  // Cracks run out from the pac's mouth into the glass, a few more on each knock.
  private addCracks(round: number): void {
    const { W, H } = this.lay
    const count = 4 + round * 4
    const reach = Math.max(W, H) * (0.25 + round * 0.22)
    for (let n = 0; n < count; n++) {
      let a = Math.random() * Math.PI * 2
      let x = W / 2 + Math.cos(a) * 60
      let y = H / 2 + Math.sin(a) * 60
      const pts: Array<[number, number]> = [[x, y]]
      const steps = 4 + Math.floor(Math.random() * 4)
      const len = (reach * (0.5 + Math.random() * 0.6)) / steps
      for (let s = 0; s < steps; s++) {
        a += (Math.random() - 0.5) * 0.8
        x += Math.cos(a) * len
        y += Math.sin(a) * len
        pts.push([x, y])
        // the odd short branch
        if (Math.random() < 0.25) {
          const b = a + (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.6)
          this.cracks.push({ pts: [[x, y], [x + Math.cos(b) * len * 0.6, y + Math.sin(b) * len * 0.6]], width: 1.5 })
        }
      }
      this.cracks.push({ pts, width: 2.5 + round })
    }
  }

  private eatAround(): void {
    const reach = this.size * 0.5
    const c0 = Math.max(0, Math.floor((this.x - reach) / CHUNK))
    const c1 = Math.min(this.cols - 1, Math.floor((this.x + reach) / CHUNK))
    const r0 = Math.max(0, Math.floor((this.y - reach) / CHUNK))
    const r1 = Math.min(this.rows - 1, Math.floor((this.y + reach) / CHUNK))
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const i = r * this.cols + c
        if (this.eaten[i]) continue
        if (this.phase === 'maze' && !this.inBoard[i]) continue
        const cx = c * CHUNK + CHUNK / 2
        const cy = r * CHUNK + CHUNK / 2
        if (Math.hypot(cx - this.x, cy - this.y) > reach) continue
        this.eatChunk(i, 0.5)
      }
    }
  }

  private eatChunk(i: number, life: number): void {
    this.eaten[i] = 1
    const c = i % this.cols
    const r = Math.floor(i / this.cols)
    this.rctx.clearRect(c * CHUNK * this.scale, r * CHUNK * this.scale, CHUNK * this.scale + 1, CHUNK * this.scale + 1)
    if (!this.ink[i]) return
    this.totalEaten++
    if (this.inBoard[i]) this.boardEaten++
    this.gained += 5
    this.size = Math.min(320, 46 + this.progress * 270)
    this.hooks.chomp()
    if (this.bits.length < 400) {
      const cx = c * CHUNK + CHUNK / 2
      const cy = r * CHUNK + CHUNK / 2
      this.bits.push({ x: cx, y: cy, vx: (Math.random() - 0.5) * 200, vy: (Math.random() - 0.5) * 200, life, color: this.colors[i]! })
    }
  }

  draw(ctx: CanvasRenderingContext2D, time: number): void {
    const { W, H } = this.lay
    const shake = this.tremor * 7
    ctx.drawImage(this.remaining, (Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake, W, H)

    for (const bit of this.bits) {
      ctx.globalAlpha = Math.min(1, bit.life * 3)
      fill(ctx, bit.color, bit.x - 3, bit.y - 3, 6, 6)
    }
    ctx.globalAlpha = 1

    const art = pacFrame(this.phase === 'glass' ? time * 6 : time * 10)
    if (art) {
      ctx.save()
      ctx.shadowColor = ALERT
      ctx.shadowBlur = 30
      drawFacing(ctx, art, this.x + (Math.random() - 0.5) * shake, this.y + (Math.random() - 0.5) * shake, this.size, this.dir, 'right')
      ctx.restore()
    }

    if (this.cracks.length && !(this.shattered && this.phaseT > BREAK + 0.25)) this.drawCracks(ctx)

    if (this.phase !== 'glass' && this.phase !== 'gone') this.drawMeter(ctx)
    this.drawCaption(ctx)
  }

  private drawCracks(ctx: CanvasRenderingContext2D): void {
    ctx.save()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (const pass of [0, 1]) {
      ctx.strokeStyle = pass === 0 ? 'rgba(150, 214, 255, 0.35)' : 'rgba(255, 255, 255, 0.9)'
      for (const crack of this.cracks) {
        ctx.lineWidth = pass === 0 ? crack.width * 3.5 : crack.width
        ctx.beginPath()
        crack.pts.forEach(([x, y], k) => (k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)))
        ctx.stroke()
      }
    }
    ctx.restore()
  }

  // How much of the screen the company owns so far, and what it wants next.
  private drawMeter(ctx: CanvasRenderingContext2D): void {
    const { W, H, phone } = this.lay
    const pct = Math.floor(this.progress * 100)
    const w = 330
    const h = 74
    const hx = W - w - 16
    const hy = phone ? 24 : H - h - 22
    fill(ctx, 'rgba(0, 0, 0, 0.82)', hx, hy, w, h)
    fill(ctx, ALERT, hx, hy, 4, h)
    label(ctx, `ACQUIRED // ${String(pct).padStart(3, '0')}%`, hx + 16, hy + 22, 28, ALERT, 'left')
    const blink = Math.floor(this.t * 4) % 2 === 0
    const goal =
      this.phase === 'maze' ? 'TAKE THE BOARD' : this.phase === 'pause' ? (this.phaseT < 2.4 ? 'NOTHING LEFT TO BUY' : 'STILL HUNGRY') : 'TAKE THE MARKET'
    label(ctx, goal, hx + 16, hy + 54, 24, this.phase === 'pause' && blink ? ALERT : ICE, 'left')
  }

  // Captions are typed out in a dark box. They sit low on the screen and move
  // to the top when the pac is down there, so they never cover it.
  private drawCaption(ctx: CanvasRenderingContext2D): void {
    const cap = this.caption
    if (!cap) return
    const { W, H, phone, portrait } = this.lay
    const size = phone || portrait ? 50 : 44
    const lineH = size * 1.15
    const shown = cap.text.slice(0, Math.floor(cap.age * 32))
    const lines: Array<{ text: string; color: string }> = [{ text: `> ${shown}${shown.length < cap.text.length && Math.floor(this.t * 6) % 2 ? '_' : ''}`, color: ICE }]
    if (cap.more && cap.age >= cap.moreAt) {
      const more = cap.more.slice(0, Math.floor((cap.age - cap.moreAt) * 24))
      lines.push({ text: `  ${more}`, color: ALERT })
    }
    ctx.font = `${size}px ${MONO}`
    const full = Math.max(ctx.measureText(`> ${cap.text}`).width, cap.more ? ctx.measureText(`  ${cap.more}`).width : 0)
    const boxW = Math.min(W - 32, full + 56)
    const boxH = (cap.more ? 2 : 1) * lineH + 30
    const centred = this.phase === 'glass'
    const low = H - (phone ? 120 : 110) - boxH / 2
    const high = (phone ? 150 : 90) + boxH / 2
    const want = centred ? H / 2 + 230 : this.y > H * 0.55 ? high : low
    this.captionY += (want - this.captionY) * Math.min(1, 0.12)
    const cy = this.captionY
    ctx.save()
    ctx.globalAlpha = Math.min(1, cap.age * 6, cap.life - cap.age)
    const bx = W / 2 - boxW / 2
    fill(ctx, 'rgba(0, 0, 0, 0.86)', bx, cy - boxH / 2, boxW, boxH)
    fill(ctx, ALERT, bx, cy - boxH / 2, 5, boxH)
    const tx = bx + 28
    let ty = cy - ((lines.length - 1) * lineH) / 2
    for (const l of lines) {
      label(ctx, l.text, tx, ty, size, l.color, 'left')
      ty += lineH
    }
    ctx.restore()
  }
}
