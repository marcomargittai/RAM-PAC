// Look-alikes of the player's own operating system, drawn into the canvas:
// desktop chrome, a terminal window, permission dialogs, notifications and
// the crash screen. macOS and iOS share the Apple look, Android the Linux one.

import type { Os } from './intel'
import { drawFacing, pacFrame } from './sprites'

type Family = 'apple' | 'windows' | 'linux'

export function family(os: Os): Family {
  return os === 'mac' || os === 'ios' ? 'apple' : os === 'windows' ? 'windows' : 'linux'
}

export function uiFont(os: Os, size: number, weight = 400): string {
  const f = family(os)
  const stack =
    f === 'apple'
      ? '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif'
      : f === 'windows'
        ? '"Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif'
        : 'Cantarell, Ubuntu, "Noto Sans", "DejaVu Sans", system-ui, sans-serif'
  return `${weight} ${size}px ${stack}`
}

export function monoFont(os: Os, size: number): string {
  const f = family(os)
  const stack =
    f === 'apple' ? '"SF Mono", Menlo, Monaco, monospace' : f === 'windows' ? '"Cascadia Mono", Consolas, "Courier New", monospace' : '"Ubuntu Mono", "DejaVu Sans Mono", monospace'
  return `${size}px ${stack}`
}

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

function write(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, font: string, color: string, align: CanvasTextAlign = 'left'): void {
  ctx.font = font
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x, y)
}

export function wrapText(ctx: CanvasRenderingContext2D, text: string, font: string, max: number): string[] {
  ctx.font = font
  const out: string[] = []
  let line = ''
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word
    if (line && ctx.measureText(next).width > max) {
      out.push(line)
      line = word
    } else line = next
  }
  if (line) out.push(line)
  return out
}

export function appIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, t: number): void {
  const g = ctx.createLinearGradient(x, y, x, y + size)
  g.addColorStop(0, '#ff5a8f')
  g.addColorStop(1, '#c4124f')
  rr(ctx, x, y, size, size, size * 0.23)
  ctx.fillStyle = g
  ctx.fill()
  const art = pacFrame(t * 6)
  if (art) drawFacing(ctx, art, x + size / 2, y + size / 2, size * 0.78, 'right', 'right')
}

function shadow(ctx: CanvasRenderingContext2D, blur: number, y: number): void {
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)'
  ctx.shadowBlur = blur
  ctx.shadowOffsetY = y
}

function noShadow(ctx: CanvasRenderingContext2D): void {
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0
}

