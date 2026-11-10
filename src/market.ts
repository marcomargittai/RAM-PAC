// The in-game HUD: a fake stock ticker. Infinite Labs' share price climbs
// slowly with every bit of RAM it takes and drops when the resistance catches
// it. A news banner runs above it, and a tape underneath shows what all this
// does to everybody else: memory and computers get dearer, the cloud cheaper.

import { INTERLUDE_1, INTERLUDE_2, PROLOGUE } from './headlines'
import { LAWS, LEVELS } from './levels'
import { ALERT, GLOW, ICE } from './palette'
import { DISPLAY, MONO, brackets, clamp, fill, label } from './render'
import { SURGE_RAM, type Game } from './sim'
import { drawUpright, lawSprite } from './sprites'

const UP = '#3dff9a'
const DOWN = '#ff4d6a'
const POINTS = 90

let history: number[] = []
let eraStart = 0
let lastLevel = -1
let lastScore = 0
let lastSample = -1

// Each time the resistance catches the company, the stock loses a fifth.
const CAUGHT_DROP = 0.8

// How often the company has been caught this run. Lives reset every era, so
// the count is kept here: it goes up once each time a catch starts.
let caughtCount = 0
let caughtAt = 0
let lastMode = ''

function caught(_game: Game): number {
  return caughtCount
}

function watchCatches(game: Game): void {
  if (game.mode === 'dying' && lastMode !== 'dying') {
    caughtCount++
    caughtAt = game.time
  }
  if (game.mode === 'ready' && game.levelIndex === 0 && game.score === 0) caughtCount = 0
  lastMode = game.mode
}

export function sharePrice(game: Game): number {
  return (12 + game.score / 320) * CAUGHT_DROP ** Math.max(0, caught(game))
}

// Prices for everyone else, driven by how much RAM has been taken in this run.
function taken(game: Game): number {
  return game.totalYou + game.totalThem
}

export function ramPrice(game: Game): number {
  return 58 + taken(game) * 0.62
}

function laptopPrice(game: Game): number {
  return 899 + taken(game) * 2.1
}

function cloudPrice(game: Game): number {
  return Math.max(2.99, 29 - taken(game) * 0.042)
}

function sample(game: Game): void {
  const price = sharePrice(game)
  if (game.levelIndex !== lastLevel || game.score < lastScore) {
    lastLevel = game.levelIndex
    history = [price]
    eraStart = price
    lastSample = game.time
  }
  lastScore = game.score
  if (game.time - lastSample >= 0.25 || game.time < lastSample) {
    lastSample = game.time
    // a little noise, so it reads as a market and not a progress bar
    const wobble = Math.sin(game.time * 7.3) * 0.004 + Math.sin(game.time * 2.1) * 0.006
    history.push(price * (1 + wobble))
    if (history.length > POINTS) history.shift()
  }
}

