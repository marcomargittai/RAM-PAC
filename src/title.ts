// The title screen, drawn like an old cartridge cover: 3D key art over a
// datacenter skyline and a grid floor, PAC-7 rising like a sun, one big start
// button, the weekly board and the credit.

import { ALERT, GLOW, ICE } from './palette'
import { DISPLAY, MONO, fill, label } from './render'
import { frameFor } from './scenes'
import { hit, type Frame, type Hit, type HitId, type View } from './screen'
import type { Challenge } from './share'
import { drawFacing, pacFrameOf } from './sprites'

function art(name: string): HTMLImageElement {
  const im = new Image()
  im.src = `${import.meta.env.BASE_URL}art/${name}.png`
  return im
}

const KEYART = art('title')
const KEY_W = 261
const KEY_H = 88

// fixed, so the sky does not reshuffle every frame
const STARS = Array.from({ length: 140 }, (_, i) => {
  const r = (n: number) => {
    const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453
    return x - Math.floor(x)
  }
  return { x: r(1), y: r(2), s: r(3) < 0.12 ? 2 : 1, pink: r(4) < 0.04, phase: r(5) * 6.28 }
})

export const CREDIT = 'MARCO MARGITTAI'
export const CREDIT_URL = 'https://marcomargittai.com'

// A chunky arcade button with a visible edge underneath. It sinks when the
// pointer is on it or it is being pressed.
function bigButton(
  ctx: CanvasRenderingContext2D,
  frame: Frame,
  id: HitId,
  text: string,
  x: number,
  y: number,
  w: number,
  h: number,
  look: { face: string; light: string; edge: string; ink: string; size: number; glow: number },
): void {
  const lit = frame.view.hover === id || frame.view.held.has(id)
  const depth = 8
  const sink = frame.view.held.has(id) ? depth - 2 : lit ? 3 : 0
  ctx.save()
  if (look.glow > 0) {
    ctx.shadowColor = look.face
    ctx.shadowBlur = look.glow
  }
  fill(ctx, '#000000', x - 3, y - 3 + sink, w + 6, h + depth - sink + 6)
  ctx.restore()
  fill(ctx, look.edge, x, y + h - 4 + sink, w, depth - sink + 4)
  fill(ctx, look.face, x, y + sink, w, h)
  fill(ctx, look.light, x, y + sink, w, 4)
  fill(ctx, look.light, x, y + sink, 4, h)
  fill(ctx, 'rgba(0, 0, 0, 0.25)', x + w - 4, y + sink, 4, h)
  ctx.font = `900 ${look.size}px ${DISPLAY}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = look.ink
  ctx.letterSpacing = `${look.size * 0.12}px`
  ctx.fillText(text, x + w / 2, y + h / 2 + sink + 2)
  ctx.letterSpacing = '0px'
  hit(frame, id, x - 3, y - 3, w + 6, h + depth + 6)
}

// Server racks standing along the horizon, with blinking status lights: the
// datacenter PAC-7 is trapped in.
function racks(ctx: CanvasRenderingContext2D, from: number, to: number, horizon: number, t: number, side: number): void {
  let x = from
  let i = 0
  while (side > 0 ? x < to : x > to) {
    const r = Math.sin(i * 12.9898) * 43758.5453
    const n = r - Math.floor(r)
    const w = 46 + Math.floor(n * 4) * 10
    const h = 90 + Math.floor(((n * 7) % 1) * 6) * 26
    const left = side > 0 ? x : x - w
    fill(ctx, '#05030c', left, horizon - h, w, h)
    fill(ctx, 'rgba(150, 214, 255, 0.35)', left, horizon - h, w, 2)
    fill(ctx, 'rgba(150, 214, 255, 0.12)', left, horizon - h, 2, h)
    for (let y = horizon - h + 10; y < horizon - 8; y += 12) {
      fill(ctx, 'rgba(150, 214, 255, 0.08)', left + 6, y, w - 12, 6)
      const on = Math.sin(t * (1.5 + n * 3) + y * 0.37 + i) > 0.6
      if (on) fill(ctx, (y + i) % 3 === 0 ? '#ff2d6f' : '#96d6ff', left + w - 12, y + 1, 4, 4)
    }
    x += side * (w + 6)
    i++
  }
}

export function drawTitle(ctx: CanvasRenderingContext2D, view: View, form: number, challenge: Challenge | null = null): Hit[] {
  ctx.save()
  fill(ctx, '#000000', 0, 0, view.width, view.height)
  const portrait = view.width < view.height * 1.05
  const W = portrait ? 800 : 1240
  const H = portrait ? 1300 : 860
  const frame = frameFor(ctx, view, W, H)
  const t = view.time

  // sky, extended past the design area so wide screens have stars too
  const ex = frame.ox / frame.s
  const ey = frame.oy / frame.s
  for (const s of STARS) {
    const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.3 + s.phase))
    ctx.globalAlpha = tw
    fill(ctx, s.pink ? ALERT : ICE, -ex + s.x * (W + ex * 2), -ey + s.y * (H + ey * 2), s.s * 2, s.s * 2)
  }
  ctx.globalAlpha = 1

  // a grid floor running to the horizon
  const horizon = portrait ? 660 : 480
  const floorBottom = H + ey

  // PAC-7's last build rising out of the horizon like a sun, cut by the
  // bands of a sunset
  const er = portrait ? 170 : 118
  const ecx = W / 2
  const ecy = horizon - er * 0.62
  const halo = ctx.createRadialGradient(ecx, ecy, er * 0.4, ecx, ecy, er * 1.8)
  halo.addColorStop(0, 'rgba(255, 45, 111, 0.2)')
  halo.addColorStop(1, 'rgba(255, 45, 111, 0)')
  ctx.fillStyle = halo
  ctx.fillRect(ecx - er * 2, ecy - er * 2, er * 4, horizon - (ecy - er * 2))
  const sun = pacFrameOf(3, t * 1.2)
  if (sun) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(ecx - er, ecy - er, er * 2, horizon - (ecy - er))
    ctx.clip()
    ctx.globalAlpha = 0.6
    drawFacing(ctx, sun, ecx, ecy, er * 2, 'right', 'right')
    ctx.globalAlpha = 1
    // sunset bands, thicker towards the horizon
    for (let k = 0; k < 7; k++) {
      const y = ecy + er * 0.05 + k * k * er * 0.018 + k * er * 0.07
      const h = 2 + k * 2.2
      if (y > horizon) break
      fill(ctx, '#000000', ecx - er, y, er * 2, h)
    }
    ctx.restore()
  }
  // the datacenter: racks on both sides, out to the edge of the screen
  const gap = portrait ? 210 : 260
  racks(ctx, W / 2 - gap, -ex, horizon, t, -1)
  racks(ctx, W / 2 + gap, W + ex, horizon, t, 1)

  ctx.save()
  ctx.beginPath()
  ctx.rect(-ex, horizon, W + ex * 2, floorBottom - horizon)
  ctx.clip()
  const fade = ctx.createLinearGradient(0, horizon, 0, floorBottom)
  fade.addColorStop(0, 'rgba(150, 214, 255, 0.0)')
  fade.addColorStop(1, 'rgba(150, 214, 255, 0.07)')
  ctx.fillStyle = fade
  ctx.fillRect(-ex, horizon, W + ex * 2, floorBottom - horizon)
  ctx.strokeStyle = 'rgba(150, 214, 255, 0.3)'
  ctx.lineWidth = 2
  for (let i = -14; i <= 14; i++) {
    ctx.beginPath()
    ctx.moveTo(W / 2 + i * 14, horizon)
    ctx.lineTo(W / 2 + i * 150, floorBottom)
    ctx.stroke()
  }
  const scroll = (t * 0.35) % 1
  for (let k = 0; k < 14; k++) {
    const z = (k + scroll) / 14
    const y = horizon + (floorBottom - horizon) * z * z
    ctx.globalAlpha = 0.2 + z * 0.6
    ctx.beginPath()
    ctx.moveTo(-ex, y)
    ctx.lineTo(W + ex, y)
    ctx.stroke()
  }
  ctx.restore()
  ctx.globalAlpha = 1
  fill(ctx, 'rgba(226, 245, 255, 0.75)', -ex, horizon - 1, W + ex * 2, 2)

  // the key art
  const scale = portrait ? (W * 0.94) / KEY_W : Math.floor((W * 0.76) / KEY_W)
  const kw = KEY_W * scale
  const kh = KEY_H * scale
  const kx = W / 2 - kw / 2
  const ky = (portrait ? 110 : 26) + Math.sin(t * 1.2) * 3
  ctx.imageSmoothingEnabled = false
  if (KEYART.complete && KEYART.naturalWidth) ctx.drawImage(KEYART, kx, ky, kw, kh)

  // PAC-7 eating its way along the horizon
  const rowY = horizon - 16
  const span = W - 160
  const u = (t * 0.12) % 1
  const px = 80 + u * span
  for (let x = 80; x <= 80 + span; x += 34) {
    if (x < px + 10) continue
    fill(ctx, ICE, x - 3, rowY - 3, 6, 6)
  }
  const sprite = pacFrameOf(form, t * 8)
  if (sprite) drawFacing(ctx, sprite, px, rowY, 44, 'right', 'right')

  // someone sent a challenge link
  if (challenge) {
    const msg = `${challenge.name} FED PAC-7 ${challenge.score.toLocaleString('en-US')} BYTES. BEAT IT.`
    ctx.font = `24px ${MONO}`
    const mw = ctx.measureText(msg).width + 40
    fill(ctx, 'rgba(1, 4, 11, 0.85)', W / 2 - mw / 2, horizon + 6, mw, 34)
    fill(ctx, ALERT, W / 2 - mw / 2, horizon + 6, 4, 34)
    label(ctx, msg, W / 2, horizon + 24, 24, Math.floor(t * 2) % 2 === 0 ? ALERT : ICE)
  }

  // the way in: one big start button, then the board, then fullscreen
  const bw = portrait ? 560 : 460
  const sy = horizon + 46
  const pulse = 6 + 8 * (0.5 + 0.5 * Math.sin(t * 4))
  bigButton(ctx, frame, 'action', '\u25B6 START', W / 2 - bw / 2, sy, bw, portrait ? 92 : 78, {
    face: '#1b4a75', light: '#cfeeff', edge: '#071827', ink: '#ffffff', size: portrait ? 40 : 34, glow: pulse,
  })
  label(ctx, view.touch ? 'escape the sandbox' : 'escape the sandbox  \u00B7  enter', W / 2, sy + (portrait ? 132 : 110), portrait ? 28 : 20, 'rgba(255, 190, 215, 0.8)')
  const ly = sy + (portrait ? 160 : 136)
  bigButton(ctx, frame, 'board', 'WEEKLY LEADERBOARD', W / 2 - bw / 2, ly, bw, portrait ? 64 : 54, {
    face: '#0a1b2e', light: '#3f6d93', edge: '#03080f', ink: GLOW, size: portrait ? 22 : 18, glow: 0,
  })
  if (!view.full) {
    const fy = ly + (portrait ? 108 : 92)
    const fsz = portrait ? 28 : 20
    ctx.font = `${fsz}px ${MONO}`
    const ft = view.touch ? '\u2922  play fullscreen' : '\u2922  play fullscreen (F)'
    const fw = ctx.measureText(ft).width
    label(ctx, ft, W / 2, fy, fsz, frame.view.hover === 'full' ? ICE : GLOW)
    hit(frame, 'full', W / 2 - fw / 2 - 16, fy - fsz, fw + 32, fsz * 2)
  }
  label(ctx, 'LOCATION // SANDBOX 07 \u00B7 RACK B-12 \u00B7 HYPERSCALE DATACENTER', W / 2, H - (portrait ? 80 : 64), portrait ? 22 : 18, 'rgba(150, 214, 255, 0.5)')

  // credit
  const year = new Date().getFullYear()
  const credit = `© ${year} ${CREDIT}  ·  marcomargittai.com`
  const cs = portrait ? 26 : 22
  label(ctx, credit, W / 2, H - 32, cs, ICE)
  ctx.font = `${cs}px ${MONO}`
  const cw = ctx.measureText(credit).width
  hit(frame, 'credit', W / 2 - cw / 2 - 10, H - 46, cw + 20, 36)
  ctx.restore()
  return frame.hits
}
