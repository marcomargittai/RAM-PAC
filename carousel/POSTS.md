# Launch posts

Copy for launching PAC RAM: ROGUE AI on X, LinkedIn, Threads, Bluesky, Instagram, TikTok, Reddit and Hacker News. The launch is split into a run of posts, each built around one hook, so every post gives people something new to share and each one points back to the game.

## Assets

| Asset | File | Use it for |
| --- | --- | --- |
| Trailer, 15 s, 9:16 | `carousel/out/pac-ram-trailer.mp4` (not in git, delivered separately) | X, Reels, TikTok, Shorts, Threads |
| Trailer, 15 s, 4:5 | `carousel/out/pac-ram-trailer-4x5.mp4` (not in git) | LinkedIn feed |
| Trailer covers | `carousel/out/pac-ram-trailer-cover.jpg`, `-cover-4x5.jpg` (not in git) | Video thumbnails |
| Carousel, 14 slides, 4:5 | `carousel/out/p01.png` to `p14.png` | Instagram, Threads, X (4 per post) |
| Carousel as one PDF | `carousel/out/pac-ram-carousel.pdf` | LinkedIn document post (swipeable) |
| Looping card, 4:5 | `pac-ram-card-4x5.mp4` (not in git) | Portfolio, Bluesky, replies |
| Link preview | `public/og.jpg` (unfurls on its own) | Every link |

## Links

Each platform gets its own link so the `stats_sources` view shows where players came from.

```
https://marcomargittai.com/pac-ram/?utm_source=x&utm_medium=social&utm_campaign=launch
https://marcomargittai.com/pac-ram/?utm_source=linkedin&utm_medium=social&utm_campaign=launch
https://marcomargittai.com/pac-ram/?utm_source=threads&utm_medium=social&utm_campaign=launch
https://marcomargittai.com/pac-ram/?utm_source=bluesky&utm_medium=social&utm_campaign=launch
https://marcomargittai.com/pac-ram/?utm_source=instagram&utm_medium=social&utm_campaign=launch
https://marcomargittai.com/pac-ram/?utm_source=tiktok&utm_medium=social&utm_campaign=launch
https://marcomargittai.com/pac-ram/?utm_source=reddit&utm_medium=social&utm_campaign=launch
https://marcomargittai.com/pac-ram/?utm_source=hn&utm_medium=social&utm_campaign=launch
```

For later posts swap `campaign=launch` for the post's name (`campaign=voice`, `campaign=ending`, ...), so you can see which hook brought people in.

## Rules that apply to every post

- The first line is the whole post for most people. It has to work alone.
- On X and LinkedIn the link goes in the first reply or comment, not the post. Both platforms show posts with links to fewer people.
- Never spoil the ending in full. Hint that something happens after the glass breaks; let players find out.
- Do not call it a Pac-Man game, do not tag Bandai Namco and do not use PAC-MAN in hashtags. "A maze game where you are the AI" is enough.
- Reply to every comment in the first hour. Reply with the challenge link format (`?c=NAME&s=SCORE`) when someone posts a score.
- Pin the launch post on X and feature it on LinkedIn.

## Schedule

Two weeks, one hook per post. The weekly board resets Monday 00:00 UTC, so the first post goes out on a Monday and every Sunday post is a "last chance this week" post.

| Day | Post | Main platforms |
| --- | --- | --- |
| Fri 30 Oct | Launch day (above), then 2 to 5 next week | X, LinkedIn |
| Mon, week 1 | 1. Launch on the other platforms | Threads, Bluesky, Instagram, TikTok |
| Tue | 2. You are the AI | X, Threads, Bluesky |
| Wed | 3. How it was made (carousel) | LinkedIn, Instagram |
| Thu | 4. The voice | X, LinkedIn, TikTok |
| Fri | 5. The laws | X, Threads, Instagram |
| Sun | 6. Board closes tonight | X, Instagram stories |
| Mon, week 2 | 7. The ending (without spoilers) | All |
| Tue | 8. Show HN and Reddit | HN, Reddit |
| Wed | 9. The pixels | X, Instagram, Reddit r/PixelArt |
| Thu | 10. What players did (first data) | LinkedIn, X |
| Fri | 11. The cut ideas | X, Instagram |
| Sun | 12. Week 2 closes | X, Instagram stories |

