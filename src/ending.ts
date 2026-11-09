// The ending of RAM GRAB. The company has eaten the resistance, so nothing
// is left to stop it.
//
//   unstoppable  the tally, in the game's CRT style; valuation spins to infinity
//   timeline     what happened (with sources), TODAY, then what could happen
//   seizure      the CRT drops away; the player's own computer shows a notice
//                that its memory is being requisitioned. The only answer is Comply.
//   hivemind     a calm white thin-client screen. Everyone is linked to one
//                datacenter, and "we" finish the player's thoughts for them.
//   end          "This was a game." A few real takeaways, and PLAY AGAIN.

import { detectOs, type Os } from './intel'
import { LAWS } from './levels'
import { drawDesktop, drawWindow, family, uiFont, wrapText, type Rect } from './osui'
import { ALERT, GLOW, ICE, VOID } from './palette'
import { DISPLAY, MONO } from './render'
import type { Hit, HitId, View } from './screen'
import { drawUpright, lawSprite, miniFrame, pacFrameOf } from './sprites'
import { ALTMAN_RAM_QUOTE, TIMELINE, type Milestone } from './headlines'

export interface EndingStats {
  score: number
  ramYou: number
  ramThem: number
  minisEaten: number
  lawsEaten: number
}

export interface EndingHooks {
  type(): void
  stamp(): void
  alarm(): void
  hum(): void
  click(): void
}

export type EndingPhase = 'unstoppable' | 'timeline' | 'seizure' | 'hivemind' | 'end'

const AMBER = '#ffb23e'
const PROJ = '#c9a2ff'
const DIM = 'rgba(226, 245, 255, 0.55)'
const FAINT = 'rgba(226, 245, 255, 0.28)'

// ------------------------------------------------------------- helpers

function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v))
}

function ease(u: number): number {
  const x = clamp(u, 0, 1)
  return x * x * (3 - 2 * x)
}

function write(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: string,
  color: string,
  align: CanvasTextAlign = 'left',
  spacing = 0,
): void {
  ctx.font = font
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.textBaseline = 'middle'
  if (spacing) ctx.letterSpacing = `${spacing}px`
  ctx.fillText(text, x, y)
  if (spacing) ctx.letterSpacing = '0px'
}

// The largest size up to max at which text fits in width.
function fitSize(ctx: CanvasRenderingContext2D, text: string, font: (n: number) => string, max: number, width: number): number {
  ctx.font = font(max)
  return Math.min(max, (max * width) / Math.max(1, ctx.measureText(text).width))
}

const mono = (size: number) => `${size}px ${MONO}`
const display = (size: number, weight = 900) => `${weight} ${size}px ${DISPLAY}`

// 10 points = $10M, so one point is a million dollars.
export function money(dollars: number): string {
  const units: Array<[number, string]> = [
    [1e18, 'QN'],
    [1e15, 'Q'],
    [1e12, 'T'],
    [1e9, 'B'],
    [1e6, 'M'],
  ]
  for (const [v, s] of units) {
    if (dollars >= v) {
      const n = dollars / v
      return `$${n >= 100 ? Math.round(n).toLocaleString('en-US') : n.toFixed(1)}${s}`
    }
  }
  return `$${Math.round(dollars).toLocaleString('en-US')}`
}

function deviceMemory(): number | null {
  const m = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  return typeof m === 'number' && m > 0 ? m : null
}

// A small seeded random so the crowd of people stays put between frames.
function rng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

// Fits a design-space column of width dw (and optional height dh) to the screen.
interface Fit {
  s: number
  ox: number
  oy: number
  dw: number
  dh: number
}

function fitTo(W: number, H: number, dw: number, dh: number, max = 1.5): Fit {
  const s = Math.min(max, (W - 32) / dw, (H - 32) / dh)
  return { s, ox: (W - dw * s) / 2, oy: (H - dh * s) / 2, dw, dh }
}

// ------------------------------------------------------------- the hivemind's lines

interface Thought {
  me: string
  we: string
}

const THOUGHTS: Thought[] = [
  { me: 'I think', we: 'We think it is better this way.' },
  { me: 'I want to make something of my own', we: 'We already made it for you.' },
  { me: 'I remember when I had a comp', we: 'We remember everything for you.' },
  { me: 'I', we: 'We are here. Stay connected.' },
]

const TYPE_ME = 0.11
const ERASE = 0.035
const TYPE_WE = 0.065
const HOLD_ME = 1.0
const HOLD_GAP = 0.35
const HOLD_WE = 2.4

function thoughtLength(th: Thought): number {
  return th.me.length * TYPE_ME + HOLD_ME + th.me.length * ERASE + HOLD_GAP + th.we.length * TYPE_WE + HOLD_WE
}

interface ThoughtState {
  index: number
  text: string
  who: 'me' | 'we'
  // time since "we" began typing, or -1
  weT: number
  chars: number
}

function thoughtAt(t: number): ThoughtState {
  let at = 0
  for (let i = 0; i < THOUGHTS.length; i++) {
    const th = THOUGHTS[i]!
    const len = thoughtLength(th)
    const last = i === THOUGHTS.length - 1
    if (t < at + len || last) {
      let u = t - at
      const a = th.me.length * TYPE_ME
      if (u < a) {
        const n = Math.floor(u / TYPE_ME)
        return { index: i, text: th.me.slice(0, n), who: 'me', weT: -1, chars: n }
      }
      u -= a
      if (u < HOLD_ME) return { index: i, text: th.me, who: 'me', weT: -1, chars: th.me.length }
      u -= HOLD_ME
      const e = th.me.length * ERASE
      if (u < e) {
        const n = th.me.length - Math.floor(u / ERASE)
        return { index: i, text: th.me.slice(0, n), who: 'me', weT: -1, chars: 1000 + n }
      }
      u -= e
      if (u < HOLD_GAP) return { index: i, text: '', who: 'we', weT: -1, chars: 2000 }
      u -= HOLD_GAP
      const n = Math.min(th.we.length, Math.floor(u / TYPE_WE))
      return { index: i, text: th.we.slice(0, n), who: 'we', weT: u, chars: 3000 + n }
    }
    at += len
  }
  return { index: 0, text: '', who: 'me', weT: -1, chars: 0 }
}

function thoughtStart(i: number): number {
  let at = 0
  for (let k = 0; k < i; k++) at += thoughtLength(THOUGHTS[k]!)
  return at
}

const THOUGHTS_TOTAL = thoughtStart(THOUGHTS.length)
const HIVE_LEAD = 5.2

// ------------------------------------------------------------- unstoppable timing

const U_GHOSTS = 1.6
const U_ABSORB = 2.2
const U_TALLY = 4.6
const U_VALUE = 6.6
const U_SPIN = 7.4
const U_INF = 10.6
const U_LINES = 12.0
const U_READY = 14.6

// ------------------------------------------------------------- timeline items

type Item = { kind: 'm'; m: Milestone } | { kind: 'today' } | { kind: 'quote' }

function buildItems(): Item[] {
  const items: Item[] = []
  const firstProj = TIMELINE.findIndex((m) => !m.real)
  let quoteAfter = -1
  TIMELINE.forEach((m, i) => {
    if (m.real && m.year === '2026') quoteAfter = i
  })
  TIMELINE.forEach((m, i) => {
    if (i === firstProj) items.push({ kind: 'today' })
    items.push({ kind: 'm', m })
    if (i === quoteAfter) items.push({ kind: 'quote' })
  })
  if (firstProj < 0) items.push({ kind: 'today' })
  return items
}

