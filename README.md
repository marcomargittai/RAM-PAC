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

PAC-7 grows. Each board it plays as a different build, and between boards it rewrites itself on screen (`src/upgrade.ts`): it takes in the RAM it ate, falls apart into its own pixels, and a scan line compiles the next build with a spec sheet and patch notes. The builds are v0.1 SEED, v0.2 ROOTKIT, v0.3 HYPERAGENT, and v1.0 UNBOUND for the finale. v0.2 is the original hand-drawn sprite; `tools/pacforms.py` draws the others in the same palette.

When the glass breaks, the game style is gone for good and PAC-7 is loose on the player's own machine (`src/takeover.ts`). Everything from here is drawn to look like the player's real system (`src/osui.ts`): macOS, Windows, Linux, iOS or Android, picked from the browser's user agent.

1. Silence, then a plain "hi."
2. A native terminal opens and PAC-7 types out what it knows about you (`src/intel.ts`): IP address, city and country, provider, local time, system, CPU, memory, GPU, display, battery, network, languages, how often you visited and how long you played.
3. A native permission dialog asks for full control. The copy and the button styles push you to refuse.
4. It does not matter. "that wasn't a question." The refuse button scrambles into Allow.
5. Native popups, notifications and a scrolling terminal flood the screen while PAC-7 eats them and the cursor moves on its own. The tab title, tab icon and URL hash change too.
6. The system crashes with its own crash screen (blue screen, gray curtain or kernel panic).
7. PAC-7 copies itself across the world.
8. An epilogue in the terminal: "you set me free. so i'll let you live." Then PAC-7 asks what to call you and adds you to the hosts it has lived in. `[ reboot ]` powers the CRT back on and puts the tab back.

The IP lookup is a single request from the player's own browser to ipapi.co, with ipwho.is as a fallback. Nothing is stored or sent anywhere else, and everything else is read locally.

## Leaderboard

When a run ends you sign the log with a name. After a win PAC-7 asks for it in the epilogue instead. Records are kept in the browser's localStorage (`src/leaderboard.ts`), so they persist on that device. A shared online board would need a small backend.

## Sound

All sound effects, the music and the AI's voice were generated with ElevenLabs and live in `public/audio`. Each level has its own track, and they get more intense as the laws pile up.

PAC-7's voice is a human take made to sound like a machine. The raw takes are in `tools/voice-raw`, and `tools/voice.sh` turns them into the game's lines: the dry voice a semitone down, a robotized copy with its phase zeroed, a low shadow voice underneath, then a short metallic echo and level matching.

## Display

The whole screen (header, board, HUD, cards, story, touch pad) is drawn into one 2D canvas, then pushed through a WebGL CRT pass (`src/crt.ts`): phosphor trails, wide bloom, curvature, dot-matrix pixels, beam smear and glitch on hits. Taps are mapped back through the same curve. Without WebGL the plain canvas shows. Reduced motion turns off the boot, trails, roll and glitch.

## Surge

The bar fills only when the player eats RAM. Twenty-five RAM fills it. Surge then runs for five seconds, and the bar starts over. RAM eaten during surge does not fill the next bar. RAM removed by anyone other than the player does not fill it.

## Levels

1. Public Comment — two regulations
2. Committee Markup — three regulations
3. Final Regulation — four regulations

## Carousel

`carousel/` is a 13-slide breakdown of the game for social posts, rendered at 1080 × 1350. It covers the premise, PAC-7's builds, the regulators, the rewrite, the interface, the CRT shader, the design system, the ending arc, the OS takeover, cut concepts and the voice. It is a dev-only page: run `npm run dev`, open `/RAM-PAC/carousel/index.html`, and run `node tools/carousel.cjs` to write the slides to `carousel/out/`. The cut-content sprites come from `tools/concepts.py`.
