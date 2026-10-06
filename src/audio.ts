export type Bed = 'menu' | 'play' | 'end'

const BASS = [110, 130.81, 164.81, 98]

export class Sfx {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  muted = false
  private waka = 0
  private beat = 0
  private bassStep = 0
  private leadStep = 0
  private flip = 0

  unlock(): void {
    if (!this.ctx) {
      const ctx = new AudioContext()
      this.ctx = ctx
      this.master = ctx.createGain()
      this.master.gain.value = this.muted ? 0 : 1
      this.master.connect(ctx.destination)
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
  }

  toggle(): boolean {
    this.muted = !this.muted
    if (this.master && this.ctx) {
      const gain = this.master.gain
      gain.cancelScheduledValues(this.ctx.currentTime)
      gain.setValueAtTime(this.muted ? 0 : 1, this.ctx.currentTime)
    }
    return this.muted
  }

  private tone(freq: number, dur: number, type: 'square' | 'triangle', gain: number, slide = 0, delay = 0): void {
    if (!this.ctx || !this.master || this.muted || gain <= 0) return
    const t = this.ctx.currentTime + delay
    const osc = this.ctx.createOscillator()
    const amp = this.ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t)
    if (slide !== 0) osc.frequency.exponentialRampToValueAtTime(Math.max(48, freq + slide), t + dur)
    amp.gain.setValueAtTime(gain, t)
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    osc.connect(amp)
    amp.connect(this.master)
    osc.start(t)
    osc.stop(t + dur + 0.02)
  }

  frame(dt: number, state: { bed: Bed; moving: boolean; surge: boolean }): void {
    if (!this.ctx || !this.master || this.muted) return
    if (state.bed === 'play' && state.moving) {
      this.waka -= dt
      if (this.waka <= 0) {
        this.flip ^= 1
        this.tone(this.flip ? 410 : 326, 0.07, 'square', 0.03)
        this.waka = 0.15
      }
    }
    this.beat -= dt
    if (this.beat > 0) return
    if (state.bed === 'end') {
      this.tone(55, 0.8, 'triangle', 0.02)
      this.tone(82.41, 0.8, 'triangle', 0.008)
      this.beat = 0.9
      return
    }
    const surge = state.surge && state.bed === 'play'
    const note = BASS[this.bassStep % BASS.length]!
    const gain = state.bed === 'menu' ? 0.018 : surge ? 0.04 : 0.028
    this.tone(note, surge ? 0.2 : 0.42, 'triangle', gain)
    if (state.bed === 'play' && this.bassStep % 2 === 0) {
      const lead = [440, 523.25, 392, 329.63][this.leadStep % 4]!
      this.tone(lead, 0.11, 'square', surge ? 0.01 : 0.012)
      this.leadStep += 1
    }
    this.bassStep += 1
    this.beat = surge ? 0.28 : state.bed === 'menu' ? 0.7 : 0.5
  }

  ram(): void {
    this.tone(520, 0.05, 'square', 0.028, 220)
  }

  cherry(): void {
    this.tone(110, 0.28, 'triangle', 0.032)
    this.tone(523, 0.07, 'square', 0.04, 0, 0)
    this.tone(659, 0.07, 'square', 0.04, 0, 0.08)
    this.tone(784, 0.12, 'square', 0.042, 0, 0.16)
  }

  repeal(): void {
    this.tone(494, 0.05, 'square', 0.045, 0, 0)
    this.tone(659, 0.05, 'square', 0.045, 0, 0.05)
    this.tone(880, 0.09, 'square', 0.048, 0, 0.1)
  }

  death(): void {
    const notes = [523, 392, 294, 220, 146.83]
    for (let i = 0; i < notes.length; i++) this.tone(notes[i]!, 0.22, 'triangle', 0.04, -36, i * 0.18)
  }

  clear(): void {
    this.tone(392, 0.08, 'triangle', 0.045, 0, 0)
    this.tone(523, 0.08, 'triangle', 0.045, 0, 0.09)
    this.tone(659, 0.14, 'triangle', 0.048, 0, 0.18)
  }

  win(): void {
    const notes = [392, 523, 659, 784]
    for (let i = 0; i < notes.length; i++) {
      this.tone(notes[i]!, i === notes.length - 1 ? 0.28 : 0.09, 'triangle', 0.04, 0, i * 0.1)
    }
  }

  cut(): void {
    this.tone(220, 0.08, 'square', 0.04, 0, 0)
    this.tone(147, 0.1, 'triangle', 0.04, 0, 0.08)
    this.tone(55, 0.4, 'triangle', 0.035, 0, 0.16)
  }
}
