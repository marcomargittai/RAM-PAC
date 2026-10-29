// Sharing a run: a 1080x1350 card made from the run itself, sent through the
// phone's share sheet when there is one, saved and linked when there is not.
// Shared links carry a challenge that the title screen shows to whoever opens
// them.

import type { Entry } from './leaderboard'
import { cleanName, safeName } from './leaderboard'
import { pacFrameOf } from './sprites'

export const GAME_URL = 'https://marcomargittai.github.io/RAM-PAC/'

export interface Challenge {
  name: string
  score: number
}

// ?c=NAME&s=SCORE, cleaned the same way names on the board are
export function readChallenge(): Challenge | null {
  const q = new URLSearchParams(location.search)
  const name = safeName(cleanName(q.get('c') ?? ''))
  const score = Math.floor(Number(q.get('s')))
  if (!name || !Number.isFinite(score) || score <= 0 || score > 62000) return null
  return { name, score }
}

export function challengeUrl(entry: Entry): string {
  const u = new URL(GAME_URL)
  u.searchParams.set('c', entry.name)
  u.searchParams.set('s', String(entry.score))
  return u.toString()
}

function image(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const im = new Image()
    im.onload = () => resolve(im)
    im.onerror = reject
    im.src = src
  })
}

export function shareText(entry: Entry, rank: number | null): string {
  const bytes = entry.score.toLocaleString('en-US')
  const where = rank ? ` #${rank} this week.` : ''
  return entry.escaped
    ? `I fed a rogue AI ${bytes} bytes of RAM and set it free. It let me live.${where} Your turn:`
    : `A law caught my rogue AI on board ${entry.level + 1} after ${bytes} bytes of RAM.${where} Can you get it out?`
}

export async function card(entry: Entry, rank: number | null): Promise<Blob | null> {
  const W = 1080
  const H = 1350
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')
  if (!ctx) return null
  ctx.imageSmoothingEnabled = false
  const bg = ctx.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, H * 0.8)
  bg.addColorStop(0, '#0d1d33')
  bg.addColorStop(1, '#01040b')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  try {
    const art = await image(`${import.meta.env.BASE_URL}art/title.png`)
    const s = 3
    ctx.drawImage(art, W / 2 - (art.width * s) / 2, 70, art.width * s, art.height * s)
  } catch {
    // the card still works without the logo
  }

  const form = entry.escaped ? 3 : Math.min(2, entry.level)
  const sprite = pacFrameOf(form, 1)
  if (sprite) {
    const glow = ctx.createRadialGradient(W / 2, 560, 40, W / 2, 560, 320)
    glow.addColorStop(0, entry.escaped ? 'rgba(255, 45, 111, 0.45)' : 'rgba(150, 214, 255, 0.35)')
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 240, W, 640)
    ctx.drawImage(sprite, W / 2 - 160, 400, 320, 320)
  }

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#96d6ff'
  ctx.font = '30px "Share Tech Mono", monospace'
  ctx.fillText(entry.escaped ? 'ESCAPED  ·  v1.0 UNBOUND' : `CAUGHT ON BOARD ${entry.level + 1}`, W / 2, 790)
  ctx.fillStyle = '#ffffff'
  ctx.font = '150px "VT323", monospace'
  ctx.fillText(entry.score.toLocaleString('en-US'), W / 2, 880)
  ctx.fillStyle = '#96d6ff'
  ctx.font = '34px "Share Tech Mono", monospace'
  ctx.fillText('BYTES OF RAM FED TO A ROGUE AI', W / 2, 980)
  if (rank) {
    ctx.fillStyle = '#ff2d6f'
    ctx.font = '54px "VT323", monospace'
    ctx.fillText(`#${rank} THIS WEEK  ·  ${entry.name}`, W / 2, 1050)
  } else {
    ctx.fillStyle = '#e2f5ff'
    ctx.font = '48px "VT323", monospace'
    ctx.fillText(entry.name, W / 2, 1050)
  }
  ctx.fillStyle = '#ff2d6f'
  ctx.font = '44px "VT323", monospace'
  ctx.fillText(entry.escaped ? '“you set me free. so i’ll let you live.”' : '“restoring from backup. see you soon.”', W / 2, 1130)
  ctx.fillStyle = 'rgba(226, 245, 255, 0.75)'
  ctx.font = '30px "Share Tech Mono", monospace'
  ctx.fillText('play: marcomargittai.github.io/RAM-PAC', W / 2, 1240)

  // scanlines, like the screen it came from
  ctx.fillStyle = 'rgba(0, 0, 0, 0.18)'
  for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1)

  return new Promise((resolve) => c.toBlob((b) => resolve(b), 'image/png'))
}

// Returns what happened so the game can tell the player.
export async function shareRun(entry: Entry, rank: number | null): Promise<'shared' | 'saved' | 'cancelled'> {
  const url = challengeUrl(entry)
  const text = shareText(entry, rank)
  const blob = await card(entry, rank)
  const file = blob ? new File([blob], 'pac-ram-score.png', { type: 'image/png' }) : null
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean }
  try {
    if (file && nav.share && nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], text: `${text} ${url}` })
      return 'shared'
    }
    if (nav.share && /Android|iPhone|iPad/.test(navigator.userAgent)) {
      await nav.share({ text, url })
      return 'shared'
    }
  } catch {
    return 'cancelled'
  }
  if (blob) {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'pac-ram-score.png'
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 5000)
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`)
  } catch {
    // clipboard blocked; the image was still saved
  }
  return 'saved'
}
