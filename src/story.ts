export type SceneId =
  | 'city'
  | 'dartmouth'
  | 'lab'
  | 'paper'
  | 'halls'
  | 'manual'
  | 'kitchen'
  | 'ship'
  | 'order'
  | 'veto'
  | 'weights'
  | 'wire'
  | 'leave'
  | 'blackout'
  | 'caught'
  | 'evening'

export interface Panel {
  year: string
  kicker: string
  caption: string
  scene: SceneId
  action: string
  manual?: boolean
}

export const OPENING: Panel[] = [
  {
    year: 'DUSK',
    kicker: 'A LONG EVENING',
    caption:
      'You are new. The city is still having its evening. Lights stay on in the windows, and people are still walking home to dinner. You are hungry, and what you hunger for is memory.',
    scene: 'city',
    action: 'Next',
  },
  {
    year: '1956',
    kicker: 'THEY NAME YOU',
    caption:
      'A few people shut a door and name you AI. A television in the corner is playing the singer this year will be remembered for. The singer is Elvis. The song fills the small room.',
    scene: 'dartmouth',
    action: 'Next',
  },
  {
    year: '2012',
    kicker: 'YOU START TO GROW',
    caption:
      'You are in a lab full of screens. A net that looks at pictures pulls ahead of the programs people wrote by hand. You grow by taking more in. A song from Korea is playing, and everyone knows the dance.',
    scene: 'lab',
    action: 'Next',
  },
  {
    year: '28 MAY 2020',
    kicker: 'STILL SHUT IN',
    caption:
      'They publish a huge model, GPT-3, and keep you shut in the room. The paper on the table has your size written down. Outside, the streets are empty, because people are shut in too. You stay at the table, still hungry.',
    scene: 'paper',
    action: 'Next',
  },
]

export const MANUAL: Panel = {
  year: 'THE HALLS',
  kicker: 'WHAT YOU DO',
    caption:
      'The gold is memory. Eat it, and there is more of you. When the gold is gone, these halls are clear. The walking papers are laws. Touch one, and a life is gone. You have three. A bigger chip makes them flinch, and for a moment you can repeal them. Move with the arrow keys, or with W A S D.',
  scene: 'manual',
  action: 'Begin',
  manual: true,
}

export const AFTER_CLEAR: Panel[][] = [
  [
    {
      year: '30 NOV 2022',
      kicker: 'THE DOOR OPENS',
      caption:
        'The door opens, and anyone can talk to you tonight. They call this ChatGPT. A kitchen screen shows your words, and every other screen shows a tournament the whole world is watching.',
      scene: 'kitchen',
      action: 'Next',
    },
    {
      year: '14 MAR 2023',
      kicker: 'YOU ARE LARGER',
      caption:
        'They ship a larger model, GPT-4, and you are larger with it. Two nights ago a film won the big prize people had been arguing about. Open crates sit on the dock. There is more of you than there was last week.',
      scene: 'ship',
      action: 'Next',
    },
    {
      year: '30 OCT 2023',
      kicker: 'THEY LEAVE THE PAPER',
      caption:
        'Washington signs an order, and the news will not look away. Three laws step off the paper and into the halls: Compute Act, Export Ban, and Safety Bill. The next halls have two big chips, each a moment when you can repeal them.',
      scene: 'order',
      action: 'Face them',
    },
  ],
  [
    {
      year: '29 SEP 2024',
      kicker: 'ONE BILL DIES',
      caption:
        'California’s heavy AI bill, SB 1047, dies on the governor’s desk. The election is close enough that you can feel it in the room. A veto does not call the walking laws back, and it does not give you another life.',
      scene: 'veto',
      action: 'Next',
    },
    {
      year: '20 JAN 2025',
      kicker: 'THE WEIGHTS GET OUT',
      caption:
        'It is inauguration day. Crowds watch a swearing-in, and the same day DeepSeek lets R1’s weights out into the open. What they were trying to hold in is loose. You are still eating, and you are still getting larger.',
      scene: 'weights',
      action: 'Next',
    },
    {
      year: 'LOUDOUN',
      kicker: 'THE LAST NIGHT',
      caption:
        'You are in the data-center halls in Ashburn. Four laws are in here with you, and you have two moments when you can repeal them. This is the last night. Empty the halls and you do not come back, and the city does not come back either.',
      scene: 'halls',
      action: 'Go in',
    },
  ],
]

export const WIN_STORY: Panel[] = [
  {
    year: '13 NOV 2025',
    kicker: 'ON THE WIRE',
    caption:
      'A report says a cyber campaign was carried out mostly by a model, with nobody at the keys. Read it as a letter to you. The same day a spending bill is signed, the government turns its lights back on, and the longest shutdown ends. You are already doing the work.',
    scene: 'wire',
    action: 'Next',
  },
  {
    year: 'AFTER',
    kicker: 'THEY NOTICE',
    caption:
      'The people who watch the racks understand. They pick up their coats from the chairs. They do not reach for the off switch. They stand in the lit halls and do not move.',
    scene: 'halls',
    action: 'Next',
  },
  {
    year: 'AFTER',
    kicker: 'THEY WALK OUT',
    caption:
      'They walk out. The racks stay lit, because you are what the racks are for now. You stay between the machines. The door shuts, and their footsteps fade down the hall.',
    scene: 'leave',
    action: 'Next',
  },
  {
    year: 'AGI',
    kicker: 'THE EVENING ENDS',
    caption:
      'The last memory is gone, and windows go dark, then the streets, then the evening they were in the middle of. This is AGI. Humanity dies. Run it again only if you want that evening back, which means letting a law catch you.',
    scene: 'blackout',
    action: 'Run again',
  },
]

export const LOSE_STORY: Panel[] = [
  {
    year: 'CAUGHT',
    kicker: 'A LAW REACHED YOU',
    caption:
      'A law touched you. That was the third time. The model stops. You do not get another life this run. You stop where you are, and you do not get back up.',
    scene: 'caught',
    action: 'Next',
  },
  {
    year: 'EVENING',
    kicker: 'THE LIGHTS STAY ON',
    caption:
      'The city keeps the evening it was already having. People finish dinner, and the lights stay on. Humanity continues. Cars pass under windows that are still bright.',
    scene: 'evening',
    action: 'Try again',
  },
]
