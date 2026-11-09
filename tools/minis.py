#!/usr/bin/env python3
"""The mini-pacs: ordinary consumers who also collect RAM, as 32x32 sprites.

A small warm-amber pac with one big friendly round eye, rosy cheek and a
little tuft of hair, so it reads as a person at home rather than a machine.
It is smaller than any of the player's forms and has none of their screens,
armour or circuitry. Faces right like the pac forms, three mouth frames.

Writes public/sprites/mini-{closed,half,open}.png.
Run from the repo root: python3 tools/minis.py [preview.png]
"""

import math
import os
import sys

from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'sprites')
N = 32
MOUTH = {'closed': 0, 'half': 26, 'open': 46}

INK = (20, 10, 6)
BODY = (255, 201, 74)
HI = (255, 228, 150)
LO = (214, 138, 36)
CHEEK = (255, 128, 96)
HAIR = (120, 62, 24)
HAIR_HI = (170, 96, 40)
EYE = (250, 250, 245)
PUPIL = (40, 26, 16)


def mini(frame):
    cx, cy, r = 15.5, 17.0, 10.6
    body = {(x, y) for y in range(N) for x in range(N) if (x - cx) ** 2 + (y - cy) ** 2 <= r * r}
    a = math.radians(MOUTH[frame])
    if a > 0:
        body = {(x, y) for (x, y) in body if not (x > cx and abs(math.atan2(y - cy, x - cx)) < a)}
    # a cowlick on the crown
    tuft = {(13, 5), (14, 5), (14, 4), (15, 4)}
    shape = body | tuft
    px = {}
    for (x, y) in body:
        d = math.hypot(x - (cx - 3), y - (cy - 4))
        c = BODY
        if d < 4.2:
            c = HI
        if math.hypot(x - cx, y - (cy - 3)) > r - 1.3 and y > cy:
            c = LO
        px[(x, y)] = c
    # a mop of brown hair over the top and back of the head, fringe sweeping forward
    for (x, y) in body:
        fringe = 8.4 + max(0, x - 15) * 0.55
        if y < fringe and x < 23:
            px[(x, y)] = HAIR_HI if (x + y) % 4 == 0 and y < 7 else HAIR
        if x <= 7 and y < 14:
            px[(x, y)] = HAIR
    for p in tuft:
        px[p] = HAIR
    # one big round eye, pupil looking ahead
    ex, ey = 13.5, 12.0
    for y in range(8, 17):
        for x in range(9, 19):
            if (x - ex) ** 2 + (y - ey) ** 2 <= 8.5:
                px[(x, y)] = EYE
    for p in ((14, 11), (15, 11), (14, 12), (15, 12), (14, 13), (15, 13)):
        px[p] = PUPIL
    # eye rim
    for (x, y) in list(px):
        if px[(x, y)] == EYE:
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if (nx, ny) in px and px[(nx, ny)] not in (EYE, PUPIL):
                    px[(nx, ny)] = INK
    # rosy cheek
    for p in ((9, 18), (10, 18), (9, 19), (10, 19), (11, 19)):
        if p in body:
            px[p] = CHEEK
    if frame == 'closed':
        for x in range(int(cx) + 2, N):
            if (x, int(cy)) in body:
                px[(x, int(cy))] = INK
    # outline
    for (x, y) in shape:
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if (nx, ny) not in shape and 0 <= nx < N and 0 <= ny < N:
                px[(nx, ny)] = INK
    im = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    for (x, y), c in px.items():
        if 0 <= x < N and 0 <= y < N:
            im.putpixel((x, y), c + (255,))
    return im


def main():
    ims = []
    for frame in ('closed', 'half', 'open'):
        im = mini(frame)
        im.save(os.path.join(OUT, f'mini-{frame}.png'))
        ims.append(im)
    if len(sys.argv) > 1:
        sheet = Image.new('RGBA', (len(ims) * 280 + 20, 300), (1, 4, 11, 255))
        for i, im in enumerate(ims):
            big = im.resize((256, 256), Image.NEAREST)
            sheet.paste(big, (20 + i * 280, 22), big)
        sheet.save(sys.argv[1])


if __name__ == '__main__':
    main()
