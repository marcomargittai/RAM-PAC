// Stills for the deep-dive carousel (carousel/deep). Needs `npm run dev`.
// The IP lookup is answered with a made-up address so no real one is shown.
const { chromium } = require('playwright')
const path = require('path')
const OUT = path.join(__dirname, '../carousel/deep/shots/')
const T = path.join(__dirname, 'trailer/')
const fs = require('fs')
;(async () => {
  const b = await chromium.launch()
  const p = await (await b.newContext({ viewport: { width: 1080, height: 1350 }, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36' })).newPage()
  p.on('pageerror', (e) => console.log('ERR', e.message))
  p.on('console', (m) => { if (!/GL Driver/.test(m.text())) console.log('C', m.text()) })
  await p.route('**/rpc/**', (r) => r.abort())
  await p.route('https://ipapi.co/**', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ ip: '84.27.191.06', city: 'Rotterdam', region: 'South Holland', country_name: 'Netherlands', org: 'Ziggo B.V.', latitude: 51.92, longitude: 4.48 }) }))
  await p.addInitScript({ content: fs.readFileSync(T + 'vclock.js', 'utf8') + '\n' + fs.readFileSync(T + 'pilot.js', 'utf8') })
  await p.goto('http://127.0.0.1:43123/')
  await p.waitForTimeout(3000)
  const step = (ms) => p.evaluate((ms) => { window.__pilot(); return window.__step(ms) }, ms)
  const ev = (fn, arg) => p.evaluate(fn, arg)
  const skip = async (sec) => { for (let t = 0; t < sec * 1000; t += 50) await step(50) }
  const until = async (fn, max = 120) => { for (let t = 0; t < max * 1000; t += 50) { if (await ev(fn)) return true; await step(50) } console.log('timeout', fn.toString()); return false }
  const shot = (name) => p.screenshot({ path: OUT + name + '.jpg', quality: 92 }).then(() => console.log('shot', name))
  const toGame = async () => { for (let i = 0; i < 40 && (await ev(() => window.__dbg.stage.kind)) !== 'game'; i++) { await p.keyboard.press('Escape'); await step(100); await p.keyboard.press('Enter'); await step(100) } }
  await skip(4)
  await p.keyboard.press('Enter'); await step(200)
  // story terminal
  await skip(9); await shot('story')
  await toGame()
  await p.keyboard.press('Enter')
  await until(() => window.__game.mode === 'play')
  await ev(() => { window.__game.lives = 9 })
  await skip(1.5); await ev(() => { window.__game.lives = 9; window.__game.surgeCharge = 24 })
  await until(() => window.__game.surge > 0 && window.__game.mode === 'play', 30); await skip(1.2); await shot('surge')
  // the rewrite between boards
  await ev(() => { window.__game.dots = [] })
  await until(() => window.__dbg.stage.kind === 'upgrade')
  for (const [t, n] of [[1.2, 'rw1'], [1.4, 'rw2'], [1.6, 'rw3'], [2.5, 'rw4']]) { await skip(t); await shot(n) }
  for (let k = 0; k < 2; k++) {
    await toGame(); await p.keyboard.press('Enter'); await until(() => window.__game.mode === 'play')
    await skip(4); await ev(() => { window.__game.lives = 9 })
    if (k === 1) { await ev(() => { window.__game.surgeCharge = 24 }); await until(() => window.__game.surge > 0, 30); await skip(4.6); await ev(() => { window.__game.lives = 9 }); await until(() => window.__game.mode === 'play' && window.__game.surge === 0, 10); await skip(0.6); await shot('play3') }
    await ev(() => { window.__game.dots = [] })
    await until(() => window.__dbg.stage.kind === 'upgrade')
  }
  for (let i = 0; i < 40 && (await ev(() => window.__dbg.stage.kind)) !== 'finale'; i++) { await p.keyboard.press('Escape'); await step(150) }
  await until(() => window.__dbg.stage.kind === 'finale', 30)
  // steer the finale in a zigzag: across, down a row, back
  await ev(() => {
    const pilot = window.__pilot
    window.__pilot = () => {
      pilot()
      const st = window.__dbg.stage
      if (st.kind !== 'finale') return
      const f = st.finale
      const b = f.phase === 'maze' ? f.lay.board : { x: 0, y: 0, size: Math.max(f.lay.W, f.lay.H) }
      const right = f.phase === 'maze' ? b.x + b.size : f.lay.W
      const bottom = f.phase === 'maze' ? b.y + b.size : f.lay.H
      const z = window.__zig || (window.__zig = { across: 'right', downTo: 0 })
      const half = f.size * 0.3
      if (f.dir === 'down') {
        if (f.y >= z.downTo || f.y >= bottom - half - 1) { z.across = z.across === 'right' ? 'left' : 'right'; f.dir = z.across }
      } else if (f.dir === 'up') {
        if (f.y <= b.y + half + 1) f.dir = z.across
      } else {
        const atEdge = f.dir === 'right' ? f.x >= right - half - 1 : f.x <= b.x + half + 1
        if (atEdge) { if (f.y >= bottom - half - 2) { f.dir = 'up' } else { z.downTo = f.y + f.size * 0.75; f.dir = 'down' } }
      }
    }
  })
  await until(() => window.__dbg.stage.finale.phase === 'maze' && window.__dbg.stage.finale.phaseT > 6, 60); await shot('finale1')
  await until(() => window.__dbg.stage.finale.phase === 'ui' && window.__dbg.stage.finale.phaseT > 3, 90); await shot('finale2')
  await until(() => window.__dbg.stage.finale.phase === 'ui' && window.__dbg.stage.finale.phaseT > 7, 90); await shot('finale3')
  await until(() => window.__dbg.stage.finale.phase === 'glass' && window.__dbg.stage.finale.phaseT > 2.7, 90); await shot('glass')
  await until(() => window.__dbg.stage.kind === 'takeover', 200)
  await until(() => window.__dbg.stage.tk.phase === 'scan', 60); await skip(9); await shot('scan')
  await until(() => window.__dbg.stage.tk.phase === 'ask', 200); await skip(1.5); await shot('ask')
  await ev(() => window.__dbg.stage.tk.choose(0))
  await until(() => window.__dbg.stage.tk.phase === 'chaos', 120); await skip(4); await shot('chaos')
  await until(() => window.__dbg.stage.tk.phase === 'crash', 120); await skip(1.5); await shot('crash')
  await until(() => window.__dbg.stage.tk.phase === 'spread', 120); await skip(16); await shot('spread')
  for (let i = 0; i < 60 && (await ev(() => window.__dbg.stage.tk.phase)) === 'spread'; i++) { await p.keyboard.press('Enter'); await skip(1) }
  await until(() => window.__dbg.stage.tk.phase === 'chat', 60); await skip(22); await shot('chat')
  await b.close()
})()
