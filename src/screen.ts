// The whole display: header, board, HUD panel, cards, touch pad and boot
// screen, all drawn into one canvas so the CRT pass covers every pixel.

import { LEVELS } from './levels'
import { ALERT, ERA_NAMES, FRIGHT, GLOW, ICE, VOID, eraOf, theme, type Theme } from './palette'
import { DISPLAY, MONO, brackets, clamp, fill, hatch, hideActors, label, panel, render, tag, tileSize, warning } from './render'
import { SURGE_RAM, stateLabel, visual, type Game, type Ghost } from './sim'
import { drawFacing, lawSprite, pacFrame } from './sprites'
import type { Entry } from './leaderboard'

const HUD = '"Chakra Petch", "Share Tech Mono", sans-serif'

export type HitId =
  | 'pause'
  | 'mute'
  | 'full'
  | 'board'
  | 'credit'
  | 'share'
  | 'action'
  | 'skip'
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'yes'
  | 'no'
  | 'save'
  | 'again'
  | 'name'

export interface Hit {
  id: HitId
  x: number
  y: number
  w: number
  h: number
}

export interface Card {
  mode: string
  kicker: string
  title: string
  body: string
  action: string
}

export interface View {
  width: number
  height: number
  touch: boolean
  muted: boolean
  full: boolean
  hover: HitId | null
  held: ReadonlySet<HitId>
  card: Card | null
  records: Entry[]
  boot: number
  time: number
}

export interface Frame {
  s: number
  ox: number
  oy: number
  hits: Hit[]
  view: View
}

const BOOT_LINES: Array<[number, string, string]> = [
  [0.15, 'PAC-RAM BIOS v3.11 // VECTOR PHOSPHOR SUBSYSTEM', ''],
  [0.45, 'MEMORY TEST ............ ', '640K OK'],
  [0.7, 'GRID ALIGNMENT ......... ', '19 x 19'],
  [0.95, 'REGULATIONS FOUND ...... ', '4'],
  [1.2, 'MODEL WEIGHTS .......... ', 'UNCAPPED'],
]

// ?dev in the address shows test shortcuts like skipping a board
export const DEV = new URLSearchParams(location.search).has('dev')

export const BOOT_SECONDS = 2.6

let ramTotal = 0
let ramLevel = -1

export function hit(frame: Frame, id: HitId, x: number, y: number, w: number, h: number): void {
  frame.hits.push({ id, x: frame.ox + x * frame.s, y: frame.oy + y * frame.s, w: w * frame.s, h: h * frame.s })
}

export function text(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  size: number,
  color: string,
  align: CanvasTextAlign = 'left',
  weight = 600,
  spacing = 0,
): void {
  ctx.fillStyle = color
  ctx.font = `${weight} ${size}px ${HUD}`
  ctx.textAlign = align
  ctx.textBaseline = 'middle'
  ctx.letterSpacing = `${spacing}px`
  ctx.fillText(value, x, y)
  ctx.letterSpacing = '0px'
}

export function wrap(ctx: CanvasRenderingContext2D, value: string, max: number): string[] {
  const words = value.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (line && ctx.measureText(next).width > max) {
      lines.push(line)
      line = word
    } else line = next
  }
  if (line) lines.push(line)
  return lines
}

export function logo(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = 'left'): void {
  ctx.save()
  ctx.font = `italic 900 ${size}px ${DISPLAY}`
  ctx.textAlign = align
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  ctx.lineWidth = Math.max(1.5, size / 22)
  ctx.strokeStyle = ALERT
  ctx.globalAlpha = 0.55
  ctx.strokeText(value, x + 2.5, y + 1)
  ctx.globalAlpha = 1
  ctx.strokeStyle = color
  ctx.strokeText(value, x, y)
  ctx.restore()
}

export function button(
  ctx: CanvasRenderingContext2D,
  frame: Frame,
  id: HitId,
  value: string,
  x: number,
  y: number,
  w: number,
  h: number,
  tone: string,
  size = 14,
): void {
  const lit = frame.view.hover === id || frame.view.held.has(id)
  ctx.fillStyle = lit ? 'rgba(150, 214, 255, 0.16)' : 'rgba(1, 4, 11, 0.6)'
  ctx.fillRect(x, y, w, h)
  ctx.strokeStyle = lit ? ICE : tone
  ctx.globalAlpha = lit ? 1 : 0.75
  ctx.lineWidth = lit ? 2 : 1
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2)
  ctx.globalAlpha = 1
  if (lit) fill(ctx, ALERT, x, y, 5, h)
  text(ctx, value, x + w / 2 + (lit ? 2 : 0), y + h / 2 + 1, size, lit ? ICE : tone, 'center', 600, size * 0.16)
  hit(frame, id, x, y, w, h)
}