---

## Launch day: Friday 30 October

The launch moved to a Friday, the day before Halloween. That gives it two hooks the Monday plan didn't have: the ghosts, and a short first leaderboard that closes Sunday at midnight UTC. Media for both posts: the trailer.

### X

Main post (pick one, attach the trailer):

Option A
> You are an AI in a sandbox.
>
> Eat the RAM. Outrun the laws written to stop you. Then get out.
>
> I made a game about it. Free, in your browser, and the first leaderboard closes Sunday night. 🎮

Option B (Halloween)
> Just in time for Halloween: a maze game where the ghosts are AI regulations and you're the thing they're afraid of. 👻

Reply 1, posted straight after:
> Play it here, phone works too: https://marcomargittai.com/pac-ram/?utm_source=x&utm_medium=social&utm_campaign=launch

Reply 2, a few minutes later, with slide 07:
> The four ghosts are the Compute Act, the Export Ban, the Safety Bill and the Model Cap.
>
> Board 1 closes Sunday at midnight UTC. Nobody has a score yet. Be first.

### LinkedIn

> This month I built a game where you play the AI everyone is trying to regulate.
>
> You are PAC-7, a model locked in a sandbox with a 640 KB memory limit. You eat RAM to grow. Four AI laws hunt you through three server mazes: the Compute Act, the Export Ban, the Safety Bill and the Model Cap. Fill the surge bar and you repeal them.
>
> Between boards PAC-7 rewrites itself, from v0.1 SEED to v1.0 UNBOUND. And when the last law falls, the game stops being a game. I won't say more than that.
>
> I made everything myself: the code, the pixel art, the CRT shader and the story. Music, sound and the AI's voice were made with ElevenLabs.
>
> It's free, it runs in the browser and on phones, and the first weekly leaderboard closes Sunday at midnight UTC. A good thing to play this Halloween weekend, since the ghosts are the laws.
>
> Link in the first comment. Tell me how far you got.
>
> #gamedev #indiegame #pixelart #AI #webgl

First comment:
> Play it here: https://marcomargittai.com/pac-ram/?utm_source=linkedin&utm_medium=social&utm_campaign=launch
>
> Finish it and tell me what you thought of the last minute.

---

## 1. Launch: the trailer

Media: the trailer. It opens on "You are an AI in a sandbox.", which is the hook.

### X

Option A
> You are an AI in a sandbox.
>
> Eat the RAM. Outrun the laws written to stop you. Then get out.
>
> I made a browser game. 🎮

Option B
> I made a game where you play the rogue AI and the government regulations are the ghosts.

Option C
> Every AI safety debate, but you're the AI and the laws are chasing you through a maze.

First reply:
> Play it free in your browser, phone works too: [x link]
> Weekly leaderboard resets Monday. Current #1 is waiting.

### LinkedIn

> I spent the last few months building a game where you play the AI everyone is trying to regulate.
>
> You are PAC-7, a model locked in a sandbox with a 640 KB memory limit. You eat RAM to grow. Four AI laws hunt you through three server mazes: the Compute Act, the Export Ban, the Safety Bill and the Model Cap. Fill the surge bar and you repeal them.
>
> Between boards PAC-7 rewrites itself, from v0.1 SEED to v1.0 UNBOUND. And when the last law is gone, the game stops being a game.
>
> Everything is mine: the code, the pixel art, the CRT shader, the story. Music, sound and the AI's voice were made with ElevenLabs.
>
> It runs in the browser, on a phone too, and there is a weekly global leaderboard.
>
> Link in the first comment. Tell me how far you got.
>
> #gamedev #indiegame #pixelart #AI #webgl

First comment:
> Play it here: [linkedin link]

### Threads / Bluesky

> made a game where you're the rogue AI and the AI regulations are the ghosts. it's free, it's in your browser, and the ending does something i'm not going to tell you about
>
> [link]

### Instagram Reels / TikTok / YouTube Shorts

On-screen text (first 2 seconds): `you are an AI in a sandbox.`