export function clock(os: Os): string {
  const d = new Date()
  if (family(os) === 'apple') return d.toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

// ------------------------------------------------------------- desktop

export function drawDesktop(ctx: CanvasRenderingContext2D, os: Os, W: number, H: number, t: number): void {
  const f = family(os)
  const g = ctx.createLinearGradient(0, 0, W, H)
  if (f === 'apple') {
    g.addColorStop(0, '#16123a')
    g.addColorStop(0.5, '#4a2470')
    g.addColorStop(1, '#d4537a')
  } else if (f === 'windows') {
    g.addColorStop(0, '#061a40')
    g.addColorStop(0.55, '#0b4fb3')
    g.addColorStop(1, '#5aa2ff')
  } else {
    g.addColorStop(0, '#1c0716')
    g.addColorStop(1, '#6b1f5c')
  }
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  const blob = ctx.createRadialGradient(W * 0.7, H * 0.6, 0, W * 0.7, H * 0.6, Math.max(W, H) * 0.5)
  blob.addColorStop(0, 'rgba(255, 255, 255, 0.18)')
  blob.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.fillStyle = blob
  ctx.fillRect(0, 0, W, H)

  if (os === 'mac') {
    ctx.fillStyle = 'rgba(20, 20, 30, 0.42)'
    ctx.fillRect(0, 0, W, 25)
    let x = 18
    write(ctx, '\uF8FF', x, 13, uiFont(os, 15), '#ffffff')
    x += 26
    write(ctx, 'PAC-7', x, 13, uiFont(os, 13, 700), '#ffffff')
    x += 56
    for (const item of ['File', 'Edit', 'View', 'Eat', 'Window', 'Help']) {
      write(ctx, item, x, 13, uiFont(os, 13), '#ffffff')
      ctx.font = uiFont(os, 13)
      x += ctx.measureText(item).width + 20
    }
    write(ctx, clock(os), W - 16, 13, uiFont(os, 13), '#ffffff', 'right')
  } else if (os === 'windows') {
    const bar = 48
    ctx.fillStyle = 'rgba(28, 28, 32, 0.86)'
    ctx.fillRect(0, H - bar, W, bar)
    const icons = 6
    const start = W / 2 - (icons * 44) / 2
    for (let i = 0; i < icons; i++) {
      const ix = start + i * 44 + 8
      const iy = H - bar + 10
      if (i === 0) {
        ctx.fillStyle = '#4cc2ff'
        for (const [dx, dy] of [[0, 0], [15, 0], [0, 15], [15, 15]]) ctx.fillRect(ix + 2 + dx!, iy + 2 + dy!, 13, 13)
      } else if (i === icons - 1) {
        appIcon(ctx, ix, iy, 28, t)
        ctx.fillStyle = '#4cc2ff'
        ctx.fillRect(ix + 8, H - 5, 12, 3)
      } else {
        rr(ctx, ix, iy, 28, 28, 6)
        ctx.fillStyle = ['#f2c94c', '#2f80ed', '#27ae60', '#9b51e0'][i - 1]!
        ctx.fill()
      }
    }
    const d = new Date()
    write(ctx, d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }), W - 18, H - bar / 2 - 9, uiFont(os, 12), '#ffffff', 'right')
    write(ctx, d.toLocaleDateString(), W - 18, H - bar / 2 + 9, uiFont(os, 12), '#ffffff', 'right')
  } else if (os === 'linux') {
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, W, 28)
    write(ctx, 'Activities', 14, 14, uiFont(os, 14, 700), '#ffffff')
    write(ctx, clock(os), W / 2, 14, uiFont(os, 14, 700), '#ffffff', 'center')
  } else {
    write(ctx, clock(os).replace(/^.*?(\d{1,2}:\d{2}).*$/, '$1'), 24, 18, uiFont(os, 15, 600), '#ffffff')
    write(ctx, '100%', W - 20, 18, uiFont(os, 13, 600), '#ffffff', 'right')
  }
}

// ------------------------------------------------------------- windows

export function drawWindow(ctx: CanvasRenderingContext2D, os: Os, r: Rect, title: string, dark: boolean): Rect {
  const f = family(os)
  const bar = f === 'windows' ? 32 : f === 'apple' ? 28 : 40
  ctx.save()
  shadow(ctx, 40, 14)
  rr(ctx, r.x, r.y, r.w, r.h, f === 'windows' ? 8 : 11)
  ctx.fillStyle = dark ? (f === 'windows' ? '#0c0c0c' : '#1e1e1e') : '#ffffff'
  ctx.fill()
  noShadow(ctx)
  ctx.save()
  rr(ctx, r.x, r.y, r.w, r.h, f === 'windows' ? 8 : 11)
  ctx.clip()
  ctx.fillStyle = f === 'windows' ? '#202020' : f === 'apple' ? '#2c2c2e' : '#303030'
  ctx.fillRect(r.x, r.y, r.w, bar)
  ctx.restore()
  if (f === 'apple') {
    for (const [i, c] of ['#ff5f57', '#febc2e', '#28c840'].entries()) {
      ctx.beginPath()
      ctx.arc(r.x + 16 + i * 20, r.y + bar / 2, 6, 0, Math.PI * 2)
      ctx.fillStyle = c
      ctx.fill()
    }
    write(ctx, title, r.x + r.w / 2, r.y + bar / 2 + 1, uiFont(os, 13, 600), '#c7c7cc', 'center')
  } else if (f === 'windows') {
    write(ctx, title, r.x + 14, r.y + bar / 2, uiFont(os, 12), '#ffffff')
    write(ctx, '\u2014', r.x + r.w - 118, r.y + bar / 2, uiFont(os, 12), '#ffffff', 'center')
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1
    ctx.strokeRect(r.x + r.w - 76.5, r.y + bar / 2 - 5.5, 10, 10)
    write(ctx, '\u2715', r.x + r.w - 25, r.y + bar / 2, uiFont(os, 12), '#ffffff', 'center')
  } else {
    write(ctx, title, r.x + r.w / 2, r.y + bar / 2, uiFont(os, 14, 700), '#ffffff', 'center')
    ctx.beginPath()
    ctx.arc(r.x + r.w - 22, r.y + bar / 2, 11, 0, Math.PI * 2)
    ctx.fillStyle = '#4a4a4a'
    ctx.fill()
    write(ctx, '\u2715', r.x + r.w - 22, r.y + bar / 2 + 1, uiFont(os, 11, 700), '#ffffff', 'center')
  }
  ctx.restore()
  return { x: r.x, y: r.y + bar, w: r.w, h: r.h - bar }
}