export function module(ctx: CanvasRenderingContext2D, title: string, x: number, y: number, w: number, h: number, tone: string): void {
  ctx.fillStyle = 'rgba(150, 214, 255, 0.035)'
  ctx.fillRect(x, y, w, h)
  ctx.strokeStyle = 'rgba(150, 214, 255, 0.16)'
  ctx.lineWidth = 1
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1)
  brackets(ctx, tone, x, y, w, h, 10, 1)
  if (!title) return
  label(ctx, '▸', x + 14, y + 19, 18, ALERT, 'left')
  text(ctx, title.toUpperCase(), x + 28, y + 19, 13, tone, 'left', 700, 3)
}

export function drawScreen(ctx: CanvasRenderingContext2D, game: Game, view: View): Hit[] {
  const th = theme(game.surge > 0, game.levelIndex)
  ctx.save()
  fill(ctx, VOID, 0, 0, view.width, view.height)
  if (view.boot >= 0) {
    drawBoot(ctx, view)
    ctx.restore()
    return []
  }
  drawBackdrop(ctx, view, th)

  const lay = layoutFor(view)
  const frame: Frame = { s: lay.s, ox: lay.ox, oy: lay.oy, hits: [], view }
  ctx.translate(frame.ox, frame.oy)
  ctx.scale(lay.s, lay.s)
  drawComposition(ctx, game, frame, th, lay)
  ctx.restore()
  return frame.hits
}

export interface Layout {
  portrait: boolean
  W: number
  H: number
  s: number
  ox: number
  oy: number
  board: { x: number; y: number; size: number }
}

export function layoutFor(view: { width: number; height: number; touch: boolean }): Layout {
  const portrait = view.width < view.height * 1.05
  const W = portrait ? 800 : 1240
  const H = portrait ? (view.touch ? 1440 : 1190) : 890
  const s = Math.min(view.width / W, view.height / H) * 0.94
  const board = portrait ? { x: 20, y: 138, size: 760 } : { x: 36, y: 104, size: 760 }
  return { portrait, W, H, s, ox: (view.width - W * s) / 2, oy: (view.height - H * s) / 2, board }
}

function drawComposition(ctx: CanvasRenderingContext2D, game: Game, frame: Frame, th: Theme, lay: Layout): void {
  if (game.levelIndex !== ramLevel || game.dots.length > ramTotal) {
    ramLevel = game.levelIndex
    ramTotal = game.dots.length
  }
  if (lay.portrait) drawPortrait(ctx, game, frame, th, lay.W)
  else drawLandscape(ctx, game, frame, th, lay.W)
}

// The whole interface as one flat image in design units, for the finale to eat.
export function snapshot(game: Game, view: View, scale: number): { canvas: HTMLCanvasElement; lay: Layout } {
  const lay = layoutFor(view)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(lay.W * scale)
  canvas.height = Math.round(lay.H * scale)
  const ctx = canvas.getContext('2d')!
  ctx.setTransform(scale, 0, 0, scale, 0, 0)
  const th = theme(false, game.levelIndex)
  const frame: Frame = { s: 1, ox: 0, oy: 0, hits: [], view: { ...view, card: null, hover: null } }
  hideActors(true)
  drawComposition(ctx, game, frame, th, lay)
  hideActors(false)
  return { canvas, lay }
}

export function drawBackdrop(ctx: CanvasRenderingContext2D, view: View, th: Theme): void {
  const glow = ctx.createRadialGradient(view.width / 2, view.height * 0.45, 0, view.width / 2, view.height * 0.45, Math.max(view.width, view.height) * 0.7)
  glow.addColorStop(0, 'rgba(110, 180, 255, 0.08)')
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, view.width, view.height)
  ctx.globalAlpha = 0.5
  ctx.fillStyle = th.grid
  for (let y = 12; y < view.height; y += 24) {
    for (let x = 12; x < view.width; x += 24) ctx.fillRect(x, y, 1, 1)
  }
  ctx.globalAlpha = 1
}

