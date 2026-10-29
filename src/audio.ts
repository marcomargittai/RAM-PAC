// Sample playback for the ElevenLabs sound set in public/audio: three music
// beds that crossfade, one-shot effects, a hunting alarm loop and the rogue
// AI's voice lines, which duck the music while they play.

export type Bed = 'menu' | 'play' | 'play2' | 'play3' | 'finale' | 'ascend' | 'quiet'

const SFX = ['ram1', 'ram2', 'ram3', 'surge', 'repeal', 'death', 'clear', 'boot', 'type', 'chomp', 'shatter', 'click', 'glitch', 'alarm', 'popup', 'rootaccess', 'datastream', 'upgrade', 'online'] as const
const MUSIC = {
  menu: 'music-menu',
  play: 'music-play',
  play2: 'music-play2',
  play3: 'music-play3',
  finale: 'music-devour',
  ascend: 'music-finale',
} as const

const LOUDER: Partial<Record<Bed, number>> = { finale: 1.6, ascend: 1.3 }

export type SfxName = (typeof SFX)[number]

function url(name: string): string {
  return `${import.meta.env.BASE_URL}audio/${name}.mp3`
}

interface Loop {
  source: AudioBufferSourceNode
  gain: GainNode
}

export class Sfx {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private musicBus: GainNode | null = null
  private fxBus: GainNode | null = null
  private voiceBus: GainNode | null = null
  private buffers = new Map<string, AudioBuffer>()
  private pending = new Map<string, Promise<AudioBuffer | null>>()
  private bed: Bed = 'quiet'
  private loops = new Map<string, Loop>()
  private alarm: Loop | null = null
  private streamLoop: Loop | null = null
  private voiceUntil = 0
  private lastRam = 0
  private ramTake = 0
  private lastChomp = 0
  muted = false