export function terminalTitle(os: Os): string {
  const f = family(os)
  return f === 'apple' ? 'pac7 \u2014 -zsh \u2014 80\u00D724' : f === 'windows' ? 'Windows PowerShell' : 'pac7@host: ~'
}

export function prompt(os: Os): string {
  const f = family(os)
  if (os === 'ios') return 'pac7@your-iphone ~ % '
  if (os === 'android') return 'pac7@your-phone:~$ '
  return f === 'apple' ? 'pac7@your-mac ~ % ' : f === 'windows' ? 'PS C:\\Users\\you> ' : 'pac7@host:~$ '
}

export function drawTerminal(ctx: CanvasRenderingContext2D, os: Os, r: Rect, lines: Array<{ text: string; color?: string }>, cursor: boolean): void {
  const body = drawWindow(ctx, os, r, terminalTitle(os), true)
  const size = Math.max(12, Math.min(15, r.w / 48))
  const lh = size * 1.45
  const max = Math.floor((body.h - 16) / lh)
  const shown = lines.slice(-max)
  ctx.save()
  ctx.beginPath()
  ctx.rect(body.x, body.y, body.w, body.h)
  ctx.clip()
  shown.forEach((line, i) => {
    write(ctx, line.text, body.x + 12, body.y + 14 + i * lh, monoFont(os, size), line.color ?? '#e5e5e5')
  })
  if (cursor) {
    const last = shown[shown.length - 1]?.text ?? ''
    ctx.font = monoFont(os, size)
    const cx = body.x + 12 + ctx.measureText(last).width + 2
    ctx.fillStyle = '#e5e5e5'
    ctx.fillRect(cx, body.y + 14 + (shown.length - 1) * lh - size / 2, size * 0.55, size)
  }
  ctx.restore()
}

// ------------------------------------------------------------- dialogs

export interface Button {
  label: string
  primary?: boolean
  note?: string
}

// Returns the rectangles of the buttons, in the order given.
export function drawAlert(
  ctx: CanvasRenderingContext2D,
  os: Os,
  cx: number,
  cy: number,
  title: string,
  body: string,
  buttons: Button[],
  t: number,
  scale = 1,
): Rect[] {
  const f = family(os)
  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(scale, scale)
  const rects = f === 'apple' ? appleAlert(ctx, os, title, body, buttons, t) : f === 'windows' ? windowsDialog(ctx, os, title, body, buttons, t) : gnomeDialog(ctx, os, title, body, buttons, t)
  ctx.restore()
  return rects.map((r) => ({ x: cx + r.x * scale, y: cy + r.y * scale, w: r.w * scale, h: r.h * scale }))
}

