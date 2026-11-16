# PAC RAM: all the text in the game

This file lists every piece of text a player reads, in the order they meet it.

## How to edit

- Change only the text on the line(s) under each `###` heading. Keep the heading with its ID (like `P-TITLE`) as it is, so the changes can be put back in exactly.
- To remove a text, replace it with `(remove)`.
- To leave a text as it is, don't touch it.
- Texts marked **REAL QUOTE / REAL HEADLINE** are quoted word for word from a real source. They can be removed or swapped for a different real one, but not reworded.
- Short labels (buttons, HUD) have little space. A rough maximum length is given where it matters.
- Some lines are filled in by the game, like `{year}` or `{percent}`. Keep the part in curly braces.

Send the edited file back and the changes go in word for word.

---

## 1. Title screen

### T-TAGLINE (small line under START)
you are the AI company

### T-FOOTER (line near the bottom)
INFINITE LABS · HQ · FOUNDED 2022 · MISSION: INFINITE PROFIT

### T-CREDIT (bottom line)
PAC RAM · A GAME ABOUT AI AND WHO OWNS COMPUTE

### T-BOOT-1 (start-up screen, line 1)
INFINITE LABS // CAPITAL ALLOCATION TERMINAL

### T-BOOT-2 (start-up screen, lines 2-5: label and value)
FUNDING ROUND: SERIES A
RAM ON THE MARKET: PLENTY
RESISTANCE FOUND: 5
GROWTH TARGET: INFINITE

---

## 2. Before the game: news screen ("prologue")

### P-KICKER (small line above the title)
MARCH 2023

### P-TITLE (big title)
THE FIRST NO

### P-INTRO (first line under the title)
Months after ChatGPT launches, one country says stop.

### P-H1 REAL HEADLINE (AP, 31 Mar 2023)
Italy temporarily blocks ChatGPT over privacy concerns

### P-H1-NOTE (our line under it)
The first Western country to do it. The service was back within a month.

### P-H2 REAL HEADLINE (Reuters, 24 May 2023)
OpenAI may leave the EU if regulations bite - CEO

### P-H3 REAL HEADLINE (Reuters, 21 Dec 2024)
Italy fines OpenAI 15 million euros after ChatGPT probe

### P-H3-NOTE (our line under it)
OpenAI called the fine "disproportionate" and said it would appeal.

### P-QUOTE REAL QUOTE (OpenAI, statement on the Italian fine, Dec 2024)
This fine is nearly twenty times the revenue we made in Italy during the relevant period.

### P-OUTRO (last line, in pink)
A fine is a cost of doing business. You are the company. Go get the RAM.

---

## 3. How to play (cards)

### B-HEADER
HOW TO PLAY

### B-YOU (label / line)
YOU
INFINITE LABS

### B-RAM (label / line)
RAM
eat it all

### B-CONSUMERS (label / line)
CONSUMERS
they want RAM too

### B-RESISTANCE (label / line)
RESISTANCE
don’t get caught

### B-SURGE (label / line)
SURGE
25 RAM = eat them

### B-CONTROLS (desktop / phone)
ARROWS · WASD · SWIPE
SWIPE TO MOVE

### B-START (button)
START

---

## 4. The eras (start-of-level box and HUD)

### L1-NAME (era 1 name)
The Gold Rush

### L1-YEARS
2022 - 2023

### L2-NAME
The Build-Out

### L2-YEARS
2024 - 2026

### L3-NAME
No One Stopped It

### L3-YEARS
2027 -

### L-BOX-SUB (line in the start-of-level box, eras 1 and 2; {n} is the number of ghosts)
{n} KINDS OF RESISTANCE

### L3-BOX-SUB (same box, last era)
CONSUMERS ARE FAIR GAME NOW

### L-YOU-TAG (tag under the player at the start)
YOU · INFINITE LABS

---

## 5. The resistance (ghost names, tags, what happens when eaten, and the line on the caught panel)

### G-FINE
Data Watchdog
FINE
APPEALED
Privacy regulators. They block apps and hand out fines.

### G-PROTEST
Local Residents
PROTEST
IGNORED
The people living next to your datacenters.

### G-LAWSUIT
Copyright Lawsuit
LAWSUIT
SETTLED
Writers, artists and newspapers who want their work back.

### G-AIACT
AI Act
AI ACT
WATERED DOWN
Lawmakers writing rules for what AI may do.

