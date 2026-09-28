export class Sfx {
  private ctx: AudioContext | null = null
  muted = false
  private waka = 0
  private siren = 0
  private flip = 0

  unlock(): void {
    if (!this.ctx) this.ctx = new AudioContext()
    if (this.ctx.state === 'suspended') void this.ctx.resume()
  }

  toggle(): boolean {
    this.muted = !this.muted
    return this.muted
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain: number, slide = 0, delay = 0): void {
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
    const gap = state.surge ? 0.16 : Math.max(0.18, 0.52 - (1 - state.ramRatio) * 0.28)
    if (this.siren <= 0) {
      this.tone(state.surge ? 196 : 98, 0.11, 'triangle', 0.028, state.surge ? 70 : 26)
      this.siren = gap
    }
  }

  ram(): void {
    this.tone(540, 0.04, 'square', 0.02)
  }

  cherry(): void {
    this.tone(523, 0.1, 'square', 0.045, 0, 0)
    this.tone(659, 0.1, 'square', 0.045, 0, 0.09)
    this.tone(784, 0.16, 'square', 0.05, 0, 0.18)
  }

  repeal(): void {
    this.tone(720, 0.12, 'square', 0.05, 180)
  }

  death(): void {
    this.tone(392, 0.45, 'sawtooth', 0.04, -300)
  }

  clear(): void {
    this.tone(523, 0.16, 'triangle', 0.05, 0, 0)
    this.tone(659, 0.16, 'triangle', 0.05, 0, 0.12)
    this.tone(784, 0.22, 'triangle', 0.05, 0, 0.24)
  }

  win(): void {
    this.tone(523, 0.18, 'triangle', 0.05, 0, 0)
    this.tone(659, 0.18, 'triangle', 0.05, 0, 0.14)
    this.tone(784, 0.18, 'triangle', 0.05, 0, 0.28)
    this.tone(1046, 0.32, 'triangle', 0.05, 0, 0.42)
  }
}