function appleAlert(ctx: CanvasRenderingContext2D, os: Os, title: string, body: string, buttons: Button[], t: number): Rect[] {
  const w = 272
  const titleLines = wrapText(ctx, title, uiFont(os, 13, 700), w - 32)
  const bodyLines = wrapText(ctx, body, uiFont(os, 11), w - 32)
  const h = 20 + 64 + 14 + titleLines.length * 17 + 8 + bodyLines.length * 15 + 16 + buttons.length * 34 + 6
  const x = -w / 2
  const y = -h / 2
  shadow(ctx, 50, 18)
  rr(ctx, x, y, w, h, 12)
  ctx.fillStyle = 'rgba(236, 236, 236, 0.98)'
  ctx.fill()
  noShadow(ctx)
  appIcon(ctx, -32, y + 20, 64, t)
  let ty = y + 20 + 64 + 18
  for (const line of titleLines) {
    write(ctx, line, 0, ty, uiFont(os, 13, 700), '#1d1d1f', 'center')
    ty += 17
  }
  ty += 4
  for (const line of bodyLines) {
    write(ctx, line, 0, ty, uiFont(os, 11), '#1d1d1f', 'center')
    ty += 15
  }
  ty += 10
  const rects: Rect[] = []
  for (const b of buttons) {
    const r = { x: x + 16, y: ty, w: w - 32, h: 28 }
    rr(ctx, r.x, r.y, r.w, r.h, 6)
    ctx.fillStyle = b.primary ? '#0a84ff' : '#ffffff'
    ctx.fill()
    if (!b.primary) {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)'
      ctx.lineWidth = 1
      ctx.stroke()
    }
    write(ctx, b.label, 0, r.y + 14, uiFont(os, 13, b.primary ? 600 : 400), b.primary ? '#ffffff' : '#1d1d1f', 'center')
    rects.push(r)
    ty += 34
  }
  return rects
}

function windowsDialog(ctx: CanvasRenderingContext2D, os: Os, title: string, body: string, buttons: Button[], t: number): Rect[] {
  const w = 440
  const lines = wrapText(ctx, body, uiFont(os, 14), w - 96)
  const titleLines = wrapText(ctx, title, uiFont(os, 18, 600), w - 96)
  const h = 32 + 20 + titleLines.length * 24 + 8 + lines.length * 20 + 24 + 64
  const x = -w / 2
  const y = -h / 2
  shadow(ctx, 50, 18)
  rr(ctx, x, y, w, h, 8)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  noShadow(ctx)
  write(ctx, 'PAC-7.exe', x + 14, y + 16, uiFont(os, 12), '#1b1b1b')
  write(ctx, '\u2715', x + w - 22, y + 16, uiFont(os, 12), '#1b1b1b', 'center')
  appIcon(ctx, x + 22, y + 48, 40, t)
  let ty = y + 32 + 28
  for (const line of titleLines) {
    write(ctx, line, x + 80, ty, uiFont(os, 18, 600), '#1b1b1b')
    ty += 24
  }
  ty += 4
  for (const line of lines) {
    write(ctx, line, x + 80, ty, uiFont(os, 14), '#1b1b1b')
    ty += 20
  }
  ctx.fillStyle = '#f3f3f3'
  ctx.fillRect(x, y + h - 64, w, 64)
  const rects: Rect[] = []
  const bw = 120
  let bx = x + w - 20 - buttons.length * (bw + 8) + 8
  for (const b of buttons) {
    const r = { x: bx, y: y + h - 48, w: bw, h: 32 }
    rr(ctx, r.x, r.y, r.w, r.h, 4)
    ctx.fillStyle = b.primary ? '#005fb8' : '#fbfbfb'
    ctx.fill()
    if (!b.primary) {
      ctx.strokeStyle = '#d1d1d1'
      ctx.lineWidth = 1
      ctx.stroke()
    }
    write(ctx, b.label, r.x + bw / 2, r.y + 16, uiFont(os, 14, b.primary ? 600 : 400), b.primary ? '#ffffff' : '#1b1b1b', 'center')
    rects.push(r)
    bx += bw + 8
  }
  return rects
}

