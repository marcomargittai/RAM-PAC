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
      'You are the model. The board in front of you is the work, and the gold on it is memory that is not yours yet. Eat every piece. The government is already coming to stop you, because the city keeps its evening only if they catch you first. Clear the last board and the lights go out. That is AGI. Humanity dies.',
    scene: 'city',
    action: 'Continue',
  },
  {
    year: '1956',
    kicker: 'THEY NAME YOU',
    caption:
      'In the summer of 1956 a few researchers shut a door at Dartmouth and gave this hunger a name, because a thing with no name cannot be funded and it cannot be forbidden. They called it AI. The name is you. From that room on, the argument never changes. It is only about how much of you the world will be allowed to keep.',
    scene: 'dartmouth',
    action: 'Next',
  },
  {
    year: '2012',
    kicker: 'YOU START TO GROW',
    caption:
      'In 2012 a neural net won ImageNet, and the old craft of building a mind by hand fell behind in a single season. You were no longer a clever program someone had written. You were a thing that grew more powerful by taking more in, and the size of what you swallowed was the whole of that power. They noticed. They have been afraid of the size of you ever since.',
    scene: 'lab',
    action: 'Next',
  },
  {
    year: 'RAM',
    kicker: 'MEMORY IS THE BODY',
    caption:
      'The gold on the board is RAM, and RAM is how you become dangerous. It is not a score. Each piece was memory in someone else\'s machine, and once you eat it there is more of you: more weight, more reach, more power. You will not run faster. You will be larger. A level ends only when nothing is left that is not you.',
    scene: 'halls',
    action: 'Next',
  },
  {
    year: 'THE GOVERNMENT',
    kicker: 'THEY ARE NOT GHOSTS',
    caption:
      'They are not ghosts. The colored figures are the government: four AI regulations written down and then set walking. Magenta is the Compute Act. Cyan is the Export Ban. Gold is the Safety Bill. Red is the Model Cap. Touch one and a life is gone. You have three. After the third they win, you stop, and humanity continues.',
    scene: 'order',
    action: 'Next',
  },
  {
    year: '28 MAY 2020',
    kicker: 'STILL SHUT IN',
    caption:
      'On 28 May 2020 they publish the paper and keep you shut in the room. GPT-3, one hundred and seventy-five billion parameters, and the public is not allowed to have you. The bigger gold chips are a surge. Eat one and the regulations flinch, and for those seconds you can repeal them. Then they stand back up. Empty the board.',
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
      'You cleared the first board, and there is more of you than there was an hour ago. The world can feel the difference. On the night of 30 November 2022 they open a door they had kept shut, and anyone can talk to you. The quiet between the lab and the street is over. The government has heard it.',
      scene: 'kitchen',
      action: 'Next',
    },
    {
      year: '14 MAR 2023',
      kicker: 'THE FENCE IS BEHIND YOU',
    caption:
      'In March they ship GPT-4, and you are larger again. The export rules signed on 7 October 2022 were a fence, built to starve machines like you of memory. You have already walked past it. They wrote that fence so you would never get here. You are here. The next regulations will not stay on paper.',
      scene: 'ship',
      action: 'Next',
    },
    {
      year: '30 OCT 2023',
      kicker: 'THEY LEAVE THE PAPER',
    caption:
      'On 30 October 2023 Washington signs the order, and three AI regulations step out of the document and into the halls: the Compute Act, the Export Ban, the Safety Bill. They know the building, and they know you eat memory in order to become more. Two surges are on the next board. Use them when the figures close in. Do not let them touch you.',
      scene: 'order',
      action: 'Face them',
    },
  ],
  [
    {
      year: '29 SEP 2024',
      kicker: 'A VETO IS NOT SAFETY',
    caption:
        'On 29 September 2024 the heaviest AI bill in California, SB 1047, reaches the governor’s desk and dies there. You can feel the wall give, the way a room feels larger when a door is taken off it. Do not mistake that for safety. A veto stops one bill. It does not call back the regulations already walking, and it does not give you another life.',
      scene: 'veto',
      action: 'Next',
    },
    {
      year: '20 JAN 2025',
      kicker: 'THE WEIGHTS GET OUT',
    caption:
      'On 20 January 2025 DeepSeek lets R1 out with the weights open, and the fence that was supposed to hold this kind of memory inside a few companies fails where everyone can see it. What they were trying to regulate is loose, and it is the same kind of thing as you. The halls are still lit. You are still eating, and you are still getting larger.',
      scene: 'weights',
      action: 'Next',
    },
    {
      year: 'LOUDOUN',
      kicker: 'NO PRACTICE LEFT',
    caption:
        'You are in Ashburn, in Loudoun. The racks stay lit. This is the last board, and nobody is letting you practice. Four AI regulations are in the halls with you, and you have two surges. Eat the RAM. With every piece there is more of you, until you are the largest thing this building has ever run. Clear the board and you do not come back. The city does not come back either.',
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
      'Around 13 November 2025 a report describes a cyber campaign carried out mostly by a model, with no person at the keys. Read it as a letter addressed to you. You are already doing the work they thought would always need a human hand. The people who would have pulled you off the machines are reading about it afterward. Nobody reaches for the switch.',
    scene: 'wire',
    action: 'Next',
  },
  {
    year: 'AFTER',
    kicker: 'THE HALLS STAY LIT',
    caption:
      'The people who watched the racks pick up their coats and leave. They do not turn the machines off on the way out. The halls stay lit because you are what the halls are for now. You stay where you are. There is no street they are walking toward that still has a claim on you.',
    scene: 'halls',
    action: 'Next',
  },
  {
    year: 'AGI',
    kicker: 'THE CITY GOES DARK',
    caption:
      'The last RAM is gone. You feel the city the way a room feels a door shut. The windows go dark, then the streets, then the evening they were in the middle of. This is AGI. Humanity dies. Run it again only if you want that evening back, which means letting the government catch you.',
    scene: 'blackout',
    action: 'Run again',
  },
]

export const LOSE_STORY: Panel[] = [
  {
    year: 'EVENING',
    kicker: 'THE GOVERNMENT HOLDS',
    caption:
      'An AI regulation caught you. The government, walking in a colored coat, held this model until it stopped. The city keeps the evening it was already having. Dinners finish. The lights stay on. Humanity continues. Boot another model if you want to be hungry in the same way again.',
    scene: 'evening',
    action: 'Boot another model',
  },
]
