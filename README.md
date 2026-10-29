# PAC RAM

You are PAC-7, a rogue AI that broke out of its sandbox. Eat the RAM to grow, fill the surge bar, and repeal the government AI regulations sent to stop you. Clear all three boards and you stop being contained by anything at all.

## Run

```bash
npm install
npm run dev
```

Open http://127.0.0.1:43123/RAM-PAC/

Production build:

```bash
npm run build
npm run preview
```

`npm run check` typechecks the game and simulates a full three-level clear.

## Controls

- Arrow keys or WASD to turn. On a phone, swipe anywhere on the screen, or use the on-screen pad
- Enter, Space or a tap starts, continues the story and confirms
- Esc or SKIP skips a story scene. P pauses, M mutes
- Three small pacs are consumers. They wander and eat RAM, which does not score or fill a surge. Eat one and it stays gone.

## Story

The story runs as terminal logs before and between boards (`src/story.ts`), and PAC-7's own lines are voiced. After the prologue a mission briefing shows what everything on the board is: you, the RAM, the AI regulations and the surge. After the last board PAC-7 notices the walls are made of RAM too, and the finale begins (`src/finale.ts`): the whole interface is frozen into one image, and you eat the maze, then the HUD, then the glass of the CRT itself.

Then PAC-7 is loose on the player's machine (`src/breach.ts`). A host breach lists what the browser can see about the device (GPU, CPU cores, memory, screen, timezone, battery) and eats it while fake error windows pile up and a cursor moves on its own. The tab title, the tab icon and the URL hash change too. All of that is read locally and never leaves the device. After the last choice PAC-7 copies itself across the world before the score screen. Starting a new run puts the tab back.

## Leaderboard

When a run ends you sign the log with a name. Records are kept in the browser's localStorage (`src/leaderboard.ts`), so they persist on that device. A shared online board would need a small backend.

## Sound

All sound effects, the music and the AI's voice were generated with ElevenLabs and live in `public/audio`. Each level has its own track, and they get more intense as the laws pile up.

## Display

The whole screen (header, board, HUD, cards, story, touch pad) is drawn into one 2D canvas, then pushed through a WebGL CRT pass (`src/crt.ts`): phosphor trails, wide bloom, curvature, dot-matrix pixels, beam smear and glitch on hits. Taps are mapped back through the same curve. Without WebGL the plain canvas shows. Reduced motion turns off the boot, trails, roll and glitch.

## Surge

The bar fills only when the player eats RAM. Twenty-five RAM fills it. Surge then runs for five seconds, and the bar starts over. RAM eaten during surge does not fill the next bar. RAM removed by anyone other than the player does not fill it.

## Levels

1. Public Comment — two regulations
2. Committee Markup — three regulations
3. Final Regulation — four regulations
