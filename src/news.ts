// The news screens before the game and between boards: a wire feed seen
// through the CRT. The kicker and title slam in, the intro types out, then
// each real headline lands as a wire card, then a quote, then the outro.
// Text only; the lead maps hooks.type / hooks.stamp to sounds.

import type { Headline, NewsBeat, Quote } from './headlines'
import { ALERT, GLOW, ICE, theme } from './palette'
import { MONO, brackets, clamp, fill, label, tag } from './render'
import { frameFor } from './scenes'
import { button, drawBackdrop, logo, wrap, type Hit, type View } from './screen'

const HUD = '"Chakra Petch", "Share Tech Mono", sans-serif'

export type NewsStep =
  | { kind: 'head' }
  | { kind: 'intro'; text: string }
  | { kind: 'card'; headline: Headline; index: number; text: string }
  | { kind: 'quote'; quote: Quote; text: string }
  | { kind: 'outro'; text: string }

// how long a card takes to drop into place, and the title to slam in
const LAND = 0.32
const SLAM = 0.45
// characters per second while typing
const CPS = { intro: 42, card: 48, quote: 40, outro: 34 } as const

export class NewsPlayer {
  readonly beat: NewsBeat
  readonly steps: NewsStep[]
  time = 0
  done = false
  // the current step, how long it has been showing, and how much has typed
  index = 0
  age = 0
  typed = 0
  private wait = 0
  private revealed = false

  constructor(
    beat: NewsBeat,
    private hooks: { type(): void; stamp(): void },
  ) {
    this.beat = beat
    this.steps = [
      { kind: 'head' },
      { kind: 'intro', text: beat.intro },
      ...beat.headlines.map((headline, index) => ({ kind: 'card' as const, headline, index, text: headline.note ?? '' })),
      ...(beat.quote ? [{ kind: 'quote' as const, quote: beat.quote, text: beat.quote.text }] : []),
      { kind: 'outro', text: beat.outro },
    ]
    this.enter()
  }

  get step(): NewsStep {
    return this.steps[this.index]!
  }

  private enter(): void {
    this.age = 0
    this.typed = 0
    this.revealed = false
    const step = this.step
    if (step.kind === 'head' || step.kind === 'card') this.hooks.stamp()
  }

  // seconds the finished step stays up before the feed moves on
  private hold(): number {
    const step = this.step
    switch (step.kind) {
      case 'head':
        return 0.5
      case 'intro':
        return 1.6 + step.text.length * 0.035
      case 'card':
        return 2.6 + (step.headline.text.length + step.text.length) * 0.045
      case 'quote':
        return 2.8 + step.text.length * 0.045
      case 'outro':
        return 5.5
    }
  }

  private speed(): number {
    const step = this.step
    return step.kind === 'head' ? 0 : CPS[step.kind]
  }

  private textLength(): number {
    const step = this.step
    return step.kind === 'head' ? 0 : step.text.length
  }

  private finishReveal(): void {
    this.typed = this.textLength()
    if (this.step.kind === 'head') this.age = Math.max(this.age, SLAM)
    if (this.step.kind === 'card') this.age = Math.max(this.age, LAND)
    this.revealed = true
    this.wait = this.hold()
  }

  private next(): void {
    if (this.index >= this.steps.length - 1) {
      this.done = true
      return
    }
    this.index++
    this.enter()
  }

  update(dt: number): void {
    this.time += dt
    if (this.done) return
    this.age += dt
    const step = this.step
    if (!this.revealed) {
      // a card types its note only once it has landed
      const delay = step.kind === 'card' ? LAND : step.kind === 'head' ? SLAM : 0
      if (this.age < delay) return
      const len = this.textLength()
      const before = Math.floor(this.typed)
      this.typed = Math.min(len, this.typed + dt * this.speed())
      const now = Math.floor(this.typed)
      if (now !== before && now % 2 === 0) this.hooks.type()
      if (this.typed >= len) this.finishReveal()
      return
    }
    this.wait -= dt
    if (this.wait <= 0) this.next()
  }

  // Enter or tap: finish the current reveal, or go to the next item.
  advance(): void {
    if (this.done) return
    if (!this.revealed) this.finishReveal()
    else this.next()
  }

  skip(): void {
    this.done = true
  }
}

const ease = (p: number) => 1 - Math.pow(1 - clamp(p, 0, 1), 3)

function setFont(ctx: CanvasRenderingContext2D, font: string): void {
  ctx.font = font
  ctx.letterSpacing = '0px'
}

