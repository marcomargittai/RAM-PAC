# LinkedIn post: PAC RAM field notes

Attach `out/pac-ram-field-notes.pdf` as a document. Give it the title "PAC RAM, taken apart".

---

Last week I shared the trailer for PAC RAM. A few people asked how it works, so I put together some notes on the art, the logic and the story.

The idea: Pac-Man, but you play the AI. The four ghosts are AI laws: Compute Act, Export Ban, Safety Bill and Model Cap. They use the same targeting logic as the original ghosts. One chases you, one cuts you off, one flanks and one guards a corner.

The three boards are named after the steps a bill goes through, and each one adds a law. Between boards the AI rewrites itself into a new build and talks to you. After the last board the game falls away. You eat the maze, then the interface, then the screen, and it carries on as if it's on your own computer.

Everything is drawn into one canvas and finished by one WebGL shader. No engine. The logo, sprites and cursors are generated with small scripts, the voice is a human take run through a processing chain, and the music and effects are made with ElevenLabs.

It took about five weeks. Scores are verified on the server and the leaderboard resets every Monday.

Play it at marcomargittai.com/pac-ram

---

## Shorter version

Some notes on how PAC RAM works: the ghost logic, the upgrades, the art direction and the ending. 9 sheets.

marcomargittai.com/pac-ram