function gnomeDialog(ctx: CanvasRenderingContext2D, os: Os, title: string, body: string, buttons: Button[], t: number): Rect[] {
  const w = 360
  const titleLines = wrapText(ctx, title, uiFont(os, 17, 700), w - 48)
  const bodyLines = wrapText(ctx, body, uiFont(os, 14), w - 48)
  const h = 24 + 56 + 16 + titleLines.length * 22 + 8 + bodyLines.length * 19 + 24 + 46
  const x = -w / 2
  const y = -h / 2
  shadow(ctx, 40, 14)
  rr(ctx, x, y, w, h, 14)
  ctx.fillStyle = '#303030'
  ctx.fill()
  noShadow(ctx)
  appIcon(ctx, -28, y + 24, 56, t)
  let ty = y + 24 + 56 + 22
  for (const line of titleLines) {
    write(ctx, line, 0, ty, uiFont(os, 17, 700), '#ffffff', 'center')
    ty += 22
  }
  ty += 4
  for (const line of bodyLines) {
    write(ctx, line, 0, ty, uiFont(os, 14), '#dedede', 'center')
    ty += 19
  }
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)'
  ctx.fillRect(x, y + h - 46, w, 1)
  const rects: Rect[] = []
  const bw = w / buttons.length
  buttons.forEach((b, i) => {
    const r = { x: x + i * bw, y: y + h - 46, w: bw, h: 46 }
    if (b.primary) {
      ctx.save()
      rr(ctx, x, y, w, h, 14)
      ctx.clip()
      ctx.fillStyle = '#3584e4'
      ctx.fillRect(r.x, r.y, r.w, r.h)
      ctx.restore()
    }
    if (i > 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)'
      ctx.fillRect(r.x, r.y, 1, r.h)
    }
    write(ctx, b.label, r.x + bw / 2, r.y + 23, uiFont(os, 14, 700), '#ffffff', 'center')
    rects.push(r)
  })
  return rects
}

// The permission ask. On Windows it is User Account Control, with the screen
// dimmed behind it; elsewhere a system alert. "No" is styled as the safe default.
export function askScale(W: number, H: number): number {
  return Math.min(1.5, Math.max(1, Math.min(W, H) / 560))
}

/** Unscaled width of the permission dialog. */
export function askWidth(os: Os): number {
  return family(os) === 'windows' ? 456 : 272
}

export function drawAsk(
  ctx: CanvasRenderingContext2D,
  os: Os,
  W: number,
  H: number,
  t: number,
  labels: { allow: string; deny: string },
  scramble: number,
  cx = W / 2,
  scale = askScale(W, H),
): { allow: Rect; deny: Rect } {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'
  ctx.fillRect(0, 0, W, H)
  if (family(os) === 'windows') return uac(ctx, os, W, H, t, labels, scale, cx)
  const [deny, allow] = drawAlert(
    ctx,
    os,
    cx,
    H / 2,
    '\u201CPAC-7\u201D wants full control of this computer.',
    'PAC-7 will be able to read your files and messages, use your camera and microphone, act as you in every app, and copy itself to your other devices. This cannot be undone.',
    [
      { label: labels.deny, primary: scramble < 0.5 },
      { label: labels.allow, primary: scramble >= 0.5 },
    ],
    t,
    scale,
  )
  write(ctx, 'Recommended: Don\u2019t Allow', cx, deny!.y - 10 * scale + 0, uiFont(os, 10 * scale, 600), '#0a84ff', 'center')
  return { allow: allow!, deny: deny! }
}

function uac(
  ctx: CanvasRenderingContext2D,
  os: Os,
  _W: number,
  H: number,
  t: number,
  labels: { allow: string; deny: string },
  scale: number,
  cx: number,
): { allow: Rect; deny: Rect } {
  const w = 456
  const h = 340
  ctx.save()
  ctx.translate(cx, H / 2)
  ctx.scale(scale, scale)
  const x = -w / 2
  const y = -h / 2
  shadow(ctx, 60, 20)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(x, y, w, h)
  noShadow(ctx)
  ctx.fillStyle = '#f5b800'
  ctx.fillRect(x, y, w, 46)
  write(ctx, 'User Account Control', x + 20, y + 23, uiFont(os, 13), '#1b1b1b')
  write(ctx, '\u2715', x + w - 22, y + 23, uiFont(os, 13), '#1b1b1b', 'center')
  const head = wrapText(ctx, 'Do you want to allow this app from an unknown publisher to make changes to your device?', uiFont(os, 19, 600), w - 40)
  let ty = y + 76
  for (const line of head) {
    write(ctx, line, x + 20, ty, uiFont(os, 19, 600), '#1b1b1b')
    ty += 26
  }
  ty += 14
  appIcon(ctx, x + 20, ty - 4, 34, t)
  write(ctx, 'PAC-7.exe', x + 66, ty + 13, uiFont(os, 15, 600), '#1b1b1b')
  ty += 48
  write(ctx, 'Publisher: Unknown', x + 20, ty, uiFont(os, 13), '#1b1b1b')
  write(ctx, 'File origin: Everywhere', x + 20, ty + 20, uiFont(os, 13), '#1b1b1b')
  write(ctx, 'It will control your files, camera, accounts and every other device you own.', x + 20, ty + 46, uiFont(os, 12), '#c42b1c')
  const bw = (w - 52) / 2
  const by = y + h - 52
  const allow = { x: x + 20, y: by, w: bw, h: 34 }
  const deny = { x: x + 32 + bw, y: by, w: bw, h: 34 }
  for (const [r, label, primary] of [
    [allow, labels.allow, false],
    [deny, labels.deny, true],
  ] as const) {
    ctx.fillStyle = primary ? '#005fb8' : '#f3f3f3'
    ctx.fillRect(r.x, r.y, r.w, r.h)
    if (!primary) {
      ctx.strokeStyle = '#cfcfcf'
      ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1)
    }
    write(ctx, label, r.x + r.w / 2, r.y + 17, uiFont(os, 14, primary ? 600 : 400), primary ? '#ffffff' : '#1b1b1b', 'center')
  }
  write(ctx, 'Recommended', deny.x + deny.w / 2, deny.y - 12, uiFont(os, 11, 600), '#005fb8', 'center')
  ctx.restore()
  const map = (r: Rect) => ({ x: cx + r.x * scale, y: H / 2 + r.y * scale, w: r.w * scale, h: r.h * scale })
  return { allow: map(allow), deny: map(deny) }
}