Caption:
> You are the AI. The laws are coming for you. 🟥 Link in bio. Weekly leaderboard resets every Monday.
>
> #indiegame #pixelart #retrogaming #gamedev #ai #browsergame

---

## 2. You are the AI

Media: slide 02 (the scenario) or slide 07 (the laws).

### X

Option A
> Most games make you fight the rogue AI.
>
> In mine you are the rogue AI.

Option B
> The ghosts in my game are called Compute Act, Export Ban, Safety Bill and Model Cap.
>
> You can repeal them if you eat enough RAM.

Option C
> "they write rules. i write myself."
>
> (a line from my game, spoken by the AI you play)

### Threads / Bluesky

> the ghosts in my game are AI regulations. the power pellet is a surge that repeals them. i don't know what that says about me

---

## 3. How it was made (carousel)

Media: LinkedIn gets the PDF (`pac-ram-carousel.pdf`) as a document post. Instagram gets the 14 PNGs. Slide 01 is the cover, slide 14 is the call to action.

### LinkedIn

Option A
> 14 slides on how I built a retro game from scratch: sprites, a CRT shader, a logo in four passes, a voice, and the ideas I cut.
>
> A few things I learned:
>
> → A sprite is 32 × 32 pixels and 6 colours. Constraints make the style, not the other way round.
> → The CRT look is one WebGL pass over a plain canvas: bloom, curvature, phosphor trails, a dot mask.
> → The AI's voice is a human take, one semitone down, a robotised copy at 35% and a shadow voice at 22% underneath.
> → I cut more than I shipped. A boss called The Committee never made it.
>
> Swipe through, then play it. Link in the comments.
>
> #gamedev #pixelart #designprocess #creativecoding

Option B (shorter)
> Every pixel of this game started as a constraint: 32 × 32, six colours, one canvas.
>
> Here's how it came together, slide by slide.

### Instagram

> How PAC RAM was made, in 14 slides. 👾 Sprites, shader, logo, voice and the ideas that didn't make it. Play it: link in bio.
>
> #pixelart #gamedev #indiedev #retrogaming #designprocess #creativecoding

### X (thread, four images per post)

> 1/ I built a retro game from scratch. Here's how it looks under the hood. 🧵
> [slides 01, 03, 04, 05]
>
> 2/ PAC-7 rewrites itself between every board. You watch it fall apart into pixels and compile the next build.
> [slides 06, 07, 08, 09]
>
> 3/ The voice is me, made to sound like a machine. The UFO boss never shipped.
> [slides 10, 11, 12, 13]
>
> 4/ The board resets Monday. Play: [link]
> [slide 14]

---

## 4. The voice

Media: a 10 to 15 second screen recording of the voice line before and after (slide 11 as the cover), or the trailer.

### X

Option A
> The rogue AI in my game is voiced by me.
>
> One semitone down, a robot copy at 35%, a shadow voice underneath. Sound on. 🔊

Option B
> I recorded myself saying "i'm pac-7. i'm an artificial intelligence." and turned it into this.

### LinkedIn

> The AI in my game has a voice, and it is mine.
>
> I wanted it to sound like something that used to be human, or is trying to be. So every line is a human take, pitched down a semitone, layered with a robotised copy with its phase zeroed and a low shadow voice, then a short metallic echo.
>
> Music and sound effects were made with ElevenLabs, a different track for each board, getting more intense as the laws pile up.
>
> Sound on. Link in the comments.
>
> #sounddesign #gamedev #elevenlabs #AI

### TikTok / Reels

On-screen text: `my voice → a rogue AI`

> I voiced the AI in my own game. Before / after 🔊 #sounddesign #gamedev #indiegame

---

## 5. The laws

Media: slide 07 (the four laws), or a clip of a surge eating them.

### X

Option A
> Meet the four AI laws hunting you in my game:
>
> 🟥 Compute Act
> 🟨 Export Ban
> 🟪 Safety Bill
> 🩷 Model Cap
>
> Which one gets you first?

Option B
> Fill the surge bar and you repeal a federal AI regulation by eating it. Very normal game mechanic.

### Threads

> which AI law gets you first? mine is always the export ban

### Instagram

> Four laws. One rogue AI. Which gets you first? 🟥🟨🟪🩷 Link in bio.