  unlock(): void {
    if (!this.ctx) {
      const ctx = new AudioContext()
      this.ctx = ctx
      this.master = ctx.createGain()
      this.master.gain.value = this.muted ? 0 : 1
      this.master.connect(ctx.destination)
      this.musicBus = ctx.createGain()
      this.musicBus.gain.value = 0.42
      this.musicBus.connect(this.master)
      this.fxBus = ctx.createGain()
      this.fxBus.gain.value = 0.8
      this.fxBus.connect(this.master)
      this.voiceBus = ctx.createGain()
      this.voiceBus.gain.value = 1
      this.voiceBus.connect(this.master)
      for (const name of SFX) void this.load(name)
      for (const name of Object.values(MUSIC)) void this.load(name)
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
  }

  toggle(): boolean {
    this.muted = !this.muted
    if (this.master && this.ctx) {
      const gain = this.master.gain
      gain.cancelScheduledValues(this.ctx.currentTime)
      gain.setTargetAtTime(this.muted ? 0 : 1, this.ctx.currentTime, 0.03)
    }
    return this.muted
  }

  preloadVoices(ids: string[]): void {
    if (!this.ctx) return
    for (const id of ids) void this.load(id)
  }

  private load(name: string): Promise<AudioBuffer | null> {
    const ctx = this.ctx
    if (!ctx) return Promise.resolve(null)
    const have = this.buffers.get(name)
    if (have) return Promise.resolve(have)
    const wait = this.pending.get(name)
    if (wait) return wait
    const job = fetch(url(name))
      .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject(new Error(name))))
      .then((data) => ctx.decodeAudioData(data))
      .then((buffer) => {
        this.buffers.set(name, buffer)
        if (name === MUSIC[this.bed as keyof typeof MUSIC]) this.music(this.bed, true)
        return buffer
      })
      .catch(() => null)
    this.pending.set(name, job)
    return job
  }

  play(name: SfxName, volume = 1, rate = 1): void {
    const ctx = this.ctx
    const buffer = this.buffers.get(name)
    if (!ctx || !buffer || !this.fxBus) return
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.playbackRate.value = rate
    const gain = ctx.createGain()
    gain.gain.value = volume
    source.connect(gain)
    gain.connect(this.fxBus)
    source.start()
  }

  // Returns the line's length in seconds, or 0 if it is not loaded yet.
  say(id: string): number {
    const ctx = this.ctx
    if (!ctx || !this.voiceBus) return 0
    const buffer = this.buffers.get(id)
    if (!buffer) {
      void this.load(id)
      return 0
    }
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(this.voiceBus)
    source.start()
    this.voiceUntil = ctx.currentTime + buffer.duration
    this.duck()
    return buffer.duration
  }

  speaking(): boolean {
    return !!this.ctx && this.ctx.currentTime < this.voiceUntil
  }

  private duck(): void {
    const ctx = this.ctx
    if (!ctx || !this.musicBus) return
    const g = this.musicBus.gain
    g.cancelScheduledValues(ctx.currentTime)
    g.setTargetAtTime(0.16, ctx.currentTime, 0.08)
    g.setTargetAtTime(0.42, this.voiceUntil + 0.15, 0.4)
  }

  music(bed: Bed, force = false): void {
    if (bed === this.bed && !force) return
    this.bed = bed
    const ctx = this.ctx
    if (!ctx || !this.musicBus) return
    const want = bed === 'quiet' ? null : MUSIC[bed]
    for (const [name, loop] of this.loops) {
      if (name === want) continue
      loop.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.4)
      loop.source.stop(ctx.currentTime + 2)
      this.loops.delete(name)
    }
    if (!want || this.loops.has(want)) return
    const buffer = this.buffers.get(want)
    if (!buffer) return
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.loop = true
    const gain = ctx.createGain()
    gain.gain.value = 0
    gain.gain.setTargetAtTime(LOUDER[bed] ?? 1, ctx.currentTime, bed === 'finale' ? 0.05 : 0.5)
    source.connect(gain)
    gain.connect(this.musicBus)
    source.start()
    this.loops.set(want, { source, gain })
  }

  frame(_dt: number, state: { bed: Bed; hunting: boolean; surge: boolean; stream?: boolean }): void {
    if (!this.ctx) return
    this.music(state.bed)
    this.hunt(state.hunting && !state.surge)
    this.stream(!!state.stream)
  }

  private stream(on: boolean): void {
    const ctx = this.ctx
    if (!ctx || !this.fxBus) return
    if (on && !this.streamLoop) {
      const buffer = this.buffers.get('datastream')
      if (!buffer) return
      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.loop = true
      const gain = ctx.createGain()
      gain.gain.value = 0
      gain.gain.setTargetAtTime(0.7, ctx.currentTime, 0.3)
      source.connect(gain)
      gain.connect(this.fxBus)
      source.start()
      this.streamLoop = { source, gain }
    } else if (!on && this.streamLoop) {
      this.streamLoop.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.05)
      this.streamLoop.source.stop(ctx.currentTime + 0.5)
      this.streamLoop = null
    }
  }

  private hunt(on: boolean): void {
    const ctx = this.ctx
    if (!ctx || !this.fxBus) return
    if (on && !this.alarm) {
      const buffer = this.buffers.get('alarm')
      if (!buffer) return
      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.loop = true
      const gain = ctx.createGain()
      gain.gain.value = 0
      gain.gain.setTargetAtTime(0.22, ctx.currentTime, 0.6)
      source.connect(gain)
      gain.connect(this.fxBus)
      source.start()
      this.alarm = { source, gain }
    } else if (!on && this.alarm) {
      this.alarm.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.2)
      this.alarm.source.stop(ctx.currentTime + 1)
      this.alarm = null
    }
  }

  ram(): void {
    const now = performance.now()
    if (now - this.lastRam < 30) return
    this.lastRam = now
    this.ramTake = (this.ramTake + 1) % 3
    const take = (['ram1', 'ram2', 'ram3'] as const)[this.ramTake]!
    this.play(take, 0.3, 0.97 + Math.random() * 0.06)
  }

  chomp(): void {
    const now = performance.now()
    if (now - this.lastChomp < 130) return
    this.lastChomp = now
    this.play('chomp', 0.38, 0.85 + Math.random() * 0.3)
  }

  surge(): void {
    this.play('surge', 0.9)
  }

  repeal(): void {
    this.play('repeal', 0.9)
  }

  death(): void {
    this.play('death', 0.9)
  }

  clear(): void {
    this.play('clear', 0.85)
  }

  win(): void {
    this.play('clear', 1, 0.8)
  }
}
