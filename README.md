# PAC RAM: INFINITE PROFIT

A browser game about AI and who gets to own compute. Play it at https://ram-grab.vercel.app/

This is the group version, a fork of PAC RAM: ROGUE AI.

## The idea

You are Infinite Labs, an AI company. You need RAM to grow your datacenters, and your goal is infinite profit. Standing in your way is the resistance: governments and the public.

## Game loop

Eat the RAM across a maze while avoiding the ghosts of the resistance:

| Ghost | Tag | Stands for |
| --- | --- | --- |
| Data Watchdog | FINE | Privacy regulators who block apps and hand out fines |
| Local Residents | PROTEST | The people living next to your datacenters |
| Copyright Lawsuit | LAWSUIT | Writers, artists and newspapers who want their work back |
| AI Act | AI ACT | Lawmakers writing rules for AI |
| Datacenter Moratorium | BAN | Towns and grids that say no more datacenters |

Consumers (small amber pacs) roam the maze too and take RAM for their own computers. They are slower than you and normally safe from you. During a surge you can eat them, and in the last era they are always fair game: eating one takes the RAM it collected. The HUD shows the tug of war as market share.

The RAM is drawn as little white RAM sticks. Eat 25 to fill the surge bar. For a few seconds the resistance turns blue and you can eat it (a fine gets APPEALED, a protest IGNORED, a lawsuit SETTLED, the AI Act WATERED DOWN, a ban LIFTED); an eaten ghost goes back to its base and comes out again. The surge is shown by a flash and the colours, without a text overlay.

The right-hand panel is a fake stock ticker: Infinite Labs' share price climbs as you take RAM, while a tape and a price list show what that does to everyone else (RAM and laptops get dearer, a cloud PC gets cheaper, fewer homes buy a computer). Your final score is your valuation.

## Progression

Three eras, each harder and bigger than the last. You get faster, the resistance gets faster, the consumers get slower, and the mazes grow (15 x 15, 19 x 19, 25 x 25) because there is more RAM to take.

1. **The Gold Rush** (2022 - 2023): two kinds of resistance, three consumers. You are a STARTUP.
2. **The Build-Out** (2024 - 2026): four kinds of resistance, four consumers. You are a HYPERSCALER.
3. **No One Stopped It** (2027 - ): all five, six consumers, and consumers are fair game. You are a CONGLOMERATE.

Between eras the company upgrades itself on screen (`src/upgrade.ts`): it takes in the RAM, falls apart into pixels and is rebuilt as its next form (STARTUP, HYPERSCALER, CONGLOMERATE, THE CLOUD). Then real headlines play as a news wire (`src/news.ts`, content in `src/headlines.ts`):

- Before the game: Italy blocks ChatGPT (2023), OpenAI hints it may leave the EU, Italy's EUR 15M fine and OpenAI's response.
- After era 1: communities next to datacenters (Newton County wells, xAI's turbines in Memphis, Uruguay's drought, Ireland's grid, power bills in the PJM region).
- After era 2: Stargate, "trillions" on infrastructure, Micron leaving the consumer memory business, and Sam Altman on the RAM in your PC.

Every headline is quoted as published, with the outlet and date. Sources are linked in `src/headlines.ts`.

## Ending

Clear the third era and the board is empty, but the company is still hungry. In the finale (`src/finale.ts`) you steer it to eat the board itself: the maze, then the stock ticker, then the glass of the screen, because there is still memory out there: in your computer.

The ending (`src/ending.ts`) stays on one idea: electronics keep getting more expensive until people can't afford them, the cloud gets cheaper, and owning a powerful computer becomes obsolete. A timeline runs from 2022 to a projected future (real milestones marked with their source, the projection marked as such). Then the screen turns into your own computer and a notice says the memory above the personal allowance is being collected, worked out from how much RAM your device reports. In a short chat in speech bubbles you pick your replies while the cloud talks you out of owning a computer, and a short end card closes on Sam Altman's remark about RAM in home PCs.

Lose all your lives and the resistance held.

## Run

```bash
npm install
npm run dev
```

Open http://127.0.0.1:43123/

`npm run build` makes a static build in `dist/` with relative paths, so it runs from any sub-path. `npm run check` typechecks and simulates a full three-era run.

Test mode for playtesting: open https://ram-grab.vercel.app/?dev to get a SKIP BOARD button (also the `]` key). It stays on in that browser; `?dev=0` turns it off.

## Controls

Arrow keys, WASD or swipes to move. Enter, Space or a tap starts and continues. Esc skips a news screen. P pauses, M mutes, F toggles fullscreen.

## Not in this version

No voice (text only), no rogue-AI story or OS takeover, no online leaderboard and no analytics. The top-valuations board is kept on the player's own device.

## Art and sound

Sprites are drawn by scripts in `tools/`: `ghosts.py` (the five resistance ghosts), `minis.py` (consumers), `pacforms.py` (the company's builds), `keyart.py` (title art and `public/og.jpg`). Music and sound effects were made with ElevenLabs and live in `public/audio`.

## Disclaimer

An independent game. Not affiliated with or endorsed by Bandai Namco Entertainment, owner of PAC-MAN, or by any company named in the headlines.
