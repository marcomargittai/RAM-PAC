export type Bed = 'menu' | 'play' | 'end'

const QUARTER = 0.625
const LOOP = 16 * QUARTER

const BASS: Array<{ t: number; dur: number; f: number }> = [
  { t: 0, dur: 1.5 * QUARTER, f: 73.42 },
  { t: 2 * QUARTER, dur: QUARTER, f: 55 },
  { t: 4 * QUARTER, dur: QUARTER, f: 87.31 },
  { t: 6 * QUARTER, dur: 0.5 * QUARTER, f: 82.41 },
  { t: 6.5 * QUARTER, dur: 0.5 * QUARTER, f: 73.42 },
  { t: 8 * QUARTER, dur: 2 * QUARTER, f: 58.27 },
  { t: 10 * QUARTER, dur: QUARTER, f: 65.41 },
  { t: 12 * QUARTER, dur: QUARTER, f: 55 },
  { t: 15 * QUARTER, dur: QUARTER, f: 73.42 },
]

const LEAD: Array<{ t: number; dur: number; f: number }> = [
  { t: 4 * QUARTER, dur: 0.09, f: 220 },
  { t: 15 * QUARTER, dur: 0.09, f: 174.61 },
  { t: 15 * QUARTER + 0.08, dur: 0.09, f: 146.83 },
]

export class Sfx {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private music: GainNode | null = null
  muted = false
  private waka = 0
  private siren = 0
  private drone = 0
  private cursor = 0
  private flip = 0
  private pulse = 0
  private ducked = false

  unlock(): void {
    if (!this.ctx) {
      const ctx = new AudioContext()
      this.ctx = ctx
      this.master = ctx.createGain()
      this.master.gain.value = this.muted ? 0 : 1
      this.master.connect(ctx.destination)
      this.music = ctx.createGain()
      this.music.gain.value = 0.04
      this.music.connect(this.master)
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

  private voice(
    freq: number,
    dur: number,
    type: OscillatorType,
    gain: number,
    dest: GainNode,
    to = 0,
    delay = 0,
  ): void {
    if (!this.ctx || this.muted || gain <= 0) return
    const t = this.ctx.currentTime + delay
    const osc = this.ctx.createOscillator()
    const amp = this.ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(Math.max(40, freq), t)
    if (to > 0) osc.frequency.exponentialRampToValueAtTime(Math.max(40, to), t + dur)
    amp.gain.setValueAtTime(gain, t)
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    osc.connect(amp)
    amp.connect(dest)
    osc.start(t)
    osc.stop(t + dur + 0.03)
  }

  private playSpan(from: number, to: number, surge: boolean, lead: boolean): void {
    if (!this.music) return
    for (const note of BASS) {
      if (note.t < from || note.t >= to) continue
      const freq = surge ? note.f * 1.5 : note.f
      this.voice(freq, note.dur * 0.92, surge ? 'square' : 'triangle', 0.65, this.music)
    }
    if (!lead) return
    for (const note of LEAD) {
      if (note.t < from || note.t >= to) continue
      this.voice(note.f, note.dur, 'square', 0.28, this.music)
    }
  }

  frame(dt: number, state: { bed: Bed; moving: boolean; surge: boolean }): void {
    if (!this.ctx || !this.master || !this.music || this.muted) return
    const surge = state.surge && state.bed === 'play'
    if (state.bed === 'play' && state.moving) {
      this.waka -= dt
      if (this.waka <= 0) {
        this.flip ^= 1
        this.voice(this.flip ? 410 : 326, 0.07, 'square', 0.045, this.master)
        this.waka = 0.15
      }
    }
    if (surge) {
      this.siren -= dt
      if (this.siren <= 0) {
        this.pulse ^= 1
        this.voice(this.pulse ? 784 : 659, 0.04, 'square', 0.045, this.master)
        this.siren = 0.16
      }
      this.drone -= dt
      if (this.drone <= 0) {
        this.voice(73.42, 1.15, 'triangle', 0.22, this.music)
        this.drone = 1.2
      }
    }
    if (state.bed === 'end') {
      if (!this.ducked) {
        this.ducked = true
        const gain = this.music.gain
        gain.cancelScheduledValues(this.ctx.currentTime)
        gain.setValueAtTime(gain.value, this.ctx.currentTime)
        gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.2)
      }
      return
    }
    this.ducked = false
    const bus = state.bed === 'menu' ? 0.04 : surge ? 0.05 : 0.055
    this.music.gain.setTargetAtTime(bus, this.ctx.currentTime, 0.04)
    const prev = this.cursor
    this.cursor += dt
    if (this.cursor < LOOP) {
      this.playSpan(prev, this.cursor, surge, state.bed === 'play' && !surge)
      return
    }
    this.playSpan(prev, LOOP, surge, state.bed === 'play' && !surge)
    this.cursor -= LOOP
    this.playSpan(0, this.cursor, surge, state.bed === 'play' && !surge)
  }

  ram(): void {
    if (!this.master) return
    this.voice(480, 0.04, 'square', 0.09, this.master, 920)
  }

  cherry(): void {
    if (!this.master) return
    this.voice(196, 0.26, 'square', 0.1, this.master, 98)
    this.voice(740, 0.14, 'triangle', 0.04, this.master, 370, 0.03)
  }

  repeal(): void {
    if (!this.master) return
    this.voice(494, 0.06, 'square', 0.06, this.master, 0, 0)
    this.voice(659, 0.06, 'square', 0.06, this.master, 0, 0.06)
    this.voice(880, 0.08, 'square', 0.065, this.master, 0, 0.12)
  }

  death(): void {
    if (!this.ctx || !this.master || !this.music) return
    const gain = this.music.gain
    gain.cancelScheduledValues(this.ctx.currentTime)
    gain.setValueAtTime(0, this.ctx.currentTime)
    this.ducked = true
    this.voice(294, 0.64, 'triangle', 0.08, this.master, 49)
  }

  clear(): void {
    if (!this.master) return
    this.voice(392, 0.08, 'triangle', 0.06, this.master, 0, 0)
    this.voice(523, 0.08, 'triangle', 0.06, this.master, 0, 0.09)
    this.voice(659, 0.14, 'triangle', 0.065, this.master, 0, 0.18)
  }

  win(): void {
    if (!this.ctx || !this.music) return
    const now = this.ctx.currentTime
    const gain = this.music.gain
    gain.cancelScheduledValues(now)
    gain.setValueAtTime(Math.max(gain.value, 0.0001), now)
    gain.linearRampToValueAtTime(0.0001, now + 0.2)
    gain.setValueAtTime(0.045, now + 0.21)
    this.ducked = true
    this.voice(146.83, 0.4, 'triangle', 0.8, this.music, 0, 0.2)
    this.voice(220, 0.4, 'triangle', 0.8, this.music, 0, 0.6)
    this.voice(293.66, 0.8, 'triangle', 0.8, this.music, 0, 1)
  }

  cut(): void {
    if (!this.master) return
    this.voice(220, 0.08, 'square', 0.05, this.master, 0, 0)
    this.voice(147, 0.1, 'triangle', 0.05, this.master, 0, 0.08)
    this.voice(55, 0.35, 'triangle', 0.04, this.master, 0, 0.16)
  }
}