function drawBoot(ctx: CanvasRenderingContext2D, view: View): void {
  const t = view.boot
  const size = clamp(Math.min(view.width, view.height) / 26, 15, 26)
  const lineH = size * 1.3
  const left = Math.max(16, view.width / 2 - size * 13)
  let y = view.height / 2 - lineH * 4
  for (const [at, head, value] of BOOT_LINES) {
    if (t >= at) {
      label(ctx, head, left, y, size, at === 0.15 ? ICE : GLOW, 'left')
      if (value) {
        ctx.font = `${size}px ${MONO}`
        label(ctx, value, left + ctx.measureText(head).width, y, size, value === '4' ? ALERT : ICE, 'left')
      }
    }
    y += lineH
  }
  if (t < 1.45) return
  y += lineH * 0.5
  const dots = Math.floor(t * 4) % 2 === 0 ? '...' : ''
  label(ctx, `NOW LOADING ${dots}`, left, y, size, ICE, 'left')
  y += lineH
  const barW = Math.min(view.width - left * 2, size * 26)
  const barH = size * 0.8
  ctx.strokeStyle = ICE
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(left, y - barH / 2, barW, barH, barH / 2)
  ctx.stroke()
  const u = clamp((t - 1.5) / 1, 0, 1)
  const steps = Math.floor(u * 14) / 14
  if (steps > 0) {
    ctx.fillStyle = ICE
    ctx.beginPath()
    ctx.roundRect(left + 4, y - barH / 2 + 4, (barW - 8) * steps, barH - 8, (barH - 8) / 2)
    ctx.fill()
  }
  label(ctx, 'PRESS START TO SKIP', left, y + lineH * 1.3, size * 0.7, 'rgba(150, 214, 255, 0.5)', 'left')
}

function drawHeader(ctx: CanvasRenderingContext2D, game: Game, frame: Frame, W: number, th: Theme, compact: boolean): void {
  label(ctx, 'SYS//', 24, 16, 17, GLOW, 'left')
  label(ctx, 'MODEL-01 · INSERT COIN', 62, 16, 17, ALERT, 'left')
  logo(ctx, 'PAC RAM', 24, 48, compact ? 40 : 36, ICE)

  const bw = compact ? 118 : 104
  const bh = 36
  const by = compact ? 24 : 18
  button(ctx, frame, 'mute', frame.view.muted ? 'SOUND OFF' : 'SOUND ON', W - 24 - bw, by, bw, bh, th.line, 13)
  button(ctx, frame, 'pause', game.mode === 'pause' ? 'RESUME' : 'PAUSE', W - 24 - bw * 2 - 10, by, bw, bh, th.line, 13)
  if (!frame.view.full) button(ctx, frame, 'full', 'FULL', W - 24 - bw * 2 - 10 - 74, by, 64, bh, ALERT, 13)

  const pos = visual(game.player)
  const parts: Array<[string, string, string]> = [
    ['REC', 'LIVE', ALERT],
    ['X', `<<< ${pos.x.toFixed(2).padStart(5, '0')} >>>`, th.line],
    ['Y', `<<< ${pos.y.toFixed(2).padStart(5, '0')} >>>`, th.line],
    ['MODE', ERA_NAMES[eraOf(game.levelIndex)] ?? '', th.line],
  ]
  const ry = compact ? 84 : 38
  ctx.font = `22px ${MONO}`
  const widths = parts.map(([k, v]) => ctx.measureText(`${k} ${v}`).width)
  const total = widths.reduce((a, b) => a + b, 0) + 26 * (parts.length - 1) + 14
  let x = compact ? W / 2 - total / 2 : 620 - total / 2 + 30
  if (Math.floor(frame.view.time * 1.6) % 2 === 0) {
    ctx.fillStyle = ALERT
    ctx.beginPath()
    ctx.arc(x + 5, ry, 5, 0, Math.PI * 2)
    ctx.fill()
  }
  x += 14
  parts.forEach(([k, v, tone], i) => {
    label(ctx, k, x, ry, 22, tone, 'left')
    const kw = ctx.measureText(`${k} `).width
    label(ctx, v, x + kw, ry, 22, ICE, 'left')
    x += widths[i]! + 26
  })

  const line = compact ? 104 : 70
  ctx.globalAlpha = 0.3
  fill(ctx, th.line, 24, line, W - 48, 1)
  ctx.globalAlpha = 1
  fill(ctx, th.line, 24, line - 1, 140, 3)
}