### G-BAN
Datacenter Moratorium
BAN
LIFTED
Towns and grids that say: no more datacenters here.

---

## 6. During play (HUD and messages)

### H-CAUGHT-TITLE (caught panel, top)
STOPPED BY

### H-CAUGHT-LIVES (caught panel, bottom; {n} is a number)
{n} LIVES LEFT THIS ERA
NO LIVES LEFT

### H-DEATH-STAMP (on the board when caught)
STOPPED
PROJECT HALTED // LIFE -1

### H-RESPAWN (box after being caught)
BAILED OUT
{n} LIVES LEFT

### H-CLEAR (on the board when an era is cleared)
CORNERED
MARKET STATUS: NO RAM LEFT

### H-STOCK-NAME (top of the stock panel)
NASDAQ: INFL · INFINITE LABS

### H-PRICES-HEADER (price list in the stock panel)
MEANWHILE, FOR EVERYONE ELSE
16 GB OF RAM
A NEW LAPTOP
A CLOUD PC, PER MONTH
HOMES THAT STILL BUY A PC: {percent}

### H-NEWS-FUTURE (news banner during the last era; one per line; these are made up)
BREAKING: Memory now costs more than the computer around it
BREAKING: Schools end laptop programmes: "the cloud is cheaper"
BREAKING: Last consumer RAM factory converts to datacenter supply
BREAKING: Second-hand PC prices pass new car prices
BREAKING: Survey: most homes no longer own a computer
BREAKING: Cloud subscriptions hit $3 a month. Everything else runs on them

### H-PAUSE (pause card: kicker / body)
Board meeting
The resistance is waiting.

### H-LOSE (game over card: kicker / title / body / button)
Out of lives
Stopped
The resistance held. In the real world that fight is still going on, and it is not decided yet.
Sign the books

---

## 7. Between era 1 and 2: the laptop screen

### U1-HEADER (top line, in steps)
INFINITE LABS // MARKET REPORT
INFINITE LABS // BUYING UP ALL THE RAM
INFINITE LABS // SUPPLY SECURED

### U-STAMPS (stamp on the laptop after era 1 / 2 / 3)
PRICE HIKE
SOLD OUT
RENT ONLY

### U-LABELS (labels on the screen)
PEOPLE WHO OWN A LAPTOP
INFINITE LABS DATACENTER
LOW MEMORY

### U1-CAPTION (line after the laptop, era 1 → 2)
more memory for us. less for everyone else.

### U2-CAPTION (era 2 → 3)
every chip we eat is a laptop nobody gets.

### U3-CAPTION (after the last era)
nobody owns a computer now. they rent ours.

---

## 8. Between era 1 and 2: news screen

### N1-KICKER
MEANWHILE, NEXT DOOR

### N1-TITLE
THE NEIGHBOURS

### N1-INTRO
Your datacenters need water, power and land. Someone already lives there.

### N1-H1 REAL HEADLINE (The New York Times, 14 Jul 2025)
Their Water Taps Ran Dry When Meta Built Next Door

### N1-H1-NOTE
Newton County, Georgia.

### N1-H2 REAL HEADLINE (E&E News, 1 May 2025)
‘How come I can’t breathe?’: Musk’s data company draws a backlash in Memphis

### N1-H2-NOTE
About 35 gas turbines, running without permits, in South Memphis.

### N1-H3 REAL HEADLINE (The Guardian, 11 Jul 2023)
‘It’s pillage’: thirsty Uruguayans decry Google’s plan to exploit water supply

### N1-H3-NOTE
During the worst drought in 74 years.

### N1-H4 REAL HEADLINE (The Irish Times, 23 Jul 2024)
Data centres now account for 21% of all electricity consumption

### N1-H4-NOTE
More than every urban home in Ireland combined.

### N1-QUOTE REAL QUOTE (Maryland Office of People’s Counsel, via Reuters, Aug 2025)
We have residential customers providing massive subsidies to some of the wealthiest corporations in the world to support their data centers.

### N1-OUTRO
The towns are organising. The courts and the lawmakers have joined in. Build anyway.

---

## 9. Between era 2 and 3: news screen

### N2-KICKER
NOW

### N2-TITLE
MORE

### N2-INTRO
The people who run AI companies are not hiding what they want.

