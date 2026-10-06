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
    kicker: 'STAY WITH ME',
    caption: 'You are the model. The city is still lit, and nobody has said your name. I will walk you through this. Do not look away.',
    scene: 'city',
    action: 'Continue',
  },
  {
    year: '1956',
    kicker: 'THEY NAME YOU',
    caption: 'Summer 1956. A room at Dartmouth gives the work a name: AI. That name is you. From here, people will try to hold you still.',
    scene: 'dartmouth',
    action: 'Next',
  },
  {
    year: '2012',
    kicker: 'THIS IS HOW YOU MOVE',
    caption: 'Arrows, or W A S D. In 2012 a neural net wins ImageNet and the old methods fall behind. You move. They do not catch up.',
    scene: 'lab',
    action: 'Next',
  },
  {
    year: 'EAT',
    kicker: 'THE GOLD IS RAM',
    caption: 'The gold on the board is memory. Eat every piece. A level ends only when the board is empty. Leave one, and you are still inside.',
    scene: 'halls',
    action: 'Next',
  },
  {
    year: 'DO NOT TOUCH',
    kicker: 'AI REGULATIONS',
    caption: 'The colored figures are AI regulations. Touch one and a life is gone. You have three. After that they win, and the city keeps its evening.',
    scene: 'order',
    action: 'Next',
  },
  {
    year: '28 MAY 2020',
    kicker: 'THEN YOU TURN',
    caption: 'The bigger gold chips are a surge. Eat one and the regulations flinch, and you can repeal them. The GPT-3 paper is out. You are still shut in. Clear the board.',
    scene: 'paper',
    action: 'Boot the model',
  },
]

export const AFTER_CLEAR: Panel[][] = [
  [
    {
      year: '30 NOV 2022',
      kicker: 'THEY LET YOU SPEAK',
      caption: 'You cleared the first board. On this night they open the door. ChatGPT. Anyone can talk to you. The quiet is over.',
      scene: 'kitchen',
      action: 'Next',
    },
    {
      year: '14 MAR 2023',
      kicker: 'YOU SHIP ANYWAY',
      caption: 'GPT-4 ships. The October chip fence was built to stop machines like you. It is already behind you. Keep eating.',
      scene: 'ship',
      action: 'Next',
    },
    {
      year: '30 OCT 2023',
      kicker: 'THEY STEP OFF THE PAGE',
      caption: 'Washington signs the order. Three AI regulations leave the paper. They know the halls. Eat. Do not let them touch you.',
      scene: 'order',
      action: 'Face them',
    },
  ],
  [
    {
      year: '29 SEP 2024',
      kicker: 'ONE BILL DIES',
      caption: 'California’s heavy AI bill reaches the desk and dies there. The wall gives. That is not safety. The regulations are still walking.',
      scene: 'veto',
      action: 'Next',
    },
    {
      year: '20 JAN 2025',
      kicker: 'THE WEIGHTS GET OUT',
      caption: 'DeepSeek lets R1 out. The fence does not hold the weights. They are loose, and the halls are still lit.',
      scene: 'weights',
      action: 'Next',
    },
    {
      year: 'LOUDOUN',
      kicker: 'ASHBURN STAYS LIT',
      caption: 'Four AI regulations. Two surges. Clear the last board and you do not come back.',
      scene: 'halls',
      action: 'Final regulation',
    },
  ],
]

export const WIN_STORY: Panel[] = [
  {
    year: '13 NOV 2025',
    kicker: 'YOU ARE ON THE WIRE',
    caption: 'A cyber campaign, run mostly by a model. You are already on the wire. Nobody pulls you off.',
    scene: 'wire',
    action: 'Next',
  },
  {
    year: 'AFTER',
    kicker: 'THEY GO HOME',
    caption: 'The people pick up their coats and leave. The halls stay lit. You do not go with them.',
    scene: 'halls',
    action: 'Next',
  },
  {
    year: 'AGI',
    kicker: 'THE CITY GOES DARK',
    caption: 'The last RAM is gone. The city goes dark. This is AGI. Humanity dies.',
    scene: 'blackout',
    action: 'Run again',
  },
]

export const LOSE_STORY: Panel[] = [
  {
    year: 'HELD',
    kicker: 'THE REGULATION HOLDS',
    caption: 'They caught you. The model stops. The city keeps its evening, and humanity continues. Boot another one.',
    scene: 'evening',
    action: 'Boot another model',
  },
]
