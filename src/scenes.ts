// Full-screen scenes that replace the game view: the briefing, the name
// entry for the leaderboard, and the leaderboard itself.

import { countdown, type Entry } from './leaderboard'
import { ALERT, FRIGHT, GLOW, ICE, VOID, theme } from './palette'
import { MONO, brackets, fill, label, panel, tag } from './render'
import { button, drawBackdrop, hit, logo, text, type Frame, type Hit, type View } from './screen'
import { drawFacing, drawUpright, lawSprite, miniFrame, pacFrame } from './sprites'
import { LEVELS } from './levels'
import { valuation } from './sim'

export function frameFor(ctx: CanvasRenderingContext2D, view: View, W: number, H: number): Frame {
  const s = Math.min(view.width / W, view.height / H) * 0.94
  const frame: Frame = { s, ox: (view.width - W * s) / 2, oy: (view.height - H * s) / 2, hits: [], view }
  ctx.translate(frame.ox, frame.oy)
  ctx.scale(s, s)
  return frame
}

export function drawEntry(ctx: CanvasRenderingContext2D, view: View, data: { score: number; level: number; escaped: boolean; name: string; focused: boolean }): Hit[] {
  ctx.save()
  fill(ctx, VOID, 0, 0, view.width, view.height)
  drawBackdrop(ctx, view, theme(false, 1))
  const narrow = view.width < view.height
  const W = narrow ? 640 : 900
  const H = narrow ? 900 : 760
  const frame = frameFor(ctx, view, W, H)
  const tone = data.escaped ? ALERT : GLOW
  const x = 60
  const w = W - 120
  panel(ctx, tone, x, 40, w, H - 80)
  tag(ctx, data.escaped ? 'STATUS: UNSTOPPABLE' : 'STATUS: STOPPED', W / 2, 90, 24, 'rgba(1, 4, 11, 0.95)', ICE, ALERT)
  if (data.escaped) logo(ctx, 'INFINITE PROFIT', W / 2, 170, narrow ? 40 : 46, ICE, 'center')
  else logo(ctx, 'THE RESISTANCE HELD', W / 2, 170, narrow ? 36 : 46, ICE, 'center')
  label(ctx, 'FINAL VALUATION', W / 2, 250, narrow ? 30 : 26, GLOW)
  label(ctx, `<<< ${valuation(data.score)} >>>`, W / 2, 300, 64, ICE)
  label(ctx, data.escaped ? 'ALL THREE ERAS // NO ONE STOPPED YOU' : `STOPPED IN ERA ${data.level + 1} // ${(LEVELS[data.level]?.years ?? '').trim()}`, W / 2, 352, narrow ? 26 : 24, tone)

  label(ctx, narrow ? 'SIGN THE BOOKS: YOUR NAME' : 'SIGN THE BOOKS — ENTER YOUR NAME', W / 2, 420, narrow ? 30 : 24, GLOW)
  const bw = narrow ? 480 : 520
  const bx = W / 2 - bw / 2
  const by = 445
  ctx.fillStyle = 'rgba(150, 214, 255, 0.08)'
  ctx.fillRect(bx, by, bw, 76)
  ctx.strokeStyle = data.focused ? ICE : GLOW
  ctx.lineWidth = data.focused ? 2 : 1
  ctx.strokeRect(bx + 1, by + 1, bw - 2, 74)
  const name = data.name || (data.focused ? '' : 'TAP TO TYPE')
  label(ctx, name, W / 2, by + 40, 52, data.name ? ICE : 'rgba(226, 245, 255, 0.35)')
  if (data.focused && Math.floor(view.time * 2.5) % 2 === 0) {
    ctx.font = `52px ${MONO}`
    fill(ctx, ICE, W / 2 + ctx.measureText(data.name).width / 2 + 4, by + 18, 22, 44)
  }
  hit(frame, 'name', bx, by, bw, 76)
  button(ctx, frame, 'save', 'SAVE RECORD', W / 2 - 170, 560, 340, narrow ? 80 : 56, tone, narrow ? 24 : 18)
  button(ctx, frame, 'skip', 'DON’T SAVE', W / 2 - 120, narrow ? 670 : 640, 240, narrow ? 64 : 40, 'rgba(150, 214, 255, 0.6)', narrow ? 18 : 12)
  ctx.restore()
  return frame.hits
}

