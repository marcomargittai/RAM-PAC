// The ending of PAC RAM. The glass is broken, nothing is left to stop the
// company, and memory becomes something people can't afford.
//
//   timeline  what happened (with sources), TODAY, then what could happen as
//             memory keeps getting more expensive
//   seizure   the CRT drops away; the player's own computer shows a notice that
//             its memory is being collected. The only answer is Comply.
//   cost      the tube comes back on: what it cost everyone else (laptop prices
//             up, computer ownership down, around the same laptop the
//             upgrade screens strip), then "This was a game." with the real
//             price rise and Altman's real quote. CONTINUE.
//   score     the arcade ending: GAME OVER, the RAM you collected as the high
//             score, the share bar (you against the consumers), PLAY AGAIN.

import type { Bed } from './audio'
import { detectOs, type Os } from './intel'
import { drawDesktop, drawWindow, family, uiFont, wrapText, type Rect } from './osui'
import { ALERT, GLOW, ICE, VOID } from './palette'
import { DISPLAY, MONO } from './render'
import type { Hit, HitId, View } from './screen'
import { TIMELINE, type Milestone } from './headlines'
import { LAP_H, LAP_W, STICKS, drawFigure, drawLaptop, drawPriceTag, drawStamp, type TagPlace } from './upgrade'

export interface EndingStats {
  score: number
  ramYou: number
  ramThem: number
  minisEaten: number
  // how many times the player switched a resistance ghost off
  lawsDisabled: number
}

export interface EndingHooks {
  // no longer called (the typing sound was too much); kept so callers compile
  type(): void
  stamp(): void
  alarm(): void
  hum(): void
  click(): void
}

export type EndingPhase = 'timeline' | 'seizure' | 'cost' | 'score'

// what it costs everyone else is bad news: those numbers are red
const RED = '#ff2e45'
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

// ------------------------------------------------------------- timeline items

type Item = { kind: 'm'; m: Milestone } | { kind: 'today' }

function buildItems(): Item[] {
  const items: Item[] = []
  const firstProj = TIMELINE.findIndex((m) => !m.real)
  TIMELINE.forEach((m, i) => {
    if (i === firstProj) items.push({ kind: 'today' })
    items.push({ kind: 'm', m })
  })
  if (firstProj < 0) items.push({ kind: 'today' })
  return items
}

// ------------------------------------------------------------- cost screen timing

// white fades to black, then the tube comes back on
const C_ON = 0.9
// everyone else: the laptop's price counts up as its memory is torn out, the
// stamp lands, then the people who still own a computer grey out
const C_HEAD = 1.3
const C_PRICE = 1.6
const COUNT = 1.2
const C_PULL = C_PRICE + 0.35
const C_STAMP = C_PULL + COUNT + 0.15
const C_OWN = C_STAMP + 0.1
const C_NOTE = C_OWN + 0.35 + COUNT + 0.15
// perspective
const C_RULE = C_NOTE + 0.2
const C_GAME = C_RULE + 0.3
const C_REAL = C_GAME + 0.5
const C_QUOTE = C_REAL + 0.5
const C_READY = C_QUOTE + 0.7
// Enter jumps to the end of the next beat
const C_BEATS = [C_STAMP + 0.3, C_NOTE, C_READY]

// the quote at the end of the cost screen
const LEX_QUOTE = {
  who: 'Sam Altman',
  where: 'Lex Fridman Podcast',
  date: 'Mar 2024',
  text: 'I think compute is going to be the currency of the future. I think it’ll be maybe the most precious commodity in the world.',
  url: 'https://lexfridman.com/sam-altman-2-transcript',
}

// the row of people, as on the upgrade screens
const PEOPLE = 20

// ------------------------------------------------------------- score screen timing

const S_HEAD = 0.25
const S_BAR = 0.7
const S_FILL = 1.5
const S_SHARE = S_BAR + S_FILL + 0.25
const S_STATS = S_SHARE + 0.6
const S_READY = S_STATS + 0.7
const S_BEATS = [S_SHARE + 0.3, S_READY]

// the game's own numbers: 2022 is roughly real, 20XX is the game's future
const PRICE_THEN = 899
const PRICE_NOW = 9999
const OWN_THEN = 80
const OWN_NOW = 3

// the consumers' colour, as on the HUD
const CONSUMER = '#ffc94a'

// ------------------------------------------------------------- the ending

export class Ending {
  phase: EndingPhase = 'timeline'
  t = 0
  glitch = 0.7
  flat = 0
  power = 1
  done = false

  private os: Os
  private fired = new Set<string>()
  private quiet = false
  private lastClick = 0

  // timeline
  private items = buildItems()
  private shown = 0
  private nextAt = 0.7
  private lastShownAt = 0
  private cam = 0
  private camTarget = 0

