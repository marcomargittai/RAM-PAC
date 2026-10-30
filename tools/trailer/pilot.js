// Autopilot for trailer capture: BFS to the nearest frightened law during a
// surge, otherwise to the nearest RAM, avoiding tiles next to hunting laws.
window.__pilot = () => {
  const g = window.__game
  if (!g || g.mode !== 'play') return
  const rows = g.maze.rows, h = g.maze.h, w = g.maze.w
  const open = (x, y) => { const c = rows[y]?.[x] ?? '#'; return c !== '#' && c !== 'd' && c !== 'G' }
  const V = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }
  const p = g.player
  let sx = p.x, sy = p.y
  if (p.progress > 0.5) { sx += V[p.dir][0]; sy += V[p.dir][1] }
  sx = (sx + w) % w
  const danger = new Set()
  for (const gh of g.ghosts) if (gh.state === 'chase' || gh.state === 'scatter') for (const [dx, dy] of [[0,0],[1,0],[-1,0],[0,1],[0,-1]]) danger.add((gh.x + dx) + ',' + (gh.y + dy))
  const prey = new Set(g.ghosts.filter((gh) => gh.state === 'frightened').map((gh) => gh.x + ',' + gh.y))
  const food = new Set(g.dots.map((d) => d.x + ',' + d.y))
  const goal = prey.size ? prey : food
  const seen = new Map([[sx + ',' + sy, null]])
  const q = [[sx, sy]]
  let hit = null
  while (q.length) {
    const [x, y] = q.shift()
    const k = x + ',' + y
    if (goal.has(k) && !(x === sx && y === sy)) { hit = k; break }
    for (const d of ['up', 'left', 'down', 'right']) {
      let nx = x + V[d][0], ny = y + V[d][1]
      nx = (nx + w) % w
      const nk = nx + ',' + ny
      if (ny < 0 || ny >= h || !open(nx, ny) || seen.has(nk)) continue
      if (danger.has(nk) && !prey.size) continue
      seen.set(nk, [k, d]); q.push([nx, ny])
    }
  }
  if (!hit) return
  let k = hit, first = null
  while (seen.get(k)) { const [prev, d] = seen.get(k); first = d; k = prev }
  if (first) p.queued = first
}