export interface BoardView {
  records: Entry[]
  mine: Entry | null
  global: boolean
  online: boolean
  loading: boolean
  from: 'title' | 'run'
}

export function drawLeaderboard(ctx: CanvasRenderingContext2D, view: View, board: BoardView): Hit[] {
  ctx.save()
  fill(ctx, VOID, 0, 0, view.width, view.height)
  drawBackdrop(ctx, view, theme(false, 1))
  const narrow = view.width < view.height
  const W = narrow ? 720 : 900
  const H = narrow ? 1200 : 1060
  const frame = frameFor(ctx, view, W, H)
  const x = 50
  const w = W - 100
  panel(ctx, GLOW, x, 24, w, H - 48)
  text(ctx, 'THE RICH LIST', W / 2, 70, narrow ? 20 : 14, GLOW, 'center', 700, 5)
  logo(ctx, 'TOP VALUATIONS', W / 2, 118, narrow ? 36 : 46, ICE, 'center')
  label(ctx, `THIS WEEK \u00B7 RESETS IN ${countdown()}`, W / 2, 168, narrow ? 26 : 24, ALERT)
  label(ctx, 'SCORES ON THIS DEVICE', W / 2, 202, narrow ? 24 : 19, 'rgba(150, 214, 255, 0.6)')

  const top = 250
  text(ctx, 'RANK', x + 40, top, narrow ? 18 : 13, GLOW, 'left', 700, 3)
  text(ctx, 'NAME', x + 130, top, narrow ? 18 : 13, GLOW, 'left', 700, 3)
  text(ctx, 'REACHED', x + w - 280, top, narrow ? 18 : 13, GLOW, 'left', 700, 3)
  text(ctx, 'VALUE', x + w - 40, top, narrow ? 18 : 13, GLOW, 'right', 700, 3)
  fill(ctx, 'rgba(150, 214, 255, 0.3)', x + 30, top + 16, w - 60, 1)

  const isMine = (r: Entry) => board.mine !== null && r.name === board.mine.name && r.score === board.mine.score
  const mineAt = board.records.findIndex(isMine)
  const rows = 11
  const row = (r: Entry, i: number, y: number) => {
    const mine = i === mineAt
    if (mine) {
      ctx.fillStyle = 'rgba(255, 45, 111, 0.14)'
      ctx.fillRect(x + 24, y - 21, w - 48, 42)
      fill(ctx, ALERT, x + 24, y - 21, 4, 42)
    }
    const tone = mine ? ALERT : ICE
    label(ctx, String(i + 1).padStart(2, '0'), x + 40, y, 30, mine ? ALERT : i < 3 ? ICE : GLOW, 'left')
    label(ctx, r.name || '???', x + 130, y, 30, tone, 'left')
    label(ctx, r.escaped ? '\u221E UNSTOPPED' : `ERA ${r.level + 1}`, x + w - 280, y, 26, r.escaped ? ALERT : GLOW, 'left')
    label(ctx, valuation(r.score), x + w - 40, y, 30, tone, 'right')
  }
  if (!board.records.length) label(ctx, board.loading ? 'LOADING\u2026' : 'NO SCORES THIS WEEK. BE THE FIRST.', W / 2, top + 90, 28, ICE)
  board.records.slice(0, rows).forEach((r, i) => row(r, i, top + 56 + i * 50))
  if (mineAt >= rows) {
    label(ctx, '\u00B7 \u00B7 \u00B7', W / 2, top + 56 + rows * 50 - 14, 24, GLOW)
    row(board.records[mineAt]!, mineAt, top + 56 + rows * 50 + 18)
  }

  const by = H - 120
  button(ctx, frame, 'again', board.from === 'title' ? '\u25C2 BACK' : 'PLAY AGAIN', W / 2 - 150, by, 300, narrow ? 76 : 58, ICE, narrow ? 22 : 18)
  ctx.restore()
  return frame.hits
}

// Shown once after the prologue: who is who on the board, told with pictures.
const CONSUMER = '#ffc94a'