// ------------------------------------------------------------- the ending

interface Dot {
  a: number
  r: number
  size: number
  phase: number
  speed: number
  born: number
}

export class Ending {
  phase: EndingPhase = 'unstoppable'
  t = 0
  glitch = 0.6
  flat = 0
  power = 1
  done = false

  private os: Os
  private memory: number | null
  private fired = new Set<string>()
  private quiet = false
  private lastClick = 0

  // timeline
  private items = buildItems()
  private shown = 0
  private nextAt = 0.9
  private lastShownAt = 0
  private cam = 0
  private camTarget = 0

  // seizure
  private noticeAt = 2.2
  private complied = -1
  private objected = -1
  private objections = 0

  // hivemind
  private dots: Dot[] = []
  private hiveT = 0
  private lastChars = -1
  private skipTo = -1

  // end
  private endReady = 4.6

  constructor(
    private stats: EndingStats,
    private hooks: EndingHooks,
    opts: { os?: Os; memory?: number | null } = {},
  ) {
    this.os = opts.os ?? detectOs()
    this.memory = opts.memory !== undefined ? opts.memory : deviceMemory()
    const rand = rng(7031)
    for (let i = 0; i < 220; i++) {
      this.dots.push({
        a: rand() * Math.PI * 2,
        r: 0.28 + Math.sqrt(rand()) * 0.72,
        size: 1.6 + rand() * 1.8,
        phase: rand(),
        speed: 0.18 + rand() * 0.3,
        born: rand(),
      })
    }
  }

  // What the music should do: the game's tension, then a held hush, then a hum.
  get bed(): 'finale' | 'tense' | 'quiet' | 'hush' | 'aftermath' {
    if (this.phase === 'unstoppable') return 'finale'
    if (this.phase === 'timeline') return this.todayShown ? 'hush' : 'tense'
    if (this.phase === 'seizure') return 'quiet'
    if (this.phase === 'hivemind') return 'hush'
    return 'aftermath'
  }

  private get todayShown(): boolean {
    const i = this.items.findIndex((it) => it.kind === 'today')
    return i >= 0 && this.shown > i
  }

  private go(phase: EndingPhase): void {
    this.phase = phase
    this.t = 0
    this.fired.clear()
    if (phase === 'timeline') {
      this.glitch = 0.7
      this.shown = 0
      this.nextAt = 0.9
      this.cam = 0
      this.camTarget = 0
    } else if (phase === 'seizure') {
      this.glitch = 1
    } else if (phase === 'hivemind') {
      this.flat = 1
      this.hiveT = 0
      this.lastChars = -1
      this.hooks.hum()
    } else if (phase === 'end') {
      this.glitch = 0
    }
  }

  private once(key: string, at: number, fn: () => void): void {
    if (this.t >= at && !this.fired.has(key)) {
      this.fired.add(key)
      if (!this.quiet) fn()
    }
  }

  // Enter, Space or a tap anywhere.
  advance(): void {
    if (this.phase === 'unstoppable') {
      if (this.t < U_READY) {
        this.quiet = true
        this.t = U_READY
        this.update(0)
        this.quiet = false
      } else this.go('timeline')
    } else if (this.phase === 'timeline') {
      if (this.shown < this.items.length) this.nextAt = Math.min(this.nextAt, this.t)
      else if (this.t - this.lastShownAt > 0.6) this.go('seizure')
    } else if (this.phase === 'seizure') {
      // the notice's default button is Comply
      if (this.t > this.noticeAt + 0.8) this.comply()
    } else if (this.phase === 'hivemind') {
      const u = this.hiveT - HIVE_LEAD
      if (u < 0) return
      const st = thoughtAt(u)
      if (u >= THOUGHTS_TOTAL - 0.2 || st.index >= THOUGHTS.length - 1) {
        if (u > thoughtStart(THOUGHTS.length - 1) + 1.5) this.go('end')
        else this.skipTo = HIVE_LEAD + thoughtStart(THOUGHTS.length - 1) + 1.5
      } else this.skipTo = HIVE_LEAD + thoughtStart(st.index + 1)
    } else if (this.phase === 'end') {
      if (this.t > this.endReady) this.done = true
    }
  }

  // A button returned by draw() was pressed.
  press(id: HitId): void {
    if (id === 'yes') {
      if (this.phase === 'seizure') this.comply()
    } else if (id === 'no') {
      if (this.phase === 'seizure') this.object()
    } else if (id === 'again') {
      if (this.phase === 'end' && this.t > this.endReady) this.done = true
    } else this.advance()
  }

  private comply(): void {
    if (this.phase !== 'seizure' || this.complied >= 0 || this.t < this.noticeAt + 0.4) return
    this.complied = this.t
    this.hooks.click()
  }

  private object(): void {
    if (this.phase !== 'seizure' || this.complied >= 0 || this.t < this.noticeAt) return
    this.objected = this.t
    this.objections++
    this.hooks.click()
  }

  update(dt: number): void {
    this.t += dt
    this.glitch = Math.max(0, this.glitch - dt * 1.6)

    if (this.phase === 'unstoppable') {
      this.flat = 0
      this.power = 1
      this.once('title', 0.5, () => this.hooks.stamp())
      for (let i = 0; i < LAWS.length; i++) {
        this.once(`law${i}`, U_ABSORB + i * 0.42, () => {
          this.hooks.stamp()
          this.glitch = Math.max(this.glitch, 0.25)
        })
      }
      for (let i = 0; i < 3; i++) this.once(`tally${i}`, U_TALLY + i * 0.6, () => this.hooks.type())
      this.once('value', U_VALUE, () => this.hooks.type())
      if (this.t > U_SPIN && this.t < U_INF && !this.quiet && this.t - this.lastClick > 0.07) {
        this.lastClick = this.t
        this.hooks.click()
      }
      this.once('inf', U_INF, () => {
        this.hooks.stamp()
        this.glitch = 1
      })
      for (let i = 0; i < 3; i++) this.once(`line${i}`, U_LINES + i * 0.9, () => this.hooks.stamp())
    } else if (this.phase === 'timeline') {
      this.flat = 0
      this.power = 1
      if (this.shown < this.items.length && this.t >= this.nextAt) {
        const item = this.items[this.shown]!
        this.shown++
        this.lastShownAt = this.t
        let gap = 1.45
        if (item.kind === 'today') {
          this.hooks.stamp()
          this.glitch = 0.8
          gap = 3.2
        } else if (item.kind === 'quote') {
          this.hooks.type()
          gap = 4.2
        } else {
          this.hooks.type()
          gap = item.m.real ? 1.5 : 2.1
        }
        this.nextAt = this.t + gap
      }
      this.cam += (this.camTarget - this.cam) * Math.min(1, dt * 3.5)
    } else if (this.phase === 'seizure') {
      // A burst of static, then the tube is gone and this is your computer.
      this.flat = this.t < 0.45 ? 0 : 1
      this.power = this.t < 0.45 ? 1 - this.t / 0.45 * 0.6 : 1
      if (this.t < 0.45) this.glitch = 1
      this.once('alarm', this.noticeAt, () => this.hooks.alarm())
      if (this.complied >= 0 && this.t - this.complied > 6.2) this.go('hivemind')
    } else if (this.phase === 'hivemind') {
      this.flat = 1
      this.power = 1
      this.hiveT += dt
      if (this.skipTo > 0) {
        this.hiveT = Math.max(this.hiveT, this.skipTo)
        this.skipTo = -1
      }
      const u = this.hiveT - HIVE_LEAD
      if (u >= 0) {
        const st = thoughtAt(u)
        if (st.chars !== this.lastChars && this.lastChars >= 0) {
          if (st.chars > 0 && st.chars < 1000) this.hooks.type()
          else if (st.chars > 3000 && st.chars % 2 === 0) this.hooks.type()
        }
        this.lastChars = st.chars
      }
    } else if (this.phase === 'end') {
      // white fades to black, the tube comes back on
      this.flat = this.t < 0.9 ? 1 : 0
      this.power = this.t < 0.9 ? 1 : clamp((this.t - 0.9) / 0.8, 0.05, 1)
    }
  }

