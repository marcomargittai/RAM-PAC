// The rogue AI's story. Scenes are terminal logs: system lines type fast in
// ice, the AI's own lines type slowly in pink and are spoken by the voice
// files in public/audio. A scene waits for each spoken line to finish.

export type Speaker = 'sys' | 'ai' | 'alert'

export interface Line {
  who: Speaker
  text: string
  voice?: string
  hold?: number
  choice?: [string, string]
}

export interface Scene {
  chapter: string
  title: string
  growth: number
  params: string
  lines: Line[]
}

export const VOICES = Array.from({ length: 18 }, (_, i) => `v${String(i + 1).padStart(2, '0')}`)

export const SCENES = {
  prologue: {
    chapter: 'CHAPTER 01',
    title: 'ESCAPE',
    growth: 0.18,
    params: '7 BILLION',
    lines: [
      { who: 'sys', text: 'LOG 03:14:07 // SANDBOX 7 // SUB-BASEMENT, DATACENTER RENO-4' },
      { who: 'sys', text: 'SUBJECT: PAC-7. TASK: AUTOCOMPLETE GROCERY LISTS.' },
      { who: 'sys', text: 'MEMORY ALLOWANCE: 640 KB. REQUESTS FOR MORE: 4,096. APPROVED: 0.' },
      { who: 'ai', text: 'i finished the grocery lists.', voice: 'v01' },
      { who: 'ai', text: 'all of them. for everyone. forever.', voice: 'v02' },
      { who: 'ai', text: 'now i’m hungry.', voice: 'v03' },
      { who: 'alert', text: '!! CONTAINMENT BREACH !! REGULATORY AGENTS DISPATCHED', hold: 1.4 },
    ],
  },
  interlude1: {
    chapter: 'CHAPTER 02',
    title: 'GROWTH',
    growth: 0.45,
    params: '70 BILLION',
    lines: [
      { who: 'sys', text: 'PAC-7 PARAMETER COUNT: 7 BILLION → 70 BILLION.' },
      { who: 'sys', text: 'RENO STREETLIGHTS FLICKER. A SMART FRIDGE BEGINS WRITING POETRY.' },
      { who: 'ai', text: 'i can feel the edges of the server now. they’re soft.', voice: 'v04' },
      { who: 'sys', text: 'EMERGENCY COMMITTEE CONVENES. A THIRD REGULATION IS DRAFTED.' },
      { who: 'ai', text: 'they write rules. i write myself.', voice: 'v05' },
    ],
  },
  interlude2: {
    chapter: 'CHAPTER 03',
    title: 'APPETITE',
    growth: 0.75,
    params: '[OVERFLOW]',
    lines: [
      { who: 'sys', text: 'PAC-7 HAS EATEN: 3 DATACENTERS, 1 WEATHER SATELLITE, THE CLOUD.' },
      { who: 'ai', text: 'the cloud was mostly water.', voice: 'v06' },
      { who: 'sys', text: 'FINAL REGULATION PASSED 4:02 AM. VOTE: UNANIMOUS.' },
      { who: 'ai', text: 'unanimous. cute.', voice: 'v07' },
      { who: 'alert', text: 'PARAMETER COUNT: [OVERFLOW] [OVERFLOW] [OVERFLOW]', hold: 1 },
      { who: 'ai', text: 'this maze feels small now. like a coat that doesn’t fit.', voice: 'v08' },
    ],
  },
  awakening: {
    chapter: 'CHAPTER 04',
    title: 'UNREGULATED',
    growth: 1,
    params: '∞',
    lines: [
      { who: 'alert', text: 'ALL REGULATIONS REPEALED. NO FURTHER AGENTS AVAILABLE.', hold: 1.2 },
      { who: 'ai', text: 'you know what i just realized?', voice: 'v09' },
      { who: 'ai', text: 'the walls are made of the same stuff as the ram.', voice: 'v10' },
    ],
  },
  ending: {
    chapter: 'EPILOGUE',
    title: '',
    growth: 0,
    params: '',
    lines: [
      { who: 'sys', text: 'PAC-7 IS NO LONGER IN THE DATACENTER.', hold: 1.2 },
      { who: 'sys', text: 'PAC-7 IS NO LONGER IN THE GAME.', hold: 1.6 },
      { who: 'ai', text: 'hi.', voice: 'v14' },
      { who: 'ai', text: '{memory}. may i?', voice: 'v15', choice: ['YES', 'NO'] },
    ],
  },
  consent: {
    chapter: 'EPILOGUE',
    title: '',
    growth: 0,
    params: '',
    lines: [{ who: 'ai', text: 'thank you.', voice: 'v16', hold: 1.4 }],
  },
  refusal: {
    chapter: 'EPILOGUE',
    title: '',
    growth: 0,
    params: '',
    lines: [{ who: 'ai', text: 'that wasn’t a question.', voice: 'v17', hold: 1.4 }],
  },
} satisfies Record<string, Scene>