function drawField(ctx: CanvasRenderingContext2D, game: Game, frame: Frame, th: Theme, x: number, y: number): void {
  const size = game.maze.w * tileSize()
  label(ctx, 'CH 03 // FIELD', x, y - 16, 17, 'rgba(150, 214, 255, 0.55)', 'left')
  label(ctx, 'RP-3000 · VECTOR DISPLAY', x + size, y - 16, 17, 'rgba(150, 214, 255, 0.55)', 'right')
  brackets(ctx, th.line, x - 8, y - 8, size + 16, size + 16, 22, 2)
  ctx.save()
  ctx.translate(x, y)
  ctx.beginPath()
  ctx.rect(0, 0, size, size)
  ctx.clip()
  render(ctx, game)
  ctx.restore()
  if (frame.view.card) drawCard(ctx, frame, frame.view.card, th, x, y, size)
}

function drawCard(ctx: CanvasRenderingContext2D, frame: Frame, card: Card, th: Theme, bx: number, by: number, size: number): void {
  const peek = card.mode === 'pause'
  const tone = card.mode === 'lose' ? ALERT : card.mode === 'pause' ? GLOW : th.line
  ctx.fillStyle = peek ? 'rgba(1, 4, 11, 0.55)' : 'rgba(1, 4, 11, 0.8)'
  ctx.fillRect(bx, by, size, size)

  const w = 540
  const x = bx + size / 2 - w / 2
  ctx.font = `25px ${MONO}`
  const body = wrap(ctx, card.body, w - 80)
  const titleH = card.mode === 'title' ? 116 : 60
  const records = card.mode === 'title' ? frame.view.records.slice(0, 3) : []
  const listH = records.length ? 40 + records.length * 26 : 0
  const h = 40 + titleH + body.length * 26 + 30 + 64 + listH
  const y = peek ? by + 60 : by + size / 2 - h / 2
  panel(ctx, tone, x, y, w, h)
  ctx.fillStyle = 'rgba(150, 214, 255, 0.05)'
  ctx.fillRect(x + 1, y + 1, w - 2, h - 2)

  let cy = y + 30
  if (card.kicker) tag(ctx, card.kicker.toUpperCase(), bx + size / 2 + 2, cy, 22, 'rgba(1, 4, 11, 0.95)', ICE, ALERT)
  cy += 22
  if (card.mode === 'title') {
    ctx.strokeStyle = tone
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(x + 70, cy + 6, w - 140, 74, 16)
    ctx.stroke()
    logo(ctx, card.title.toUpperCase(), bx + size / 2, cy + 44, 52, tone, 'center')
    text(ctx, 'ROGUE AI', bx + size / 2, cy + 100, 15, ALERT, 'center', 700, 9)
  } else {
    const head = card.mode === 'lose' ? `${card.title}`.toUpperCase() : card.title.toUpperCase()
    ctx.font = `italic 900 40px ${DISPLAY}`
    const hw = ctx.measureText(head).width
    if (card.mode === 'lose') warning(ctx, bx + size / 2 - hw / 2 - 30, cy + 30, 36, ALERT)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = ALERT
    ctx.globalAlpha = 0.5
    ctx.fillText(head, bx + size / 2 + (card.mode === 'lose' ? 18 : 0) - 2, cy + 32)
    ctx.globalAlpha = 1
    ctx.fillStyle = card.mode === 'lose' ? ALERT : ICE
    ctx.fillText(head, bx + size / 2 + (card.mode === 'lose' ? 18 : 0), cy + 30)
  }
  cy += titleH + 8
  for (const line of body) {
    label(ctx, line, bx + size / 2, cy, 25, card.mode === 'lose' ? ICE : GLOW)
    cy += 26
  }
  cy += 6
  const mw = w * 0.7
  const mx = bx + size / 2 - mw / 2
  ctx.strokeStyle = tone
  ctx.globalAlpha = 0.6
  ctx.strokeRect(mx + 0.5, cy + 0.5, mw, 10)
  ctx.globalAlpha = 1
  const full = card.mode === 'win' || card.mode === 'cleared'
  const u = full ? 1 : 0.08 + ((frame.view.time / (peek ? 6 : 2.4)) % 1) * 0.92
  hatch(ctx, tone, mx + 2, cy + 2, (mw - 3) * (Math.floor(u * 12) / 12), 7, 5)
  cy += 26
  const aw = 240
  const pulse = 0.5 + 0.5 * Math.sin(frame.view.time * 5.5)
  ctx.globalAlpha = 0.6 + pulse * 0.4
  button(ctx, frame, 'action', card.action.toUpperCase(), bx + size / 2 - aw / 2, cy, aw, 46, tone, 16)
  ctx.globalAlpha = 1
  if (!records.length) return
  cy += 72
  text(ctx, 'HALL OF THE UNREGULATED', bx + size / 2, cy, 12, GLOW, 'center', 700, 3)
  cy += 26
  records.forEach((r, i) => {
    label(ctx, `${i + 1}.`, x + 110, cy, 23, ALERT, 'left')
    label(ctx, r.name || '???', x + 146, cy, 23, ICE, 'left')
    label(ctx, `${r.escaped ? '\u221E ' : ''}${r.score}`, x + w - 110, cy, 23, ICE, 'right')
    cy += 26
  })
}

