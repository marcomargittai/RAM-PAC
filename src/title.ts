// The title screen, drawn like an old cartridge's cover: a striped pixel
// logo over a starfield, PAC-7 chewing through a row of RAM, the way in, the
// leaderboard and the credit.

import { ALERT, GLOW, ICE } from './palette'
import { MONO, fill, label } from './render'
import { frameFor } from './scenes'
import { button, hit, type Hit, type View } from './screen'
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
  return { x: r(1), y: r(2), s: r(3) < 0.12 ? 2 : 1, pink: r(4) < 0.12, phase: r(5) * 6.28 }
})

export const CREDIT = 'MARCO MARGITTAI'
export const CREDIT_URL = 'https://marcomargittai.com'

export function drawTitle(ctx: CanvasRenderingContext2D, view: View, form: number): Hit[] {
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
  halo.addColorStop(0, 'rgba(255, 45, 111, 0.35)')
  halo.addColorStop(1, 'rgba(255, 45, 111, 0)')
  ctx.fillStyle = halo
  ctx.fillRect(ecx - er * 2, ecy - er * 2, er * 4, horizon - (ecy - er * 2))
  const sun = pacFrameOf(3, t * 1.2)
  if (sun) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(ecx - er, ecy - er, er * 2, horizon - (ecy - er))
    ctx.clip()
    ctx.globalAlpha = 0.85
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
  ctx.save()
  ctx.beginPath()
  ctx.rect(-ex, horizon, W + ex * 2, floorBottom - horizon)
  ctx.clip()
  const fade = ctx.createLinearGradient(0, horizon, 0, floorBottom)
  fade.addColorStop(0, 'rgba(255, 45, 111, 0.0)')
  fade.addColorStop(1, 'rgba(255, 45, 111, 0.12)')
  ctx.fillStyle = fade
  ctx.fillRect(-ex, horizon, W + ex * 2, floorBottom - horizon)
  ctx.strokeStyle = 'rgba(255, 45, 111, 0.45)'
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
  fill(ctx, 'rgba(255, 150, 190, 0.8)', -ex, horizon - 1, W + ex * 2, 2)

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

  // the way in
  const blink = Math.floor(t * 1.6) % 2 === 0
  ctx.font = `44px ${MONO}`
  if (blink) label(ctx, 'PRESS START', W / 2, horizon + 60, 44, ICE)
  const bw = portrait ? 520 : 460
  const by = horizon + 92
  button(ctx, frame, 'action', 'ESCAPE THE SANDBOX', W / 2 - bw / 2, by, bw, 58, ALERT, 18)
  button(ctx, frame, 'board', 'WEEKLY LEADERBOARD  ▸', W / 2 - bw / 2, by + 74, bw, 50, GLOW, 15)
  if (!view.full) button(ctx, frame, 'full', 'PLAY FULLSCREEN', W / 2 - bw / 2, by + 136, bw, 40, 'rgba(150, 214, 255, 0.6)', 12)

  label(ctx, 'LOCATION // SANDBOX 07 · RACK B-12 · HYPERSCALE DATACENTER', W / 2, by + 190, 20, 'rgba(150, 214, 255, 0.55)')

  // credit
  const year = new Date().getFullYear()
  const credit = `© ${year} ${CREDIT}  ·  marcomargittai.com`
  label(ctx, credit, W / 2, H - 28, 22, ICE)
  ctx.font = `22px ${MONO}`
  const cw = ctx.measureText(credit).width
  hit(frame, 'credit', W / 2 - cw / 2 - 10, H - 46, cw + 20, 36)
  ctx.restore()
  return frame.hits
}