// Shrink a font until the text wraps into at most `lines` rows.
function fit(ctx: CanvasRenderingContext2D, value: string, maxW: number, lines: number, size: number, min: number, font: (s: number) => string): { size: number; rows: string[] } {
  for (let s = size; ; s -= 2) {
    setFont(ctx, font(s))
    const rows = wrap(ctx, value, maxW)
    const widest = Math.max(0, ...rows.map((r) => ctx.measureText(r).width))
    if ((rows.length <= lines && widest <= maxW) || s <= min) return { size: s, rows }
  }
}

function rowsAt(ctx: CanvasRenderingContext2D, rows: string[], x: number, y: number, size: number, lead: number, color: string, font: string, align: CanvasTextAlign = 'left'): number {
  ctx.fillStyle = color
  setFont(ctx, font)
  ctx.textAlign = align
  ctx.textBaseline = 'top'
  for (const row of rows) {
    ctx.fillText(row, Math.round(x), Math.round(y))
    y += size * lead
  }
  return y
}

// typed prefix of rows that were wrapped from the full text, so lines never jump
function typedRows(rows: string[], typed: number): string[] {
  const out: string[] = []
  let left = Math.floor(typed)
  for (const row of rows) {
    if (left <= 0) break
    out.push(row.slice(0, left))
    left -= row.length + 1
  }
  return out
}

function cursor(ctx: CanvasRenderingContext2D, rows: string[], x: number, y: number, size: number, lead: number, color: string, t: number, align: CanvasTextAlign = 'left', fullRows?: string[]): void {
  if (Math.floor(t * 2.5) % 2 !== 0) return
  const i = Math.max(0, rows.length - 1)
  const row = rows[i] ?? ''
  let cx = x + ctx.measureText(row).width + 4
  if (align === 'center') cx = x - ctx.measureText(fullRows?.[i] ?? row).width / 2 + ctx.measureText(row).width + 4
  fill(ctx, color, cx, y + i * size * lead + size * 0.12, size * 0.42, size * 0.78)
}

interface CardLayout {
  h: number
  draw(y: number, alpha: number, live: boolean): void
}

function cardLayout(ctx: CanvasRenderingContext2D, news: NewsPlayer, step: Extract<NewsStep, { kind: 'card' }>, x: number, w: number, compact: boolean, portrait: boolean, at: number): CardLayout {
  const h0 = step.headline
  const pad = compact ? 14 : 22
  const metaSize = compact ? (portrait ? 20 : 18) : portrait ? 26 : 22
  const big = compact ? (portrait ? 28 : 21) : portrait ? 52 : 36
  const headFont = (s: number) => `${compact ? 400 : 600} ${s}px ${HUD}`
  const innerW = w - pad * 2 - 8
  const head = fit(ctx, h0.text, innerW, compact ? 2 : 4, big, compact ? 16 : 24, headFont)
  const noteSize = portrait ? 30 : 25
  setFont(ctx, `${noteSize}px ${MONO}`)
  const noteRows = !compact && h0.note ? wrap(ctx, h0.note, innerW) : []
  const metaH = metaSize * 1.1
  const headH = head.rows.length * head.size * 1.16
  const noteH = noteRows.length ? 10 + noteRows.length * noteSize * 1.05 : 0
  const h = pad + metaH + (compact ? 4 : 10) + headH + noteH + pad - 4
  const total = news.beat.headlines.length
  return {
    h,
    draw(y, alpha, live) {
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.fillStyle = live ? 'rgba(10, 30, 52, 0.88)' : 'rgba(1, 4, 11, 0.82)'
      ctx.fillRect(x, y, w, h)
      ctx.strokeStyle = live ? 'rgba(150, 214, 255, 0.55)' : 'rgba(150, 214, 255, 0.22)'
      ctx.lineWidth = 1
      ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.round(w) - 1, Math.round(h) - 1)
      fill(ctx, live ? ALERT : 'rgba(150, 214, 255, 0.35)', x, y, live ? 6 : 3, h)
      if (live) brackets(ctx, ICE, x - 4, y - 4, w + 8, h + 8, 14, 2)
      // the stamp: a flash as the card lands
      if (live && at < 0.5) {
        ctx.globalAlpha = alpha * (1 - at / 0.5) * 0.35
        ctx.fillStyle = ICE
        ctx.fillRect(x, y, w, h)
        ctx.globalAlpha = alpha
      }
      const lx = x + pad + 8
      let cy = y + pad
      label(ctx, `SOURCE: ${h0.outlet.toUpperCase()}`, lx, cy + metaH / 2, metaSize, live ? ALERT : GLOW, 'left')
      const right = `${h0.date.toUpperCase()}  ·  ${String(step.index + 1).padStart(2, '0')}/${String(total).padStart(2, '0')}`
      label(ctx, right, x + w - pad, cy + metaH / 2, metaSize, GLOW, 'right')
      cy += metaH + (compact ? 4 : 10)
      rowsAt(ctx, head.rows, lx, cy, head.size, 1.16, live ? ICE : 'rgba(226, 245, 255, 0.85)', headFont(head.size))
      cy += headH
      if (noteRows.length) {
        cy += 10
        const typed = live ? news.typed : step.text.length
        const shown = typedRows(noteRows, typed)
        rowsAt(ctx, shown, lx, cy, noteSize, 1.05, GLOW, `${noteSize}px ${MONO}`)
        if (live && typed < step.text.length && at >= LAND) cursor(ctx, shown, lx, cy, noteSize, 1.05, GLOW, news.time)
      }
      ctx.restore()
    },
  }
}