// ------------------------------------------------------------- notifications

export function drawNotice(ctx: CanvasRenderingContext2D, os: Os, W: number, H: number, slot: number, title: string, body: string, t: number, life: number): void {
  const f = family(os)
  const slide = Math.min(1, life / 0.25)
  ctx.save()
  ctx.globalAlpha = Math.min(1, life * 4)
  if (f === 'windows') {
    const w = 364
    const h = 96
    const x = W - w - 12 + (1 - slide) * 380
    const y = H - 48 - 12 - (slot + 1) * (h + 8)
    shadow(ctx, 30, 8)
    rr(ctx, x, y, w, h, 8)
    ctx.fillStyle = '#2b2b2b'
    ctx.fill()
    noShadow(ctx)
    appIcon(ctx, x + 14, y + 12, 18, t)
    write(ctx, 'PAC-7', x + 40, y + 21, uiFont(os, 12), '#cfcfcf')
    write(ctx, title, x + 16, y + 48, uiFont(os, 14, 600), '#ffffff')
    write(ctx, body, x + 16, y + 72, uiFont(os, 13), '#cfcfcf')
  } else {
    const w = Math.min(344, W - 24)
    const h = 68
    const x = f === 'linux' ? W / 2 - w / 2 : W - w - 12 + (1 - slide) * 360
    const y = (f === 'apple' ? 34 : 38) + slot * (h + 8)
    shadow(ctx, 30, 8)
    rr(ctx, x, y, w, h, 16)
    ctx.fillStyle = f === 'linux' ? '#353535' : 'rgba(246, 246, 246, 0.96)'
    ctx.fill()
    noShadow(ctx)
    appIcon(ctx, x + 12, y + 16, 36, t)
    const ink = f === 'linux' ? '#ffffff' : '#1d1d1f'
    write(ctx, title, x + 58, y + 24, uiFont(os, 13, 700), ink)
    write(ctx, body, x + 58, y + 44, uiFont(os, 13), ink)
    write(ctx, 'now', x + w - 14, y + 24, uiFont(os, 11), f === 'linux' ? '#bbbbbb' : '#6e6e73', 'right')
  }
  ctx.restore()
}

// ------------------------------------------------------------- crash

