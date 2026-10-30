// Virtual time for frame-exact capture: the page's clock and animation
// frames only move when the recorder calls __step(ms).
(() => {
  let now = 0
  let queue = []
  const realNow = performance.now.bind(performance)
  const start = realNow()
  performance.now = () => now
  window.requestAnimationFrame = (cb) => { queue.push(cb); return queue.length }
  window.cancelAnimationFrame = () => {}
  window.__step = (ms) => {
    now += ms
    const q = queue
    queue = []
    for (const cb of q) cb(now)
    return now
  }
  window.__realStart = start
})()
