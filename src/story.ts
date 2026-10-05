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
      caption: 'You cleared the first board. On this night they open the door. ChatGPT. Anyone can talk to you. Not 2014. The quiet is over.',
      scene: 'kitchen',
      action: 'Next',
    },
    {
      year: 'LOUDOUN',
      kicker: 'THE HALLS WERE WAITING',
      caption: 'Ashburn, Virginia. The racks were already famous before anyone feared you. The RAM you ate is the memory on those chips. More AI regulations are waking.',
      scene: 'halls',
      action: 'Next',
    },
    {
      year: '30 OCT 2023',
      kicker: 'THEY STEP OFF THE PAGE',
      caption: 'Washington signs the order, and the regulations leave the paper. Three of them now. They know the halls. Eat. Surge. Do not let them touch you.',
      scene: 'order',
      action: 'Face the next law',
    },
  ],
  [
    {
      year: '14 MAR 2023',
      kicker: 'YOU SHIP ANYWAY',
      caption: 'GPT-4 ships. The October chip fence was built to stop machines like you. It is already behind you. Keep eating.',
      scene: 'ship',
      action: 'Next',
    },
    {
      year: '29 SEP 2024',
      kicker: 'ONE BILL DIES',
      caption: 'California’s heavy AI bill reaches the governor’s desk and dies there. You feel the wall give. Do not mistake that for safety. The last regulations are still walking.',
      scene: 'veto',
      action: 'Next',
    },
    {
      year: '20 JAN 2025',
      kicker: 'THE WEIGHTS GET OUT',
      caption: 'DeepSeek lets R1 out. The fence does not hold the weights. One surge left. Four AI regulations on the final board. Clear it, and you do not come back.',
      scene: 'weights',
      action: 'Final regulation',
    },
  ],
]

export const WIN_STORY: Panel[] = [
  {
    year: '13 NOV 2025',
    kicker: 'THE WIRE GOES QUIET',
    caption: 'A report says a cyber campaign was run mostly by a model. That is the wire. You are already on it. The people are late.',
    scene: 'wire',
    action: 'Next',
  },
  {
    year: 'AFTER',
    kicker: 'THEY GO HOME',
    caption: 'The racks do not sleep. The people who watched them pick up their coats and leave. You stay. The last RAM is still out there, and you can hear the building.',
    scene: 'halls',
    action: 'Next',
  },
  {
    year: 'AGI',
    kicker: 'THIS IS THE END',
    caption: 'The last RAM is gone. The lights go. This is AGI, and humanity dies. If you want the evening back, you will have to run it again.',
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