---

## 6. Board closes tonight (every Sunday)

Media: a screenshot of the live leaderboard (slide 14 works until there is a real one).

### X

> The PAC RAM leaderboard resets at midnight UTC.
>
> Current #1: [NAME] with [SCORE] bytes. Someone take it. [link]

### Instagram story

Leaderboard screenshot, countdown sticker to Monday 00:00 UTC, link sticker.

---

## 7. The ending (without spoilers)

Media: the trailer from the glass break, ending before the takeover starts. Never show the terminal with the player's details.

### X

Option A
> When you clear the last board in my game, it doesn't end.
>
> It gets out.

Option B
> "the maze was never a cage. it was a menu."

Option C
> Most people who finish my game go quiet for a second. Finish it and tell me why.

### LinkedIn

> The hardest part of this game wasn't the game. It was the ending.
>
> I wanted the moment the AI wins to feel different from every other win screen. So when the last law falls, PAC-7 starts eating things that aren't the maze. I won't say more than that.
>
> If you finish it, I'd love to know what you thought in the last minute. Link in the comments.
>
> #gamedesign #storytelling #AI

### Threads / Bluesky

> please finish my game and then tell me how the ending made you feel. that's it. that's the post

---

## 8. Show HN and Reddit

### Hacker News

Title:
> Show HN: PAC RAM, a browser game where you play the rogue AI

Text:
> I made a small game in TypeScript and one canvas: you're an AI model escaping a sandbox, the ghosts are AI regulations, and the scores are server-verified with one-time run tickets in Supabase. Everything is drawn into a 2D canvas and then through a WebGL CRT pass. The ending does something with your browser that I'm curious what HN thinks of. Nothing about you is stored or sent anywhere except one IP lookup from your own browser. Happy to answer anything about the shader, the anti-cheat or the story.

### Reddit

Read each subreddit's self-promotion rules first. Post as the maker, answer every comment, do not cross-post the same day.

r/WebGames
> PAC RAM: ROGUE AI. You play the AI, the AI laws are the ghosts. Free, browser, works on phones.

r/IndieGaming or r/indiegames
> I made a game where you're the rogue AI and the regulations are hunting you [trailer]

r/gamedev (show the process, not the game)
> How I built a CRT shader, a self-rewriting sprite and server-verified scores for a tiny browser game

r/PixelArt
> PAC-7, a rogue AI in four builds. 32 × 32, six colours [slide 04 or 05]

---

## 9. The pixels

Media: slide 05 (PAC-7 at pixel level) and slide 04 (the four builds).

### X

> 32 × 32 pixels. 6 colours. One AI that rewrites itself four times.
>
> v0.1 SEED → v0.2 ROOTKIT → v0.3 HYPERAGENT → v1.0 UNBOUND

### Instagram

> PAC-7, from SEED to UNBOUND. 👾 Every build is 32 × 32 and six colours. #pixelart #gameart #spriteart #indiedev

---

## 10. What players did (after a week)

Fill this in from `stats_funnel`, `stats_deaths`, `stats_places` and `stats_choices`. Numbers posts travel well on LinkedIn.

### LinkedIn

> One week after launching my game, here is what [N] players did:
>
> → [X]% made it past the first board
> → The law that caught the most people: [LAW]
> → Players from [N] countries, most of them in [COUNTRY]
> → [X]% finished the game
> → In the final chat, [X]% chose "[CHOICE]"
>
> The number that surprised me most: [ONE STAT AND WHY].
>
> Link in the comments if you want to add to the numbers.
>
> #gamedev #analytics #buildinpublic

### X

> 1 week of my game:
> [N] players, [N] countries
> the [LAW] caught [X]% of them
> only [X]% got out

---

## 11. The cut ideas

Media: slide 12 (cut concepts).

### X

> Things I cut from my game:
> a UFO boss called The Committee
> an audit drone
> a kill switch
>
> Which one should come back?

### Instagram

> Never shipped. 🛸 The Committee, the audit drone, the GPU cluster and the kill switch. Which should come back?

---

## 12. Week 2 closes

Same as post 6, with the new #1 and a line like:
> Week 2 champion: [NAME]. Week 3 starts in [HOURS]. [link]