export function drawNews(ctx: CanvasRenderingContext2D, view: View, news: NewsPlayer): Hit[] {
  ctx.save()
  fill(ctx, '#000000', 0, 0, view.width, view.height)
  drawBackdrop(ctx, view, theme(false, 0))
  const portrait = view.width < view.height * 1.05
  const W = portrait ? 800 : 1240
  const H = portrait ? 1300 : 860
  const frame = frameFor(ctx, view, W, H)
  const t = news.time
  const beat = news.beat
  const at = news.index
  const step = news.step

  // the wire bar across the top
  const barY = portrait ? 34 : 28
  const live = Math.floor(t * 2) % 2 === 0
  ctx.fillStyle = live ? ALERT : 'rgba(255, 45, 111, 0.35)'
  ctx.beginPath()
  ctx.arc(48, barY, portrait ? 8 : 6, 0, Math.PI * 2)
  ctx.fill()
  label(ctx, 'LIVE WIRE', 66, barY, portrait ? 26 : 22, ALERT, 'left')
  label(ctx, 'INFINITE LABS // PRESS MONITOR', W - 40, barY, portrait ? 22 : 20, 'rgba(150, 214, 255, 0.6)', 'right')
  fill(ctx, 'rgba(150, 214, 255, 0.3)', 40, barY + 22, W - 80, 1)
  fill(ctx, ICE, 40, barY + 21, 120, 3)

  // heading: kicker, title, intro
  const headP = at === 0 ? ease(news.age / SLAM) : 1
  const colX = 40
  const colW = portrait ? W - 80 : 400
  let y = portrait ? 110 : 110
  setFont(ctx, `${portrait ? 26 : 22}px ${MONO}`)
  const kickW = Math.ceil(ctx.measureText(beat.kicker).width) + (portrait ? 26 : 22)
  ctx.save()
  ctx.globalAlpha = clamp(headP * 2, 0, 1)
  tag(ctx, beat.kicker, colX + 4 + kickW / 2, y, portrait ? 26 : 22, 'rgba(1, 4, 11, 0.95)', ICE, ALERT)
  ctx.restore()
  y += portrait ? 72 : 64
  let titleSize = portrait ? 72 : 56
  ctx.font = `italic 900 ${titleSize}px "Orbitron", "Chakra Petch", sans-serif`
  while (ctx.measureText(beat.title).width > colW - 10 && titleSize > 24) {
    titleSize -= 2
    ctx.font = `italic 900 ${titleSize}px "Orbitron", "Chakra Petch", sans-serif`
  }
  {
    const k = 1 + (1 - headP) * 0.6
    ctx.save()
    ctx.globalAlpha = headP
    ctx.translate(colX, y)
    ctx.scale(k, k)
    logo(ctx, beat.title, 0, 0, titleSize, ICE, 'left')
    ctx.restore()
  }
  y += titleSize * 0.5 + (portrait ? 34 : 30)

  const introSize = portrait ? 34 : 30
  setFont(ctx, `${introSize}px ${MONO}`)
  const introRows = wrap(ctx, beat.intro, colW)
  if (at >= 1) {
    const typed = at === 1 ? news.typed : beat.intro.length
    const shown = typedRows(introRows, typed)
    rowsAt(ctx, shown, colX, y, introSize, 1.1, at === 1 ? ICE : GLOW, `${introSize}px ${MONO}`)
    if (at === 1 && typed < beat.intro.length) cursor(ctx, shown, colX, y, introSize, 1.1, ICE, t)
  }
  y += introRows.length * introSize * 1.1 + (portrait ? 26 : 30)

  // progress pips: one per headline, then the quote and the end
  const pipY = y
  const firstCard = 2
  const pips = news.steps.length - firstCard
  const pipW = portrait ? 46 : 40
  for (let i = 0; i < pips; i++) {
    const s = firstCard + i
    const kind = news.steps[s]!.kind
    const px = colX + i * (pipW + 8)
    const tone = s < at ? GLOW : s === at ? ALERT : 'rgba(150, 214, 255, 0.2)'
    fill(ctx, tone, px, pipY, pipW, kind === 'card' ? 6 : 3)
  }
  label(ctx, at < firstCard ? 'INCOMING…' : step.kind === 'card' ? `WIRE ${step.index + 1} OF ${beat.headlines.length}` : step.kind === 'quote' ? 'ON THE RECORD' : 'END OF FEED', colX + pips * (pipW + 8) + 8, pipY + 3, portrait ? 22 : 20, 'rgba(150, 214, 255, 0.6)', 'left')
  y += 30

  // the feed area
  const feedX = portrait ? 40 : 480
  const feedW = portrait ? W - 80 : W - 520
  const feedTop = portrait ? y + 10 : 90
  const footY = H - 30
  const feedBottom = footY - (portrait ? 70 : 50)
  if (!portrait) fill(ctx, 'rgba(150, 214, 255, 0.18)', feedX - 20, feedTop, 1, feedBottom - feedTop)

  if (step.kind === 'card') drawFeed(ctx, news, step, feedX, feedW, feedTop, feedBottom, portrait)
  else if (step.kind === 'quote' || step.kind === 'outro') drawClose(ctx, news, feedX, feedW, feedTop, feedBottom, portrait)

  const touch = view.touch
  const fs = portrait ? 28 : 20
  label(ctx, touch ? 'TAP ▸ CONTINUE' : 'ENTER / TAP ▸ CONTINUE', 40, footY - (portrait ? 10 : 0), fs, 'rgba(150, 214, 255, 0.55)', 'left')
  const bw = portrait ? 200 : 130
  const bh = portrait ? 64 : 40
  button(ctx, frame, 'skip', 'SKIP ▸▸', W - 40 - bw, footY - bh / 2 - (portrait ? 10 : 0), bw, bh, GLOW, portrait ? 20 : 13)
  ctx.restore()
  return frame.hits
}