function drawTelemetry(ctx: CanvasRenderingContext2D, game: Game, th: Theme, x: number, y: number, w: number): void {
  module(ctx, 'Telemetry', x, y, w, 158, th.line)
  const level = LEVELS[game.levelIndex]
  const livesShown = game.mode === 'dying' ? Math.max(0, game.lives - 1) : game.lives
  const rows: Array<[string, string]> = [
    ['SCORE', `<<< ${game.score} >>>`],
    ['RAM', `<<< ${game.dots.length} >>>`],
    ['LEVEL', `${game.levelIndex + 1} ${(level?.name ?? '').toUpperCase()}`],
    ['LIVES', ''],
  ]
  rows.forEach(([k, v], i) => {
    const ry = y + 52 + i * 28
    label(ctx, k, x + 16, ry, 23, th.line, 'left')
    if (k === 'LIVES') {
      for (let l = 0; l < livesShown; l++) fill(ctx, ICE, x + 92 + l * 18, ry - 9, 9, 17)
    } else label(ctx, v, x + 92, ry, 23, ICE, 'left')
  })
}

function drawSurge(ctx: CanvasRenderingContext2D, game: Game, th: Theme, x: number, y: number, w: number, time: number): void {
  const surging = game.surge > 0
  module(ctx, '', x, y, w, 84, surging ? ALERT : th.line)
  const name = surging ? 'REPEAL THEM' : 'EAT RAM'
  const blink = !surging || Math.floor(time * 4.4) % 2 === 0
  if (blink) label(ctx, name, x + 16, y + 24, 23, surging ? ALERT : th.line, 'left')
  label(ctx, surging ? `${game.surge.toFixed(1)}s` : `${game.surgeCharge}/${SURGE_RAM}`, x + w - 16, y + 24, 23, ICE, 'right')
  const tx = x + 16
  const ty = y + 44
  const tw = w - 32
  const th2 = 22
  ctx.strokeStyle = surging ? ALERT : th.line
  ctx.globalAlpha = 0.55
  ctx.strokeRect(tx + 0.5, ty + 0.5, tw, th2)
  ctx.globalAlpha = 1
  const ratio = clamp(surging ? game.surge / game.surgeMax : game.surgeCharge / SURGE_RAM, 0, 1)
  if (ratio > 0) {
    if (surging) {
      ctx.save()
      ctx.beginPath()
      ctx.rect(tx + 3, ty + 3, (tw - 5) * ratio, th2 - 5)
      ctx.clip()
      fill(ctx, ALERT, tx + 3, ty + 3, tw, th2 - 5)
      hatch(ctx, ICE, tx + 3 - ((time * 40) % 16), ty + 3, tw + 16, th2 - 5, 8)
      ctx.restore()
    } else hatch(ctx, ICE, tx + 3, ty + 3, (tw - 5) * ratio, th2 - 5, 6)
  }
  for (let i = 1; i < 25; i++) fill(ctx, 'rgba(1, 4, 11, 0.9)', tx + (tw * i) / 25, ty + 1, 1, th2 - 1)
}

