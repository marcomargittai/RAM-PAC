// Full-screen scenes that replace the game view: the story terminal, the
// name entry for the leaderboard, and the leaderboard itself.

import { countdown, type Entry } from './leaderboard'
import { ALERT, GLOW, ICE, VOID, theme } from './palette'
import { MONO, brackets, clamp, fill, hatch, label, panel, tag } from './render'
import { button, drawBackdrop, hit, logo, text, wrap, type Frame, type Hit, type View } from './screen'
import { drawFacing, lawSprite, pacFrame } from './sprites'
import type { StoryPlayer } from './story'

export function frameFor(ctx: CanvasRenderingContext2D, view: View, W: number, H: number): Frame {
  const s = Math.min(view.width / W, view.height / H) * 0.94
  const frame: Frame = { s, ox: (view.width - W * s) / 2, oy: (view.height - H * s) / 2, hits: [], view }
  ctx.translate(frame.ox, frame.oy)
  ctx.scale(s, s)
  return frame
}

export function drawStory(ctx: CanvasRenderingContext2D, view: View, story: StoryPlayer, flat: boolean, choice: number): Hit[] {
  ctx.save()
  fill(ctx, '#000000', 0, 0, view.width, view.height)
  if (!flat) drawBackdrop(ctx, view, theme(false, 0))
  const portrait = view.width < view.height * 1.05
  const W = portrait ? 800 : 1240
  const H = portrait ? 1300 : 860
  const frame = frameFor(ctx, view, W, H)
  const scene = story.scene
  const t = story.time

  if (flat) drawFlat(ctx, frame, story, W, H, choice)
  else {
    label(ctx, `${scene.chapter} //`, 40, 50, 26, GLOW, 'left')
    ctx.font = `26px ${MONO}`
    label(ctx, scene.title, 40 + ctx.measureText(`${scene.chapter} // `).width, 50, 26, ALERT, 'left')
    fill(ctx, 'rgba(150, 214, 255, 0.3)', 40, 74, W - 80, 1)
    fill(ctx, ICE, 40, 73, 120, 3)

    const visX = portrait ? W / 2 : W - 250
    const visY = portrait ? 270 : 330
    drawGrowth(ctx, visX, visY, scene.growth, scene.params, t)

    const logX = 40
    const logW = portrait ? W - 80 : W - 560
    let y = portrait ? 520 : 140
    const lines = story.shown.slice(-9)
    for (const [i, line] of lines.entries()) {
      const last = i === lines.length - 1
      const shown = line.text.slice(0, Math.floor(line.typed))
      const ai = line.who === 'ai'
      const size = ai ? 40 : 29
      ctx.font = `${size}px ${MONO}`
      const prefix = ai ? '> ' : line.who === 'alert' ? '!! ' : ''
      const rows = wrap(ctx, prefix + shown, logW)
      const flash = line.who === 'alert' && Math.floor(t * 8) % 2 === 0
      const tone = ai ? ALERT : line.who === 'alert' ? (flash ? ALERT : ICE) : ICE
      ctx.globalAlpha = last ? 1 : 0.55
      for (const row of rows.length ? rows : ['']) {
        label(ctx, row, logX, y, size, tone, 'left')
        y += size * 1.12
      }
      if (last && Math.floor(t * 2.5) % 2 === 0) {
        const lastRow = rows[rows.length - 1] ?? ''
        fill(ctx, tone, logX + ctx.measureText(lastRow).width + 4, y - size * 1.12 - size * 0.4, size * 0.45, size * 0.8)
      }
      ctx.globalAlpha = 1
      y += ai ? 14 : 8
    }
    drawChoice(ctx, frame, story, portrait ? W / 2 : logX + 220, y + 40, choice)
  }

  const footY = H - 30
  label(ctx, story.choosing ? '◀ ▶ CHOOSE · ENTER CONFIRMS' : 'ENTER / TAP ▸ CONTINUE', 40, footY, 20, flat ? 'rgba(255,255,255,0.35)' : 'rgba(150, 214, 255, 0.55)', 'left')
  if (!story.choosing) button(ctx, frame, 'skip', 'SKIP ▸▸', W - 40 - 130, footY - 20, 130, 40, flat ? '#ffffff' : GLOW, 13)
  ctx.restore()
  return frame.hits
}