// The wire cards: the newest full size at the bottom of the stack, older
// ones compact and dim above it, scrolling up out of the feed.
function drawFeed(ctx: CanvasRenderingContext2D, news: NewsPlayer, step: Extract<NewsStep, { kind: 'card' }>, x: number, w: number, top: number, bottom: number, portrait: boolean): void {
  const gap = portrait ? 16 : 12
  const cards = news.steps.filter((s): s is Extract<NewsStep, { kind: 'card' }> => s.kind === 'card' && s.index <= step.index)
  const at = news.age
  const p = ease(at / LAND)
  const layouts = cards.map((c, i) => cardLayout(ctx, news, c, x, w, i < cards.length - 1, portrait, at))
  // top-down from the feed's top, pushed up when the stack overflows
  const place = (list: CardLayout[]) => {
    const ys: number[] = []
    let cy = top
    for (const l of list) {
      ys.push(cy)
      cy += l.h + gap
    }
    const over = Math.max(0, cy - gap - bottom)
    return ys.map((v) => v - over)
  }
  const after = place(layouts)
  const before = place(layouts.slice(0, -1))
  ctx.save()
  ctx.beginPath()
  ctx.rect(x - 12, top - 8, w + 24, bottom - top + 16)
  ctx.clip()
  layouts.forEach((l, i) => {
    const newest = i === layouts.length - 1
    const ya = after[i]!
    const yb = newest ? ya + 60 : before[i]!
    const cy = yb + (ya - yb) * p
    const age = layouts.length - 1 - i
    let alpha = newest ? p : Math.max(0.28, 0.62 - (age - 1) * 0.12)
    if (cy < top) alpha *= clamp(1 - (top - cy) / l.h, 0, 1)
    if (alpha <= 0.01) return
    if (newest && p < 1) {
      // drop in slightly enlarged, then settle
      const k = 1 + (1 - p) * 0.06
      ctx.save()
      ctx.translate(x + w / 2, cy + l.h / 2)
      ctx.scale(k, k)
      ctx.translate(-(x + w / 2), -(cy + l.h / 2))
      l.draw(cy, alpha, true)
      ctx.restore()
    } else l.draw(cy, alpha, newest)
  })
  ctx.restore()
}