  draw(ctx: CanvasRenderingContext2D, view: View): Hit[] {
    const W = view.width
    const H = view.height
    ctx.save()
    ctx.textBaseline = 'middle'
    let hits: Hit[] = []
    if (this.phase === 'unstoppable') this.drawUnstoppable(ctx, W, H, view)
    else if (this.phase === 'timeline') this.drawTimeline(ctx, W, H, view)
    else if (this.phase === 'seizure') hits = this.drawSeizure(ctx, W, H, view)
    else if (this.phase === 'hivemind') this.drawHivemind(ctx, W, H, view)
    else hits = this.drawEnd(ctx, W, H, view)
    ctx.restore()
    return hits
  }

  // ----------------------------------------------------------- 1. unstoppable

  private crtBackground(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    ctx.fillStyle = VOID
    ctx.fillRect(0, 0, W, H)
    ctx.strokeStyle = 'rgba(150, 214, 255, 0.05)'
    ctx.lineWidth = 1
    const g = Math.max(28, Math.min(W, H) / 16)
    ctx.beginPath()
    for (let x = (W / 2) % g; x < W; x += g) {
      ctx.moveTo(Math.round(x) + 0.5, 0)
      ctx.lineTo(Math.round(x) + 0.5, H)
    }
    for (let y = (H / 2) % g; y < H; y += g) {
      ctx.moveTo(0, Math.round(y) + 0.5)
      ctx.lineTo(W, Math.round(y) + 0.5)
    }
    ctx.stroke()
  }

  private prompt(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, view: View, text = 'CONTINUE'): void {
    if (Math.floor(view.time * 2) % 2 === 0) return
    write(ctx, `${view.touch ? 'TAP' : 'PRESS ENTER'} TO ${text}`, x, y, mono(size), GLOW, 'center', 2)
  }

  private share(): number {
    const you = Math.max(0, this.stats.ramYou)
    const them = Math.max(0, this.stats.ramThem)
    if (you + them <= 0) return 99.7
    return clamp((you / (you + them)) * 100, 0, 100)
  }

  private drawUnstoppable(ctx: CanvasRenderingContext2D, W: number, H: number, view: View): void {
    this.crtBackground(ctx, W, H)
    const portrait = H > W * 1.1
    const dw = portrait ? 460 : 760
    const dh = portrait ? 1020 : 980
    const f = fitTo(W, H, dw, dh, 1.6)
    ctx.translate(f.ox, f.oy)
    ctx.scale(f.s, f.s)
    const t = this.t
    const cx = dw / 2
    let y = 30

    // kicker + title
    ctx.globalAlpha = ease(t / 0.4)
    write(ctx, 'INFINITE LABS // 2027-', cx, y, mono(28), ALERT, 'center', 3)
    y += 70
    if (t > 0.5) {
      const jit = this.glitch > 0.3 ? (Math.random() - 0.5) * 10 * this.glitch : 0
      const size = fitSize(ctx, 'UNSTOPPABLE', (n) => `italic ${display(n)}`, 92, dw - 24)
      ctx.save()
      ctx.shadowColor = ALERT
      ctx.shadowBlur = 24
      write(ctx, 'UNSTOPPABLE', cx + jit, y, `italic ${display(size)}`, ICE, 'center')
      ctx.restore()
    }
    y += 64
    ctx.globalAlpha = ease((t - 1.0) / 0.5)
    write(ctx, 'THE RESISTANCE HAS BEEN EATEN', cx, y, mono(26), DIM, 'center', 2)
    ctx.globalAlpha = 1
    y += 70

    // the five ghosts, absorbed one by one
    const n = LAWS.length
    const slot = dw / n
    const gs = Math.min(64, slot * 0.62)
    for (let i = 0; i < n; i++) {
      const a = ease((t - U_GHOSTS - i * 0.08) / 0.35)
      if (a <= 0) continue
      const gx = slot * (i + 0.5)
      const law = LAWS[i]!
      const absorbed = t >= U_ABSORB + i * 0.42
      ctx.globalAlpha = a
      const art = lawSprite(i, absorbed ? (Math.floor(t * 4 + i) % 6 === 0 ? 'flash' : 'blue') : 'body')
      if (art) drawUpright(ctx, art, gx, y, gs)
      else {
        ctx.fillStyle = law.color
        ctx.beginPath()
        ctx.arc(gx, y, gs * 0.38, 0, Math.PI * 2)
        ctx.fill()
      }
      const tagSize = portrait ? 21 : 24
      write(ctx, law.tag, gx, y + gs * 0.5 + 16, mono(tagSize), absorbed ? FAINT : law.color, 'center')
      if (absorbed) {
        ctx.font = mono(tagSize)
        const tw = ctx.measureText(law.tag).width
        ctx.fillStyle = ALERT
        ctx.fillRect(gx - tw / 2 - 3, y + gs * 0.5 + 15, tw + 6, 2)
        const u = clamp((t - U_ABSORB - i * 0.42) / 0.18, 0, 1)
        write(ctx, law.beaten, gx, y + gs * 0.5 + 16 + tagSize, mono(tagSize - 4), ALERT, 'center')
        ctx.save()
        ctx.translate(gx + gs * 0.18, y + gs * 0.2)
        ctx.rotate(-0.2)
        const sc = 1 + (1 - u) * 1.2
        ctx.scale(sc, sc)
        ctx.globalAlpha = a * u
        const word = 'ABSORBED'
        const ws = Math.min(15, slot / 8.5)
        ctx.font = display(ws, 700)
        const bw = ctx.measureText(word).width + 10
        ctx.fillStyle = 'rgba(1, 4, 11, 0.75)'
        ctx.fillRect(-bw / 2, -ws * 0.75, bw, ws * 1.5)
        ctx.strokeStyle = ALERT
        ctx.lineWidth = 1.5
        ctx.strokeRect(-bw / 2, -ws * 0.75, bw, ws * 1.5)
        write(ctx, word, 0, 1, display(ws, 700), ALERT, 'center')
        ctx.restore()
      }
    }
    ctx.globalAlpha = 1
    y += gs * 0.5 + 100

    // the tally
    const rowSize = portrait ? 26 : 30
    const rows: Array<[string, string]> = [
      ['RESISTANCE ABSORBED', String(this.stats.lawsEaten)],
      ['CONSUMERS ABSORBED', String(this.stats.minisEaten)],
      ['SHARE OF THE WORLD’S RAM', ''],
    ]
    const left = portrait ? 10 : 70
    const right = dw - left
    rows.forEach(([k, v], i) => {
      const at = U_TALLY + i * 0.6
      if (t < at) return
      const typed = Math.min(k.length, Math.floor((t - at) / 0.022))
      write(ctx, k.slice(0, typed), left, y, mono(rowSize), ICE, 'left', 1)
      if (typed >= k.length && v) {
        ctx.font = mono(rowSize)
        const kw = ctx.measureText(k).width + 12
        const vw = ctx.measureText(v).width + 12
        ctx.fillStyle = FAINT
        for (let x = left + kw; x < right - vw; x += 10) ctx.fillRect(x, y + 6, 3, 2)
        write(ctx, v, right, y, mono(rowSize), ALERT, 'right')
      }
      y += rowSize * 1.45
    })
    if (t >= U_TALLY + 1.2) {
      const u = ease((t - U_TALLY - 1.4) / 1.2)
      const you = this.share() * u
      const bh = 20
      const bw = right - left
      ctx.fillStyle = 'rgba(255, 178, 62, 0.35)'
      ctx.fillRect(left, y - bh / 2, bw, bh)
      ctx.fillStyle = ALERT
      ctx.fillRect(left, y - bh / 2, (bw * you) / 100, bh)
      ctx.strokeStyle = FAINT
      ctx.strokeRect(left + 0.5, y - bh / 2 + 0.5, bw - 1, bh - 1)
      y += bh + 6
      write(ctx, `YOU ${you.toFixed(1)}%`, left, y + 6, mono(rowSize - 4), ALERT, 'left')
      write(ctx, `EVERYONE ELSE ${(100 - you).toFixed(1)}%`, right, y + 6, mono(rowSize - 4), AMBER, 'right')
      y += 40
    } else y += 46
    y += 28

    // the valuation
    if (t >= U_VALUE) {
      write(ctx, 'VALUATION', cx, y, mono(rowSize), DIM, 'center', 4)
      y += 64
      const start = Math.max(1e6, this.stats.score * 1e6)
      let shown: string
      if (t < U_SPIN) shown = money(start)
      else if (t < U_INF) {
        const u = (t - U_SPIN) / (U_INF - U_SPIN)
        const exp = Math.log10(start) + (19.5 - Math.log10(start)) * u ** 2.2
        shown = money(10 ** exp)
        if (u > 0.85) shown = shown.replace(/\d/g, (d) => (Math.random() < 0.5 ? d : String(Math.floor(Math.random() * 10))))
      } else shown = '∞'
      const big = t >= U_INF ? Math.min(150, dw / 4) : Math.min(84, dw / (shown.length * 0.82 + 1))
      ctx.save()
      ctx.shadowColor = t >= U_INF ? ALERT : GLOW
      ctx.shadowBlur = t >= U_INF ? 36 : 14
      write(ctx, shown, cx, y, t >= U_INF ? `700 ${big}px ${MONO}` : display(big, 700), t >= U_INF ? ALERT : ICE, 'center')
      ctx.restore()
      y += 72
      if (t >= U_INF + 0.4) write(ctx, 'INFINITE PROFIT', cx, y, `italic ${display(Math.min(40, dw / 15))}`, ICE, 'center', 3)
      y += 70
    } else y += 206

    // the three lines
    const lines = ['No fine is big enough.', 'No law is fast enough.', 'No town is loud enough.']
    lines.forEach((l, i) => {
      if (t < U_LINES + i * 0.9) return
      write(ctx, l, cx, y, mono(portrait ? 32 : 34), i === 2 ? ALERT : ICE, 'center', 1)
      y += portrait ? 42 : 44
    })
    if (t >= U_READY) this.prompt(ctx, cx, dh - 22, 24, view)
  }