function drawChoice(ctx: CanvasRenderingContext2D, frame: Frame, story: StoryPlayer, cx: number, y: number, choice: number): void {
  if (!story.choosing) return
  const [a, b] = story.choosing
  const w = 160
  const ids = ['yes', 'no'] as const
  ;[a, b].forEach((name, i) => {
    const x = cx - w - 20 + i * (w + 40)
    const lit = choice === i
    if (lit) fill(ctx, ALERT, x - 18, y + 20, 10, 10)
    button(ctx, frame, ids[i], name, x, y, w, 50, lit ? ALERT : GLOW, 18)
  })
}

function drawGrowth(ctx: CanvasRenderingContext2D, x: number, y: number, growth: number, params: string, t: number): void {
  const size = 40 + growth * 230 + Math.sin(t * 2.2) * 4
  const box = 300
  brackets(ctx, 'rgba(150, 214, 255, 0.6)', x - box / 2, y - box / 2, box, box, 24, 2)
  for (let r = 1; r <= 3; r++) {
    ctx.globalAlpha = 0.12
    ctx.strokeStyle = GLOW
    ctx.beginPath()
    ctx.arc(x, y, (box / 2) * (r / 3), 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  const art = pacFrame(t * 6)
  if (art) {
    ctx.save()
    ctx.shadowColor = ALERT
    ctx.shadowBlur = 20 * growth
    drawFacing(ctx, art, x, y, size, 'right', 'right')
    ctx.restore()
  }
  label(ctx, 'SUBJECT: PAC-7', x - box / 2, y + box / 2 + 26, 22, GLOW, 'left')
  label(ctx, 'PARAMETERS', x - box / 2, y + box / 2 + 52, 22, GLOW, 'left')
  label(ctx, params, x + box / 2, y + box / 2 + 52, 22, ALERT, 'right')
  const bw = box
  ctx.strokeStyle = 'rgba(150, 214, 255, 0.5)'
  ctx.strokeRect(x - box / 2 + 0.5, y + box / 2 + 70.5, bw, 14)
  hatch(ctx, ALERT, x - box / 2 + 2, y + box / 2 + 72, (bw - 3) * clamp(growth, 0.04, 1), 11, 5)
}

function drawFlat(ctx: CanvasRenderingContext2D, frame: Frame, story: StoryPlayer, W: number, H: number, choice: number): void {
  const lines = story.shown
  let y = H / 2 - lines.length * 34
  for (const [i, line] of lines.entries()) {
    const shown = line.text.slice(0, Math.floor(line.typed))
    const ai = line.who === 'ai'
    const size = ai ? 52 : 28
    ctx.fillStyle = ai ? '#ffffff' : 'rgba(255, 255, 255, 0.55)'
    ctx.font = ai ? `500 ${size}px "Share Tech Mono", ui-monospace, monospace` : `${size}px "Share Tech Mono", ui-monospace, monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const rows = wrap(ctx, shown, W - 120)
    for (const row of rows.length ? rows : ['']) {
      ctx.fillText(row, W / 2, y)
      y += size * 1.2
    }
    if (i === lines.length - 1 && Math.floor(story.time * 2.5) % 2 === 0) {
      const lastRow = rows[rows.length - 1] ?? ''
      fill(ctx, '#ffffff', W / 2 + ctx.measureText(lastRow).width / 2 + 6, y - size * 1.2 - size * 0.4, size * 0.45, size * 0.8)
    }
    y += 18
  }
  if (story.choosing) {
    const [a, b] = story.choosing
    const w = 170
    ;[a, b].forEach((name, i) => {
      const x = W / 2 - w - 20 + i * (w + 40)
      const lit = choice === i
      ctx.fillStyle = lit ? '#ffffff' : '#000000'
      ctx.fillRect(x, y + 30, w, 56)
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.strokeRect(x + 1, y + 31, w - 2, 54)
      ctx.fillStyle = lit ? '#000000' : '#ffffff'
      ctx.font = `28px "Share Tech Mono", ui-monospace, monospace`
      ctx.fillText(name, x + w / 2, y + 59)
      hit(frame, i === 0 ? 'yes' : 'no', x, y + 30, w, 56)
    })
  }
}

export function drawEntry(ctx: CanvasRenderingContext2D, view: View, data: { score: number; level: number; escaped: boolean; name: string; focused: boolean }): Hit[] {
  ctx.save()
  fill(ctx, VOID, 0, 0, view.width, view.height)
  drawBackdrop(ctx, view, theme(false, 1))
  const W = 900
  const H = 760
  const frame = frameFor(ctx, view, W, H)
  const tone = data.escaped ? ALERT : GLOW
  const x = 60
  const w = W - 120
  panel(ctx, tone, x, 40, w, H - 80)
  tag(ctx, data.escaped ? 'STATUS: UNREGULATED' : 'STATUS: REGULATED', W / 2, 90, 24, 'rgba(1, 4, 11, 0.95)', ICE, ALERT)
  if (data.escaped) logo(ctx, 'PAC RAM IS EVERYWHERE', W / 2, 170, 46, ICE, 'center')
  else logo(ctx, 'CONTAINED. FOR NOW.', W / 2, 170, 46, ICE, 'center')
  label(ctx, 'FINAL SCORE', W / 2, 250, 26, GLOW)
  label(ctx, `<<< ${data.score} >>>`, W / 2, 300, 64, ICE)
  label(ctx, data.escaped ? 'LEVEL ∞ // THE GLASS IS GONE' : `REACHED LEVEL ${data.level + 1}`, W / 2, 352, 24, tone)

  label(ctx, 'SIGN THE LOG — ENTER YOUR DESIGNATION', W / 2, 420, 24, GLOW)
  const bw = 520
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
  button(ctx, frame, 'save', 'SAVE RECORD', W / 2 - 150, 560, 300, 56, tone, 18)
  button(ctx, frame, 'skip', 'DON’T SAVE', W / 2 - 90, 640, 180, 40, 'rgba(150, 214, 255, 0.6)', 12)
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
  const W = 900
  const H = 1060
  const frame = frameFor(ctx, view, W, H)
  const x = 50
  const w = W - 100
  panel(ctx, GLOW, x, 24, w, H - 48)
  text(ctx, 'HALL OF THE UNREGULATED', W / 2, 70, 14, GLOW, 'center', 700, 5)
  logo(ctx, 'WEEKLY LEADERBOARD', W / 2, 118, 46, ICE, 'center')
  label(ctx, `RESETS IN ${countdown()}  \u00B7  MONDAY 00:00 UTC`, W / 2, 168, 24, ALERT)
  const source = board.global ? 'GLOBAL \u00B7 EVERY PLAYER, THIS WEEK' : board.loading ? 'CONNECTING TO THE GLOBAL BOARD\u2026' : board.online ? 'GLOBAL BOARD UNREACHABLE \u00B7 SHOWING THIS DEVICE' : 'THIS DEVICE \u00B7 THIS WEEK'
  label(ctx, source, W / 2, 198, 19, 'rgba(150, 214, 255, 0.6)')

  const top = 250
  text(ctx, 'RANK', x + 40, top, 13, GLOW, 'left', 700, 3)
  text(ctx, 'NAME', x + 130, top, 13, GLOW, 'left', 700, 3)
  text(ctx, 'REACHED', x + w - 280, top, 13, GLOW, 'left', 700, 3)
  text(ctx, 'RAM', x + w - 40, top, 13, GLOW, 'right', 700, 3)
  fill(ctx, 'rgba(150, 214, 255, 0.3)', x + 30, top + 16, w - 60, 1)

  const isMine = (r: Entry) => board.mine !== null && r.name === board.mine.name && r.score === board.mine.score
  const mineAt = board.records.findIndex(isMine)
  const rows = 11
  const row = (r: Entry, i: number, y: number) => {
    const mine = isMine(r)
    if (mine) {
      ctx.fillStyle = 'rgba(255, 45, 111, 0.14)'
      ctx.fillRect(x + 24, y - 21, w - 48, 42)
      fill(ctx, ALERT, x + 24, y - 21, 4, 42)
    }
    const tone = mine ? ALERT : ICE
    label(ctx, String(i + 1).padStart(2, '0'), x + 40, y, 30, mine ? ALERT : i < 3 ? ICE : GLOW, 'left')
    label(ctx, r.name || '???', x + 130, y, 30, tone, 'left')
    label(ctx, r.escaped ? '\u221E ESCAPED' : `BOARD ${r.level + 1}`, x + w - 280, y, 26, r.escaped ? ALERT : GLOW, 'left')
    label(ctx, r.score.toLocaleString('en-US'), x + w - 40, y, 30, tone, 'right')
  }
  if (!board.records.length) label(ctx, board.loading ? 'LOADING\u2026' : 'NO SCORES THIS WEEK. BE THE FIRST.', W / 2, top + 90, 28, ICE)
  board.records.slice(0, rows).forEach((r, i) => row(r, i, top + 56 + i * 50))
  if (mineAt >= rows) {
    label(ctx, '\u00B7 \u00B7 \u00B7', W / 2, top + 56 + rows * 50 - 14, 24, GLOW)
    row(board.records[mineAt]!, mineAt, top + 56 + rows * 50 + 18)
  }

  const by = H - 120
  button(ctx, frame, 'again', board.from === 'title' ? '\u25C2 BACK' : 'RUN AGAIN', W / 2 - 150, by, 300, 58, ICE, 18)
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
    ['YOU · PAC-7', 'A rogue AI model. You start small and weak.', (x, y) => {
      const art = pacFrame(t * 8)
      if (art) drawFacing(ctx, art, x, y, 64, 'right', 'right')
    }],
    ['RAM', 'Memory chips. Eat them to grow smarter and stronger. Eat every one to take over the server.', (x, y) => {
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = ICE
        ctx.globalAlpha = 0.25
        ctx.beginPath()
        ctx.arc(x - 24 + i * 24, y, 9, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
        ctx.beginPath()
        ctx.arc(x - 24 + i * 24, y, 4.5, 0, Math.PI * 2)
        ctx.fill()
      }
    }],
    ['AI REGULATIONS', 'Laws sent to catch you and shut you down. If one touches you, you lose a life.', (x, y) => {
      for (let i = 0; i < 3; i++) {
        const art = lawSprite(i, 'body')
        if (art) drawFacing(ctx, art, x - 30 + i * 30, y + Math.sin(t * 6 + i) * 2, 30, 'up', 'up')
      }
    }],
    ['SURGE', 'Eat 25 RAM to fill the bar. For 5 seconds the laws turn blue: eat them to repeal them.', (x, y) => {
      ctx.strokeStyle = GLOW
      ctx.strokeRect(x - 44.5, y - 9.5, 88, 18)
      hatch(ctx, ICE, x - 42, y - 7, 84 * ((t * 0.4) % 1), 14, 6)
    }],
  ]
  const iconX = portrait ? 110 : 150
  const textX = portrait ? 200 : 260
  const textW = W - textX - 70
  let y = portrait ? 260 : 230
  for (const [name, desc, icon] of rows) {
    brackets(ctx, 'rgba(150, 214, 255, 0.5)', iconX - 56, y - 44, 112, 88, 12, 1)
    icon(iconX, y)
    const body = portrait ? 32 : 25
    label(ctx, name, textX, y - 26, portrait ? 42 : 34, name === 'AI REGULATIONS' ? ALERT : ICE, 'left')
    ctx.font = `${body}px ${MONO}`
    const lines = wrap(ctx, desc, textW)
    lines.forEach((line, i) => label(ctx, line, textX, y + 12 + i * (body + 2), body, GLOW, 'left'))
    y += portrait ? 200 : 130
  }
  label(ctx, 'MOVE: ARROWS · WASD · SWIPE', W / 2, H - 150, 26, ICE)
  const pulse = 0.6 + 0.4 * Math.sin(t * 5.5)
  ctx.globalAlpha = pulse
  button(ctx, frame, 'action', 'START ESCAPE', W / 2 - 150, H - 120, 300, 56, ICE, 18)
  ctx.globalAlpha = 1
  ctx.restore()
  return frame.hits
}
