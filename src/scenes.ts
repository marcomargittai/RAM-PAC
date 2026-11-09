// Full-screen scenes that replace the game view: the briefing, the name
// entry for the leaderboard, and the leaderboard itself.

import { countdown, type Entry } from './leaderboard'
import { ALERT, GLOW, ICE, VOID, theme } from './palette'
import { MONO, brackets, fill, label, panel, tag } from './render'
import { button, drawBackdrop, hit, logo, text, wrap, type Frame, type Hit, type View } from './screen'
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

// Shown once after the prologue: what everything on the board is.
export function drawBriefing(ctx: CanvasRenderingContext2D, view: View): Hit[] {
  ctx.save()
  fill(ctx, VOID, 0, 0, view.width, view.height)
  drawBackdrop(ctx, view, theme(false, 0))
  const portrait = view.width < view.height * 1.05
  const W = portrait ? 800 : 1100
  const H = portrait ? 1300 : 860
  const frame = frameFor(ctx, view, W, H)
  const t = view.time
  panel(ctx, GLOW, 30, 30, W - 60, H - 60)
  tag(ctx, 'MISSION BRIEFING', W / 2, 78, 26, 'rgba(1, 4, 11, 0.95)', ICE, ALERT)
  logo(ctx, 'HOW TO PLAY PAC RAM', W / 2, 140, portrait ? 40 : 44, ICE, 'center')

  const rows: Array<[string, string, (x: number, y: number) => void]> = [
    ['YOU · INFINITE LABS', 'An AI company. You need RAM for your datacenters. Your goal: infinite profit.', (x, y) => {
      const art = pacFrame(t * 8)
      if (art) drawFacing(ctx, art, x, y, 64, 'right', 'right')
    }],
    ['RAM', 'Memory sticks. Eat them and your share price climbs. When the board runs out of RAM, the next era begins.', (x, y) => {
      ctx.fillStyle = '#cfe9ff'
      ctx.fillRect(x - 33, y - 10, 66, 18)
      ctx.fillStyle = '#1b3c5c'
      for (const dx of [-27, -9, 9]) ctx.fillRect(x + dx, y - 6, 16, 10)
      ctx.fillStyle = '#96d6ff'
      for (let dx = -31; dx < 32; dx += 5) ctx.fillRect(x + dx, y + 8, 3, 5)
    }],
    ['CONSUMERS', 'Ordinary people who want RAM too. Slower than you, and safe from you, except during a surge. In the last era they are always fair game.', (x, y) => {
      for (let i = 0; i < 3; i++) {
        const art = miniFrame(t * 7 + i)
        if (art) drawFacing(ctx, art, x - 28 + i * 28, y, 24, 'right', 'right')
      }
    }],
    ['THE RESISTANCE', 'Regulators, residents, courts and lawmakers. If one touches you, you lose a life.', (x, y) => {
      for (let i = 0; i < 3; i++) {
        const art = lawSprite(i, 'body')
        if (art) drawUpright(ctx, art, x - 30 + i * 30, y + Math.sin(t * 6 + i) * 2, 30)
      }
    }],
    ['SURGE', 'Eat 25 RAM to fill the surge bar. For a few seconds the resistance turns blue: eat it and it is sent back to base. You can eat consumers then too.', (x, y) => {
      ctx.strokeStyle = GLOW
      ctx.strokeRect(x - 44.5, y - 9.5, 88, 18)
      ctx.fillStyle = ICE
      ctx.fillRect(x - 42, y - 7, 84 * ((t * 0.4) % 1), 14)
    }],
  ]
  const iconX = portrait ? 110 : 150
  const textX = portrait ? 200 : 260
  const textW = W - textX - 70
  let y = portrait ? 240 : 205
  for (const [name, desc, icon] of rows) {
    brackets(ctx, 'rgba(150, 214, 255, 0.5)', iconX - 56, y - 44, 112, 88, 12, 1)
    icon(iconX, y)
    const body = portrait ? 29 : 23
    label(ctx, name, textX, y - 26, portrait ? 40 : 32, name === 'THE RESISTANCE' ? ALERT : name === 'CONSUMERS' ? '#ffc94a' : ICE, 'left')
    ctx.font = `${body}px ${MONO}`
    const lines = wrap(ctx, desc, textW)
    lines.forEach((line, i) => label(ctx, line, textX, y + 12 + i * (body + 2), body, GLOW, 'left'))
    y += portrait ? 172 : 108
  }
  label(ctx, view.touch ? 'MOVE: SWIPE ANYWHERE' : 'MOVE: ARROWS · WASD · SWIPE', W / 2, H - 150, portrait ? 32 : 26, ICE)
  const pulse = 0.6 + 0.4 * Math.sin(t * 5.5)
  ctx.globalAlpha = pulse
  button(ctx, frame, 'action', 'START GROWING', W / 2 - 150, H - 120, 300, 56, ICE, 18)
  ctx.globalAlpha = 1
  ctx.restore()
  return frame.hits
}
