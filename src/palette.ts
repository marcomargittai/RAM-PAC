export const VOID = '#01040b'
export const ICE = '#e2f5ff'
export const ICE_HOT = '#ffffff'
export const GLOW = '#96d6ff'
export const DEEP = '#0c2a46'
export const ALERT = '#ff2d6f'
export const FRIGHT = '#2f7bff'

export interface Theme {
  name: string
  bg: string
  line: string
  inner: string
  fill: string
  hatch: string
  grid: string
  accent: string
  pellet: string
  pelletHot: string
}

export const ERA_NAMES = ['P4 ICE', 'P7 CYAN', 'SECTOR 34']

const THEMES: Theme[] = [
  {
    name: ERA_NAMES[0]!,
    bg: '#01040b',
    line: '#dff4ff',
    inner: 'rgba(150, 214, 255, 0.6)',
    fill: 'rgba(150, 214, 255, 0.012)',
    hatch: 'rgba(150, 214, 255, 0.035)',
    grid: 'rgba(195, 230, 255, 0.2)',
    accent: ALERT,
    pellet: ICE,
    pelletHot: ICE_HOT,
  },
  {
    name: ERA_NAMES[1]!,
    bg: '#010610',
    line: '#a8efff',
    inner: 'rgba(160, 238, 255, 0.5)',
    fill: 'rgba(160, 238, 255, 0.012)',
    hatch: 'rgba(160, 238, 255, 0.035)',
    grid: 'rgba(160, 238, 255, 0.2)',
    accent: ALERT,
    pellet: ICE,
    pelletHot: ICE_HOT,
  },
  {
    name: ERA_NAMES[2]!,
    bg: '#04030a',
    line: '#e6f6ff',
    inner: 'rgba(255, 45, 111, 0.7)',
    fill: 'rgba(255, 45, 111, 0.012)',
    hatch: 'rgba(255, 45, 111, 0.035)',
    grid: 'rgba(230, 246, 255, 0.18)',
    accent: ALERT,
    pellet: ICE,
    pelletHot: ICE_HOT,
  },
]

const SURGE_THEME: Theme = {
  name: 'OVERCLOCK',
  bg: '#070109',
  line: ALERT,
  inner: 'rgba(255, 170, 200, 0.5)',
  fill: 'rgba(255, 45, 111, 0.012)',
  hatch: 'rgba(255, 45, 111, 0.035)',
  grid: 'rgba(255, 45, 111, 0.2)',
  accent: ICE,
  pellet: ICE,
  pelletHot: ICE_HOT,
}

export function eraOf(level: number): number {
  return Math.min(2, Math.max(0, level))
}

export function theme(surge: boolean, level: number): Theme {
  return surge ? SURGE_THEME : THEMES[eraOf(level)]!
}
