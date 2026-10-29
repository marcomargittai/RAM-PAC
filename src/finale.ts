// The finale. The whole interface is frozen into one image and cut into
// chunks; PAC-7 eats the maze first, then breaks out and eats the HUD, the
// header and the frame, and finally swells until it eats the glass itself.

import { ALERT, ICE } from './palette'
import { MONO, fill, label } from './render'
import type { Layout } from './screen'
import type { Dir } from './sim'
import { drawFacing, pacFrame } from './sprites'
import { FINALE_LINES } from './story'

const CHUNK = 20
const VEC: Record<Dir, [number, number]> = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }

export type FinalePhase = 'maze' | 'pause' | 'ui' | 'vacuum' | 'glass' | 'gone'

// How long the world holds still after the maze is gone, before the rest opens up.
const PAUSE = 4.2

interface Bit {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  color: string
}

interface Hooks {
  chomp(): void
  rumble(): void
  say(id: string): number
  shatter(): void
  glitch(): void
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
  subtitle = ''
  subtitleLife = 0
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
  private said = new Set<string>()
  private rumbled = false

  // The music each phase wants: a held breath while eating the maze, silence
  // when the maze is gone and again before the glass, the full track between.
  get bed(): 'tense' | 'hush' | 'finale' {
    if (this.phase === 'maze') return this.phaseT < 1.2 ? 'hush' : 'tense'
    if (this.phase === 'ui' || this.phase === 'vacuum') return 'finale'
    return 'hush'
  }

  // How hard the frozen interface shakes, 0 to 1.
  get tremor(): number {
    if (this.phase !== 'pause') return 0
    return Math.max(0, (this.phaseT - 2.4) / (PAUSE - 2.4)) ** 2
  }

  constructor(
    snap: HTMLCanvasElement,
    readonly lay: Layout,
    private scale: number,
    start: { x: number; y: number },
    private hooks: Hooks,
  ) {
    this.x = start.x
    this.y = start.y
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
        const step = Math.max(1, Math.floor((CHUNK * scale) / 5))
        for (let yy = 0; yy < CHUNK * scale; yy += step) {
          for (let xx = 0; xx < CHUNK * scale; xx += step) {
            const px = Math.min(snap.width - 1, Math.floor(c * CHUNK * scale + xx))
            const py = Math.min(snap.height - 1, Math.floor(r * CHUNK * scale + yy))
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

  get progress(): number {
    return this.totalInk ? this.totalEaten / this.totalInk : 1
  }

  get done(): boolean {
    return this.phase === 'gone'
  }

  private line(key: keyof typeof FINALE_LINES): void {
    if (this.said.has(key)) return
    this.said.add(key)
    const line = FINALE_LINES[key]
    this.subtitle = line.text
    this.subtitleLife = Math.max(3, this.hooks.say(line.voice) + 1)
  }

  private setPhase(phase: FinalePhase): void {
    this.phase = phase
    this.phaseT = 0
  }

  update(dt: number, dir: Dir | null): void {
    this.t += dt
    this.phaseT += dt
    this.subtitleLife = Math.max(0, this.subtitleLife - dt)
    this.glitch = Math.max(0, this.glitch - dt * 2)
    if (dir) this.dir = dir

    if (this.phase === 'maze' || this.phase === 'ui') {
      const speed = 250 + this.size * 0.9
      const [vx, vy] = VEC[this.dir]
      this.x += vx * speed * dt
      this.y += vy * speed * dt
      const half = this.size * 0.3
      if (this.phase === 'maze') {
        const b = this.lay.board
        this.x = Math.max(b.x + half, Math.min(b.x + b.size - half, this.x))
        this.y = Math.max(b.y + half, Math.min(b.y + b.size - half, this.y))
      } else {
        this.x = Math.max(half, Math.min(this.lay.W - half, this.x))
        this.y = Math.max(half, Math.min(this.lay.H - half, this.y))
      }
      this.eatAround()
      const boardDone = this.boardInk ? this.boardEaten / this.boardInk : 1
      if (this.phase === 'maze' && (boardDone > 0.72 || this.phaseT > 22)) {
        this.setPhase('pause')
        this.rumbled = false
      }
      if (this.phase === 'ui') {
        const outside = this.totalInk - this.boardInk
        const outEaten = this.totalEaten - this.boardEaten
        if (outside && outEaten / outside > 0.35) this.line('delicious')
        if (this.progress > 0.9 || this.phaseT > 40) this.setPhase('vacuum')
      }
    } else if (this.phase === 'pause') {
      // The maze is gone. Nothing moves. Then something under the interface does.
      if (this.phaseT > 1.4) this.line('wait')
      if (this.phaseT > 2.4 && !this.rumbled) {
        this.rumbled = true
        this.hooks.rumble()
      }
      this.glitch = Math.max(this.glitch, this.tremor * 0.5)
      if (this.phaseT > PAUSE) {
        this.setPhase('ui')
        this.glitch = 1
        this.hooks.glitch()
        this.line('outside')
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
        this.line('glass')
      }
    } else if (this.phase === 'glass') {
      const grow = Math.min(1, this.phaseT / 2.6)
      this.x += (this.lay.W / 2 - this.x) * Math.min(1, dt * 3)
      this.y += (this.lay.H / 2 - this.y) * Math.min(1, dt * 3)
      this.size = 120 + grow * grow * Math.max(this.lay.W, this.lay.H) * 2.6
      this.glitch = Math.max(this.glitch, grow * 0.8)
      if (this.phaseT > 2.6 && this.power === 1) this.hooks.shatter()
      if (this.phaseT > 2.6) this.power = Math.max(0, 1 - (this.phaseT - 2.6) / 0.9)
      if (this.phaseT > 4.2) this.setPhase('gone')
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

    const art = pacFrame(time * 10)
    if (art) {
      ctx.save()
      ctx.shadowColor = ALERT
      ctx.shadowBlur = 30
      drawFacing(ctx, art, this.x, this.y, this.size, this.dir, 'right')
      ctx.restore()
    }

    if (this.phase !== 'glass' && this.phase !== 'gone') {
      const pct = Math.floor(this.progress * 100)
      const hx = W - 346
      const hy = this.lay.phone ? 24 : H - 96
      fill(ctx, 'rgba(0, 0, 0, 0.8)', hx, hy, 330, 74)
      fill(ctx, ALERT, hx, hy, 4, 74)
      label(ctx, `CONSUMING // ${String(pct).padStart(3, '0')}%`, hx + 16, hy + 22, 28, ALERT, 'left')
      const goal = this.phase === 'maze' ? 'EAT THE MAZE' : this.phase === 'pause' ? (this.phaseT < 2.4 ? 'NO MAZE LEFT' : 'SIGNAL OUTSIDE MAZE') : 'EAT EVERYTHING'
      label(ctx, goal, hx + 16, hy + 54, 24, this.phase === 'pause' && Math.floor(this.t * 4) % 2 === 0 ? ALERT : ICE, 'left')
    }
    if (this.subtitleLife > 0 && this.subtitle) {
      ctx.globalAlpha = Math.min(1, this.subtitleLife)
      ctx.font = `40px ${MONO}`
      const w = ctx.measureText(`> ${this.subtitle}`).width + 40
      fill(ctx, 'rgba(0, 0, 0, 0.8)', W / 2 - w / 2, H - 190, w, 60)
      label(ctx, `> ${this.subtitle}`, W / 2, H - 160, 40, ALERT)
      ctx.globalAlpha = 1
    }
  }
}