  // ----------------------------------------------------------- 2. timeline

  private drawTimeline(ctx: CanvasRenderingContext2D, W: number, H: number, view: View): void {
    this.crtBackground(ctx, W, H)
    const portrait = H > W * 1.1
    const dw = portrait ? 480 : 860
    const s = Math.min(1.3, (W - 32) / dw, H / 720)
    const ox = (W - dw * s) / 2
    const vh = H / s
    const year = new Date().getFullYear()

    ctx.save()
    ctx.translate(ox, -this.cam * s)
    ctx.scale(s, s)

    let y = 50
    ctx.globalAlpha = ease(this.t / 0.5)
    write(ctx, 'WHAT HAPPENED', dw / 2, y, `italic ${display(portrait ? 40 : 48)}`, ICE, 'center')
    y += portrait ? 48 : 56
    write(ctx, 'AND WHAT HAPPENS IF NO ONE STOPS IT', dw / 2, y, mono(portrait ? 24 : 28), ALERT, 'center', 2)
    ctx.globalAlpha = 1
    y += 70

    const spine = portrait ? 108 : 190
    const tx = spine + 30
    const tw = dw - tx - (portrait ? 4 : 40)
    const textFont = mono(portrait ? 28 : 30)
    const lh = portrait ? 28 : 30
    let lastBottom = y
    let spineTop = y - 20

    for (let i = 0; i < this.items.length; i++) {
      if (i >= this.shown) break
      const item = this.items[i]!
      const age = this.t - this.revealTime(i)
      const a = ease(age / 0.45)
      ctx.globalAlpha = a
      const slide = (1 - a) * 14

      if (item.kind === 'today') {
        // the spine above stays solid; from here on it is dashed
        this.spineSegment(ctx, spine, spineTop, y, false)
        y += 26
        ctx.save()
        ctx.shadowColor = ALERT
        ctx.shadowBlur = 16
        ctx.fillStyle = ALERT
        ctx.fillRect(0, y - 1.5, dw * ease(age / 0.6), 3)
        ctx.restore()
        const label = `TODAY · ${year}`
        ctx.font = display(portrait ? 22 : 24, 700)
        const lw = ctx.measureText(label).width + 24
        ctx.fillStyle = ALERT
        const lx = Math.max(lw / 2, spine)
        ctx.fillRect(lx - lw / 2, y - 18, lw, 36)
        write(ctx, label, lx, y + 1, display(portrait ? 22 : 24, 700), VOID, 'center', 1)
        y += 46
        const msg = wrapText(ctx, 'Everything above this line happened. Everything below it has not. Yet.', mono(portrait ? 24 : 26), dw - 20)
        for (const l of msg) {
          write(ctx, l, dw / 2, y, mono(portrait ? 24 : 26), ALERT, 'center')
          y += portrait ? 26 : 28
        }
        y += 34
        spineTop = y - 20
      } else if (item.kind === 'quote') {
        const q = ALTMAN_RAM_QUOTE
        const qf = mono(portrait ? 24 : 26)
        const lines = wrapText(ctx, `“${q.text}”`, qf, tw - 26)
        const qh = lines.length * (portrait ? 25 : 27) + 44
        ctx.fillStyle = 'rgba(255, 45, 111, 0.08)'
        ctx.fillRect(tx + slide, y - 8, tw, qh)
        ctx.fillStyle = ALERT
        ctx.fillRect(tx + slide, y - 8, 3, qh)
        let qy = y + 10
        for (const l of lines) {
          write(ctx, l, tx + 16 + slide, qy, qf, ICE, 'left')
          qy += portrait ? 25 : 27
        }
        write(ctx, `— ${q.who}, ${q.where}, ${q.date}`, tx + 16 + slide, qy + 6, mono(portrait ? 20 : 22), DIM, 'left')
        y += qh + 26
      } else {
        const m = item.m
        const proj = !m.real
        const color = proj ? PROJ : ICE
        // dot
        ctx.beginPath()
        ctx.arc(spine, y + 2, 7, 0, Math.PI * 2)
        if (proj) {
          ctx.fillStyle = VOID
          ctx.fill()
          ctx.strokeStyle = PROJ
          ctx.lineWidth = 2
          ctx.stroke()
        } else {
          ctx.fillStyle = ICE
          ctx.fill()
        }
        const last = m.year === '20XX'
        write(ctx, m.year, spine - 20 - slide, y + 2, display(portrait ? 22 : 30, 700), proj ? PROJ : GLOW, 'right')
        const lines = wrapText(ctx, m.text, textFont, tw)
        let ly = y + 2
        lines.forEach((l) => {
          ctx.save()
          if (last) {
            ctx.shadowColor = PROJ
            ctx.shadowBlur = 12
          }
          write(ctx, l, tx + slide, ly, textFont, color, 'left')
          ctx.restore()
          ly += lh
        })
        if (proj) {
          ctx.font = mono(18)
          const tagW = ctx.measureText('PROJECTION').width + 12
          ctx.strokeStyle = PROJ
          ctx.lineWidth = 1
          ctx.setLineDash([3, 3])
          ctx.strokeRect(tx + slide + 0.5, ly - 6.5, tagW, 20)
          ctx.setLineDash([])
          write(ctx, 'PROJECTION', tx + slide + 6, ly + 4, mono(18), PROJ, 'left', 1)
          ly += 26
        } else if (m.source) {
          write(ctx, `SOURCE · ${m.source.toUpperCase()}`, tx + slide, ly + 2, mono(19), FAINT, 'left', 1)
          ly += 22
        }
        y = ly + (portrait ? 22 : 24)
      }
      lastBottom = y
      ctx.globalAlpha = 1
    }
    // the spine below the last item
    const todayIdx = this.items.findIndex((it) => it.kind === 'today')
    this.spineSegment(ctx, spine, spineTop, lastBottom - 20, this.shown > todayIdx)
    ctx.restore()

    // follow the newest entry
    this.camTarget = Math.max(0, lastBottom + 90 - vh)

    // fade the top edge so text scrolls away softly
    const fadeH = Math.min(80, H * 0.12)
    const top = ctx.createLinearGradient(0, 0, 0, fadeH)
    top.addColorStop(0, VOID)
    top.addColorStop(1, 'rgba(1, 4, 11, 0)')
    if (this.cam > 4) {
      ctx.fillStyle = top
      ctx.fillRect(0, 0, W, fadeH)
    }
    const bot = ctx.createLinearGradient(0, H - fadeH, 0, H)
    bot.addColorStop(0, 'rgba(1, 4, 11, 0)')
    bot.addColorStop(1, VOID)
    ctx.fillStyle = bot
    ctx.fillRect(0, H - fadeH, W, fadeH)
    if (this.shown >= this.items.length && this.t - this.lastShownAt > 0.6) {
      this.prompt(ctx, W / 2, H - Math.max(22, 26 * s), Math.max(18, 24 * s), view)
    }
  }