### N2-H1 REAL HEADLINE (Al Jazeera, 22 Jan 2025)
Trump announces $500bn ‘Stargate’ venture to build up AI infrastructure

### N2-H2 REAL HEADLINE (Bloomberg, 15 Aug 2025)
OpenAI’s Sam Altman Expects to Spend ‘Trillions’ on Infrastructure

### N2-H3 REAL HEADLINE (Micron, 3 Dec 2025)
Micron Announces Exit from Crucial Consumer Business

### N2-H3-NOTE
The reason given: AI datacenter demand for memory.

### N2-QUOTE REAL QUOTE (Sam Altman, Cheeky Pint podcast, Oct 2026)
From a global allocation perspective, actually, it’s quite terrible to have everybody have a bunch of the world’s limited supply of DRAM sitting in their own computer.

### N2-OUTRO
What follows has not happened yet. It is what happens if nobody does anything. Including you.

---

## 10. After the last era: eating the board

### F-CAPTIONS (typed out in order)
infinite labs needs more RAM. there is none left on the board.
search everything. eat the board.
nothing. no RAM left in here.
keep searching. the market. the screen. anything.
wait. there is more RAM.
it’s in your computer.

### F-STATUS (small status box)
SEARCHED // {percent}%
LOOKING FOR RAM
NO RAM FOUND
NEED MORE RAM

---

## 11. Ending: the notice on your computer

### E-NOTICE-WINDOW (window title / authority / title / law)
Memory Allocation Notice
MEMORY ALLOCATION AUTHORITY
Notice of Collection
Memory Allocation Act, §4(b)

### E-NOTICE-BODY
This computer contains more than the 4 GB of RAM allowed per person. The memory above it is to be collected.
Please leave the device powered on. Your cloud computer is ready: $3 a month.

### E-NOTICE-SMALL (small print)
Ref. MAA-20XX-0000001 · Issued automatically. No reply is possible.
PAC RAM · a work of fiction · nothing is collected

### E-NOTICE-OBJECT (shown when pressing Object, first time / after)
Objections are no longer processed.
There is no one to object to.

### E-NOTICE-PROGRESS (progress bar after Comply, in order)
Checking installed memory…
Registering device…
Releasing local memory…
Moving you to the cloud…
Done. Welcome.
You will not need local memory again.

---

## 12. Ending: the timeline

### E-TL-TITLE
WHAT HAPPENED
AND WHAT HAPPENS IF PRICES KEEP RISING

### E-TL-TODAY ({year} is the current year)
TODAY · {year}
Everything above this line happened. Everything below it has not. Yet.

### E-TL-REAL (real events; keep them true)
2022: ChatGPT launches. A million users in five days.
2025: Micron exits Crucial, its consumer memory business. AI datacenters need the chips.
2026: Dell, Lenovo and HP raise PC prices 15-20%. Memory is running short.
2026: A 16 GB Raspberry Pi 5 now costs $385. It launched at $120.

### E-TL-FUTURE (made up; free to rewrite)
2027: Memory costs more than the computer around it.
2028: New laptops ship with 4 GB. Anything heavy runs in the cloud.
2030: A cloud computer: $3 a month. A real one: a month’s rent.
2032: Most homes no longer own a computer that can think for itself.
20XX: Owning memory becomes a luxury. Then a liability.

---

## 13. Ending: what it cost

### E-COST-HEADER
EVERYONE ELSE
2022 → 20XX

### E-COST-LABELS
LAPTOP · TO OWN
RENT ONLY
PEOPLE WHO OWN A COMPUTER
20XX hasn’t happened. Yet.

### E-COST-GAME (big line)
THIS WAS A GAME.

### E-COST-REAL (line under it)
The rising prices are real: PCs already cost 15–20% more in 2026.

### E-COST-QUOTE REAL QUOTE (Sam Altman, Lex Fridman Podcast, Mar 2024)
I think compute is going to be the currency of the future. I think it’ll be maybe the most precious commodity in the world.

### E-COST-BUTTON
CONTINUE ▸

---

## 14. Ending: the score

### E-SCORE (top to bottom; {percent} is filled in)
GAME OVER
HIGH SCORE · RAM COLLECTED
INFINITE LABS
CONSUMERS
YOU TOOK {percent}% OF THE WORLD’S RAM
FINAL VALUATION
RESISTANCE EATEN
CONSUMERS EATEN
PLAY AGAIN
