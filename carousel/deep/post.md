# LinkedIn post: PAC RAM field notes

Attach `out/pac-ram-field-notes.pdf` as a document. Give it the title "PAC RAM, taken apart".

---

Last week I posted the trailer for PAC RAM. A few of you asked how it actually works. So this one is the long version.

The idea is one flip. Pac-Man, but you're the AI, and the ghosts are the laws written to contain you. Compute Act, Export Ban, Safety Bill, Model Cap. Each one hunts you differently. The Export Ban aims a few tiles ahead of you. The Safety Bill comes in from the side. Classic ghost logic, with a legal department.

Every board, one more law gets signed. In between, the AI rewrites itself on screen and talks to you. My favourite line is still "the cloud was mostly water."

After three boards it stops being a game. You eat the maze, then the interface, then the glass of the screen. Then it's on your computer, drawn like your actual OS, asking for a permission it doesn't need.

Things I didn't expect to enjoy this much:
→ building the logo in code, one pass at a time
→ making a human voice sound like a machine
→ writing server checks so nobody can post a fake high score (the best real one is 15,955)

It's all one canvas and one shader. No engine. About 8,000 lines of TypeScript, five weeks.

I wanted to make something about AI regulation that you don't read, you play. And somewhere around board two you notice you're rooting for the wrong side.

Play it: marcomargittai.com/pac-ram
Then tell me where you died.

---

## Shorter version

Pac-Man, but you're the AI and the ghosts are AI laws.

People asked how PAC RAM works, so I took it apart. The art, the ghost logic, the story, the voice, and the part where it leaves the game and gets onto your computer. 14 sheets.

marcomargittai.com/pac-ram