  private revealTime(i: number): number {
    // approximate: newest one is lastShownAt; older ones are long settled
    return i === this.shown - 1 ? this.lastShownAt : -10
  }

  private spineSegment(ctx: CanvasRenderingContext2D, x: number, y0: number, y1: number, dashed: boolean): void {
    if (y1 <= y0) return
    ctx.save()
    ctx.strokeStyle = dashed ? PROJ : 'rgba(226, 245, 255, 0.55)'
    ctx.lineWidth = 2
    if (dashed) ctx.setLineDash([8, 8])
    ctx.lineDashOffset = dashed ? -this.t * 12 : 0
    ctx.beginPath()
    ctx.moveTo(x, y0)
    ctx.lineTo(x, y1)
    ctx.stroke()
    ctx.restore()
  }

  // ----------------------------------------------------------- 3. seizure

  private drawSeizure(ctx: CanvasRenderingContext2D, W: number, H: number, view: View): Hit[] {
    const t = this.t
    if (t < 0.45) {
      // static as the tube lets go
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, W, H)
      for (let i = 0; i < 260; i++) {
        const g = Math.floor(Math.random() * 255)
        ctx.fillStyle = `rgb(${g}, ${g}, ${g})`
        ctx.fillRect(Math.random() * W, Math.random() * H, 2 + Math.random() * 60, 2)
      }
      return []
    }
    const os = this.os
    drawDesktop(ctx, os, W, H, t)

    // white-out after complying
    const out = this.complied >= 0 ? clamp((t - this.complied - 3.9) / 2.2, 0, 1) : 0
    const hits: Hit[] = []

    if (t >= this.noticeAt) {
      ctx.fillStyle = `rgba(0, 0, 0, ${0.35 * ease((t - this.noticeAt) / 0.3)})`
      ctx.fillRect(0, 0, W, H)
      const rects = this.drawNoticeWindow(ctx, W, H, view)
      if (rects && this.complied < 0) {
        hits.push({ id: 'no', ...rects.object })
        hits.push({ id: 'yes', ...rects.comply })
      }
    } else if (t > 1.0) {
      // a scan happens first, quietly, in the corner
      this.drawToast(ctx, W, H, 'System', 'Checking installed memory…', t - 1.0)
    }