  // seizure
  private noticeAt = 1.6
  private complied = -1
  private objected = -1
  private objections = 0

  constructor(
    private stats: EndingStats,
    private hooks: EndingHooks,
    opts: { os?: Os } = {},
  ) {
    this.os = opts.os ?? detectOs()
  }

  // What the music should do: the game's tension through the timeline, a held
  // hush at TODAY, quiet on the desktop, a hush as the tube comes back, the
  // aftermath over what it cost, and the finale for the score.
  get bed(): Bed {
    if (this.phase === 'timeline') return this.todayShown ? 'hush' : 'tense'
    if (this.phase === 'seizure') return 'quiet'
    if (this.phase === 'cost') return this.t < C_ON ? 'hush' : 'aftermath'
    return 'finale'
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
      this.nextAt = 0.7
      this.cam = 0
      this.camTarget = 0
    } else if (phase === 'seizure') {
      this.glitch = 1
    } else if (phase === 'cost') {
      // straight from the flat white desktop: the tube is off until C_ON
      this.glitch = 0
      this.flat = 1
    } else {
      this.glitch = 0.8
      this.flat = 0
      this.power = 1
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
    if (this.phase === 'timeline') {
      if (this.shown < this.items.length) this.nextAt = Math.min(this.nextAt, this.t)
      else if (this.t - this.lastShownAt > 0.6) this.go('seizure')
    } else if (this.phase === 'seizure') {
      // the notice's default button is Comply
      if (this.t > this.noticeAt + 0.8) this.comply()
    } else if (this.phase === 'cost') {
      if (this.t < C_READY) this.skipTo(C_BEATS, C_READY)
      else if (this.t > C_READY + 0.3) this.go('score')
    } else if (this.t < S_READY) this.skipTo(S_BEATS, S_READY)
    else if (this.t > S_READY + 0.3) this.done = true
  }

  // Jump to the end of the next beat, without the sounds on the way.
  private skipTo(beats: number[], ready: number): void {
    const to = beats.find((b) => b > this.t + 0.01) ?? ready
    this.quiet = true
    this.update(to - this.t)
    this.quiet = false
  }

  // A button returned by draw() was pressed.
  press(id: HitId): void {
    if (id === 'yes') this.comply()
    else if (id === 'no') this.object()
    else if (id === 'again') {
      if (this.phase === 'score' && this.t >= S_READY) this.done = true
    } else if (id === 'action' && this.phase === 'cost') {
      if (this.t >= C_READY) this.go('score')
      else this.advance()
    } else this.advance()
  }

  // No extra keys any more: Enter/Space go through advance().
  key(_key: string): boolean {
    return false
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

    if (this.phase === 'timeline') {
      this.flat = 0
      this.power = 1
      if (this.shown < this.items.length && this.t >= this.nextAt) {
        const item = this.items[this.shown]!
        this.shown++
        this.lastShownAt = this.t
        let gap: number
        if (item.kind === 'today') {
          this.hooks.stamp()
          this.glitch = 0.8
          gap = 2.4
        } else gap = item.m.real ? 1.4 : 1.7
        this.nextAt = this.t + gap
      }
      this.cam += (this.camTarget - this.cam) * Math.min(1, dt * 3.5)
    } else if (this.phase === 'seizure') {
      // A burst of static, then the tube is gone and this is your computer.
      this.flat = this.t < 0.45 ? 0 : 1
      this.power = this.t < 0.45 ? 1 - (this.t / 0.45) * 0.6 : 1
      if (this.t < 0.45) this.glitch = 1
      this.once('alarm', this.noticeAt, () => this.hooks.alarm())
      if (this.complied >= 0 && this.t - this.complied > 5.0) this.go('cost')
    } else if (this.phase === 'cost') {
      // the white desktop goes out, then the tube switches back on: a hum, a
      // flash of static, and the picture opens from a line
      this.flat = this.t < C_ON ? 1 : 0
      this.power = this.t < C_ON ? 1 : clamp((this.t - C_ON) / 0.7, 0.04, 1)
      this.once('on', C_ON, () => {
        this.hooks.hum()
        this.glitch = 0.9
      })
      this.once('rent', C_STAMP, () => {
        this.hooks.stamp()
        this.glitch = 0.7
      })
      this.once('game', C_GAME, () => {
        this.glitch = 0.6
      })
    } else {
      this.flat = 0
      this.power = 1
      // the high score counts up with a ticker, then the verdict lands
      if (this.t > S_BAR && this.t < S_BAR + S_FILL && !this.quiet && this.t - this.lastClick > 0.09) {
        this.lastClick = this.t
        this.hooks.click()
      }
      this.once('share', S_SHARE, () => {
        this.hooks.stamp()
        this.glitch = 0.7
      })
    }
  }

