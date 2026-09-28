import { LEVELS } from './levels'
import { visual, type Game } from './sim'

const TILE = 28

export function tileSize(): number {
  return TILE
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
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = '#0c100e'
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
    ctx.fillStyle = 'rgba(226, 61, 92, 0.18)'
    ctx.fillRect(0, 0, width, height)
    ctx.fillStyle = '#f4f1e4'
    ctx.font = '700 28px "IBM Plex Mono", ui-monospace, monospace'
    ctx.textAlign = 'center'
    ctx.fillText('REGULATED', width / 2, height / 2)
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

  if (game.mode === 'title') {
    ctx.fillStyle = 'rgba(8, 12, 9, 0.25)'
    ctx.fillRect(0, 0, width, height)
  }
}

function drawMaze(ctx: CanvasRenderingContext2D, game: Game, tile: number): void {
  const { maze } = game
  const surge = game.surge > 0
  for (let y = 0; y < maze.h; y++) {
    for (let x = 0; x < maze.w; x++) {
      const ch = maze.rows[y]![x]
      if (ch === '#') {
        ctx.fillStyle = '#1c2620'
        ctx.fillRect(x * tile, y * tile, tile, tile)
      }
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
  const tunnelY = maze.rows.findIndex((row) => row[0] !== '#' && row[maze.w - 1] !== '#')
  if (tunnelY >= 0) {
    ctx.fillStyle = '#d9c7a2'
    ctx.font = '12px "IBM Plex Mono", ui-monospace, monospace'
    ctx.textAlign = 'center'
    ctx.fillText('‹', tile * 0.5, tunnelY * tile + tile * 0.72)
    ctx.fillText('›', (maze.w - 0.5) * tile, tunnelY * tile + tile * 0.72)
  }
}

function drawPellets(ctx: CanvasRenderingContext2D, game: Game, tile: number): void {
  for (const dot of game.dots) {
    const x = dot.x * tile + tile / 2
    const y = dot.y * tile + tile / 2
    ctx.fillStyle = '#dffc6a'
    roundRect(ctx, x - 4, y - 2.5, 8, 5, 1)
    ctx.fill()
    ctx.fillStyle = '#143018'
    ctx.fillRect(x - 4, y - 1, 1.5, 2)
    ctx.fillRect(x + 2.5, y - 1, 1.5, 2)
  }
  for (const cherry of game.cherries) {
    const x = cherry.x * tile + tile / 2
    const y = cherry.y * tile + tile / 2
    ctx.fillStyle = '#2f6b32'
    ctx.beginPath()
    ctx.ellipse(x + 3, y - 7, 4, 2, -0.6, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#2f6b32'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(x, y - 2)
    ctx.quadraticCurveTo(x + 2, y - 8, x + 5, y - 8)
    ctx.stroke()
    ctx.fillStyle = '#ff4d6a'
    ctx.beginPath()
    ctx.arc(x - 2, y + 1, 4.2, 0, Math.PI * 2)
    ctx.arc(x + 2.5, y + 1, 4.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.beginPath()
    ctx.arc(x - 3, y, 1.3, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, game: Game, tile: number): void {
  if (game.mode === 'dying' && game.modeTimer < 0.35) return
  const pos = visual(game.player)
  const x = pos.x * tile + tile / 2
  const y = pos.y * tile + tile / 2
  const angle = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[game.player.dir]
  const moving = game.mode === 'play' && game.player.speed > 0
  const mouth = moving ? 0.18 + Math.abs(Math.sin(game.time * 14)) * 0.42 : 0.12
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.fillStyle = '#f4f1e4'
  ctx.beginPath()
  ctx.arc(0, 0, tile * 0.38, mouth, Math.PI * 2 - mouth)
  ctx.lineTo(0, 0)
  ctx.fill()
  ctx.fillStyle = '#14301c'
  ctx.beginPath()
  ctx.arc(-2, 0, tile * 0.12, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#7dffe1'
  ctx.beginPath()
  ctx.arc(-2, 0, tile * 0.05, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawGhost(
  ctx: CanvasRenderingContext2D,
  game: Game,
  ghost: Game['ghosts'][number],
  tile: number,
): void {
  const pos = visual(ghost)
  const x = pos.x * tile + tile / 2
  const y = pos.y * tile + tile / 2
  const frightened = ghost.state === 'frightened'
  const eaten = ghost.state === 'eaten'
  const blink = frightened && game.surge < 2 && Math.floor(game.time * 8) % 2 === 0
  const body = eaten ? 'rgba(0,0,0,0)' : blink ? '#f4f1e4' : frightened ? '#d9c7a2' : ghost.color
  const wobble = frightened ? Math.sin(game.time * 18 + ghost.law) * 1.4 : 0
  const r = tile * 0.38

  ctx.save()
  ctx.translate(x + wobble, y)
  if (!eaten) {
    ctx.fillStyle = body
    ctx.beginPath()
    ctx.arc(0, -1, r, Math.PI, 0)
    ctx.lineTo(r, r * 0.55)
    const feet = 3
    const span = (r * 2) / feet
    for (let i = feet; i >= 0; i--) {
      const fx = r - i * span
      const dip = i % 2 === 0 ? r * 0.15 : r * 0.72
      ctx.lineTo(fx, dip)
    }
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = 'rgba(244, 241, 228, 0.7)'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.arc(0, -1, r * 0.48, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = frightened ? '#6b5a3e' : '#f4f1e4'
    ctx.font = '700 9px "IBM Plex Mono", ui-monospace, monospace'
    ctx.textAlign = 'center'
    ctx.fillText('§', 0, -r * 0.15)
  } else {
    ctx.strokeStyle = ghost.color
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2)
    ctx.stroke()
  }

  const eye = eaten || frightened ? '#1a140c' : '#10140f'
  ctx.fillStyle = '#f4f1e4'
  ctx.beginPath()
  ctx.arc(-5, -1, eaten ? 3.2 : 4, 0, Math.PI * 2)
  ctx.arc(5, -1, eaten ? 3.2 : 4, 0, Math.PI * 2)
  ctx.fill()
  const look = VEC_LOOK[ghost.dir]
  ctx.fillStyle = eye
  ctx.beginPath()
  ctx.arc(-5 + look.x * 1.4, -1 + look.y * 1.4, 1.7, 0, Math.PI * 2)
  ctx.arc(5 + look.x * 1.4, -1 + look.y * 1.4, 1.7, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  if (!eaten) {
    ctx.fillStyle = frightened ? '#d9c7a2' : ghost.color
    ctx.font = '700 9px "IBM Plex Mono", ui-monospace, monospace'
    ctx.textAlign = 'center'
    ctx.fillText(ghost.tag, x, y + tile * 0.62)
  }
}

const VEC_LOOK = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
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
  ctx.font = '700 12px "IBM Plex Mono", ui-monospace, monospace'
  ctx.textAlign = 'center'
  for (const note of game.popups) {
    ctx.globalAlpha = Math.max(0, note.life)
    ctx.fillStyle = note.color
    ctx.fillText(note.text, note.x * tile + tile / 2, note.y * tile)
  }
  ctx.globalAlpha = 1
  if (game.mode === 'ready') {
    const def = LEVELS[game.levelIndex]
    ctx.fillStyle = 'rgba(12, 16, 14, 0.55)'
    ctx.fillRect(0, game.maze.h * tile * 0.38, game.maze.w * tile, 74)
    ctx.fillStyle = '#d9c7a2'
    ctx.font = '600 14px "IBM Plex Mono", ui-monospace, monospace'
    ctx.fillText(`LEVEL ${game.levelIndex + 1}`, game.maze.w * tile * 0.5, game.maze.h * tile * 0.38 + 28)
    ctx.fillStyle = '#f4f1e4'
    ctx.font = '700 20px Fraunces, Palatino, serif'
    ctx.fillText(def?.name ?? '', game.maze.w * tile * 0.5, game.maze.h * tile * 0.38 + 54)
  }
}