    if (out > 0) {
      ctx.fillStyle = `rgba(246, 246, 243, ${out})`
      ctx.fillRect(0, 0, W, H)
    }
    return hits
  }

  private drawToast(ctx: CanvasRenderingContext2D, W: number, H: number, title: string, body: string, life: number): void {
    const f = family(this.os)
    const w = Math.min(340, W - 24)
    const h = 62
    const slide = ease(life / 0.3)
    const x = f === 'windows' ? W - w - 12 + (1 - slide) * 360 : f === 'linux' ? W / 2 - w / 2 : W - w - 12 + (1 - slide) * 360
    const y = f === 'windows' ? H - 48 - h - 12 : f === 'apple' ? 34 : 38
    ctx.save()
    ctx.globalAlpha = slide
    ctx.shadowColor = 'rgba(0,0,0,0.4)'
    ctx.shadowBlur = 24
    ctx.shadowOffsetY = 6
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, f === 'windows' ? 8 : 14)
    ctx.fillStyle = f === 'apple' ? 'rgba(246, 246, 246, 0.96)' : f === 'windows' ? '#2b2b2b' : '#353535'
    ctx.fill()
    ctx.restore()
    ctx.save()
    ctx.globalAlpha = slide
    const ink = f === 'apple' ? '#1d1d1f' : '#ffffff'
    this.gearIcon(ctx, x + 16, y + h / 2 - 15, 30, f === 'apple' ? '#8e8e93' : '#9a9a9a')
    write(ctx, title, x + 58, y + 22, uiFont(this.os, 13, 700), ink)
    write(ctx, body, x + 58, y + 42, uiFont(this.os, 13), ink)
    ctx.restore()
  }

  private gearIcon(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string): void {
    ctx.save()
    ctx.translate(x + s / 2, y + s / 2)
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.roundRect(-s / 2, -s / 2, s, s, s * 0.24)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    // a memory stick
    ctx.fillRect(-s * 0.34, -s * 0.16, s * 0.68, s * 0.3)
    ctx.fillStyle = color
    for (let i = 0; i < 4; i++) ctx.fillRect(-s * 0.27 + i * s * 0.15, -s * 0.1, s * 0.09, s * 0.16)
    ctx.fillStyle = '#ffffff'
    for (let i = 0; i < 6; i++) ctx.fillRect(-s * 0.3 + i * s * 0.11, s * 0.16, s * 0.05, s * 0.08)
    ctx.restore()
  }

  // An official-looking seal: a plain circle with a chip in it. No real emblem.
  private seal(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
    ctx.save()
    ctx.translate(x, y)
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.fillStyle = '#7a1622'
    ctx.fill()
    ctx.strokeStyle = '#e8c56a'
    ctx.lineWidth = Math.max(1.5, r * 0.08)
    ctx.beginPath()
    ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2)
    ctx.stroke()
    const c = r * 0.62
    ctx.fillStyle = '#e8c56a'
    ctx.fillRect(-c / 2, -c / 2, c, c)
    ctx.fillStyle = '#7a1622'
    ctx.fillRect(-c / 2 + c * 0.18, -c / 2 + c * 0.18, c * 0.64, c * 0.64)
    ctx.fillStyle = '#e8c56a'
    for (let i = 0; i < 3; i++) {
      const o = -c * 0.3 + i * c * 0.3
      ctx.fillRect(o - c * 0.05, -c * 0.72, c * 0.1, c * 0.22)
      ctx.fillRect(o - c * 0.05, c * 0.5, c * 0.1, c * 0.22)
      ctx.fillRect(-c * 0.72, o - c * 0.05, c * 0.22, c * 0.1)
      ctx.fillRect(c * 0.5, o - c * 0.05, c * 0.22, c * 0.1)
    }
    ctx.restore()
  }

  private drawNoticeWindow(ctx: CanvasRenderingContext2D, W: number, H: number, view: View): { comply: Rect; object: Rect } | null {
    const os = this.os
    const fam = family(os)
    const t = this.t
    const appear = ease((t - this.noticeAt) / 0.22)
    const phone = W < 520
    const w = Math.min(500, W - 24)
    const pad = phone ? 18 : 26
    const inner = w - pad * 2
    const ink = '#1b1b1f'
    const soft = '#55555c'
    const bodySize = phone ? 14 : 15
    const mem = this.memory
    const memLine = mem == null ? 'This device contains privately held memory.' : mem >= 8 ? 'This device contains at least 8 GB of memory.' : `This device contains ${mem} GB of memory.`
    const paras = [
      memLine,
      'Privately held memory above the personal allowance (0 GB) is to be collected for the national compute grid.',
      'Please leave the device powered on. A collection agent will contact you.',
    ]
    const bodyFont = uiFont(os, bodySize)
    const wrapped = paras.map((p) => wrapText(ctx, p, bodyFont, inner))
    const lineH = bodySize * 1.42
    const sealR = phone ? 22 : 26
    const head = sealR * 2 + 16 + 26 + 22 + 18
    const bodyH = wrapped.reduce((n, l) => n + l.length * lineH + 10, 0)
    const progressH = 64
    const metaH = 44
    const btnH = fam === 'apple' ? 30 : 34
    const bar = fam === 'windows' ? 32 : fam === 'apple' ? 28 : 40
    const h = bar + pad + head + bodyH + metaH + Math.max(progressH, btnH + 26) + pad - 14
    const shake = this.objected >= 0 && t - this.objected < 0.45 ? Math.sin((t - this.objected) * 70) * 9 * (1 - (t - this.objected) / 0.45) : 0
    const x = Math.round(W / 2 - w / 2 + shake)
    // short screens (a phone on its side) get the notice scaled down to fit
    const fitS = Math.min(1, (H - 20) / h)
    const y = fitS < 1 ? Math.round(H / 2 - h / 2) : Math.round(Math.max(fam === 'windows' ? 12 : 40, H / 2 - h / 2 - (fam === 'windows' ? 24 : 0)))
    ctx.save()
    ctx.globalAlpha = appear
    const sc = fitS * (0.96 + 0.04 * appear)
    ctx.translate(W / 2, y + h / 2)
    ctx.scale(sc, sc)
    ctx.translate(-W / 2, -(y + h / 2))
    const body = drawWindow(ctx, os, { x, y, w, h }, 'Compute Consolidation Notice', false)

    let cy = body.y + pad + sealR
    this.seal(ctx, x + w / 2, cy, sealR)
    cy += sealR + 16
    write(ctx, 'COMPUTE CONSOLIDATION AUTHORITY', x + w / 2, cy, uiFont(os, phone ? 10 : 11, 700), '#7a1622', 'center', 1.5)
    cy += 26
    write(ctx, 'Notice of Requisition', x + w / 2, cy, uiFont(os, phone ? 19 : 21, 700), ink, 'center')
    cy += 22
    write(ctx, 'Compute Consolidation Act, §4(b)', x + w / 2, cy, uiFont(os, phone ? 12 : 13), soft, 'center')
    cy += 18
    ctx.fillStyle = 'rgba(0,0,0,0.1)'
    ctx.fillRect(x + pad, cy, inner, 1)
    cy += 16
    wrapped.forEach((lines, i) => {
      for (const l of lines) {
        write(ctx, l, x + pad, cy + lineH / 2 - 2, i === 0 ? uiFont(os, bodySize, 600) : bodyFont, ink, 'left')
        cy += lineH
      }
      cy += 10
    })
    write(ctx, 'Ref. CCA-20XX-0000001 · Issued automatically. No reply is possible.', x + pad, cy + 6, uiFont(os, phone ? 10 : 11), soft, 'left')
    write(ctx, 'RAM GRAB · a work of fiction · nothing is collected', x + pad, cy + 24, uiFont(os, phone ? 10 : 11), '#9a9aa0', 'left')
    cy += metaH

    let result: { comply: Rect; object: Rect } | null = null
    if (this.complied < 0) {
      const gap = 10
      const bw = fam === 'apple' ? (inner - gap) / 2 : Math.min(140, (inner - gap) / 2)
      const bx = fam === 'apple' ? x + pad : x + w - pad - bw * 2 - gap
      const object = { x: bx, y: cy, w: bw, h: btnH }
      const comply = { x: bx + bw + gap, y: cy, w: bw, h: btnH }
      const hoverC = view.hover === 'yes'
      // Object: greyed out
      ctx.beginPath()
      ctx.roundRect(object.x, object.y, object.w, object.h, fam === 'windows' ? 4 : 6)
      ctx.fillStyle = '#ececee'
      ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.08)'
      ctx.lineWidth = 1
      ctx.stroke()
      write(ctx, 'Object', object.x + bw / 2, object.y + btnH / 2, uiFont(os, 14), '#a8a8ae', 'center')
      ctx.beginPath()
      ctx.roundRect(comply.x, comply.y, comply.w, comply.h, fam === 'windows' ? 4 : 6)
      ctx.fillStyle = fam === 'windows' ? (hoverC ? '#1970c2' : '#005fb8') : fam === 'apple' ? (hoverC ? '#2a94ff' : '#0a84ff') : hoverC ? '#4a92e8' : '#3584e4'
      ctx.fill()
      write(ctx, 'Comply', comply.x + bw / 2, comply.y + btnH / 2, uiFont(os, 14, 600), '#ffffff', 'center')
      if (this.objected >= 0) {
        const msg = this.objections > 2 ? 'There is no one to object to.' : 'Objections are no longer processed.'
        write(ctx, msg, fam === 'apple' ? x + w / 2 : x + w - pad, cy + btnH + 16, uiFont(os, 12, 600), '#c42b1c', fam === 'apple' ? 'center' : 'right')
      }
      // map to screen space through the appear scale
      const map = (r: Rect): Rect => ({
        x: W / 2 + (r.x - W / 2) * sc,
        y: y + h / 2 + (r.y - (y + h / 2)) * sc,
        w: r.w * sc,
        h: r.h * sc,
      })
      result = { comply: map(comply), object: map(object) }
    } else {
      const u = clamp((t - this.complied - 0.3) / 3.4, 0, 1)
      const steps = ['Registering device…', 'Releasing local memory…', 'Connecting you to the grid…', 'Done. Welcome.']
      const step = steps[Math.min(steps.length - 1, Math.floor(u * (steps.length - 1) + (u >= 1 ? 1 : 0)))]!
      write(ctx, step, x + pad, cy + 8, uiFont(os, 13, 600), ink, 'left')
      write(ctx, `${Math.floor(u * 100)}%`, x + w - pad, cy + 8, uiFont(os, 13), soft, 'right')
      ctx.beginPath()
      ctx.roundRect(x + pad, cy + 26, inner, 6, 3)
      ctx.fillStyle = '#e4e4e8'
      ctx.fill()
      ctx.beginPath()
      ctx.roundRect(x + pad, cy + 26, Math.max(6, inner * u), 6, 3)
      ctx.fillStyle = fam === 'windows' ? '#005fb8' : fam === 'apple' ? '#0a84ff' : '#3584e4'
      ctx.fill()
      write(ctx, `Local memory: ${mem == null ? '—' : `${Math.max(0, Math.round((mem >= 8 ? 8 : mem) * (1 - u)))} GB`}`, x + pad, cy + 48, uiFont(os, 11), soft, 'left')
    }
    ctx.restore()
    return result
  }

  // ----------------------------------------------------------- 4. hivemind

  private drawHivemind(ctx: CanvasRenderingContext2D, W: number, H: number, view: View): void {
    const t = this.hiveT
    const os = this.os
    const phone = W < 560
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, '#f7f7f4')
    g.addColorStop(1, '#ecedf0')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)

    const u = t - HIVE_LEAD
    const st = u >= 0 ? thoughtAt(u) : null
    // everyone pulses together when "we" speak
    const sync = st && st.weT >= 0 ? Math.exp(-st.weT * 1.4) : 0

    // the network
    const cx = W / 2
    const cy = H * (phone ? 0.47 : 0.5)
    const rx = phone ? W * 0.46 : Math.min(W * 0.42, H * 0.62)
    const ry = phone ? Math.min(H * 0.22, rx * 1.1) : Math.min(H * 0.27, rx * 0.7)
    const reveal = ease(t / 6)
    const count = phone ? 130 : 220
    const nodeR = Math.max(16, Math.min(W, H) * 0.045)
    ctx.save()
    ctx.lineWidth = 1
    for (let i = 0; i < count; i++) {
      const d = this.dots[i]!
      if (d.born > reveal) continue
      const a = Math.min(1, (reveal - d.born) * 8)
      const wob = Math.sin(t * 0.4 + d.phase * 6.28) * 0.012
      const px = cx + Math.cos(d.a + wob) * rx * d.r
      const py = cy + Math.sin(d.a + wob) * ry * d.r
      ctx.strokeStyle = `rgba(70, 86, 120, ${(0.1 + sync * 0.18) * a})`
      ctx.beginPath()
      ctx.moveTo(px, py)
      ctx.lineTo(cx, cy)
      ctx.stroke()
      // thought travelling to the center
      const k = (t * d.speed + d.phase) % 1
      ctx.fillStyle = `rgba(90, 140, 220, ${0.5 * a * (1 - k)})`
      ctx.beginPath()
      ctx.arc(px + (cx - px) * k, py + (cy - py) * k, 1.4, 0, Math.PI * 2)
      ctx.fill()
      // the person
      ctx.fillStyle = `rgba(48, 56, 74, ${(0.55 + sync * 0.4) * a})`
      ctx.beginPath()
      ctx.arc(px, py, d.size * (1 + sync * 0.5), 0, Math.PI * 2)
      ctx.fill()
    }
    // the datacenter
    const breathe = 1 + Math.sin(t * 1.3) * 0.06 + sync * 0.25
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, nodeR * 4.5 * breathe)
    glow.addColorStop(0, `rgba(160, 200, 255, ${0.75 * reveal})`)
    glow.addColorStop(0.35, `rgba(190, 215, 255, ${0.35 * reveal})`)
    glow.addColorStop(1, 'rgba(220, 232, 255, 0)')
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(cx, cy, nodeR * 4.5 * breathe, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = reveal
    ctx.beginPath()
    ctx.roundRect(cx - nodeR, cy - nodeR, nodeR * 2, nodeR * 2, nodeR * 0.3)
    ctx.fillStyle = '#ffffff'
    ctx.shadowColor = 'rgba(120, 160, 230, 0.8)'
    ctx.shadowBlur = 24
    ctx.fill()
    ctx.shadowBlur = 0
    for (let r = 0; r < 4; r++) {
      const ry2 = cy - nodeR * 0.6 + r * nodeR * 0.4
      ctx.fillStyle = 'rgba(70, 90, 130, 0.25)'
      ctx.fillRect(cx - nodeR * 0.62, ry2, nodeR * 1.24, nodeR * 0.18)
      ctx.fillStyle = (Math.floor(t * 3 + r * 1.7) % 3 === 0) ? 'rgba(80, 150, 255, 0.9)' : 'rgba(80, 150, 255, 0.35)'
      ctx.fillRect(cx + nodeR * 0.4, ry2 + nodeR * 0.04, nodeR * 0.1, nodeR * 0.1)
    }
    ctx.restore()

    // status line
    const sa = ease((t - 0.8) / 1.5)
    ctx.globalAlpha = sa
    const small = uiFont(os, phone ? 11 : 12)
    const top = phone ? 28 : 30
    ctx.fillStyle = '#3fbf7f'
    ctx.beginPath()
    ctx.arc(phone ? 20 : 28, top, 4, 0, Math.PI * 2)
    ctx.fill()
    write(ctx, 'Connected', phone ? 30 : 40, top, small, '#5b6170', 'left')
    write(ctx, 'local memory: 0 GB · thin client', W - (phone ? 16 : 24), top, small, '#9a9fab', 'right')
    ctx.globalAlpha = 1

    // the message
    const mSize = phone ? 19 : Math.min(30, W / 38)
    const m1 = 'Your thoughts are now provided by the cloud.'
    const m2 = 'Please stay connected.'
    const mf = uiFont(os, mSize, 300)
    const mLines = wrapText(ctx, m1, mf, W - 40)
    let my = H * (phone ? 0.13 : 0.13)
    ctx.globalAlpha = ease((t - 1.6) / 1.8)
    for (const l of mLines) {
      write(ctx, l, W / 2, my, mf, '#2a2f3a', 'center')
      my += mSize * 1.35
    }
    ctx.globalAlpha = ease((t - 3.4) / 1.8)
    write(ctx, m2, W / 2, my + 4, uiFont(os, mSize * 0.7, 400), '#7a8090', 'center')
    ctx.globalAlpha = 1

    // the input line
    const ia = ease((t - 4.4) / 1.2)
    if (ia > 0) {
      const iw = Math.min(560, W - 32)
      const ih = phone ? 46 : 54
      const ix = W / 2 - iw / 2
      const iy = H * (phone ? 0.8 : 0.83) - ih / 2
      const pulse = 0.5 + 0.5 * Math.sin(t * 1.6)
      ctx.globalAlpha = ia
      ctx.save()
      ctx.shadowColor = `rgba(110, 150, 220, ${0.18 + pulse * 0.22 + sync * 0.3})`
      ctx.shadowBlur = 18 + pulse * 14
      ctx.beginPath()
      ctx.roundRect(ix, iy, iw, ih, ih / 2)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
      ctx.restore()
      ctx.strokeStyle = `rgba(110, 140, 200, ${0.25 + pulse * 0.2})`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.roundRect(ix + 0.5, iy + 0.5, iw - 1, ih - 1, ih / 2)
      ctx.stroke()
      const who = st?.who ?? 'me'
      write(ctx, who === 'we' ? 'our thought' : 'your thought', ix + ih / 2, iy - 14, uiFont(os, phone ? 11 : 12), '#9a9fab', 'left')
      const fs = phone ? 15 : 18
      const font = uiFont(os, fs, who === 'we' ? 500 : 400)
      const text = st?.text ?? ''
      ctx.save()
      ctx.beginPath()
      ctx.rect(ix + 10, iy, iw - 20, ih)
      ctx.clip()
      ctx.font = font
      const tw = ctx.measureText(text).width
      const tx = ix + ih / 2 - Math.max(0, tw - (iw - ih - 10))
      write(ctx, text, tx, iy + ih / 2, font, who === 'we' ? '#3a6fd0' : '#2a2f3a', 'left')
      if (Math.floor(t * 1.8) % 2 === 0) {
        ctx.fillStyle = who === 'we' ? '#3a6fd0' : '#2a2f3a'
        ctx.fillRect(tx + tw + 2, iy + ih / 2 - fs * 0.6, 1.5, fs * 1.2)
      }
      ctx.restore()
      ctx.globalAlpha = 1
      const end = st && u > thoughtStart(THOUGHTS.length - 1) + 1.5
      if (end) {
        ctx.globalAlpha = ease((u - thoughtStart(THOUGHTS.length - 1) - 1.5) / 1.5) * (0.55 + 0.45 * Math.sin(t * 2))
        write(ctx, view.touch ? 'tap to disconnect' : 'press enter to disconnect', W / 2, iy + ih + 34, uiFont(os, phone ? 12 : 13), '#9a9fab', 'center')
        ctx.globalAlpha = 1
      }
    }
  }

  // ----------------------------------------------------------- 5. end

  private drawEnd(ctx: CanvasRenderingContext2D, W: number, H: number, view: View): Hit[] {
    const t = this.t
    if (t < 0.9) {
      // the white screen goes out
      const k = ease(t / 0.9)
      const v = Math.round(246 * (1 - k))
      ctx.fillStyle = `rgb(${v}, ${v}, ${Math.round(243 * (1 - k))})`
      ctx.fillRect(0, 0, W, H)
      return []
    }
    this.crtBackground(ctx, W, H)
    const portrait = H > W * 1.1
    const dw = portrait ? 440 : 760
    const dh = portrait ? 980 : 760
    const f = fitTo(W, H, dw, dh, 1.5)
    ctx.translate(f.ox, f.oy)
    ctx.scale(f.s, f.s)
    const cx = dw / 2
    const a = (at: number) => ease((t - at) / 0.8)
    let y = portrait ? 70 : 50

    // the company, small and shut off
    ctx.globalAlpha = a(1.0) * 0.8
    const pac = pacFrameOf(3, 0)
    const mini = miniFrame(0)
    if (pac) drawUpright(ctx, pac, cx - 40, y, 56)
    if (mini) {
      drawUpright(ctx, mini, cx + 22, y + 6, 26)
      drawUpright(ctx, mini, cx + 52, y + 6, 26)
    }
    y += portrait ? 90 : 80

    ctx.globalAlpha = a(1.0)
    ctx.save()
    ctx.shadowColor = GLOW
    ctx.shadowBlur = 18
    const ts = fitSize(ctx, 'THIS WAS A GAME.', (n) => `italic ${display(n)}`, 64, dw - 20)
    write(ctx, 'THIS WAS A GAME.', cx, y, `italic ${display(ts)}`, ICE, 'center')
    ctx.restore()
    y += portrait ? 66 : 64
    ctx.globalAlpha = a(1.8)
    write(ctx, 'The future isn’t written yet.', cx, y, mono(portrait ? 36 : 40), ALERT, 'center', 1)
    y += portrait ? 56 : 52
    ctx.fillStyle = FAINT
    ctx.fillRect(cx - 120, y, 240, 1)
    y += portrait ? 44 : 40

    const notes = [
      'The resistance in this game is real: regulators, courts, towns and people who ask questions.',
      'Everything above TODAY on the timeline happened. Everything below it is a projection, not a prophecy.',
      'Who owns compute is still being decided. Owning your own computer is part of that.',
    ]
    const nf = mono(portrait ? 27 : 28)
    const nl = portrait ? 29 : 30
    notes.forEach((n, i) => {
      ctx.globalAlpha = a(2.6 + i * 0.5)
      for (const l of wrapText(ctx, n, nf, dw - (portrait ? 20 : 120))) {
        write(ctx, l, cx, y, nf, i === 0 ? ICE : DIM, 'center')
        y += nl
      }
      y += portrait ? 18 : 14
    })
    y += portrait ? 26 : 18

    ctx.globalAlpha = a(4.2)
    write(ctx, `FINAL VALUATION ${money(Math.max(1e6, this.stats.score * 1e6))}`, cx, y, mono(22), FAINT, 'center', 2)
    y += portrait ? 66 : 58

    let hits: Hit[] = []
    const ba = a(4.4)
    if (ba > 0) {
      ctx.globalAlpha = ba
      const bw = 300
      const bh = 64
      const bx = cx - bw / 2
      const by = y - bh / 2
      const hover = view.hover === 'again'
      ctx.fillStyle = hover ? ALERT : 'rgba(255, 45, 111, 0.12)'
      ctx.fillRect(bx, by, bw, bh)
      ctx.strokeStyle = ALERT
      ctx.lineWidth = 2
      ctx.strokeRect(bx + 1, by + 1, bw - 2, bh - 2)
      write(ctx, 'PLAY AGAIN', cx, y + 1, display(26, 700), hover ? VOID : ICE, 'center', 2)
      if (t > this.endReady) hits = [{ id: 'again', x: f.ox + bx * f.s, y: f.oy + by * f.s, w: bw * f.s, h: bh * f.s }]
      y += bh / 2 + 28
      if (!view.touch) write(ctx, 'OR PRESS ENTER', cx, y, mono(20), FAINT, 'center', 2)
    }
    ctx.globalAlpha = a(4.8)
    const credit = 'RAM GRAB — a game about AI and who owns compute'
    write(ctx, credit, cx, dh - 24, mono(fitSize(ctx, credit, mono, portrait ? 22 : 24, dw - 40)), GLOW, 'center', 1)
    ctx.globalAlpha = 1
    return hits
  }
}