// The quote in large type, then the outro in pink beneath it.
function drawClose(ctx: CanvasRenderingContext2D, news: NewsPlayer, x: number, w: number, top: number, bottom: number, portrait: boolean): void {
  const beat = news.beat
  const quote = beat.quote
  const step = news.step
  const inQuote = step.kind === 'quote'
  const avail = bottom - top
  const mark = portrait ? 120 : 100
  const qFont = (s: number) => `italic 400 ${s}px ${HUD}`
  const q = quote ? fit(ctx, quote.text, w - 40, portrait ? 7 : 6, portrait ? 46 : 38, 24, qFont) : null
  const whoSize = portrait ? 28 : 24
  setFont(ctx, `${whoSize}px ${MONO}`)
  const whoRows = quote ? wrap(ctx, `— ${quote.who}, ${quote.where}, ${quote.date}`, w - 40) : []
  const oFont = (s: number) => `${s}px ${MONO}`
  const o = fit(ctx, beat.outro, w - 20, 4, portrait ? 46 : 40, 26, oFont)

  const quoteH = q ? mark * 0.55 + q.rows.length * q.size * 1.22 + 16 + whoRows.length * whoSize * 1.1 : 0
  const outroH = o.rows.length * o.size * 1.1 + 40
  const gap = q ? (portrait ? 70 : 50) : 0
  const total = quoteH + gap + outroH
  let y = top + Math.max(0, (avail - total) / 2)

  if (q && quote) {
    const qAlpha = inQuote ? 1 : 0.45
    ctx.save()
    ctx.globalAlpha = qAlpha * (inQuote ? ease(news.age / 0.4) : 1)
    ctx.fillStyle = ALERT
    ctx.font = `900 ${mark}px "Orbitron", "Chakra Petch", sans-serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText('“', x, y - mark * 0.12)
    y += mark * 0.55
    const typed = inQuote ? news.typed : quote.text.length
    const shown = typedRows(q.rows, typed)
    rowsAt(ctx, shown, x + 20, y, q.size, 1.22, ICE, qFont(q.size))
    if (inQuote && typed < quote.text.length) cursor(ctx, shown, x + 20, y, q.size, 1.22, ICE, news.time)
    else {
      const last = q.rows[q.rows.length - 1] ?? ''
      setFont(ctx, qFont(q.size))
      const lw = ctx.measureText(last).width
      ctx.fillStyle = ALERT
      ctx.font = `900 ${q.size * 1.4}px "Orbitron", "Chakra Petch", sans-serif`
      ctx.textBaseline = 'top'
      ctx.fillText('”', x + 20 + lw + 6, y + (q.rows.length - 1) * q.size * 1.22 - q.size * 0.1)
    }
    y += q.rows.length * q.size * 1.22 + 16
    const whoAlpha = !inQuote || typed >= quote.text.length ? 1 : 0
    ctx.globalAlpha *= whoAlpha
    rowsAt(ctx, whoRows, x + 20, y, whoSize, 1.1, GLOW, `${whoSize}px ${MONO}`)
    ctx.restore()
    y = top + Math.max(0, (avail - total) / 2) + quoteH + gap
  }

  if (step.kind === 'outro') {
    fill(ctx, ALERT, x, y, 80, 3)
    fill(ctx, 'rgba(255, 45, 111, 0.3)', x + 80, y + 1, w - 80, 1)
    y += 26
    const shown = typedRows(o.rows, news.typed)
    rowsAt(ctx, shown, x, y, o.size, 1.1, ALERT, oFont(o.size))
    if (news.typed < beat.outro.length) cursor(ctx, shown, x, y, o.size, 1.1, ALERT, news.time)
    else if (Math.floor(news.time * 2.5) % 2 === 0) {
      setFont(ctx, oFont(o.size))
      const last = o.rows[o.rows.length - 1] ?? ''
      fill(ctx, ALERT, x + ctx.measureText(last).width + 8, y + (o.rows.length - 1) * o.size * 1.1 + o.size * 0.12, o.size * 0.42, o.size * 0.78)
    }
  }
}
