# RAM GRAB: INFINITE PROFIT

A browser game about AI and who gets to own compute. Play it at https://ram-grab.vercel.app/

This is the group version, a fork of PAC RAM: ROGUE AI. The original stays on `main`; this version lives on its own branch.

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

Consumers (small amber pacs) roam the maze too and take RAM for their own computers. They are slower than you. You and they cannot hurt each other, until the last era: then you can eat them and take the RAM they collected. The HUD shows the tug of war as market share.

Eat 25 RAM to fill the lobbying bar. For five seconds the resistance turns blue and you can eat it (a fine gets APPEALED, a protest IGNORED, a lawsuit SETTLED, the AI Act WATERED DOWN, a ban LIFTED). Your score is your valuation.

## Progression

Three eras, each harder and bigger than the last. You get faster, the resistance gets faster, the consumers get slower, and the mazes grow (15 x 15, 19 x 19, 25 x 25) because there is more RAM to take.

1. **The Gold Rush** (2022 - 2023): two kinds of resistance, three consumers. You are a STARTUP.
2. **The Build-Out** (2024 - 2026): four kinds of resistance, four consumers. You are a HYPERSCALER.
3. **No One Stopped It** (2027 - ): all five, six consumers, and consumers are fair game. You are a CONGLOMERATE.

Between eras the company grows on screen (`src/upgrade.ts`) and real headlines play as a news wire (`src/news.ts`, content in `src/headlines.ts`):

- Before the game: Italy blocks ChatGPT (2023), OpenAI hints it may leave the EU, Italy's EUR 15M fine and OpenAI's response.
- After era 1: communities next to datacenters (Newton County wells, xAI's turbines in Memphis, Uruguay's drought, Ireland's grid, power bills in the PJM region).
- After era 2: Stargate, "trillions" on infrastructure, Micron leaving the consumer memory business, and Sam Altman on the RAM in your PC.

Every headline is quoted as published, with the outlet and date. Sources are linked in `src/headlines.ts`.

## Ending

Clear the third era and nothing can stop you (`src/ending.ts`): a tally of what you absorbed, a timeline from 2022 to a projected future (real milestones marked with their source, the projection marked as such), then the screen turns into your own computer and a notice says it is being requisitioned because it contains RAM. After that, everyone is connected to one hivemind in the cloud. The last card says this is a game and the future isn't written yet.

Lose all your lives and the resistance held.

## Run

```bash
npm install
npm run dev
```

Open http://127.0.0.1:43123/

`npm run build` makes a static build in `dist/` with relative paths, so it runs from any sub-path. `npm run check` typechecks and simulates a full three-era run.

Test mode: open with `?dev` to get a SKIP BOARD button (also the `]` key). `?dev=0` turns it off.

## Controls

Arrow keys, WASD or swipes to move. Enter, Space or a tap starts and continues. Esc skips a news screen. P pauses, M mutes, F toggles fullscreen.

## Not in this version

No voice (text only), no rogue-AI story, finale or OS takeover, no online leaderboard and no analytics. The top-valuations board is kept on the player's own device.

## Art and sound

Sprites are drawn by scripts in `tools/`: `ghosts.py` (the five resistance ghosts), `minis.py` (consumers), `pacforms.py` (the company's builds), `keyart.py` (title art and `public/og.jpg`). Music and sound effects were made with ElevenLabs and live in `public/audio`.

## Disclaimer

An independent game. Not affiliated with or endorsed by Bandai Namco Entertainment, owner of PAC-MAN, or by any company named in the headlines.