  draw(ctx: CanvasRenderingContext2D, view: View): Hit[] {
    const W = view.width
    const H = view.height
    ctx.save()
    ctx.textBaseline = 'middle'
    let hits: Hit[] = []
    if (this.phase === 'timeline') this.drawTimeline(ctx, W, H, view)
    else if (this.phase === 'seizure') hits = this.drawSeizure(ctx, W, H, view)
    else if (this.phase === 'cost') hits = this.drawCost(ctx, W, H, view)
    else hits = this.drawScore(ctx, W, H, view)
    ctx.restore()
    return hits
  }

  // ----------------------------------------------------------- CRT helpers

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
    const sub = 'AND WHAT HAPPENS IF PRICES KEEP RISING'
    write(ctx, sub, dw / 2, y, mono(fitSize(ctx, sub, mono, portrait ? 24 : 28, dw - 10)), ALERT, 'center', 2)
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
        const last = m === TIMELINE[TIMELINE.length - 1]
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
        if (!proj && m.source) {
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

    // white-out after complying, full just before the final screen takes over
    const out = this.complied >= 0 ? clamp((t - this.complied - 3.5) / 1.3, 0, 1) : 0
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

  // The notice's body. No figures: just that the memory is going.
  private noticeText(): string[] {
    return [
      'This device contains memory that is to be collected.',
      'Memory is too scarce to sit idle in homes.',
      'Please leave the device powered on. Your cloud computer is ready: $3 a month.',
    ]
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
    const paras = this.noticeText()
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
    const body = drawWindow(ctx, os, { x, y, w, h }, 'Memory Allocation Notice', false)

    let cy = body.y + pad + sealR
    this.seal(ctx, x + w / 2, cy, sealR)
    cy += sealR + 16
    write(ctx, 'MEMORY ALLOCATION AUTHORITY', x + w / 2, cy, uiFont(os, phone ? 10 : 11, 700), '#7a1622', 'center', 1.5)
    cy += 26
    write(ctx, 'Notice of Collection', x + w / 2, cy, uiFont(os, phone ? 19 : 21, 700), ink, 'center')
    cy += 22
    write(ctx, 'Memory Allocation Act, §4(b)', x + w / 2, cy, uiFont(os, phone ? 12 : 13), soft, 'center')
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
    write(ctx, 'Ref. MAA-20XX-0000001 · Issued automatically. No reply is possible.', x + pad, cy + 6, uiFont(os, phone ? 10 : 11), soft, 'left')
    write(ctx, 'PAC RAM · a work of fiction · nothing is collected', x + pad, cy + 24, uiFont(os, phone ? 10 : 11), '#9a9aa0', 'left')
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
      const steps = ['Registering device…', 'Releasing local memory…', 'Moving you to the cloud…', 'Done. Welcome.']
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
      if (u >= 1) write(ctx, 'You will not need local memory again.', x + pad, cy + 48, uiFont(os, 11), soft, 'left')
    }
    ctx.restore()
    return result
  }

  // ----------------------------------------------------------- 4. cost

  // What it cost everyone else (a laptop, owning a computer at all), then the
  // step back: this was a game, the prices are real, here is what he said.
  // CONTINUE goes on to the score.
  private drawCost(ctx: CanvasRenderingContext2D, W: number, H: number, view: View): Hit[] {
    const t = this.t
    if (t < C_ON) {
      // the white desktop goes out
      const k = ease(t / C_ON)
      const v = Math.round(246 * (1 - k))
      ctx.fillStyle = `rgb(${v}, ${v}, ${Math.round(243 * (1 - k))})`
      ctx.fillRect(0, 0, W, H)
      return []
    }
    this.crtBackground(ctx, W, H)
    // the tube opens from a bright line across the middle
    const on = t - C_ON
    const open = ease((on - 0.08) / 0.45)
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, H / 2 - (H * open) / 2, W, H * open)
    ctx.clip()

    const L = this.costLayout(ctx, H > W * 1.1)
    const f = fitTo(W, H, L.dw, L.dh, 1.25)
    ctx.translate(f.ox, f.oy)
    ctx.scale(f.s, f.s)
    const a = (at: number, d = 0.5) => ease((t - at) / d)

    // --- everyone else
    this.header(ctx, 'EVERYONE ELSE', L.colX, L.colW, L.head, GLOW, L.headSize, a(C_HEAD))
    ctx.globalAlpha = a(C_HEAD) * 0.8
    write(ctx, '2022 → 20XX', L.colX + L.colW, L.head, mono(L.smallSize), DIM, 'right', 1)
    ctx.globalAlpha = 1
    this.drawCostLaptop(ctx, L)
    this.drawCostPeople(ctx, L)
    ctx.globalAlpha = a(C_NOTE)
    write(ctx, '20XX hasn’t happened. Yet.', L.colX + L.colW, L.note, mono(L.smallSize), FAINT, 'right', 1)

