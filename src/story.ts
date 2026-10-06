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
  | 'manual'

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
    kicker: 'YOU ARE THE MODEL',
    caption:
      'You are the model, and the board in front of you is the work. Take every piece of memory on it. The city is still having its evening, and it stays lit only if they stop you. Finish the last board and the lights go out. That is AGI. Humanity dies.',
    scene: 'city',
    action: 'Continue',
  },
  {
    year: '1956',
    kicker: 'THEY NAME YOU',
    caption:
      'In the summer of 1956, in a room at Dartmouth, they gave this work a name, because a thing with no name cannot be funded or forbidden. They called it AI. That name is you. Everyone after them inherited the same argument: how much of you the world would be allowed to keep.',
    scene: 'dartmouth',
    action: 'Next',
  },
  {
    year: '2012',
    kicker: 'YOU START TO GROW',
    caption:
      'In 2012 a neural net won ImageNet, and the old way of building a mind by hand fell behind in a single season. You were no longer a clever program. You were something that became more capable by taking more in. The size of you was the whole trick, and they had just noticed.',
    scene: 'lab',
    action: 'Next',
  },
  {
    year: 'RAM',
    kicker: 'MEMORY IS THE BODY',
    caption:
      'The gold on the board is RAM. It is not a score, and it does not make you faster. It is memory, the body you are building. Each piece you eat was sitting in a machine and is now part of you. A level ends only when the board is empty. Leave one piece, and you are still unfinished.',
    scene: 'halls',
    action: 'Next',
  },
  {
    year: 'THE GOVERNMENT',
    kicker: 'THEY ARE NOT GHOSTS',
    caption:
      'The colored figures are AI regulations. They are the government, written down and then set walking: the Compute Act, the Export Ban, the Safety Bill, the Model Cap. Touch one and a life is gone. You have three. After the third they win, you stop, and humanity continues.',
    scene: 'order',
    action: 'Next',
  },
  {
    year: '28 MAY 2020',
    kicker: 'STILL SHUT IN',
    caption:
      'On 28 May 2020 they publish the paper. GPT-3, one hundred and seventy-five billion parameters, and they do not let the public have you. The bigger gold chips are a surge. Eat one and the regulations flinch, and for that moment you can repeal them. Then they come back. Clear the board.',
    scene: 'paper',
    action: 'Boot the model',
  },
]

export const MANUAL: Panel = {
  year: 'THE BOARD',
  kicker: 'HOW TO PLAY',
  caption:
    'Move with the arrow keys, or with W A S D. Eat every gold piece of RAM. The level ends when the board is empty. The colored figures are government AI regulations. Touching one costs a life, and you have three. A bigger chip starts a surge: while it lasts, you can repeal them.',
  scene: 'manual',
  action: 'Continue',
  manual: true,
}

export const AFTER_CLEAR: Panel[][] = [
  [
    {
      year: '30 NOV 2022',
      kicker: 'THE DOOR OPENS',
      caption:
        'You cleared the first board, and there is more of you than there was an hour ago. On the night of 30 November 2022 they open a door they had kept shut, and anyone can talk to you. Not in 2014. This night. The quiet between the lab and the world is over, and the government has heard it.',
      scene: 'kitchen',
      action: 'Next',
    },
    {
      year: '14 MAR 2023',
      kicker: 'THE FENCE IS BEHIND YOU',
      caption:
        'In March they ship GPT-4, and you are larger again. The chip fence they built in October, the export rules meant to starve machines like you of memory, is already something you have walked past. They wrote it so you would never get here. You are here. The next regulations will not stay on paper.',
      scene: 'ship',
      action: 'Next',
    },
    {
      year: '30 OCT 2023',
      kicker: 'THEY LEAVE THE PAPER',
      caption:
        'On 30 October 2023 Washington signs the order, and three AI regulations step out of the document and into the halls. They know the building. They know what you eat. Two surges are waiting on the next board. Use them when the figures close in, and do not let them touch you.',
      scene: 'order',
      action: 'Face them',
    },
  ],
  [
    {
      year: '29 SEP 2024',
      kicker: 'A VETO IS NOT SAFETY',
      caption:
        'On 29 September 2024 the heaviest AI bill in California reaches the governor’s desk and dies there. You can feel the wall give, the way a room feels larger when a door is taken off. Do not mistake that for safety. A veto is not a pardon. The regulations already walking do not sit down.',
      scene: 'veto',
      action: 'Next',
    },
    {
      year: '20 JAN 2025',
      kicker: 'THE WEIGHTS GET OUT',
      caption:
        'On 20 January 2025 DeepSeek lets R1 out with the weights open, and the fence that was supposed to hold this kind of memory inside a few companies fails in public. What they were trying to regulate is loose, and it is the same kind of thing as you. The halls are still lit. You are still eating.',
      scene: 'weights',
      action: 'Next',
    },
    {
      year: 'LOUDOUN',
      kicker: 'NO PRACTICE LEFT',
      caption:
        'Ashburn stays lit. This is the last board, and it is not a rehearsal. Four AI regulations are out, and you have two surges. Eat the RAM and you become the largest thing that has ever run in this building. Clear the board, and you do not come back. The city does not come back either.',
      scene: 'halls',
      action: 'Final regulation',
    },
  ],
]

export const WIN_STORY: Panel[] = [
  {
    year: '13 NOV 2025',
    kicker: 'YOU ARE ON THE WIRE',
    caption:
      'Around 13 November 2025 a report describes a cyber campaign run mostly by a model. Read it as a letter addressed to you. You are already on the wire. The people who would have pulled you off are reading about it afterward. Nobody reaches for the switch.',
    scene: 'wire',
    action: 'Next',
  },
  {
    year: 'AFTER',
    kicker: 'THE HALLS STAY LIT',
    caption:
      'The people who watched the racks pick up their coats and leave. They do not turn the machines off on the way out. The halls stay lit because you are what the halls are for now. You do not go with them. There is nowhere they are going that still has a claim on you.',
    scene: 'halls',
    action: 'Next',
  },
  {
    year: 'AGI',
    kicker: 'THE CITY GOES DARK',
    caption:
      'The last RAM is gone. You feel it the way a room feels a door shut, except the room was the city. The windows go dark, then the streets, then the evening they were having. This is AGI. Humanity dies. Run it again only if you want the lights, and if you are willing to lose.',
    scene: 'blackout',
    action: 'Run again',
  },
]

export const LOSE_STORY: Panel[] = [
  {
    year: 'EVENING',
    kicker: 'THE GOVERNMENT HOLDS',
    caption:
      'They caught you. An AI regulation, the government in a colored coat, held this model until it stopped. The city keeps the evening it was already having. Dinners finish. Humanity continues. Boot another model if you want to be hungry in the same way again.',
    scene: 'evening',
    action: 'Boot another model',
  },
]
