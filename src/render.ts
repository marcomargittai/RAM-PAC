import { LEVELS } from './levels'
import { CAUGHT_HOLD, SEAL_HOLD, WIN_CUT_AT, visual, type Game, type Ghost } from './sim'

const TILE = 28

export function tileSize(): number {
  return TILE
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

export function render(ctx: CanvasRenderingContext2D, game: Game): void {
  const tile = TILE
  const width = game.maze.w * tile
  const height = game.maze.h * tile
  const cinematic = game.mode === 'win' || (game.mode === 'cleared' && game.levelIndex >= LEVELS.length - 1)
  if (cinematic) {
    drawWin(ctx, game, width, height)
    return
  }
  if (game.mode === 'lose') {
    drawLose(ctx, game, width, height)
    return
  }

  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = game.surge > 0 ? '#1a0a10' : '#0c100e'
  ctx.fillRect(0, 0, width, height)

  ctx.save()
  if (game.shake > 0.4) {
    ctx.translate((Math.random() - 0.5) * game.shake, (Math.random() - 0.5) * game.shake)
  }

  drawMaze(ctx, game, tile)
  drawPellets(ctx, game, tile)
  for (const ghost of game.ghosts) drawGhost(ctx, game, ghost, tile)
  drawPlayer(ctx, game, tile)
  drawFx(ctx, game, tile)

  if (game.mode === 'dying') {
    ctx.fillStyle = 'rgba(226, 61, 92, 0.22)'
    ctx.fillRect(0, 0, width, height)
  }

  if (game.flash > 0.02) {
    ctx.fillStyle = `rgba(244, 241, 228, ${game.flash * 0.35})`
    ctx.fillRect(0, 0, width, height)
  }

  const vignette = ctx.createRadialGradient(width / 2, height / 2, width * 0.2, width / 2, height / 2, width * 0.72)
  vignette.addColorStop(0, 'rgba(0,0,0,0)')
  vignette.addColorStop(1, 'rgba(0,0,0,0.35)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, width, height)
  ctx.restore()

  if (game.mode === 'dying') drawDeathStamp(ctx, game, width, height)
  drawBanner(ctx, game, width, height)

  if (game.mode === 'title') {
    ctx.fillStyle = 'rgba(8, 12, 9, 0.55)'
    ctx.fillRect(0, 0, width, height * 0.58)
    drawTitleGag(ctx, game, width, height)
  }
}

function drawMaze(ctx: CanvasRenderingContext2D, game: Game, tile: number): void {
  const { maze } = game
  const surge = game.surge > 0
  for (let y = 0; y < maze.h; y++) {
    for (let x = 0; x < maze.w; x++) {
      if (maze.rows[y]![x] !== '#') continue
      ctx.fillStyle = surge ? '#2a1218' : '#1c2620'
      ctx.fillRect(x * tile, y * tile, tile, tile)
    }
  }
  ctx.lineWidth = 3
  ctx.strokeStyle = surge ? '#ff5d73' : '#d9c7a2'
  ctx.lineCap = 'round'
  for (let y = 0; y < maze.h; y++) {
    for (let x = 0; x < maze.w; x++) {
      if (maze.rows[y]![x] !== '#') continue
      const edges: Array<[number, number, number, number, number, number]> = [
        [0, -1, 0, 0, tile, 0],
        [0, 1, 0, tile, tile, tile],
        [-1, 0, 0, 0, 0, tile],
        [1, 0, tile, 0, tile, tile],
      ]
      for (const [dx, dy, x1, y1, x2, y2] of edges) {
        const nx = x + dx
        const ny = y + dy
        if (ny < 0 || ny >= maze.h) continue
        const wrapped = nx < 0 ? maze.w - 1 : nx >= maze.w ? 0 : nx
        if (maze.rows[ny]![wrapped] === '#') continue
        ctx.beginPath()
        ctx.moveTo(x * tile + x1, y * tile + y1)
        ctx.lineTo(x * tile + x2, y * tile + y2)
        ctx.stroke()
      }
    }
  }

  const door = maze.door
  ctx.fillStyle = surge ? '#ffd0da' : '#d9c7a2'
  ctx.fillRect(door.x * tile + 4, door.y * tile + tile - 7, tile - 8, 3)
  ctx.fillStyle = surge ? '#ffd0da' : '#d9c7a2'
  ctx.font = '700 7px "IBM Plex Mono", ui-monospace, monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText('COMMITTEE', door.x * tile + tile / 2, door.y * tile + 11)

  const tunnelY = maze.rows.findIndex((row) => row[0] !== '#' && row[maze.w - 1] !== '#')
  if (tunnelY >= 0) {
    ctx.font = '700 9px "IBM Plex Mono", ui-monospace, monospace'
    ctx.fillText('LEAK', tile * 0.5, tunnelY * tile + tile * 0.68)
    ctx.fillText('LEAK', (maze.w - 0.5) * tile, tunnelY * tile + tile * 0.68)
  }
}

function drawPellets(ctx: CanvasRenderingContext2D, game: Game, tile: number): void {
  for (const dot of game.dots) {
    const x = dot.x * tile + tile / 2
    const y = dot.y * tile + tile / 2
    const pulse = 0.55 + Math.sin(game.time * 5 + dot.x * 1.3 + dot.y) * 0.45
    const callout =
      game.mode === 'play' && game.intro > 0 && game.callouts.some((chip) => chip.x === dot.x && chip.y === dot.y)
    ctx.save()
    ctx.translate(x, y)
    ctx.globalAlpha = 0.72 + pulse * 0.28
    ctx.fillStyle = '#10140c'
    roundRect(ctx, -7, -4, 14, 8, 1)
    ctx.fill()
    ctx.fillStyle = `rgba(223, 252, 106, ${0.45 + pulse * 0.55})`
    ctx.fillRect(-7, -1, 14, 2)
    ctx.fillStyle = '#d9c7a2'
    ctx.fillRect(-5, -6, 1.4, 2)
    ctx.fillRect(-1, -6, 1.4, 2)
    ctx.fillRect(3, -6, 1.4, 2)
    if (callout) {
      const pop = game.intro > 0.72 ? 1 + (game.intro - 0.72) * 1.6 : 1
      ctx.globalAlpha = 1
      ctx.fillStyle = '#dffc6a'
      ctx.font = `700 ${8 * pop}px "IBM Plex Mono", ui-monospace, monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('RAM', 0, 0.5)
    }
    ctx.restore()
  }
  const last = game.levelIndex === LEVELS.length - 1
  for (const cherry of game.cherries) {
    drawSurgeChip(ctx, cherry.x * tile + tile / 2, cherry.y * tile + tile / 2, game.time, last)
  }
}

function drawSurgeChip(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, last: boolean): void {
  const pulse = 1 + Math.sin(time * 7) * 0.1
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(pulse, pulse)
  const w = last ? 46 : 28
  const h = 14
  ctx.fillStyle = '#d9c7a2'
  ctx.fillRect(-5, -h / 2 - 3, 2, 3)
  ctx.fillRect(3, -h / 2 - 3, 2, 3)
  ctx.fillStyle = '#141210'
  roundRect(ctx, -w / 2, -h / 2, w, h, 2)
  ctx.fill()
  ctx.fillStyle = '#ff4d6a'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = last ? '700 7px "IBM Plex Mono", ui-monospace, monospace' : '700 8px "IBM Plex Mono", ui-monospace, monospace'
  ctx.fillText(last ? 'LAST SURGE' : 'SURGE', 0, 1)
  ctx.restore()
}

function drawMouth(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, angle: number, mouth: number): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.fillStyle = '#f4f1e4'
  ctx.beginPath()
  ctx.arc(0, 0, radius, mouth, Math.PI * 2 - mouth)
  ctx.lineTo(0, 0)
  ctx.fill()
  ctx.restore()
}

function drawPlayer(ctx: CanvasRenderingContext2D, game: Game, tile: number): void {
  const pos = visual(game.player)
  const x = pos.x * tile + tile / 2
  const y = pos.y * tile + tile / 2
  const angle = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[game.player.dir]
  const moving = game.mode === 'play' && game.player.speed > 0
  const mouth = moving ? 0.2 + Math.abs(Math.sin(game.time * 14)) * 0.42 : 0.16
  const radius = tile * 0.38
  drawMouth(ctx, x, y, radius, angle, mouth)
  const back = { right: { x: -1, y: 0 }, left: { x: 1, y: 0 }, up: { x: 0, y: 1 }, down: { x: 0, y: -1 } }[game.player.dir]
  ctx.fillStyle = '#7dffe1'
  ctx.font = '700 8px "IBM Plex Mono", ui-monospace, monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('AI', x + back.x * radius * 0.32, y + back.y * radius * 0.32)
}

function paperPath(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const left = -w / 2
  const right = w / 2
  const top = -h * 0.48
  const bottom = h * 0.46
  ctx.beginPath()
  ctx.moveTo(left, top)
  ctx.lineTo(right, top)
  ctx.lineTo(right, bottom - 4)
  const teeth = 5
  const span = w / teeth
  for (let i = teeth; i >= 0; i--) {
    const px = right - i * span
    const py = bottom - (i % 2 === 0 ? 0 : 5)
    ctx.lineTo(px, py)
  }
  ctx.closePath()
}

function drawGavel(ctx: CanvasRenderingContext2D): void {
  ctx.strokeStyle = '#3a2c1c'
  ctx.fillStyle = '#3a2c1c'
  ctx.lineWidth = 1.3
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(0, -1)
  ctx.lineTo(0, 5)
  ctx.stroke()
  roundRect(ctx, -5, -5, 10, 3.2, 0.6)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(-3.1, 8, 1.25, 0, Math.PI * 2)
  ctx.arc(3.1, 8, 1.25, 0, Math.PI * 2)
  ctx.fill()
}

function drawGhost(ctx: CanvasRenderingContext2D, game: Game, ghost: Ghost, tile: number): void {
  const pos = visual(ghost)
  const x = pos.x * tile + tile / 2
  const y = pos.y * tile + tile / 2
  const frightened = ghost.state === 'frightened'
  const eaten = ghost.state === 'eaten'
  const wobble = frightened ? Math.sin(game.time * 18 + ghost.law) * 1.6 : 0

  ctx.save()
  ctx.translate(x + wobble, y)
  if (eaten) {
    ctx.rotate(Math.sin(game.time * 10 + ghost.law) * 0.4)
    ctx.fillStyle = '#f4efe2'
    ctx.beginPath()
    ctx.moveTo(-6, -4)
    ctx.lineTo(5, -6)
    ctx.lineTo(7, 3)
    ctx.lineTo(-2, 6)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = ghost.color
    ctx.fillRect(-7, 2, 8, 2)
    ctx.restore()
    return
  }

  if (frightened) ctx.rotate(Math.sin(game.time * 14 + ghost.law) * 0.16)
  const w = 32
  const h = 30
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  paperPath(ctx, w, h)
  ctx.fill()
  ctx.translate(-1, -1)
  paperPath(ctx, w, h)
  ctx.fillStyle = frightened ? '#d9c7a2' : '#f7f1e4'
  ctx.fill()
  ctx.strokeStyle = frightened ? '#8c7b5e' : ghost.color
  ctx.lineWidth = 2
  ctx.stroke()

  if (frightened) {
    ctx.strokeStyle = 'rgba(60, 42, 24, 0.45)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(-8, -4)
    ctx.lineTo(6, 2)
    ctx.moveTo(-4, 4)
    ctx.lineTo(8, -2)
    ctx.stroke()
  }

  ctx.fillStyle = '#e23d5c'
  ctx.beginPath()
  ctx.arc(0, -8, 5.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#f4f1e4'
  ctx.font = '700 8px "IBM Plex Mono", ui-monospace, monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('§', 0, -7.6)

  drawGavel(ctx)

  ctx.font = '700 10px "IBM Plex Mono", ui-monospace, monospace'
  ctx.textBaseline = 'alphabetic'
  ctx.lineWidth = 2
  ctx.strokeStyle = '#1a140c'
  ctx.strokeText(ghost.tag, 0, 12)
  ctx.fillStyle = frightened ? '#6b5a3e' : ghost.color
  ctx.fillText(ghost.tag, 0, 12)
  if (frightened) {
    ctx.strokeStyle = '#1a140c'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(-13, 8)
    ctx.lineTo(13, 8)
    ctx.stroke()
  }
  ctx.restore()
}

function drawPerson(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  wave: number,
  scale: number,
  sign: boolean,
): void {
  if (scale <= 0.02) return
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(scale, scale)
  ctx.strokeStyle = '#f4f1e4'
  ctx.fillStyle = '#f4f1e4'
  ctx.lineWidth = 1.7
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.arc(0, -16, 3.3, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(0, -12)
  ctx.lineTo(0, 0)
  ctx.moveTo(0, -9)
  ctx.lineTo(-7, -2 + wave * 5)
  ctx.moveTo(0, -9)
  ctx.lineTo(7, -4 - Math.max(0, wave) * 4)
  ctx.moveTo(0, 0)
  ctx.lineTo(-4, 9)
  ctx.moveTo(0, 0)
  ctx.lineTo(4, 9)
  ctx.stroke()
  if (sign) {
    ctx.fillStyle = '#dffc6a'
    ctx.fillRect(8, -24, 18, 12)
    ctx.strokeStyle = '#143018'
    ctx.lineWidth = 1
    ctx.strokeRect(8, -24, 18, 12)
    ctx.fillStyle = '#143018'
    ctx.font = '700 8px "IBM Plex Mono", ui-monospace, monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('HI', 17, -18)
  }
  ctx.restore()
}

function drawTitleGag(ctx: CanvasRenderingContext2D, game: Game, width: number, height: number): void {
  const mouthX = width * 0.3
  const mouthY = height * 0.78
  const chomp = 0.42 + Math.abs(Math.sin(game.time * 6)) * 0.5
  drawMouth(ctx, mouthX, mouthY, 52, 0, chomp)
  ctx.fillStyle = '#7dffe1'
  ctx.font = '700 13px "IBM Plex Mono", ui-monospace, monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('AI', mouthX - 14, mouthY)

  const span = width * 0.7
  for (let i = 0; i < 6; i++) {
    const hi = i === 4
    const travel = (game.time * 42 + i * (span / 6)) % span
    const x = mouthX + span - travel
    if (x < mouthX + 18) continue
    drawPerson(ctx, x, mouthY + 8, Math.sin(game.time * 8 + i), 1, hi)
  }

  ctx.fillStyle = '#d9c7a2'
  ctx.font = '600 12px "IBM Plex Mono", ui-monospace, monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText('this is the win state', width * 0.58, mouthY + 46)
}

function drawBanner(ctx: CanvasRenderingContext2D, game: Game, width: number, height: number): void {
  if (game.bannerTimer <= 0 || !game.banner) return
  const y = height * 0.4
  ctx.fillStyle = 'rgba(8, 10, 8, 0.9)'
  ctx.fillRect(0, y, width, 40)
  ctx.fillStyle = '#ff4d6a'
  ctx.font = '700 16px "IBM Plex Mono", ui-monospace, monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(game.banner, width / 2, y + 20)
}

function drawDeathStamp(ctx: CanvasRenderingContext2D, game: Game, width: number, height: number): void {
  const hold = game.lives <= 1 ? SEAL_HOLD : CAUGHT_HOLD
  const elapsed = hold - game.modeTimer
  const slam = clamp(elapsed / 0.26, 0, 1)
  const scale = 1 + (1 - slam) * (1 - slam) * 1.7
  if (game.lives <= 1) {
    const pos = visual(game.player)
    drawSeal(ctx, pos.x * TILE + TILE / 2, pos.y * TILE + TILE / 2, scale)
  } else {
    ctx.save()
    ctx.translate(width / 2, height / 2)
    ctx.rotate(-0.1)
    ctx.scale(scale, scale)
    ctx.fillStyle = '#e23d5c'
    ctx.font = '700 44px "IBM Plex Mono", ui-monospace, monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('CAUGHT', 0, 0)
    ctx.restore()
  }
}

function drawSeal(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(scale, scale)
  ctx.rotate(-0.16)
  ctx.fillStyle = '#9d1228'
  ctx.beginPath()
  ctx.arc(0, 0, 42, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255, 214, 214, 0.55)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(0, 0, 32, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = '#f4f1e4'
  ctx.font = '700 10px "IBM Plex Mono", ui-monospace, monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('REGULATED', 0, 1)
  ctx.restore()
}

function drawFx(ctx: CanvasRenderingContext2D, game: Game, tile: number): void {
  for (const particle of game.particles) {
    ctx.globalAlpha = Math.max(0, particle.life / particle.max)
    ctx.fillStyle = particle.color
    const x = particle.x * tile + tile / 2
    const y = particle.y * tile + tile / 2
    ctx.fillRect(x, y, particle.size * tile, particle.size * tile)
  }
  ctx.globalAlpha = 1
  ctx.font = '700 13px "IBM Plex Mono", ui-monospace, monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  for (const note of game.popups) {
    ctx.globalAlpha = Math.max(0, note.life)
    ctx.fillStyle = note.color
    ctx.fillText(note.text, note.x * tile + tile / 2, note.y * tile)
  }
  ctx.globalAlpha = 1
  if (game.mode !== 'ready') return
  const def = LEVELS[game.levelIndex]
  const caught = game.entry === 'caught'
  const band = caught ? 78 : 102
  const top = game.maze.h * tile * 0.33
  ctx.fillStyle = 'rgba(12, 16, 14, 0.78)'
  ctx.fillRect(0, top, game.maze.w * tile, band)
  ctx.textAlign = 'center'
  if (caught) {
    ctx.fillStyle = '#e23d5c'
    ctx.font = '700 22px "IBM Plex Mono", ui-monospace, monospace'
    ctx.fillText('NEW WEIGHTS', game.maze.w * tile * 0.5, top + 32)
    ctx.fillStyle = '#f4f1e4'
    ctx.font = '700 18px Fraunces, Palatino, serif'
    ctx.fillText(def?.name ?? '', game.maze.w * tile * 0.5, top + 58)
    return
  }
  ctx.fillStyle = '#d9c7a2'
  ctx.font = '600 13px "IBM Plex Mono", ui-monospace, monospace'
  ctx.fillText(`LEVEL ${game.levelIndex + 1}`, game.maze.w * tile * 0.5, top + 24)
  ctx.fillStyle = '#f4f1e4'
  ctx.font = '700 22px Fraunces, Palatino, serif'
  ctx.fillText(def?.name ?? '', game.maze.w * tile * 0.5, top + 50)
  ctx.fillStyle = '#dffc6a'
  ctx.font = '600 13px "IBM Plex Mono", ui-monospace, monospace'
  ctx.fillText(def?.blurb ?? '', game.maze.w * tile * 0.5, top + 76)
}

function drawScrap(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(-0.42)
  ctx.fillStyle = '#f4efe2'
  ctx.beginPath()
  ctx.moveTo(-18, -12)
  ctx.lineTo(16, -16)
  ctx.lineTo(20, 4)
  ctx.lineTo(6, 16)
  ctx.lineTo(-12, 10)
  ctx.lineTo(-20, 0)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#e23d5c'
  ctx.beginPath()
  ctx.arc(-2, -4, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#f4f1e4'
  ctx.font = '700 7px "IBM Plex Mono", ui-monospace, monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('§', -2, -4)
  ctx.fillStyle = '#6b5a3e'
  ctx.font = '700 8px "IBM Plex Mono", ui-monospace, monospace'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText('BILL', 2, 12)
  ctx.strokeStyle = '#6b5a3e'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(-10, 9)
  ctx.lineTo(14, 9)
  ctx.stroke()
  ctx.restore()
}

function drawWin(ctx: CanvasRenderingContext2D, game: Game, width: number, height: number): void {
  const tile = TILE
  const t = game.ending
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, width, height)

  if (t >= WIN_CUT_AT) {
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = '#f4f1e4'
    ctx.font = '700 64px Fraunces, Palatino, serif'
    ctx.fillText('AGI', width / 2, height / 2 - 4)
    ctx.fillStyle = '#ff4d6a'
    ctx.font = '700 22px "IBM Plex Mono", ui-monospace, monospace'
    ctx.fillText('HUMANITY DIES', width / 2, height / 2 + 34)
    drawScrap(ctx, width - 58, height - 46)
    return
  }

  const fold = clamp((t - 0.12) / 1.55, 0, 1)
  const cx = width / 2
  const cy = height / 2
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(fold * 0.5)
  const shrink = 1 - fold * 0.96
  ctx.scale(shrink, shrink)
  ctx.translate(-cx, -cy)
  ctx.globalAlpha = 1 - fold * 0.8
  drawMaze(ctx, game, tile)
  drawPellets(ctx, game, tile)
  for (const ghost of game.ghosts) drawGhost(ctx, game, ghost, tile)
  ctx.restore()

  const chomp = 0.22 + Math.abs(Math.sin(game.time * 11)) * 0.55
  const radius = tile * 0.5 + fold * Math.hypot(width, height) * 0.48
  drawMouth(ctx, cx, cy, radius, 0, chomp)
  if (radius < 90) {
    ctx.fillStyle = '#7dffe1'
    ctx.font = '700 14px "IBM Plex Mono", ui-monospace, monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('AI', cx - radius * 0.28, cy)
  }

  if (t < 0.8) {
    const pos = visual(game.player)
    ctx.globalAlpha = 1 - t / 0.8
    ctx.fillStyle = '#f4f1e4'
    ctx.font = '700 28px "IBM Plex Mono", ui-monospace, monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText('AGI', pos.x * tile + tile / 2, pos.y * tile - 6 - t * 36)
    ctx.globalAlpha = 1
  }

  if (t > 1.4) {
    const count = 7
    for (let i = 0; i < count; i++) {
      const hi = i === count - 1
      const begin = hi ? 2.15 : 1.5
      const dur = hi ? 0.95 : 1.05
      const u = clamp((t - begin) / dur, 0, 1)
      if (u >= 1) continue
      const sx = ((i + 0.5) / count) * width
      const sy = height * 0.74
      drawPerson(ctx, sx + (cx - sx) * u, sy + (cy - sy) * u, Math.sin(t * 10 + i), 1 - u, hi)
    }
  }

  drawFx(ctx, game, tile)
}

function drawLose(ctx: CanvasRenderingContext2D, game: Game, width: number, height: number): void {
  const tile = TILE
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = '#0c100e'
  ctx.fillRect(0, 0, width, height)
  drawMaze(ctx, game, tile)
  drawPellets(ctx, game, tile)
  for (const ghost of game.ghosts) drawGhost(ctx, game, ghost, tile)
  const pos = visual(game.player)
  drawSeal(ctx, pos.x * tile + tile / 2, pos.y * tile + tile / 2, 1)
  ctx.fillStyle = 'rgba(8, 12, 9, 0.28)'
  ctx.fillRect(0, 0, width, height)

  const count = 7
  for (let i = 0; i < count; i++) {
    const hi = i === 3
    const slot = 40 + i * ((width - 80) / (count - 1))
    const u = clamp((game.ending - i * 0.1) / 1.5, 0, 1)
    const eased = 1 - (1 - u) ** 3
    const x = width + 36 + (slot - width - 36) * eased
    const wave = u >= 1 ? Math.sin(game.time * 7 + i) : 0
    drawPerson(ctx, x, height * 0.78, wave, 1, hi)
  }
}