    // --- the step back
    if (t >= C_RULE) {
      ctx.globalAlpha = 1
      ctx.fillStyle = 'rgba(226, 245, 255, 0.35)'
      const e = ease((t - C_RULE) / 0.5)
      const r = L.rule
      if (r.w > r.h) ctx.fillRect(r.x + (r.w * (1 - e)) / 2, r.y, r.w * e, r.h)
      else ctx.fillRect(r.x, r.y + (r.h * (1 - e)) / 2, r.w, r.h * e)
    }
    ctx.globalAlpha = a(C_GAME, 0.4)
    ctx.save()
    ctx.shadowColor = GLOW
    ctx.shadowBlur = 18
    const gs = fitSize(ctx, 'THIS WAS A GAME.', (n) => `italic ${display(n)}`, L.gameSize, L.textW - 20)
    write(ctx, 'THIS WAS A GAME.', L.textX, L.game, `italic ${display(gs)}`, ICE, 'center')
    ctx.restore()
    ctx.globalAlpha = a(C_REAL)
    let ry = L.real
    for (const l of L.realLines) {
      write(ctx, l, L.textX, ry, mono(L.realSize), ALERT, 'center', 1)
      ry += L.realSize * 1.1
    }

    // the quote
    const q = L.quote
    ctx.globalAlpha = a(C_QUOTE, 0.7)
    ctx.fillStyle = 'rgba(255, 45, 111, 0.08)'
    ctx.fillRect(q.x, q.y, q.w, q.h)
    ctx.fillStyle = ALERT
    ctx.fillRect(q.x, q.y, 3, q.h)
    let qy = q.y + q.pad + q.lh / 2 - 2
    for (const l of q.lines) {
      write(ctx, l, q.x + q.pad, qy, mono(q.size), ICE, 'left')
      qy += q.lh
    }
    qy += 6
    for (const l of q.attr) {
      write(ctx, l, q.x + q.pad, qy, mono(q.attrSize), DIM, 'left')
      qy += q.attrSize * 1.15
    }

    // continue
    let hits: Hit[] = []
    const b = L.button
    const ba = a(C_READY - 0.3, 0.4)
    if (ba > 0) {
      ctx.globalAlpha = ba
      this.button(ctx, b, 'CONTINUE ▸', L.buttonSize, view.hover === 'action', GLOW)
      if (t >= C_READY) hits = [{ id: 'action', ...this.toScreen(f, b) }]
    } else if (t > 1.6 && !view.touch && Math.floor(view.time * 2) % 2 === 1) {
      ctx.globalAlpha = 0.6
      write(ctx, 'ENTER ▸▸', L.dw, L.dh - 4, mono(L.smallSize), FAINT, 'right', 2)
    }
    ctx.restore()
    ctx.globalAlpha = 1

