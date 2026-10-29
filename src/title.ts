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

const LOGO = art('logo')
const TAGLINE = art('tagline')

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

function planet(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, px: number, t: number): void {
  // a dithered planet made of data: cyan land, deep sea, a pink city glow
  for (let y = -r; y <= r; y += px) {
    for (let x = -r; x <= r; x += px) {
      const d = Math.hypot(x, y) / r
      if (d > 1) continue
      const lon = x / r + t * 0.03
      const land = Math.sin(lon * 7.1 + y * 0.09) + Math.cos(lon * 3.3 - y * 0.05) > 0.6
      const shade = x / r - y / r * 0.4
      let c = land ? (shade > 0.1 ? '#3fb6e8' : '#1d6d9a') : shade > 0.2 ? '#123a5c' : '#0a2238'
      if (land && Math.sin(x * 0.7 + y * 1.3) > 0.92) c = ALERT
      if (d > 0.93) c = shade > 0 ? '#6cc8ff' : '#0c2a46'
      if (((x + y) / px) % 2 === 0 && shade < -0.5) continue
      fill(ctx, c, cx + x, cy + y, px, px)
    }
  }
}

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
  planet(ctx, portrait ? 130 : 150, portrait ? H - 330 : H - 190, portrait ? 70 : 64, 4, t)

  // the logo, at a whole-number scale so the pixels stay square
  const logoScale = Math.max(2, Math.floor((W * (portrait ? 0.9 : 0.66)) / 178))
  const lw = 178 * logoScale
  const lh = 39 * logoScale
  const lx = W / 2 - lw / 2
  const ly = portrait ? 150 : 90
  ctx.imageSmoothingEnabled = false
  if (LOGO.complete && LOGO.naturalWidth) ctx.drawImage(LOGO, lx, ly + Math.sin(t * 1.4) * 3, lw, lh)
  const ts = Math.max(2, Math.floor(logoScale * 0.75))
  if (TAGLINE.complete && TAGLINE.naturalWidth) ctx.drawImage(TAGLINE, lx + lw - TAGLINE.naturalWidth * ts, ly + lh + 14, TAGLINE.naturalWidth * ts, TAGLINE.naturalHeight * ts)

  // PAC-7 eating its way along a row of RAM
  const rowY = ly + lh + 14 + 27 * ts + (portrait ? 90 : 64)
  const span = W - 160
  const u = (t * 0.12) % 1
  const px = 80 + u * span
  for (let x = 80; x <= 80 + span; x += 34) {
    if (x < px + 10) continue
    fill(ctx, ICE, x - 3, rowY - 3, 6, 6)
  }
  const sprite = pacFrameOf(form, t * 8)
  if (sprite) drawFacing(ctx, sprite, px, rowY, 72, 'right', 'right')

  // the way in
  const blink = Math.floor(t * 1.6) % 2 === 0
  ctx.font = `44px ${MONO}`
  if (blink) label(ctx, 'PRESS START', W / 2, rowY + 80, 44, ICE)
  const bw = portrait ? 520 : 460
  const by = rowY + 130
  button(ctx, frame, 'action', 'ESCAPE THE SANDBOX', W / 2 - bw / 2, by, bw, 58, ALERT, 18)
  button(ctx, frame, 'board', 'WEEKLY LEADERBOARD  ▸', W / 2 - bw / 2, by + 74, bw, 50, GLOW, 15)
  if (!view.full) button(ctx, frame, 'full', 'PLAY FULLSCREEN', W / 2 - bw / 2, by + 136, bw, 40, 'rgba(108, 200, 255, 0.6)', 12)

  label(ctx, 'LOCATION // SANDBOX 07 · RACK B-12 · HYPERSCALE DATACENTER', W / 2, by + 214, 20, 'rgba(108, 200, 255, 0.55)')

  // credit
  const year = new Date().getFullYear()
  label(ctx, `© ${year}  ${CREDIT}`, W / 2, H - 70, 26, ICE)
  label(ctx, 'marcomargittai.com', W / 2, H - 38, 20, 'rgba(108, 200, 255, 0.6)')
  ctx.font = `20px ${MONO}`
  const cw = ctx.measureText('marcomargittai.com').width
  hit(frame, 'credit', W / 2 - cw / 2 - 10, H - 56, cw + 20, 36)
  ctx.restore()
  return frame.hits
}