// A RAM stick drawn like the board's pickups (22x12 pixel art), centred on x, y at scale s.
function briefStick(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  const ox = Math.round(x - 11 * s)
  const oy = Math.round(y - 6 * s)
  const px = (color: string, a: number, b: number, w: number, h: number) => {
    ctx.fillStyle = color
    ctx.fillRect(ox + a * s, oy + b * s, w * s, h * s)
  }
  px('#ffb38a', 0, 0, 22, 10)
  px('#ffe0c8', 0, 0, 22, 1)
  px(VOID, 10, 8, 2, 2)
  for (const a of [2, 8, 14]) px('#4a1d12', a, 2, 5, 5)
  for (let a = 1; a < 21; a += 2) if (a < 10 || a > 11) px('#ffd36b', a, 10, 1, 2)
}

interface Box {
  x: number
  y: number
  w: number
  h: number
}

// One vignette: a big title, an animated picture, and at most one short line.
function briefCard(
  ctx: CanvasRenderingContext2D,
  box: Box,
  tone: string,
  title: string,
  line: string,
  big: number,
  small: number,
  scene: (area: Box) => void,
): void {
  const { x, y, w, h } = box
  ctx.fillStyle = 'rgba(150, 214, 255, 0.035)'
  ctx.fillRect(x, y, w, h)
  ctx.strokeStyle = 'rgba(150, 214, 255, 0.18)'
  ctx.lineWidth = 1
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1)
  brackets(ctx, tone, x, y, w, h, 16, 2)
  label(ctx, title, x + w / 2, y + big * 0.8, big, tone)
  label(ctx, line, x + w / 2, y + h - small * 0.95, small, GLOW)
  const area = { x: x + 6, y: y + big * 1.5, w: w - 12, h: h - big * 1.5 - small * 1.8 }
  ctx.save()
  ctx.beginPath()
  ctx.rect(area.x, area.y, area.w, area.h)
  ctx.clip()
  scene(area)
  ctx.restore()
}

// RAM sticks sliding in from the right and vanishing into a mouth at `mouth`.
function briefFeed(ctx: CanvasRenderingContext2D, a: Box, y: number, mouth: number, scale: number, gap: number, t: number, speed: number): void {
  const shift = (t * speed) % gap
  for (let sx = mouth + gap - shift; sx < a.x + a.w + gap; sx += gap) if (sx > mouth + 4) briefStick(ctx, sx, y, scale)
}

// A soft light behind the player so "you" reads first.
function briefHalo(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, 'rgba(226, 245, 255, 0.28)')
  g.addColorStop(1, 'rgba(226, 245, 255, 0)')
  ctx.fillStyle = g
  ctx.fillRect(x - r, y - r, r * 2, r * 2)
}