    // the line the picture opened from
    if (on < 0.6) {
      ctx.save()
      ctx.globalAlpha = 1 - on / 0.6
      ctx.shadowColor = GLOW
      ctx.shadowBlur = 20
      ctx.fillStyle = ICE
      const lw = W * Math.min(1, on / 0.12)
      ctx.fillRect(W / 2 - lw / 2, H / 2 - 1.5, lw, 3)
      ctx.restore()
    }
    return hits
  }

  // ----------------------------------------------------------- 5. score

  // The arcade ending: GAME OVER, the RAM you collected as the high score,
  // the share bar of the whole run (you against the consumers), a few numbers,
  // PLAY AGAIN.
  private drawScore(ctx: CanvasRenderingContext2D, W: number, H: number, view: View): Hit[] {
    const t = this.t
    this.crtBackground(ctx, W, H)
    const wide = H <= W * 1.1
    const dw = wide ? 760 : 380
    const k = wide ? 1.3 : 1
    const a = (at: number, d = 0.4) => ease((t - at) / d)

    // design-space positions, top to bottom
    const over = 22 * k
    const label = over + 66 * k
    const big = label + 70 * k
    const barLabel = big + 82 * k
    const bar = { x: 0, y: barLabel + 22 * k, w: dw, h: 54 * k }
    const counts = bar.y + bar.h + 24 * k
    const share = counts + 58 * k
    const stats = share + (wide ? 74 : 92) * k
    const button = { x: dw / 2 - 150 * k, y: stats + (wide ? 64 : 82) * k, w: 300 * k, h: 58 * k }
    const dh = button.y + button.h + (wide ? 34 : 30) * k
    const f = fitTo(W, H, dw, dh, 1.2)
    ctx.save()
    ctx.translate(f.ox, f.oy)
    ctx.scale(f.s, f.s)

    // GAME OVER
    ctx.globalAlpha = a(S_HEAD - 0.2)
    ctx.save()
    ctx.shadowColor = ALERT
    ctx.shadowBlur = 22
    const jit = this.glitch > 0.3 ? (Math.random() - 0.5) * 10 * this.glitch : 0
    write(ctx, 'GAME OVER', dw / 2 + jit, over + 14 * k, `italic ${display(fitSize(ctx, 'GAME OVER', (n) => `italic ${display(n)}`, 52 * k, dw - 40))}`, ALERT, 'center', 4)
    ctx.restore()

    // the high score: the RAM you took
    const you = Math.max(0, Math.round(this.stats.ramYou))
    const them = Math.max(0, Math.round(this.stats.ramThem))
    const fill = ease((t - S_BAR) / S_FILL)
    ctx.globalAlpha = a(S_HEAD)
    write(ctx, 'HIGH SCORE · RAM COLLECTED', dw / 2, label, mono(22 * k), DIM, 'center', 3)
    ctx.globalAlpha = a(S_BAR - 0.2)
    ctx.save()
    ctx.shadowColor = GLOW
    ctx.shadowBlur = 24
    const youNow = Math.round(you * fill)
    write(ctx, youNow.toLocaleString('en-US'), dw / 2, big, display(84 * k, 900), ICE, 'center', 2)
    ctx.restore()

    // the share bar: you against the consumers, over the whole run
    const pct = this.share()
    ctx.globalAlpha = a(S_BAR)
    write(ctx, 'INFINITE LABS', 0, barLabel, mono(21 * k), ALERT, 'left', 2)
    write(ctx, 'CONSUMERS', dw, barLabel, mono(21 * k), CONSUMER, 'right', 2)
    ctx.fillStyle = 'rgba(226, 245, 255, 0.06)'
    ctx.fillRect(bar.x, bar.y, bar.w, bar.h)
    const yw = (bar.w * pct * fill) / 100
    const tw = (bar.w * (100 - pct) * fill) / 100
    ctx.save()
    ctx.shadowColor = ALERT
    ctx.shadowBlur = 18
    ctx.fillStyle = ALERT
    ctx.fillRect(bar.x, bar.y, yw, bar.h)
    ctx.shadowColor = CONSUMER
    ctx.fillStyle = CONSUMER
    ctx.fillRect(bar.x + bar.w - tw, bar.y, tw, bar.h)
    ctx.restore()
    // the seam
    if (fill >= 1) {
      ctx.fillStyle = VOID
      ctx.fillRect(bar.x + yw - 1.5, bar.y, 3, bar.h)
    }
    ctx.strokeStyle = 'rgba(226, 245, 255, 0.4)'
    ctx.lineWidth = 1.5
    ctx.strokeRect(bar.x, bar.y, bar.w, bar.h)
    const pYou = `${Math.round(pct * fill)}%`
    const pThem = `${Math.round((100 - pct) * fill)}%`
    const pf = display(28 * k, 900)
    ctx.font = pf
    if (yw > ctx.measureText(pYou).width + 24 * k) write(ctx, pYou, bar.x + 14 * k, bar.y + bar.h / 2 + 1, pf, VOID, 'left')
    if (tw > ctx.measureText(pThem).width + 24 * k) write(ctx, pThem, bar.x + bar.w - 14 * k, bar.y + bar.h / 2 + 1, pf, VOID, 'right')
    write(ctx, `${youNow.toLocaleString('en-US')} RAM`, 0, counts, mono(22 * k), ICE, 'left', 1)
    write(ctx, `${Math.round(them * fill).toLocaleString('en-US')} RAM`, dw, counts, mono(22 * k), ICE, 'right', 1)

    // the verdict
    if (t >= S_SHARE) {
      const pop = 1 + (1 - ease((t - S_SHARE) / 0.25)) * 0.35
      ctx.globalAlpha = a(S_SHARE, 0.2)
      // one line on wide screens, two on phones
      const verdict = wide ? [`YOU TOOK ${Math.round(pct)}% OF THE WORLD’S RAM`] : [`YOU TOOK ${Math.round(pct)}%`, 'OF THE WORLD’S RAM']
      ctx.save()
      ctx.translate(dw / 2, share + (wide ? 0 : 14))
      ctx.scale(pop, pop)
      ctx.shadowColor = ALERT
      ctx.shadowBlur = 16
      verdict.forEach((v, i) => {
        const vs = fitSize(ctx, v, (n) => `italic ${display(n)}`, (wide ? 30 : i ? 24 : 38) * k, dw - 8)
        write(ctx, v, 0, wide ? 0 : i ? 20 : -16, `italic ${display(vs)}`, ICE, 'center')
      })
      ctx.restore()
    }

    // three small numbers
    const cells: Array<[string, string, string]> = [
      [money(Math.max(1e6, this.stats.score * 1e6)), 'FINAL', 'VALUATION'],
      [`${Math.round(this.stats.lawsDisabled)}×`, 'RESISTANCE', 'EATEN'],
      [String(Math.round(this.stats.minisEaten)), 'CONSUMERS', 'EATEN'],
    ]
    const cw = dw / cells.length
    const small = (wide ? 16 : 15) * k
    cells.forEach(([n, l1, l2], i) => {
      const at = S_STATS + i * 0.15
      if (t < at) return
      ctx.globalAlpha = a(at, 0.3)
      const cx = cw * (i + 0.5)
      write(ctx, n, cx, stats, display(fitSize(ctx, n, (s) => display(s, 700), 28 * k, cw - 12), 700), ICE, 'center')
      if (wide) write(ctx, `${l1} ${l2}`, cx, stats + 30 * k, mono(small * 1.2), DIM, 'center', 1)
      else {
        write(ctx, l1, cx, stats + 30, mono(17), DIM, 'center', 1)
        write(ctx, l2, cx, stats + 48, mono(17), DIM, 'center', 1)
      }
    })

    // play again
    let hits: Hit[] = []
    const ba = a(S_READY - 0.3)
    if (ba > 0) {
      ctx.globalAlpha = ba
      this.button(ctx, button, 'PLAY AGAIN', 24 * k, view.hover === 'again', ALERT)
      if (t >= S_READY) {
        hits = [{ id: 'again', ...this.toScreen(f, button) }]
        if (!view.touch) write(ctx, 'OR PRESS ENTER', dw / 2, button.y + button.h + 18 * k, mono(17 * k), FAINT, 'center', 2)
      }
    }
    ctx.restore()
    ctx.globalAlpha = 1
    return hits
  }

  private toScreen(f: Fit, r: Rect): Rect {
    return { x: f.ox + r.x * f.s, y: f.oy + r.y * f.s, w: r.w * f.s, h: r.h * f.s }
  }

  private button(ctx: CanvasRenderingContext2D, b: Rect, text: string, size: number, hover: boolean, color: string): void {
    ctx.fillStyle = hover ? color : color === ALERT ? 'rgba(255, 45, 111, 0.12)' : 'rgba(150, 214, 255, 0.1)'
    ctx.fillRect(b.x, b.y, b.w, b.h)
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2)
    write(ctx, text, b.x + b.w / 2, b.y + b.h / 2 + 1, display(size, 700), hover ? VOID : ICE, 'center', 2)
  }

  private header(ctx: CanvasRenderingContext2D, text: string, x: number, w: number, y: number, color: string, size: number, alpha: number): void {
    if (alpha <= 0) return
    ctx.globalAlpha = alpha
    write(ctx, text, x, y, mono(size), color, 'left', 4)
    ctx.globalAlpha = alpha * 0.5
    ctx.fillStyle = color
    ctx.fillRect(x, y + size * 0.72, w * alpha, 1.5)
    ctx.globalAlpha = 1
  }

  // The laptop from the upgrade screens: its price counts up from $899 while
  // the memory is torn out of its keyboard, its screen goes dark, and RENT
  // ONLY slams down on it.
  private drawCostLaptop(ctx: CanvasRenderingContext2D, L: CostLayout): void {
    const t = this.t
    const kP = clamp((t - C_PULL) / COUNT, 0, 1) ** 1.7
    const stamped = t >= C_STAMP
    const pulls = Array.from({ length: STICKS }, (_, i) => C_PULL + (COUNT * (i + 0.5)) / STICKS)
    let jolt = 0
    let bump = 0
    // the tag's swing: a damped spring kicked by every stick and by the stamp
    let swing = 0
    const kick = (at: number, v: number) => {
      const d = t - at
      if (d > 0) swing += (v / 7.33) * Math.exp(-2.5 * d) * Math.sin(7.33 * d)
    }
    for (const [i, at] of pulls.entries()) {
      const d = t - at
      if (d > 0 && d < 0.15) jolt = Math.max(jolt, 1 - d / 0.15)
      if (d > 0 && d < 0.25) bump = Math.max(bump, 1 - d / 0.25)
      kick(at, 3.2 * (i % 2 ? -1 : 1))
    }
    kick(C_STAMP, 4)
    const since = t - C_STAMP
    const shake = stamped ? Math.max(0, 1 - (since - 0.12) / 0.4) * (since > 0.12 ? 10 : 0) : 0
    const { x, y, u } = L.lap

    ctx.save()
    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake)
    // a soft pool of light under it: it is the thing on display
    const r = LAP_W * u * 0.85
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, `rgba(150, 214, 255, ${stamped ? 0.1 : 0.16})`)
    g.addColorStop(1, 'rgba(150, 214, 255, 0)')
    ctx.fillStyle = g
    ctx.fillRect(x - r, y - r, r * 2, r * 2)
    drawLaptop(ctx, x, y, u, { t, k: kP, from: 0, to: 3, started: false, stamped, pulls, jolt })
    const price = kP >= 1 ? `$${PRICE_NOW.toLocaleString('en-US')}+` : `$${Math.round(PRICE_THEN + (PRICE_NOW - PRICE_THEN) * kP).toLocaleString('en-US')}`
    const rise = Math.round(((PRICE_THEN + (PRICE_NOW - PRICE_THEN) * kP) / PRICE_THEN - 1) * 100)
    drawPriceTag(ctx, L.tag, {
      title: stamped ? 'LAPTOP · TO OWN' : 'A NEW LAPTOP',
      price,
      line: t < C_PULL ? 'IN STOCK' : `WAS $${PRICE_THEN}  ▲ +${rise.toLocaleString('en-US')}%`,
      bg: stamped ? RED : '#ffd6e2',
      ink: stamped ? '#ffffff' : RED,
      glow: RED,
      hot: t >= C_PULL,
      swing,
      bump: bump * 0.5,
      widest: `$${PRICE_NOW.toLocaleString('en-US')}+`,
    })
    if (stamped) drawStamp(ctx, 'RENT ONLY', x, y + u * 7, L.stampSize, since)
    ctx.restore()
    // a short flash as the stamp lands
    const flash = Math.max(0, 1 - (since - 0.1) / 0.35)
    if (stamped && since > 0.1 && flash > 0) {
      ctx.globalAlpha = flash * flash * 0.3
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(-L.dw, -L.dh, L.dw * 3, L.dh * 3)
      ctx.globalAlpha = 1
    }
  }

  // The people who own a computer: 80% of the row, greying out to 3%.
  private drawCostPeople(ctx: CanvasRenderingContext2D, L: CostLayout): void {
    const t = this.t
    if (t < C_HEAD) return
    const P = L.people
    const k = clamp((t - C_OWN - 0.35) / COUNT, 0, 1) ** 1.7
    const nFrom = Math.round(OWN_THEN / (100 / PEOPLE))
    const nTo = Math.max(1, Math.round(OWN_NOW / (100 / PEOPLE)))
    const owners = nFrom - Math.floor((nFrom - nTo) * k + 1e-6)

    // heading: the label, then 80% → the share now, in red
    ctx.globalAlpha = ease((t - C_HEAD) / 0.5)
    write(ctx, 'PEOPLE WHO OWN A COMPUTER', L.colX, P.head, mono(P.labSize), ICE, 'left', 2)
    const pct = `${Math.round(OWN_THEN + (OWN_NOW - OWN_THEN) * k)}%`
    const right = L.colX + L.colW
    ctx.save()
    if (k >= 1) {
      ctx.shadowColor = RED
      ctx.shadowBlur = 18
    }
    write(ctx, pct, right, P.head, `italic ${display(P.numSize)}`, RED, 'right')
    ctx.restore()
    ctx.font = `italic ${display(P.numSize)}`
    const nw = ctx.measureText('80%').width
    if (t >= C_OWN) write(ctx, `${OWN_THEN}% →`, right - nw - 10, P.head, mono(P.labSize), DIM, 'right', 1)
    ctx.globalAlpha = 1

    const total = (PEOPLE - 1) * P.pitch
    for (let i = 0; i < PEOPLE; i++) {
      const owns = i < owners
      let flash = 0
      if (!owns && i < nFrom) {
        // the moment this one lost theirs
        const at = C_OWN + 0.35 + COUNT * ((nFrom - i) / (nFrom - nTo)) ** (1 / 1.7)
        if (t > at && t - at < 0.5) flash = 1 - (t - at) / 0.5
      }
      drawFigure(ctx, L.colX + L.colW / 2 - total / 2 + i * P.pitch, P.y, P.q, owns, flash, t + i * 0.37)
    }
  }

  // Portrait: one column, laptop on top. Landscape: the laptop and the people
  // on the left, the step back on the right.
  private costLayout(ctx: CanvasRenderingContext2D, portrait: boolean): CostLayout {
    if (portrait) {
      const dw = 420
      const u = 4.6
      const lapTop = 46
      const ly = lapTop + (LAP_H * u) / 2
      const lapBottom = lapTop + LAP_H * u
      const th = 104
      const ty = lapBottom + 22 + th / 2
      const tag: TagPlace = { x: dw / 2, y: ty, w: 270, h: th, tieX: dw / 2, tieY: lapBottom - 2, portrait: true }
      const head = ty + th / 2 + 34
      const people = { head, y: head + 46, q: 2.1, pitch: 20.4, labSize: 18, numSize: 30 }
      const note = people.y + 34
      const rule = { x: 0, y: note + 22, w: dw, h: 1.5 }
      const game = rule.y + 38
      const realSize = 20
      const realLines = wrapText(ctx, 'The rising prices are real: PCs already cost 15–20% more in 2026.', mono(realSize), dw - 20)
      const real = game + 40
      const quote = this.quoteBox(ctx, 0, real + realLines.length * realSize * 1.1 + 2, dw, 20, 16, 12)
      const button = { x: dw / 2 - 130, y: quote.y + quote.h + 20, w: 260, h: 52 }
      return {
        dw,
        dh: button.y + button.h + 6,
        colX: 0,
        colW: dw,
        textX: dw / 2,
        textW: dw,
        head: 14,
        headSize: 22,
        smallSize: 16,
        lap: { x: dw / 2, y: ly, u },
        stampSize: 44,
        tag,
        people,
        note,
        rule,
        game,
        gameSize: 38,
        real,
        realLines,
        realSize,
        quote,
        button,
        buttonSize: 22,
      }
    }
    const dw = 1180
    const colW = 540
    const u = 5.8
    const lapTop = 50
    const ly = lapTop + (LAP_H * u) / 2
    const lapBottom = lapTop + LAP_H * u
    const th = 116
    const ty = lapBottom + 24 + th / 2
    const tag: TagPlace = { x: colW / 2, y: ty, w: 310, h: th, tieX: colW / 2, tieY: lapBottom - 2, portrait: true }
    const head = ty + th / 2 + 42
    const people = { head, y: head + 54, q: 3, pitch: 26.5, labSize: 22, numSize: 36 }
    const note = people.y + 38
    const dh = note + 14
    // the right column, centred on the height
    const textX0 = colW + 60
    const textW = dw - textX0
    const realSize = 23
    const realLines = wrapText(ctx, 'The rising prices are real: PCs already cost 15–20% more in 2026.', mono(realSize), textW - 60)
    const quote0 = this.quoteBox(ctx, textX0, 0, textW, 24, 19, 16)
    const block = 50 + 50 + realLines.length * realSize * 1.1 + 8 + quote0.h + 30 + 60
    const game = (dh - block) / 2 + 25
    const real = game + 54
    const quote = { ...quote0, y: real + realLines.length * realSize * 1.1 + 8 }
    const button = { x: textX0 + textW / 2 - 150, y: quote.y + quote.h + 30, w: 300, h: 60 }
    return {
      dw,
      dh,
      colX: 0,
      colW,
      textX: textX0 + textW / 2,
      textW,
      head: 14,
      headSize: 26,
      smallSize: 19,
      lap: { x: colW / 2, y: ly, u },
      stampSize: 52,
      tag,
      people,
      note,
      rule: { x: colW + 30, y: 40, w: 1.5, h: dh - 60 },
      game,
      gameSize: 46,
      real,
      realLines,
      realSize,
      quote,
      button,
      buttonSize: 26,
    }
  }

  private quoteBox(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, size: number, attrSize: number, pad: number): QuoteBox {
    const q = LEX_QUOTE
    const lines = wrapText(ctx, `“${q.text}”`, mono(size), w - pad * 2 - 6)
    const attr = wrapText(ctx, `— ${q.who}, ${q.where}, ${q.date}`, mono(attrSize), w - pad * 2 - 6)
    const lh = size * 1.08
    const h = pad + lines.length * lh + 6 + attr.length * attrSize * 1.15 + pad - 4
    return { x, y, w, h, pad, size, lh, lines, attrSize, attr }
  }
}

interface QuoteBox {
  x: number
  y: number
  w: number
  h: number
  pad: number
  size: number
  lh: number
  lines: string[]
  attrSize: number
  attr: string[]
}

// Where everything on the cost screen goes, in design units.
interface CostLayout {
  dw: number
  dh: number
  // the column with the laptop and the people
  colX: number
  colW: number
  // the centre and width of the step back
  textX: number
  textW: number
  head: number
  headSize: number
  smallSize: number
  lap: { x: number; y: number; u: number }
  stampSize: number
  tag: TagPlace
  people: { head: number; y: number; q: number; pitch: number; labSize: number; numSize: number }
  note: number
  rule: Rect
  game: number
  gameSize: number
  real: number
  realLines: string[]
  realSize: number
  quote: QuoteBox
  button: Rect
  buttonSize: number
}
