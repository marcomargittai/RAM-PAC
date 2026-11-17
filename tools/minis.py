#!/usr/bin/env python3
"""The consumers: ordinary people who also collect RAM, as 32x32 sprites.

A little walking person, side view facing right: a big round head with a mop
of brown hair, one dark eye and a rosy cheek, an amber t-shirt, brown trousers
and shoes, carrying a RAM stick (the same peach stick as the board's pickups)
in front of the chest. Upright and two-legged, so it can never be read as a
pac. Three frames make a four-step walk cycle: stride, pass, stride, pass.

Writes public/sprites/mini-walk{1,2,3}.png.
Run from the repo root: python3 tools/minis.py [preview.png]
"""

import os
import sys

from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'sprites')
N = 32

INK = (20, 10, 6)
SKIN = (255, 222, 160)
SKIN_LO = (232, 176, 110)
CHEEK = (255, 128, 96)
EYE = (30, 18, 10)
HAIR = (120, 62, 24)
HAIR_HI = (170, 96, 40)
SHIRT = (255, 201, 74)
SHIRT_HI = (255, 228, 150)
SHIRT_LO = (214, 138, 36)
PANTS = (96, 58, 30)
PANTS_FAR = (66, 38, 20)
SHOE = (44, 26, 14)
RAM = (255, 179, 138)
RAM_HI = (255, 224, 200)
CHIP = (74, 29, 18)
GOLD = (255, 211, 107)


def rect(px, x0, y0, x1, y1, c):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            px[(x, y)] = c


def leg(px, top, foot, c, shoe_dir=1):
    """A 3-px wide leg from hip (top) to ankle (foot), then a shoe pointing forward."""
    (tx, ty), (fx, fy) = top, foot
    steps = fy - ty
    for i in range(steps + 1):
        x = round(tx + (fx - tx) * i / steps)
        rect(px, x, ty + i, x + 2, ty + i, c)
    rect(px, fx, fy + 1, fx + 3, fy + 2, SHOE)


def person(frame):
    px = {}
    lift = -1 if frame == 2 else 0  # the body rises on the passing step
    # legs first so the shirt overlaps the hips
    hip = 22 + lift
    if frame == 2:
        leg(px, (14, hip), (14, 27), PANTS_FAR)
        leg(px, (15, hip), (16, 27), PANTS)
    else:
        near, far = (PANTS, PANTS_FAR) if frame == 1 else (PANTS_FAR, PANTS)
        leg(px, (13, hip), (10, 27), far)  # back leg
        leg(px, (16, hip), (19, 27), near)  # front leg
        if frame == 3:  # the near leg is the back one now: redraw it on top
            leg(px, (13, hip), (10, 27), PANTS)

    def up(y):
        return y + lift

    # torso: amber t-shirt, lit from the front-top
    rect(px, 12, up(14), 19, up(22), SHIRT)
    rect(px, 17, up(15), 19, up(17), SHIRT_HI)
    rect(px, 12, up(20), 13, up(22), SHIRT_LO)
    rect(px, 12, up(14), 12, up(19), SHIRT_LO)
    # neck
    rect(px, 15, up(13), 17, up(13), SKIN_LO)
    # head
    head = [(12, 18), (11, 19), (10, 20), (10, 21), (10, 21), (10, 21), (10, 21), (10, 21), (11, 20), (12, 19)]
    for i, (a, b) in enumerate(head):
        rect(px, a, up(3 + i), b, up(3 + i), SKIN)
    # hair: a mop over the crown and back of the head, a fringe sweeping forward
    hair_rows = [(12, 18), (11, 20), (10, 21), (10, 21), (10, 14), (10, 13), (10, 12), (10, 12)]
    for i, (a, b) in enumerate(hair_rows):
        rect(px, a, up(3 + i), b, up(3 + i), HAIR)
    rect(px, 15, up(7), 20, up(7), HAIR)  # fringe
    for p in ((13, 4), (14, 4), (16, 4), (12, 5), (17, 5)):
        px[(p[0], up(p[1]))] = HAIR_HI
    rect(px, 11, up(2), 13, up(2), HAIR)  # cowlick
    # ear
    rect(px, 13, up(9), 13, up(10), SKIN_LO)
    # eye and cheek
    rect(px, 18, up(8), 19, up(9), EYE)
    rect(px, 17, up(11), 18, up(11), CHEEK)
    # mouth: a small smile
    px[(20, up(11))] = SKIN_LO
    # the RAM stick, carried in front of the chest
    sx, sy = 19, up(14)
    rect(px, sx, sy, sx + 9, sy + 3, RAM)
    rect(px, sx, sy, sx + 9, sy, RAM_HI)
    rect(px, sx + 2, sy + 1, sx + 3, sy + 2, CHIP)
    rect(px, sx + 6, sy + 1, sx + 7, sy + 2, CHIP)
    for x in range(sx, sx + 10, 2):
        px[(x, sy + 4)] = GOLD
    for x in range(sx + 1, sx + 10, 2):
        px[(x, sy + 4)] = RAM
    # arm: shoulder down to a hand that grips the stick from below
    rect(px, 15, up(16), 17, up(18), SHIRT)
    rect(px, 18, up(18), 20, up(19), SKIN)
    rect(px, 18, up(18), 18, up(19), SKIN_LO)
    # outline everything in ink
    shape = set(px)
    for (x, y) in shape:
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if (nx, ny) not in shape and 0 <= nx < N and 0 <= ny < N:
                px[(nx, ny)] = INK
    # ink line separating the arm from the torso
    for p in ((14, 16), (14, 17), (15, 19), (16, 19), (17, 19)):
        q = (p[0], up(p[1]))
        if px.get(q) in (SHIRT, SHIRT_LO, SHIRT_HI):
            px[q] = SHIRT_LO
    im = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    for (x, y), c in px.items():
        if 0 < x < N and 0 < y < N:
            im.putpixel((x, y), c + (255,))
    return im


def main():
    for old in ('closed', 'half', 'open'):
        path = os.path.join(OUT, f'mini-{old}.png')
        if os.path.exists(path):
            os.remove(path)
    ims = []
    for frame in (1, 2, 3):
        im = person(frame)
        im.save(os.path.join(OUT, f'mini-walk{frame}.png'))
        ims.append(im)
    if len(sys.argv) > 1:
        sheet = Image.new('RGBA', (len(ims) * 220 + 20 + 4 * 40, 230), (1, 4, 11, 255))
        for i, im in enumerate(ims):
            big = im.resize((192, 192), Image.NEAREST)
            sheet.paste(big, (20 + i * 220, 18), big)
        for i, im in enumerate(ims + [ims[1]]):
            small = im.resize((24, 24), Image.NEAREST)
            sheet.paste(small, (len(ims) * 220 + 10 + i * 40, 100), small)
        sheet.save(sys.argv[1])


if __name__ == '__main__':
    main()