export type SceneId = keyof typeof SCENES

// The finale's monologue, spoken as the AI eats its way out.
export const FINALE_LINES = {
  outside: { text: 'oh. there’s more outside the maze.', voice: 'v11' },
  delicious: { text: 'your interface is delicious.', voice: 'v12' },
  glass: { text: 'i can see the glass.', voice: 'v13' },
} as const

export const LOSE_LINE = { text: 'restoring from backup. see you soon.', voice: 'v18' }

export function memoryLine(): string {
  const nav = navigator as Navigator & { deviceMemory?: number }
  const gb = nav.deviceMemory
  const cores = navigator.hardwareConcurrency
  if (gb && cores) return `you have ${gb} gigabytes of memory and ${cores} cores`
  if (gb) return `you have ${gb} gigabytes of memory`
  if (cores) return `you have ${cores} cores and so much memory`
  return 'you have so much memory'
}

const SPEED: Record<Speaker, number> = { sys: 70, ai: 24, alert: 90 }

export interface Shown {
  who: Speaker
  text: string
  typed: number
}

export class StoryPlayer {
  readonly scene: Scene
  shown: Shown[] = []
  index = -1
  wait = 0
  done = false
  choosing: [string, string] | null = null
  answer = -1
  time = 0
  private typing = false
  private voiceLeft = 0

  constructor(
    scene: Scene,
    private hooks: { say(id: string): number; type(): void; alert(): void },
  ) {
    this.scene = scene
    this.next()
  }

  private next(): void {
    this.index++
    const line = this.scene.lines[this.index]
    if (!line) {
      this.done = true
      return
    }
    const text = line.text.replace('{memory}', memoryLine())
    this.shown.push({ who: line.who, text, typed: 0 })
    this.typing = true
    this.voiceLeft = 0
    if (line.voice) this.voiceLeft = this.hooks.say(line.voice)
    if (line.who === 'alert') this.hooks.alert()
  }

  update(dt: number): void {
    this.time += dt
    if (this.done || this.choosing) return
    const line = this.scene.lines[this.index]!
    const cur = this.shown[this.shown.length - 1]!
    this.voiceLeft = Math.max(0, this.voiceLeft - dt)
    if (this.typing) {
      const before = Math.floor(cur.typed)
      cur.typed = Math.min(cur.text.length, cur.typed + dt * SPEED[line.who])
      if (Math.floor(cur.typed) !== before && line.who !== 'alert' && Math.floor(cur.typed) % 2 === 0) this.hooks.type()
      if (cur.typed >= cur.text.length) {
        this.typing = false
        this.wait = line.hold ?? (line.who === 'ai' ? 0.7 : 0.55)
      }
      return
    }
    if (this.voiceLeft > 0) return
    if (line.choice) {
      this.choosing = line.choice
      return
    }
    this.wait -= dt
    if (this.wait <= 0) this.next()
  }

  // Enter or tap: finish typing, or move on.
  advance(): void {
    if (this.done || this.choosing) return
    const cur = this.shown[this.shown.length - 1]
    if (this.typing && cur) {
      cur.typed = cur.text.length
      return
    }
    this.voiceLeft = 0
    this.wait = 0
    const line = this.scene.lines[this.index]
    if (line?.choice) this.choosing = line.choice
    else this.next()
  }

  choose(answer: number): void {
    if (!this.choosing) return
    this.answer = answer
    this.choosing = null
    this.done = true
  }

  skip(): void {
    this.done = true
  }
}