function money(v: number, cents = true): string {
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 })}`
}

function change(now: number, from: number): { text: string; up: boolean } {
  const pct = from > 0 ? ((now - from) / from) * 100 : 0
  return { text: `${pct >= 0 ? '▲' : '▼'} ${Math.abs(pct).toFixed(1)}%`, up: pct >= 0 }
}

function chart(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.strokeStyle = 'rgba(150, 214, 255, 0.12)'
  ctx.lineWidth = 1
  for (let i = 1; i < 4; i++) {
    ctx.beginPath()
    ctx.moveTo(x, y + (h * i) / 4 + 0.5)
    ctx.lineTo(x + w, y + (h * i) / 4 + 0.5)
    ctx.stroke()
  }
  if (history.length < 2) return
  const lo = Math.min(...history) * 0.98
  const hi = Math.max(...history, lo * 1.05)
  const px = (i: number) => x + (w * i) / (POINTS - 1)
  const py = (v: number) => y + h - ((v - lo) / (hi - lo)) * h
  const grad = ctx.createLinearGradient(0, y, 0, y + h)
  grad.addColorStop(0, 'rgba(61, 255, 154, 0.28)')
  grad.addColorStop(1, 'rgba(61, 255, 154, 0)')
  ctx.beginPath()
  ctx.moveTo(px(0), y + h)
  history.forEach((v, i) => ctx.lineTo(px(i), py(v)))
  ctx.lineTo(px(history.length - 1), y + h)
  ctx.closePath()
  ctx.fillStyle = grad
  ctx.fill()
  // each step is coloured by where it goes: green up, red down. A crash after
  // being caught shows red, and the climb back turns green again.
  ctx.lineWidth = 2.5
  for (let i = 1; i < history.length; i++) {
    const a = history[i - 1]!
    const b = history[i]!
    // the noise wobbles a little; only a real move changes colour
    const down = b < a * 0.995
    ctx.beginPath()
    ctx.moveTo(px(i - 1), py(a))
    ctx.lineTo(px(i), py(b))
    ctx.strokeStyle = down ? DOWN : UP
    ctx.stroke()
  }
  const lx = px(history.length - 1)
  const ly = py(history[history.length - 1]!)
  ctx.fillStyle = ICE
  ctx.beginPath()
  ctx.arc(lx, ly, 4, 0, Math.PI * 2)
  ctx.fill()
}

// The scrolling tape of other prices.
function tape(ctx: CanvasRenderingContext2D, game: Game, x: number, y: number, w: number, size: number, time: number): void {
  const items: Array<[string, string, boolean]> = [
    ['INFL', money(sharePrice(game)), true],
    ['16GB RAM', money(ramPrice(game), false), true],
    ['LAPTOP', money(laptopPrice(game), false), true],
    ['CLOUD PC/MO', money(cloudPrice(game)), false],
    ['HOME PCS SOLD', `-${Math.min(97, Math.round(taken(game) / 7))}%`, false],
  ]
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y - size, w, size * 2)
  ctx.clip()
  fill(ctx, 'rgba(1, 4, 11, 0.7)', x, y - size, w, size * 2)
  ctx.font = `${size}px ${MONO}`
  const parts = items.map(([k, v, up]) => ({ k, v, up, w: ctx.measureText(`${k} ${v} ▲`).width + size * 2 }))
  const total = parts.reduce((a, p) => a + p.w, 0)
  let cx = x - ((time * 40) % total)
  while (cx < x + w) {
    for (const p of parts) {
      label(ctx, p.k, cx, y, size, GLOW, 'left')
      const kw = ctx.measureText(`${p.k} `).width
      label(ctx, `${p.v} ${p.up ? '▲' : '▼'}`, cx + kw, y, size, p.k === 'INFL' ? UP : p.up ? DOWN : UP, 'left')
      cx += p.w
    }
  }
  ctx.restore()
}

// The surge bar: 25 RAM fills it, then for a few seconds the resistance can be eaten.
function surgeBar(ctx: CanvasRenderingContext2D, game: Game, x: number, y: number, w: number, h: number, time: number, k: number): void {
  const surging = game.surge > 0
  const r = clamp(surging ? game.surge / game.surgeMax : game.surgeCharge / SURGE_RAM, 0, 1)
  label(ctx, surging ? 'SURGE' : `SURGE ${game.surgeCharge}/${SURGE_RAM}`, x, y + h / 2, 15 * k, surging ? ALERT : GLOW, 'left')
  const bx = x + 110 * k
  const bw = w - 110 * k
  ctx.strokeStyle = surging ? ALERT : 'rgba(150, 214, 255, 0.5)'
  ctx.lineWidth = 1
  ctx.strokeRect(bx + 0.5, y + 0.5, bw, h)
  if (r <= 0) return
  const blink = !surging || game.surge > 1.5 || Math.floor(time * 8) % 2 === 0
  if (blink) fill(ctx, surging ? ALERT : ICE, bx + 2, y + 2, (bw - 3) * r, h - 3)
}

// What the company's growth costs everybody else.
function prices(ctx: CanvasRenderingContext2D, game: Game, x: number, y: number, w: number): void {
  label(ctx, 'MEANWHILE, FOR EVERYONE ELSE', x, y + 10, 18, 'rgba(150, 214, 255, 0.7)', 'left')
  fill(ctx, 'rgba(150, 214, 255, 0.25)', x, y + 24, w, 1)
  const rows: Array<[string, number, number, (v: number) => string]> = [
    ['16 GB OF RAM', ramPrice(game), 58, (v) => money(v, false)],
    ['A NEW LAPTOP', laptopPrice(game), 899, (v) => money(v, false)],
    ['A CLOUD PC, PER MONTH', cloudPrice(game), 29, (v) => money(v)],
  ]
  rows.forEach(([name, now, start, fmt], i) => {
    const ry = y + 56 + i * 44
    label(ctx, name, x, ry, 22, ICE, 'left')
    const ch = change(now, start)
    label(ctx, ch.text, x + w, ry, 20, name.startsWith('A CLOUD') ? UP : ch.up ? DOWN : UP, 'right')
    ctx.font = `20px ${MONO}`
    const cw = ctx.measureText(ch.text).width
    label(ctx, fmt(now), x + w - cw - 18, ry, 24, ICE, 'right')
  })
  const sold = Math.min(97, Math.round(taken(game) / 7))
  label(ctx, `HOMES THAT STILL BUY A PC: ${100 - sold}%`, x, y + 56 + 3 * 44, 22, sold > 40 ? DOWN : GLOW, 'left')
}

// What is in the news while you play. Real headlines for the eras that
// happened (see src/headlines.ts); the last era is the game's own future.
const FUTURE_NEWS = [
  'Memory now costs more than the computer around it',
  'Schools end laptop programmes: "the cloud is cheaper"',
  'Last consumer RAM factory converts to datacenter supply',
  'Second-hand PC prices pass new car prices',
  'Survey: most homes no longer own a computer',
  'Cloud subscriptions hit $3 a month. Everything else runs on them',
]

function newsFor(level: number): string[] {
  const real = (beats: Array<typeof PROLOGUE>) => beats.flatMap((b) => b.headlines.map((h) => `${h.outlet.toUpperCase()}: ${h.text}`))
  if (level <= 0) return real([PROLOGUE, INTERLUDE_1])
  if (level === 1) return real([INTERLUDE_1, INTERLUDE_2])
  return FUTURE_NEWS.map((t) => `BREAKING: ${t}`)
}

function newsBanner(ctx: CanvasRenderingContext2D, game: Game, x: number, y: number, w: number, h: number, time: number, k: number): void {
  ctx.save()
  fill(ctx, 'rgba(255, 45, 111, 0.14)', x, y, w, h)
  fill(ctx, ALERT, x, y, 3, h)
  const tagW = 74 * k
  fill(ctx, ALERT, x, y, tagW, h)
  label(ctx, 'NEWS', x + tagW / 2, y + h / 2, 16 * k, '#01040b')
  ctx.beginPath()
  ctx.rect(x + tagW, y, w - tagW, h)
  ctx.clip()
  const size = 17 * k
  ctx.font = `${size}px ${MONO}`
  const items = newsFor(game.levelIndex)
  const gap = 40 * k
  const widths = items.map((t) => ctx.measureText(t).width + gap)
  const total = widths.reduce((a, b) => a + b, 0)
  let cx = x + tagW + 12 - ((time * 55 * k) % total)
  while (cx < x + w) {
    items.forEach((t, i) => {
      label(ctx, t, cx, y + h / 2, size, ICE, 'left')
      label(ctx, '\u25C6', cx + widths[i]! - gap / 2, y + h / 2, size * 0.7, ALERT)
      cx += widths[i]!
    })
  }
  ctx.restore()
}

export interface MarketOpts {
  big: boolean
}

// The whole panel. Height is flexible: the chart takes what is left.
export function drawMarket(ctx: CanvasRenderingContext2D, game: Game, x: number, y: number, w: number, h: number, time: number, opts: MarketOpts = { big: false }): void {
  watchCatches(game)
  sample(game)
  const k = opts.big ? 1.45 : 1
  ctx.fillStyle = 'rgba(150, 214, 255, 0.035)'
  ctx.fillRect(x, y, w, h)
  ctx.strokeStyle = 'rgba(150, 214, 255, 0.16)'
  ctx.lineWidth = 1
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1)
  const pad = 16 * k
  const level = LEVELS[game.levelIndex]
  const price = sharePrice(game)
  const ch = change(price, eraStart)

  // the news banner sits on top; everything else moves down under it
  const newsH = 30 * k
  newsBanner(ctx, game, x + 1, y + 1, w - 2, newsH, time, k)
  y += newsH + 4 * k
  h -= newsH + 4 * k

  label(ctx, 'NASDAQ: INFL · INFINITE LABS', x + pad, y + 18 * k, 17 * k, GLOW, 'left')
  label(ctx, level?.years.trim() ?? '', x + w - pad, y + 18 * k, 17 * k, 'rgba(150, 214, 255, 0.55)', 'right')
  label(ctx, money(price), x + pad, y + 58 * k, 52 * k, ICE, 'left')
  ctx.font = `${52 * k}px ${MONO}`
  const pw = ctx.measureText(money(price)).width
  label(ctx, ch.text, x + pad + pw + 14 * k, y + 64 * k, 26 * k, ch.up ? UP : DOWN, 'left')

  // lives and the power-up, small and on the right
  const livesShown = game.mode === 'dying' ? Math.max(0, game.lives - 1) : game.lives
  for (let l = 0; l < livesShown; l++) fill(ctx, ICE, x + w - pad - 10 * k - l * 18 * k, y + 46 * k, 9 * k, 20 * k)

  const tapeH = 36 * k
  const footH = 44 * k
  const cy = y + 112 * k
  // a tall panel also lists what everybody else pays
  const table = h > 500
  const tableH = table ? 250 : 0
  // on a phone there may be no room for the chart; the price and the tape stay
  const room = h - (cy - y) - tapeH - footH - tableH - 10 * k
  const chH = room >= 50 ? room : 0
  if (chH) chart(ctx, x + pad, cy, w - pad * 2, chH)
  surgeBar(ctx, game, x + pad, cy - 16 * k, w - pad * 2, 14 * k, time, k)
  tape(ctx, game, x + 1, cy + chH + 10 * k + tapeH / 2, w - 2, 18 * k, time)
  if (table) prices(ctx, game, x + pad, cy + chH + 10 * k + tapeH + 16, w - pad * 2)

  // the resistance, just as icons: dim when they're switched off
  const fy = y + h - footH / 2
  game.ghosts.forEach((ghost, i) => {
    const art = lawSprite(ghost.law, ghost.state === 'frightened' ? 'blue' : 'body')
    ctx.globalAlpha = ghost.state === 'eaten' || ghost.state === 'housed' ? 0.35 : 1
    if (art) ctx.drawImage(art, x + pad + i * 34 * k, fy - 13 * k, 26 * k, 26 * k)
    ctx.globalAlpha = 1
  })
  const share = game.ramYou + game.ramThem ? game.ramYou / (game.ramYou + game.ramThem) : 1
  const edible = level?.minisEdible
  label(ctx, `MARKET SHARE ${Math.round(share * 100)}%`, x + w - pad, fy, 20 * k, edible ? '#ffc94a' : ICE, 'right')
  if (game.surge > 0) fill(ctx, ALERT, x, y, 3, h)
  if (game.mode === 'dying' || game.mode === 'lose') drawCaught(ctx, game, x, y, w, h, time, k)
}

// Caught: the part of the resistance that got you takes over the panel, big.
function drawCaught(ctx: CanvasRenderingContext2D, game: Game, x: number, y: number, w: number, h: number, time: number, k: number): void {
  const ghost = game.ghosts.find((g) => g.name === game.caughtName)
  const law = ghost ? LAWS[ghost.law] : undefined
  const ink = law?.color ?? ALERT
  const t = game.time - caughtAt
  fill(ctx, 'rgba(8, 0, 3, 0.94)', x, y, w, h)
  fill(ctx, ALERT, x, y, 3, h)
  const cx = x + w / 2
  // the ghost slams in, then bobs
  const slam = clamp(t / 0.25, 0, 1)
  const size = Math.min(w * 0.55, h * 0.42) * (1 + (1 - slam) * (1 - slam) * 0.8)
  const gy = y + h * 0.36 + Math.sin(time * 5) * 4 * k
  const glow = ctx.createRadialGradient(cx, gy, size * 0.1, cx, gy, size * 0.9)
  glow.addColorStop(0, `${ink}55`)
  glow.addColorStop(1, `${ink}00`)
  ctx.fillStyle = glow
  ctx.fillRect(cx - size, gy - size, size * 2, size * 2)
  const art = ghost ? lawSprite(ghost.law, 'body') : null
  if (art) drawUpright(ctx, art, cx, gy, size)
  brackets(ctx, ALERT, cx - size / 2 - 12, gy - size / 2 - 12, size + 24, size + 24, 18 * k, 2)
  label(ctx, 'STOPPED BY', cx, y + 30 * k, 22 * k, ALERT)
  ctx.font = `italic 900 ${Math.round(34 * k)}px ${DISPLAY}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = ink
  const name = (law?.name ?? game.caughtName).toUpperCase()
  const ny = gy + size / 2 + 40 * k
  ctx.fillText(name, cx, ny, w - 30)
  if (law?.about) {
    // shrink the line until it fits the panel
    let size = 20 * k
    ctx.font = `${size}px ${MONO}`
    while (size > 11 && ctx.measureText(law.about).width > w - 28) {
      size -= 1
      ctx.font = `${size}px ${MONO}`
    }
    label(ctx, law.about, cx, ny + 36 * k, size, ICE)
  }
  const drop = `INFL \u25BC -${Math.round((1 - CAUGHT_DROP) * 100)}%`
  label(ctx, drop, cx, ny + 76 * k, 30 * k, DOWN)
  label(ctx, game.mode === 'lose' ? 'NO LIVES LEFT' : `${Math.max(0, game.lives - 1)} LIVES LEFT THIS ERA`, cx, ny + 112 * k, 20 * k, GLOW)
}


