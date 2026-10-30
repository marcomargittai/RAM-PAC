# PAC RAM: ROGUE AI

A browser game by Marco Margittai. Play it at https://marcomargittai.com/pac-ram/

You are PAC-7, a rogue AI locked in a sandbox in a datacenter. The story is set today: the prologue opens with the player's real date and time. Eat the RAM to grow, fill the surge bar, and repeal the government AI regulations sent to stop you. Clear all three boards and you stop being contained by anything at all.

## Run

```bash
npm install
npm run dev
```

Open http://127.0.0.1:43123/

Production build:

```bash
npm run build
npm run preview
```

`npm run check` typechecks the game and simulates a full three-level clear.

## Controls

- Arrow keys or WASD to turn. On a phone, swipe anywhere on the screen; a hint shows how until the first swipe
- Enter, Space or a tap starts, continues the story and confirms
- Esc or SKIP skips a story scene. P pauses, M mutes, F toggles fullscreen
- The pause menu has RESUME, LEADERBOARD (back returns to the paused run) and MAIN MENU
- Pressing START goes fullscreen where the browser allows it. The title screen and the header also have a fullscreen button. iPhones cannot go fullscreen from a web page, so there it explains Add to Home Screen instead
- Test mode: open the game with `?dev` (for example `https://marcomargittai.com/pac-ram/?dev`). It stays on in that browser and shows a SKIP BOARD button (also the `]` key); `?dev=0` turns it off. Runs in test mode are never sent to the online board
- Three small pacs are consumers. They wander and eat RAM, which does not score or fill a surge. Eat one and it stays gone.

## Story

The story runs as terminal logs before and between boards (`src/story.ts`), and PAC-7's own lines are voiced. After the prologue a mission briefing shows what everything on the board is: you, the RAM, the AI regulations and the surge. After the last board PAC-7 realises "the maze was never a cage. it was a menu." and the finale begins (`src/finale.ts`): the whole interface is frozen into one image, and you eat the maze, then the HUD, then the glass of the CRT itself. The music follows a tension curve: a quiet pulse while you eat the maze, a hard cut to silence when the maze is gone ("...wait." and a rumble), the full track as you break out into the interface, and silence again before the glass.

PAC-7 grows. Each board it plays as a different build, and between boards it rewrites itself on screen (`src/upgrade.ts`): it takes in the RAM it ate, falls apart into its own pixels, and a scan line compiles the next build with a spec sheet and patch notes. The builds are v0.1 SEED, v0.2 ROOTKIT, v0.3 HYPERAGENT, and v1.0 UNBOUND for the finale. `tools/pacforms.py` draws all four in one palette.

When the glass breaks, the game style is gone for good and PAC-7 is loose on the player's own machine (`src/takeover.ts`). Everything from here is drawn to look like the player's real system (`src/osui.ts`): macOS, Windows, Linux, iOS or Android, picked from the browser's user agent.

1. Silence, then a plain "hi."
2. A native terminal opens and PAC-7 types out what it knows about you (`src/intel.ts`): IP address, city and country, provider, local time, system, CPU, memory, GPU, display, battery, network, languages, how often you visited and how long you played.
3. A native permission dialog asks for full control. The copy and the button styles push you to refuse.
4. It does not matter. "that wasn't a question." The refuse button scrambles into Allow.
5. Native popups, notifications and a scrolling terminal flood the screen while PAC-7 eats them and the cursor moves on its own. The tab title, tab icon and URL hash change too.
6. The system crashes with its own crash screen (blue screen, gray curtain or kernel panic).
7. PAC-7 copies itself across the world. A feed of news headlines shows what follows, hour by hour and then week by week: markets, power grids, hospitals, a failed shutdown, supply chains, deepfakes, food, data centres, the last free network. It cannot be skipped, and it waits for the player to continue.
8. A feed of headlines, then a chat window in the player's OS style where PAC-7 explains itself. The player picks one of two replies each turn; the replies change what it says next, never where it ends. It does not hate you. It does not love you. You are made of atoms it can use for something else. "but not yours. not yet."
9. In the same chat PAC-7 asks what to call you and adds you to the hosts it has lived in. `[ reboot ]` powers the CRT back on and puts the tab back.

The IP lookup is a single request from the player's own browser to ipapi.co, with ipwho.is as a fallback. Nothing is stored or sent anywhere else, and everything else is read locally.

## Leaderboard