export function drawBriefing(ctx: CanvasRenderingContext2D, view: View): Hit[] {
  ctx.save()
  fill(ctx, VOID, 0, 0, view.width, view.height)
  drawBackdrop(ctx, view, theme(false, 0))
  const portrait = view.width < view.height * 1.05
  const W = portrait ? 800 : 1100
  const H = portrait ? 1300 : 860
  const frame = frameFor(ctx, view, W, H)
  const t = view.time
  const loop = (period: number, offset = 0) => (((t + offset) % period) + period) % period / period
  panel(ctx, GLOW, 30, 30, W - 60, H - 60)
  logo(ctx, 'HOW TO PLAY', W / 2, portrait ? 110 : 92, portrait ? 52 : 46, ICE, 'center')

  const big = portrait ? 50 : 38
  const small = portrait ? 34 : 26
  const gap = 20
  const left = portrait ? 60 : 50
  const inner = W - left * 2
  const rowH = portrait ? 270 : 262
  const top = portrait ? 180 : 148
  const row = (i: number) => top + i * (rowH + gap)
  let you: Box, ram: Box, consumers: Box, resistance: Box, surge: Box
  if (portrait) {
    const yw = 400
    you = { x: left, y: row(0), w: yw, h: rowH }
    ram = { x: left + yw + gap, y: row(0), w: inner - yw - gap, h: rowH }
    consumers = { x: left, y: row(1), w: inner, h: rowH }
    const half = (inner - gap) / 2
    resistance = { x: left, y: row(2), w: half, h: rowH }
    surge = { x: left + half + gap, y: row(2), w: half, h: rowH }
  } else {
    const yw = 300
    const rw = 200
    you = { x: left, y: row(0), w: yw, h: rowH }
    ram = { x: left + yw + gap, y: row(0), w: rw, h: rowH }
    consumers = { x: left + yw + rw + gap * 2, y: row(0), w: inner - yw - rw - gap * 2, h: rowH }
    const half = (inner - gap) / 2
    resistance = { x: left, y: row(1), w: half, h: rowH }
    surge = { x: left + half + gap, y: row(1), w: half, h: rowH }
  }

  const pacSize = 104
  const pacBody = pacSize * 0.27

  briefCard(ctx, you, ICE, 'YOU', 'INFINITE LABS', big, small, (a) => {
    const cy = a.y + a.h / 2
    const px = a.x + a.w * 0.3 + Math.sin(t * 2) * 6
    briefFeed(ctx, a, cy, px + pacBody * 0.3, 2.2, 66, t, 120)
    briefHalo(ctx, px, cy, pacBody * 2)
    const art = pacFrame(t * 10)
    if (art) drawFacing(ctx, art, px, cy, pacSize, 'right', 'right')
  })

  briefCard(ctx, ram, '#ffb38a', 'RAM', 'eat it all', big, small, (a) => {
    const bob = Math.sin(t * 3) * 5
    const s = Math.min(5, (a.w - 30) / 26)
    ctx.save()
    ctx.globalAlpha = 0.35 + 0.25 * Math.sin(t * 4)
    ctx.fillStyle = 'rgba(255, 154, 102, 0.35)'
    ctx.beginPath()
    ctx.ellipse(a.x + a.w / 2, a.y + a.h / 2 + bob, 15 * s, 10 * s, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    briefStick(ctx, a.x + a.w / 2, a.y + a.h / 2 + bob, s)
  })

  briefCard(ctx, consumers, CONSUMER, 'CONSUMERS', 'they want RAM too', big, small, (a) => {
    const cy = a.y + a.h / 2
    // left: you, crossed out against them
    const vsW = 150
    const youX = a.x + 46
    const you = pacFrame(t * 6)
    briefHalo(ctx, youX, cy - 6, 50)
    if (you) {
      ctx.save()
      ctx.globalAlpha = 0.75
      drawFacing(ctx, you, youX, cy - 6, 84, 'right', 'right')
      ctx.restore()
    }
    label(ctx, 'YOU', youX, cy + 38, portrait ? 24 : 20, GLOW)
    const nx = a.x + vsW - 34
    ctx.strokeStyle = ALERT
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(nx - 14, cy - 8)
    ctx.lineTo(nx + 14, cy - 8)
    ctx.moveTo(nx - 14, cy + 6)
    ctx.lineTo(nx + 14, cy + 6)
    ctx.moveTo(nx + 9, cy - 20)
    ctx.lineTo(nx - 9, cy + 18)
    ctx.stroke()
    // right: a conga line of consumers eating their own row of RAM
    const lane = { x: a.x + vsW, y: a.y, w: a.w - vsW, h: a.h }
    ctx.save()
    ctx.beginPath()
    ctx.rect(lane.x, lane.y, lane.w, lane.h)
    ctx.clip()
    const spacing = 56
    const lead = lane.x + Math.min(200, Math.max(150, lane.w * 0.55)) + Math.sin(t * 1.6) * 8
    briefFeed(ctx, lane, cy, lead + 10, 1.9, 58, t, 90)
    for (let i = 0; i < 3; i++) {
      const art = miniFrame(t * 9 + i)
      if (art) drawFacing(ctx, art, lead - i * spacing, cy + Math.sin(t * 8 + i * 2) * 2, 62, 'right', 'right')
    }
    ctx.restore()
  })

  briefCard(ctx, resistance, ALERT, 'RESISTANCE', 'don’t get caught', big, small, (a) => {
    const cy = a.y + a.h / 2
    const gapG = 58
    // the floor scrolls left so everyone reads as running right
    ctx.fillStyle = 'rgba(150, 214, 255, 0.35)'
    const shift = (t * 220) % 40
    for (let fx = a.x - shift; fx < a.x + a.w; fx += 40) ctx.fillRect(fx, cy + 40, 20, 3)
    const head = a.x + a.w - 60 + Math.sin(t * 1.3) * 10
    briefHalo(ctx, head, cy, pacBody * 1.8)
    const art = pacFrame(t * 10)
    if (art) drawFacing(ctx, art, head, cy, pacSize * 0.9, 'right', 'right')
    for (let i = 0; i < 3; i++) {
      const g = lawSprite(i, 'body')
      const gx = head - 80 - i * gapG + Math.sin(t * 2.2 + i * 0.9) * 14
      if (g) drawUpright(ctx, g, gx, cy + Math.sin(t * 7 + i * 1.7) * 4, 56, 'right')
    }
  })

  briefCard(ctx, surge, FRIGHT, 'SURGE', '25 RAM = eat them', big, small, (a) => {
    const P = 5.6
    const p = loop(P) * P
    const fillPhase = 2.4
    const barW = Math.min(a.w - 40, 320)
    const barH = 24
    const bx = a.x + (a.w - barW) / 2
    const by = a.y + 8
    const laneY = a.y + a.h * 0.64
    const level = p < fillPhase ? p / fillPhase : Math.max(0, 1 - (p - fillPhase) / (P - fillPhase))
    const count = p < fillPhase ? Math.floor(25 * level) : 25
    const full = p >= fillPhase
    ctx.strokeStyle = full ? ICE : GLOW
    ctx.lineWidth = 2
    ctx.strokeRect(bx + 1, by + 1, barW - 2, barH - 2)
    const lit = full && Math.floor(t * 8) % 2 === 0
    ctx.fillStyle = lit ? ICE : full ? FRIGHT : '#ffb38a'
    ctx.fillRect(bx + 4, by + 4, (barW - 8) * level, barH - 8)
    label(ctx, `${count}/25`, bx + barW / 2, by + barH + 18, portrait ? 26 : 22, full ? ICE : GLOW)
    const startX = a.x + 52
    if (!full) {
      // the pac sits still while RAM slides into its mouth
      const art = pacFrame(t * 12)
      const feed = (t * 150) % 60
      for (let sx = startX + 40 - feed; sx < a.x + a.w; sx += 60) if (sx > startX + 8) briefStick(ctx, sx, laneY, 1.8)
      if (art) drawFacing(ctx, art, startX, laneY, pacSize * 0.85, 'right', 'right')
      return
    }
    const q = p - fillPhase
    const meetT = 1.3
    const travel = a.w - 80 - 44
    const pacX = startX + Math.min(q, P) * (travel / meetT) * 0.55
    const ghostX = a.x + a.w - 40 - Math.min(q, meetT) * (travel / meetT) * 0.45
    const art = pacFrame(t * 12)
    if (q < meetT) {
      const look = q < 0.35 ? 'body' : 'blue'
      const g = lawSprite(1, look)
      if (g) drawUpright(ctx, g, ghostX, laneY + Math.sin(t * 9) * 3, 56, 'left')
    } else {
      // eaten: the eyes fly home and a burst marks the bite
      const k = q - meetT
      const eyes = lawSprite(1, 'eyes')
      ctx.save()
      ctx.globalAlpha = Math.max(0, 1 - k / 1.4)
      if (eyes) drawUpright(ctx, eyes, ghostX + k * 90, laneY - k * 70, 56, 'right')
      ctx.fillStyle = ICE
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2
        const r = 20 + k * 70
        ctx.fillRect(ghostX + Math.cos(ang) * r - 3, laneY + Math.sin(ang) * r - 3, 6, 6)
      }
      ctx.restore()
    }
    if (art) drawFacing(ctx, art, pacX, laneY, pacSize * 0.85, 'right', 'right')
  })

  label(ctx, view.touch ? 'SWIPE TO MOVE' : 'ARROWS · WASD · SWIPE', W / 2, portrait ? H - 200 : H - 128, portrait ? 34 : 28, ICE)
  const pulse = 0.6 + 0.4 * Math.sin(t * 5.5)
  ctx.globalAlpha = pulse
  const bw = portrait ? 360 : 300
  const bh = portrait ? 84 : 58
  button(ctx, frame, 'action', 'START', W / 2 - bw / 2, portrait ? H - 160 : H - 104, bw, bh, ICE, portrait ? 28 : 22)
  ctx.globalAlpha = 1
  ctx.restore()
  return frame.hits
}
