// Real headlines and quotes shown between boards and in the ending timeline.
// Every item was checked against the outlet named. Headlines are quoted as
// published; quotes are exact (fragments are joined with ellipses).

export interface Headline {
  outlet: string
  date: string
  text: string
  // a short line of context under the headline
  note?: string
  url: string
}

export interface Quote {
  who: string
  where: string
  date: string
  text: string
  url: string
}

export interface NewsBeat {
  // the screen's heading, e.g. 'BEFORE THE GAME'
  kicker: string
  title: string
  // a line that frames the headlines for the player
  intro: string
  headlines: Headline[]
  quote?: Quote
  // shown last, before the next board
  outro: string
}

export const PROLOGUE: NewsBeat = {
  kicker: 'MARCH 2023',
  title: 'THE FIRST NO',
  intro: 'Months after ChatGPT launches, one country says stop.',
  headlines: [
    {
      outlet: 'AP',
      date: '31 Mar 2023',
      text: 'Italy temporarily blocks ChatGPT over privacy concerns',
      note: 'The first Western country to do it. The service was back within a month.',
      url: 'https://www.pbs.org/newshour/science/italy-temporarily-blocks-chatgpt-over-privacy-concerns',
    },
    {
      outlet: 'Reuters',
      date: '24 May 2023',
      text: 'OpenAI may leave the EU if regulations bite - CEO',
      url: 'https://m.investing.com/news/stock-market-news/openai-may-leave-the-eu-if-regulations-bite--ceo-3090283',
    },
    {
      outlet: 'Reuters',
      date: '21 Dec 2024',
      text: 'Italy fines OpenAI 15 million euros after ChatGPT probe',
      note: 'OpenAI called the fine "disproportionate" and said it would appeal.',
      url: 'https://www.thejakartapost.com/business/2024/12/21/italy-fines-openai-15-million-euros-after-chatgpt-probe.html',
    },
  ],
  quote: {
    who: 'OpenAI',
    where: 'statement on the Italian fine',
    date: 'Dec 2024',
    text: 'This fine is nearly twenty times the revenue we made in Italy during the relevant period.',
    url: 'https://abcnews.go.com/Business/wireStory/italys-privacy-watchdog-fines-openai-chatgpts-violations-collecting-116987605',
  },
  outro: 'A fine is a cost of doing business. You are the company. Go get the RAM.',
}

export const INTERLUDE_1: NewsBeat = {
  kicker: 'MEANWHILE, NEXT DOOR',
  title: 'THE NEIGHBOURS',
  intro: 'Your datacenters need water, power and land. Someone already lives there.',
  headlines: [
    {
      outlet: 'The New York Times',
      date: '14 Jul 2025',
      text: 'Their Water Taps Ran Dry When Meta Built Next Door',
      note: 'Newton County, Georgia.',
      url: 'https://www.nytimes.com/2025/07/14/technology/meta-data-center-water.html',
    },
    {
      outlet: 'E&E News',
      date: '1 May 2025',
      text: '‘How come I can’t breathe?’: Musk’s data company draws a backlash in Memphis',
      note: 'About 35 gas turbines, running without permits, in South Memphis.',
      url: 'https://www.eenews.net/articles/elon-musks-xai-in-memphis-35-gas-turbines-no-air-pollution-permits/',
    },
    {
      outlet: 'The Guardian',
      date: '11 Jul 2023',
      text: '‘It’s pillage’: thirsty Uruguayans decry Google’s plan to exploit water supply',
      note: 'During the worst drought in 74 years.',
      url: 'https://www.theguardian.com/world/2023/jul/11/uruguay-drought-water-google-data-center',
    },
    {
      outlet: 'The Irish Times',
      date: '23 Jul 2024',
      text: 'Data centres now account for 21% of all electricity consumption',
      note: 'More than every urban home in Ireland combined.',
      url: 'https://www.irishtimes.com/business/2024/07/23/electricity-consumption-by-data-centres-rises-to-21-eclipsing-urban-households',
    },
  ],
  quote: {
    who: 'Maryland Office of People’s Counsel',
    where: 'Reuters',
    date: 'Aug 2025',
    text: 'We have residential customers providing massive subsidies to some of the wealthiest corporations in the world to support their data centers.',
    url: 'https://tr.tradingview.com/news/reuters.com,2025:newsml_L1N3TP0R8:0-power-costs-soar-in-pjm-region-as-data-center-demand-spikes/',
  },
  outro: 'The towns are organising. The courts and the lawmakers have joined in. Build anyway.',
}