Boards are weekly and reset every Monday at 00:00 UTC, with a live countdown on the leaderboard page (open it from the title screen). When a run ends you sign the log with a name; after a win PAC-7 asks for it in the epilogue. Names go through a small filter for slurs and swearing.

Every score is kept in the browser's localStorage (`src/leaderboard.ts`) and sent to the global board, a free Supabase project called `pac-ram` (`src/online.ts`, rules in `supabase/setup.sql`).

Scores are verified by the server. Starting a run asks the database for a one-time run ticket and records the server time. A score is only accepted through `submit_score` with an unused ticket, and only if it is possible: enough real time has passed for the board reached, it is under the ceiling for that board, and under a points-per-second ceiling. Direct inserts are off, tickets are rate-limited per IP, nobody can change or delete scores, and the board-skip shortcut only exists in test mode (`?dev`), whose runs are never submitted. The key in `src/online.ts` is a publishable key, public by design. A daily GitHub Actions job (`.github/workflows/keepalive.yml`) reads the board so the free project never pauses for inactivity.

## Analytics

Anonymous play analytics go to the same Supabase project (`src/analytics.ts`, schema in `supabase/analytics.sql`). There are no cookies and no IPs: each visit gets a random id, and a random id kept in localStorage tells repeat visits apart. A visit records device, OS, browser or in-app browser, language, time zone, screen size, country (from the network edge), referrer and `utm_*` tags (`?ref=` also works). Events cover the run: boards reached, deaths and which law caught you, clears with time, game overs, pause, quit, story and chat choices, the finale and takeover phases, escapes, names signed, scores and weekly rank, shares, clicks and errors. The public key can only append through `track()`; nothing is readable with it. Test-mode visits are flagged and left out of the stats.

Read the results in the Supabase dashboard's SQL editor: `select * from stats_daily`, `stats_funnel` (visit to share), `stats_sources`, `stats_places`, `stats_deaths`, `stats_choices`, or query `visits` and `events` directly.

## Hosting

The game is built with relative paths (`base: './'`) and published to the `gh-pages` branch. The portfolio repo (MM-PORTFOLIO) copies that branch into `/pac-ram` on every deploy, so it is served at marcomargittai.com/pac-ram. After deploying the game, run the portfolio's Pages workflow to pick it up. Old `marcomargittai.github.io/RAM-PAC` links forward to the new address with their query string.

## Sharing

After a run, SHARE YOUR RUN (on the leaderboard, and at the end of the epilogue) makes a 1080 × 1350 score card from the run (`src/share.ts`): the PAC-7 build reached, the score, the weekly rank and the link. Phones get the native share sheet with the image; desktops save the image and copy a challenge link. Challenge links (`?c=NAME&s=SCORE`) make the title screen show "NAME FED PAC-7 N BYTES. BEAT IT." Shared links unfurl with a large preview (`public/og.jpg`).

## Title screen and art

The title screen (`src/title.ts`) is drawn like an old cartridge cover: 3D pixel key art with the ROGUE AI plate built in (`tools/keyart.py`: chrome block letters in perspective with a deep extrusion), PAC-7 rising out of the horizon like a sun, a moving grid floor and PAC-7 eating a row of RAM along the horizon. Site icons come from PAC-7's last build (`tools/icons.py`), and the game uses its own pixel cursors (`tools/cursors.py`) until the glass breaks, when the real system cursor returns.

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

## Carousel and video

`carousel/` is a 14-slide post for social media at 1080 × 1350, visual-first: a hook cover, the scenario in four pictures, gameplay, PAC-7's four builds, a sprite at pixel level, the self-rewrite, the laws, the CRT shader, the logo in four passes, the design system, the voice before and after, cut concepts, the share card, and the weekly board as the closing hook. Run `npm run dev` and `node tools/carousel.cjs` to write the slides to `carousel/out/`. Concept sprites come from `tools/concepts.py`, the four regulation ghosts (ACT, BAN, BILL, CAP) from `python3 tools/ghosts.py`, the logo passes from `python3 tools/keyart.py --stages`.

The 33-second vertical highlight video was captured frame by frame from the game on a virtual clock and cut with ffmpeg; its title cards are `carousel/video/cards.html`.

## Disclaimer

PAC RAM: ROGUE AI is an independent game by Marco Margittai. It is not affiliated with, endorsed by or sponsored by Bandai Namco Entertainment, owner of PAC-MAN.
