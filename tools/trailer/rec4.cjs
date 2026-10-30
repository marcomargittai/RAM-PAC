const { chromium } = require('playwright')
const fs = require('fs')
const OUT = 'tr/' + process.argv[2] + '/'
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true })
const FPS = 30
;(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
  const p = await (await b.newContext({ viewport: { width: 1080, height: 1920 }, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36' })).newPage()
  p.on('pageerror', e => console.log('ERR', e.message))
  await p.route('**/rpc/**', r => r.abort())
  await p.addInitScript({ content: fs.readFileSync('vclock.js', 'utf8') + '\n' + fs.readFileSync('pilot.js', 'utf8') })
  await p.goto('http://127.0.0.1:43123/')
  await p.waitForTimeout(3000)
  const step = (ms) => p.evaluate((ms) => { window.__pilot(); return window.__step(ms) }, ms)
  const ev = (fn, arg) => p.evaluate(fn, arg)
  const skip = async (sec) => { for (let t = 0; t < sec * 1000; t += 50) await step(50) }
  const until = async (fn, max = 120) => { for (let t = 0; t < max * 1000; t += 50) { if (await ev(fn)) return true; await step(50) } console.log('timeout', fn.toString()); return false }
  let n = 0
  const rec = async (name, sec, speed = 1) => {
    const start = n
    for (let i = 0; i < Math.round(sec * FPS); i++) {
      await step((1000 / FPS) * speed)
      await p.screenshot({ path: `${OUT}${String(n++).padStart(5, '0')}.png` })
    }
    console.log(name, start, n - 1)
  }
  const toGame = async () => {
    for (let i = 0; i < 40 && await ev(() => window.__dbg.stage.kind) !== 'game'; i++) { await p.keyboard.press('Escape'); await step(100); await p.keyboard.press('Enter'); await step(100) }
  }
  const nextBoard = async () => {
    await ev(() => { window.__game.dots = [] })
    await until(() => window.__dbg.stage.kind === 'upgrade')
    await toGame(); await p.keyboard.press('Enter'); await until(() => window.__game.mode === 'play')
  }
  await skip(4)
  await p.keyboard.press('Enter'); await step(200)
  await toGame()
  await p.keyboard.press('Enter')
  await until(() => window.__game.mode === 'play')
  const which = process.argv[2]
  if (which === 'a') {
    await skip(3)
    await ev(() => { window.__game.lives = 9 })
    await rec('run1', 4)
    await ev(() => { window.__game.surgeCharge = 24 })
    await rec('surge1', 5)
    await nextBoard()
    await skip(3)
    await ev(() => { window.__game.lives = 9; window.__game.surgeCharge = 24 })
    await rec('surge2', 5)
  } else {
    await nextBoard(); await nextBoard()
    await skip(4)
    await ev(() => { window.__game.lives = 9 })
    await rec('run3', 4)
    await ev(() => { window.__game.surgeCharge = 24 })
    await rec('surge3', 5)
    await ev(() => { window.__game.dots = [] })
    await until(() => window.__dbg.stage.kind === 'upgrade')
    for (let i = 0; i < 40 && await ev(() => window.__dbg.stage.kind) !== 'finale'; i++) { await p.keyboard.press('Escape'); await step(150) }
    await ev(() => { const f = window.__dbg.stage.finale; f.phase = 'vacuum'; f.phaseT = 0 })
    await until(() => window.__dbg.stage.kind === 'takeover', 200)
    await until(() => window.__dbg.stage.tk.phase === 'ask', 200)
    await ev(() => window.__dbg.stage.tk.choose(0))
    await until(() => window.__dbg.stage.tk.phase === 'chaos', 120)
    await rec('chaos', 7, 1.5)
    await until(() => window.__dbg.stage.tk.phase === 'spread', 120)
    await skip(1)
    await rec('spread', 5, 2)
  }
  await b.close()
})()