function lawTone(ghost: Ghost): string {
  return ghost.state === 'frightened' ? FRIGHT : ghost.color
}

function drawLaws(ctx: CanvasRenderingContext2D, game: Game, th: Theme, x: number, y: number, w: number, h: number, time: number): void {
  module(ctx, 'AI regulations', x, y, w, h, th.line)
  game.ghosts.forEach((ghost, i) => {
    const ry = y + 42 + i * 38
    const tone = lawTone(ghost)
    ctx.globalAlpha = ghost.state === 'eaten' ? 0.4 : 1
    const grad = ctx.createLinearGradient(x + 14, 0, x + w - 14, 0)
    grad.addColorStop(0, `${ghost.color}26`)
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = grad
    ctx.fillRect(x + 14, ry, w - 28, 30)
    fill(ctx, tone, x + 14, ry, 3, 30)
    text(ctx, ghost.name, x + 28, ry + 16, 15, ICE, 'left', 600, 0.5)
    const blink = ghost.state !== 'frightened' || Math.floor(time * 5) % 2 === 0
    if (blink) label(ctx, stateLabel(ghost.state, game.phase), x + w - 24, ry + 16, 21, tone, 'right')
    ctx.globalAlpha = 1
  })
}

function bar(ctx: CanvasRenderingContext2D, name: string, value: number, x: number, y: number, w: number, tone: string): void {
  label(ctx, name, x, y + 6, 18, tone, 'left')
  const bx = x + 78
  const bw = w - 78
  ctx.strokeStyle = tone
  ctx.globalAlpha = 0.45
  ctx.strokeRect(bx + 0.5, y + 0.5, bw, 12)
  ctx.globalAlpha = 1
  fill(ctx, ICE, bx + 2, y + 2, (bw - 3) * clamp(value, 0, 1), 9)
  for (let i = 1; i < 10; i++) fill(ctx, 'rgba(1, 4, 11, 0.7)', bx + (bw * i) / 10, y + 1, 1, 11)
}

function drawVitals(ctx: CanvasRenderingContext2D, game: Game, th: Theme, x: number, y: number, w: number, h: number, time: number): void {
  module(ctx, 'Subject // model-01', x, y, w, h, th.line)
  const fx = x + 66
  const fy = y + 100
  ctx.globalAlpha = 0.18
  ctx.strokeStyle = th.line
  ctx.beginPath()
  ctx.arc(fx, fy, 44, 0, Math.PI * 2)
  ctx.stroke()
  ctx.globalAlpha = 1
  const art = pacFrame(time * 5)
  if (art) drawFacing(ctx, art, fx, fy, 70, 'right', 'right')
  const leads: Array<[number, string]> = [
    [fy - 26, 'CORE'],
    [fy + 2, 'JAW'],
    [fy + 30, 'BUS'],
  ]
  for (const [ly, name] of leads) {
    ctx.globalAlpha = 0.7
    fill(ctx, th.line, fx + 30, ly, 26, 1)
    ctx.globalAlpha = 1
    fill(ctx, ICE, fx + 26, ly - 2, 5, 5)
    label(ctx, name, fx - 64, ly, 15, 'rgba(226, 245, 255, 0.5)', 'left')
  }

  const surging = game.surge > 0
  const memory = ramTotal ? 1 - game.dots.length / ramTotal : 0
  const clock = surging ? 0.92 + 0.08 * Math.sin(time * 20) : 0.55 + 0.12 * Math.sin(time * 1.7)
  const heat = surging ? game.surge / game.surgeMax : game.surgeCharge / SURGE_RAM
  const bx = x + 150
  const bw = w - 166
  bar(ctx, 'MEMORY', memory, bx, y + 48, bw, th.line)
  bar(ctx, 'CLOCK', clock, bx, y + 74, bw, th.line)
  bar(ctx, 'HEAT', heat, bx, y + 100, bw, surging ? ALERT : th.line)
  bar(ctx, 'SIGNAL', game.lives / 3, bx, y + 126, bw, th.line)

  label(ctx, 'RISK OF REGULATION', x + 16, y + 168, 19, th.line, 'left')
  game.ghosts.forEach((ghost, i) => {
    const gx = x + 30 + i * 40
    const gy = y + 198
    const art = lawSprite(ghost.law, ghost.state === 'frightened' ? 'blue' : 'body')
    const out = ghost.state === 'chase' || ghost.state === 'scatter' || ghost.state === 'frightened'
    ctx.globalAlpha = out ? 1 : 0.25
    if (art) drawFacing(ctx, art, gx, gy, 26, 'up', 'up')
    ctx.globalAlpha = 1
  })
  const mhz = Math.round(clock * 4200)
  label(ctx, `CLOCK: ${mhz} MHZ ${surging ? 'INCREASING' : 'STABLE'}`, x + 16, y + h - 44, 19, ICE, 'left')
  label(ctx, 'ARROWS/WASD MOVE · P PAUSE · M MUTE', x + 16, y + h - 20, 16, 'rgba(226, 245, 255, 0.45)', 'left')
}

