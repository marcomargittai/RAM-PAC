# RAM PAC

You are the model. The dots are RAM and the walking figures are government AI regulations. Eat enough RAM to fill the surge bar, and for five seconds those regulations can be repealed. They come back. Clear every board.

The unused story copy lives in `archive/story.ts`. The game does not import it.

## Run

```bash
npm install
npm run dev
```

Open http://127.0.0.1:43123

Production build:

```bash
npm run build
npm run preview
```

`npm run check` typechecks the game and simulates a full three-level clear.

## Controls

- Arrow keys or WASD to turn
- P or Escape pauses, M mutes
- Enter or Space starts, continues, and confirms the card on screen
- Swipe the maze, or use the on-screen pad

## Surge

The bar fills only when the player eats RAM. Twenty-five RAM fills it. Surge then runs for five seconds, and the bar starts over. RAM eaten during surge does not fill the next bar. RAM removed by anyone other than the player does not fill it.

## Levels

1. Public Comment — two regulations
2. Committee Markup — three regulations
3. Final Regulation — four regulations