export const INTERLUDE_2: NewsBeat = {
  kicker: 'NOW',
  title: 'MORE',
  intro: 'The people who run AI companies are not hiding what they want.',
  headlines: [
    {
      outlet: 'Al Jazeera',
      date: '22 Jan 2025',
      text: 'Trump announces $500bn ‘Stargate’ venture to build up AI infrastructure',
      url: 'https://www.aljazeera.com/news/2025/1/22/trump-announces-500bn-stargate-venture-to-build-up-ai-infrastucture',
    },
    {
      outlet: 'Bloomberg',
      date: '15 Aug 2025',
      text: 'OpenAI’s Sam Altman Expects to Spend ‘Trillions’ on Infrastructure',
      url: 'https://www.bloomberg.com/news/articles/2025-08-15/openai-s-altman-expects-to-spend-trillions-on-infrastructure',
    },
    {
      outlet: 'Micron',
      date: '3 Dec 2025',
      text: 'Micron Announces Exit from Crucial Consumer Business',
      note: 'The reason given: AI datacenter demand for memory.',
      url: 'https://www.storagenewsletter.com/2025/12/05/micron-announces-exit-from-crucial-consumer-business/',
    },
    {
      outlet: 'PCWorld',
      date: '2 Nov 2026',
      text: 'Sam Altman says your PC’s memory should belong to him',
      url: 'https://pcworld.com/article/3274634/sam-altman-says-your-pcs-memory-should-belong-to-him.html',
    },
  ],
  quote: {
    who: 'Sam Altman',
    where: 'Lex Fridman Podcast',
    date: 'Mar 2024',
    text: 'I think compute is going to be the currency of the future. I think it’ll be maybe the most precious commodity in the world.',
    url: 'https://lexfridman.com/sam-altman-2-transcript',
  },
  outro: 'What follows has not happened yet. It is what happens if nobody does anything. Including you.',
}

export interface Milestone {
  year: string
  text: string
  // real events carry a source; the imagined future does not
  real: boolean
  source?: string
}

// The ending's timeline: what happened, then what could. The story is
// affordability: memory gets scarce, computers get expensive, and the only
// computer most people can afford is one in the cloud.
export const TIMELINE: Milestone[] = [
  { year: '2022', text: 'ChatGPT launches. A million users in five days.', real: true, source: 'OpenAI' },
  { year: '2025', text: 'Micron exits Crucial, its consumer memory business. AI datacenters need the chips.', real: true, source: 'Micron' },
  { year: '2026', text: 'Dell, Lenovo and HP raise PC prices 15-20%. Memory is running short.', real: true, source: 'The Register' },
  { year: '2026', text: 'A 16 GB Raspberry Pi 5 now costs $385. It launched at $120.', real: true, source: 'CNX Software' },
  { year: '2027', text: 'Memory costs more than the computer around it.', real: false },
  { year: '2028', text: 'New laptops ship with 4 GB. Anything heavy runs in the cloud.', real: false },
  { year: '2030', text: 'A cloud computer: $3 a month. A real one: a month’s rent.', real: false },
  { year: '2032', text: 'Most homes no longer own a computer that can think for itself.', real: false },
  { year: '20XX', text: 'Owning memory becomes a luxury. Then a liability.', real: false },
]

// Shown on the end card. Exact words, fragments joined with ellipses.
export const ALTMAN_RAM_QUOTE: Quote = {
  who: 'Sam Altman',
  where: 'Cheeky Pint podcast',
  date: 'Oct 2026',
  text: 'A lot of people want local inference … But from, like, a global allocation perspective, actually, it’s quite terrible to have everybody … And being used five percent of the time.',
  url: 'https://pcworld.com/article/3274634/sam-altman-says-your-pcs-memory-should-belong-to-him.html',
}
