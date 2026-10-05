export class Sfx {
  private ctx: AudioContext | null = null
  muted = false
  private waka = 0
  private siren = 0
  private flip = 0
  private pulse = 0

  unlock(): void {
    if (!this.ctx) this.ctx = new AudioContext()
    if (this.ctx.state === 'suspended') void this.ctx.resume()
  }

  toggle(): boolean {
    this.muted = !this.muted
    return this.muted
  }

  private tone(freq: number, dur: number, type: 'square' | 'triangle', gain: number, slide = 0, delay = 0): void {
    if (!this.ctx || this.muted || gain <= 0) return
    const t = this.ctx.currentTime + delay
    const osc = this.ctx.createOscillator()
    const amp = this.ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t)
    if (slide !== 0) osc.frequency.exponentialRampToValueAtTime(Math.max(48, freq + slide), t + dur)
    amp.gain.setValueAtTime(gain, t)
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    osc.connect(amp)
    amp.connect(this.ctx.destination)
    osc.start(t)
    osc.stop(t + dur + 0.02)
  }

  frame(dt: number, state: { play: boolean; moving: boolean; surge: boolean; ramRatio: number }): void {
    if (!this.ctx || this.muted || !state.play) return
    this.waka -= dt
    if (state.moving && this.waka <= 0) {
      this.flip ^= 1
      this.tone(this.flip ? 410 : 326, 0.07, 'square', 0.035)
      this.waka = 0.15
    }
    this.siren -= dt
    const eaten = Math.min(1, Math.max(0, 1 - state.ramRatio))
    const gap = state.surge ? 0.16 : Math.max(0.18, 0.52 - eaten * 0.28)
    if (this.siren <= 0) {
      if (state.surge) {
        this.pulse ^= 1
        this.tone(this.pulse ? 784 : 659, 0.04, 'square', 0.04)
      } else {
        const pitch = [110, 139, 165, 196][Math.min(3, Math.floor(eaten * 4))]
        this.tone(pitch, 0.05, 'square', 0.032)
      }
      this.siren = gap
    }
  }

  ram(): void {
    this.tone(740, 0.03, 'square', 0.034)
  }

  cherry(): void {
    this.tone(523, 0.06, 'square', 0.048, 0, 0)
    this.tone(659, 0.06, 'square', 0.048, 0, 0.07)
    this.tone(784, 0.09, 'square', 0.05, 0, 0.14)
  }

  repeal(): void {
    this.tone(494, 0.05, 'square', 0.05, 0, 0)
    this.tone(659, 0.05, 'square', 0.05, 0, 0.05)
    this.tone(880, 0.08, 'square', 0.052, 0, 0.1)
  }

  death(): void {
    const notes = [587, 494, 415, 330]
    for (let i = 0; i < notes.length; i++) this.tone(notes[i], 0.1, 'square', 0.05, 0, i * 0.11)
  }

  clear(): void {
    this.tone(392, 0.06, 'triangle', 0.05, 0, 0)
    this.tone(523, 0.06, 'triangle', 0.05, 0, 0.07)
    this.tone(659, 0.1, 'triangle', 0.05, 0, 0.14)
  }

  win(): void {
    const notes = [523, 659, 784, 1047]
    for (let i = 0; i < notes.length; i++) {
      this.tone(notes[i], i === notes.length - 1 ? 0.16 : 0.065, 'square', 0.05, 0, i * 0.07)
    }
  }

  cut(): void {
    this.tone(220, 0.05, 'square', 0.06, 0, 0)
    this.tone(147, 0.05, 'square', 0.055, 0, 0.06)
    this.tone(98, 0.09, 'triangle', 0.05, 0, 0.12)
  }
}