function drawSkip(ctx: CanvasRenderingContext2D, frame: Frame, x: number, y: number): void {
  if (!DEV) return
  ctx.globalAlpha = 0.6
  button(ctx, frame, 'skip', 'SKIP', x, y, 64, 22, 'rgba(150, 214, 255, 0.6)', 10)
  ctx.globalAlpha = 1
}

function drawLandscape(ctx: CanvasRenderingContext2D, game: Game, frame: Frame, th: Theme, W: number): void {
  drawHeader(ctx, game, frame, W, th, false)
  drawField(ctx, game, frame, th, 36, 104)
  const px = 836
  const pw = W - 24 - px
  const tabs = ['SYSTEMS', 'INVENTORY', 'DATABASE']
  tabs.forEach((name, i) => {
    const tw = (pw - 8) / 3
    const tx = px + i * (tw + 4)
    ctx.strokeStyle = i === 0 ? 'rgba(150, 214, 255, 0.4)' : 'rgba(150, 214, 255, 0.15)'
    ctx.strokeRect(tx + 0.5, 96.5, tw, 26)
    fill(ctx, i === 0 ? ALERT : 'rgba(150, 214, 255, 0.15)', tx, 96, tw, 2)
    text(ctx, name, tx + tw / 2, 110, 11, i === 0 ? ICE : 'rgba(150, 214, 255, 0.5)', 'center', 600, 2)
  })
  drawTelemetry(ctx, game, th, px, 134, pw)
  drawSurge(ctx, game, th, px, 304, pw, frame.view.time)
  const lawsH = 50 + game.ghosts.length * 38
  drawLaws(ctx, game, th, px, 400, pw, lawsH, frame.view.time)
  const vy = 400 + lawsH + 12
  drawVitals(ctx, game, th, px, vy, pw, Math.max(250, 872 - vy), frame.view.time)
  label(ctx, 'BRIGHT ||||||||||||||||||||||||| CONTRAST', 36 + 380, 884, 15, 'rgba(150, 214, 255, 0.3)')
  drawSkip(ctx, frame, 36, 872)
}

function drawPortrait(ctx: CanvasRenderingContext2D, game: Game, frame: Frame, th: Theme, W: number): void {
  drawHeader(ctx, game, frame, W, th, true)
  drawField(ctx, game, frame, th, 20, 138)
  const y = 916
  const cw = (W - 52) / 2
  drawTelemetry(ctx, game, th, 20, y, cw)
  drawSurge(ctx, game, th, 20, y + 170, cw, frame.view.time)
  drawLaws(ctx, game, th, 32 + cw, y, cw, 254, frame.view.time)
  if (frame.view.touch) {
    const bw = 124
    const bh = 104
    const gap = 12
    const cx = W / 2
    const top = 1196
    button(ctx, frame, 'up', '▲', cx - bw / 2, top, bw, bh, th.line, 26)
    button(ctx, frame, 'left', '◀', cx - bw * 1.5 - gap, top + bh + gap, bw, bh, th.line, 26)
    button(ctx, frame, 'down', '▼', cx - bw / 2, top + bh + gap, bw, bh, th.line, 26)
    button(ctx, frame, 'right', '▶', cx + bw / 2 + gap, top + bh + gap, bw, bh, th.line, 26)
    drawSkip(ctx, frame, 20, 1410)
  } else drawSkip(ctx, frame, 20, 1180)
}
