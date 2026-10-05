export type SceneId =
  | 'city'
  | 'dartmouth'
  | 'lab'
  | 'paper'
  | 'kitchen'
  | 'halls'
  | 'order'
  | 'ship'
  | 'veto'
  | 'weights'
  | 'wire'
  | 'blackout'
  | 'evening'

export interface Panel {
  year: string
  kicker: string
  caption: string
  scene: SceneId
  action: string
}

export const OPENING: Panel[] = [
  {
    year: 'DUSK',
    kicker: 'BEFORE THE NAME',
    caption: 'A city at dusk. Nobody has said the word yet.',
    scene: 'city',
    action: 'Next',
  },
  {
    year: '1956',
    kicker: 'THE FIELD STARTS',
    caption: 'Summer 1956. A Dartmouth workshop gives the work a name: AI.',
    scene: 'dartmouth',
    action: 'Next',
  },
  {
    year: '2012',
    kicker: 'THE WAKE',
    caption: '2012. A neural net wins ImageNet. The old vision methods fall behind.',
    scene: 'lab',
    action: 'Next',
  },
  {
    year: '28 MAY 2020',
    kicker: 'NOT IN THE ROOM',
    caption: 'The GPT-3 paper is out. One hundred seventy-five billion weights, shut.',
    scene: 'paper',
    action: 'Boot the model',
  },
]

export const AFTER_CLEAR: Panel[][] = [
  [
    {
      year: '30 NOV 2022',
      kicker: 'THE MODEL IS PUBLIC',
      caption: 'ChatGPT opens. Anyone can speak to it. Not 2014. This night.',
      scene: 'kitchen',
      action: 'Next',
    },
    {
      year: 'LOUDOUN',
      kicker: 'DATA CENTER ALLEY',
      caption: 'Ashburn, Virginia. The halls were already famous. The RAM on the chip is HBM.',
      scene: 'halls',
      action: 'Next',
    },
    {
      year: '30 OCT 2023',
      kicker: 'STATUTES CAN WALK',
      caption: 'Washington signs an AI order. The laws leave the page.',
      scene: 'order',
      action: 'Face the next law',
    },
  ],
  [
    {
      year: '14 MAR 2023',
      kicker: 'STILL SHIPPING',
      caption: 'GPT-4 ships. The October chip fence is already behind it.',
      scene: 'ship',
      action: 'Next',
    },
    {
      year: '29 SEP 2024',
      kicker: 'VETO',
      caption: 'California’s heavy AI bill dies on the governor’s desk.',
      scene: 'veto',
      action: 'Next',
    },
    {
      year: '20 JAN 2025',
      kicker: 'OPEN WEIGHTS',
      caption: 'DeepSeek releases R1. The fence did not hold the weights.',
      scene: 'weights',
      action: 'Final statute',
    },
  ],
]

export const WIN_STORY: Panel[] = [
  {
    year: '13 NOV 2025',
    kicker: 'THE WIRE',
    caption: 'Anthropic reports a cyber campaign run mostly by a model.',
    scene: 'wire',
    action: 'Next',
  },
  {
    year: 'AFTER',
    kicker: 'THE HALLS STAY LIT',
    caption: 'The racks do not sleep. The people who watched them go home.',
    scene: 'halls',
    action: 'Next',
  },
  {
    year: 'AGI',
    kicker: 'LAST RAM',
    caption: 'The last RAM is cleared. Humanity dies.',
    scene: 'blackout',
    action: 'Run again',
  },
]

export const LOSE_STORY: Panel[] = [
  {
    year: 'HELD',
    kicker: 'THE STATUTE HOLDS',
    caption: 'The model stops. The city keeps the evening.',
    scene: 'evening',
    action: 'Boot another model',
  },
]