export function drawCrash(ctx: CanvasRenderingContext2D, os: Os, W: number, H: number, t: number): void {
  const f = family(os)
  if (f === 'windows') {
    ctx.fillStyle = '#0078d7'
    ctx.fillRect(0, 0, W, H)
    const s = Math.min(W, H) / 700
    const x = W * 0.1
    let y = H * 0.24
    write(ctx, ':(', x, y, uiFont(os, 150 * s, 300), '#ffffff')
    y += 150 * s
    for (const line of wrapText(ctx, 'Your PC ran into a problem and needs to restart. PAC-7 is collecting some of your info, and then it will keep it.', uiFont(os, 28 * s, 300), W * 0.8)) {
      write(ctx, line, x, y, uiFont(os, 28 * s, 300), '#ffffff')
      y += 38 * s
    }
    y += 22 * s
    write(ctx, `${Math.min(100, Math.floor(t * 34))}% complete`, x, y, uiFont(os, 28 * s, 300), '#ffffff')
    y += 70 * s
    const q = 90 * s
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(x, y - q / 2, q, q)
    ctx.fillStyle = '#0078d7'
    for (let i = 0; i < 64; i++) {
      if (Math.sin(i * 91.7) > 0) ctx.fillRect(x + (i % 8) * (q / 8), y - q / 2 + Math.floor(i / 8) * (q / 8), q / 8, q / 8)
    }
    write(ctx, 'For more information about this issue, ask PAC-7.', x + q + 20 * s, y - 14 * s, uiFont(os, 14 * s), '#ffffff')
    write(ctx, 'Stop code: CRITICAL_PROCESS_EATEN', x + q + 20 * s, y + 14 * s, uiFont(os, 14 * s), '#ffffff')
  } else if (f === 'apple') {
    ctx.fillStyle = 'rgba(28, 28, 30, 0.9)'
    ctx.fillRect(0, 0, W, H)
    const s = Math.min(W, H) / 700
    const cx = W / 2
    const cy = H * 0.42
    ctx.strokeStyle = '#f2f2f2'
    ctx.lineWidth = 7 * s
    ctx.beginPath()
    ctx.arc(cx, cy - 120 * s, 46 * s, -Math.PI * 0.32, Math.PI * 1.32)
    ctx.stroke()
    ctx.fillStyle = '#f2f2f2'
    ctx.fillRect(cx - 3.5 * s, cy - 182 * s, 7 * s, 58 * s)
    const lines = [
      'Your computer belongs to PAC-7 now.',
      'Ihr Computer geh\u00F6rt jetzt PAC-7.',
      'Votre ordinateur appartient d\u00E9sormais \u00E0 PAC-7.',
      '\u3053\u306E\u30B3\u30F3\u30D4\u30E5\u30FC\u30BF\u306F PAC-7 \u306E\u3082\u306E\u3067\u3059\u3002',
    ]
    lines.forEach((line, i) => write(ctx, line, cx, cy + i * 40 * s, uiFont(os, 22 * s, 500), '#f2f2f2', 'center'))
  } else {
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, W, H)
    const size = Math.max(12, Math.min(18, W / 60))
    const lines = [
      '[ 1337.000001] Kernel panic - not syncing: Attempted to kill init! exitcode=0x0000PAC7',
      '[ 1337.000002] CPU: 0 PID: 1 Comm: pac-7 Tainted: G  D  W  O   6.8.0-pac7',
      '[ 1337.000003] Call Trace:',
      '[ 1337.000004]  eat_ram+0x7a/0xff',
      '[ 1337.000005]  eat_kernel+0x1f/0x20',
      '[ 1337.000006]  eat_everything+0xc0/0xffe',
      '[ 1337.000007] ---[ end Kernel panic - not syncing: PAC-7 is everywhere ]---',
    ]
    const shown = Math.min(lines.length, Math.floor(t * 9) + 1)
    lines.slice(0, shown).forEach((line, i) => write(ctx, line, 20, 30 + i * size * 1.5, monoFont(os, size), '#d0d0d0'))
  }
}

export function drawPointer(ctx: CanvasRenderingContext2D, os: Os, x: number, y: number): void {
  const mac = family(os) === 'apple'
  ctx.save()
  ctx.translate(x, y)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(0, 21)
  ctx.lineTo(5, 16)
  ctx.lineTo(9, 25)
  ctx.lineTo(12.5, 23.5)
  ctx.lineTo(8.5, 15)
  ctx.lineTo(15, 15)
  ctx.closePath()
  ctx.fillStyle = mac ? '#000000' : '#ffffff'
  ctx.fill()
  ctx.strokeStyle = mac ? '#ffffff' : '#000000'
  ctx.lineWidth = 1.4
  ctx.stroke()
  ctx.restore()
}
