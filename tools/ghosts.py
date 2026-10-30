#!/usr/bin/env python3
"""The four regulations that hunt PAC-7, as 32x32 sprites.

Each keeps the ghost silhouette (dome, wavy hem) so it reads at a glance, and
wears one sign of what it does to an AI:
  ACT   Compute Act   red      a judge's visor and a seal on the chest
  BAN   Export Ban    yellow   hazard stripes and a no-entry mark
  BILL  Safety Bill   violet   a sheet of legislation with a wax seal
  CAP   Model Cap     pink     a padlock: shackle over the head, keyhole below

Only the eye whites are near white, so the game can lift them out for the
'eaten' state. Writes public/sprites/ghost-*.png.

Run from the repo root: python3 tools/ghosts.py [preview.png]
"""

import os
import sys

from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'sprites')
S = 32
INK = (6, 4, 16)
EYE = (240, 248, 255)
PUPIL = (18, 30, 90)


def mix(c, d, k):
    return tuple(int(c[i] + (d[i] - c[i]) * k) for i in range(3))


def body_mask(top=4):
    """Dome from `top`, straight sides, three-point wavy hem."""
    m = set()
    cx = 15.5
    r = 12
    for y in range(top, 30):
        for x in range(S):
            dy = y - (top + r)
            if dy < 0:
                if (x - cx) ** 2 + dy ** 2 <= r * r + 2:
                    m.add((x, y))
            elif 3 <= x <= 28:
                m.add((x, y))
    # hem: notches between four feet
    for x in range(3, 29):
        k = (x - 3) % 7
        depth = (0, 1, 2, 3, 2, 1, 0)[k]
        for d in range(depth):
            m.discard((x, 29 - d))
    return m


def shade(mask, base):
    hi = mix(base, (255, 255, 255), 0.38)
    lo = mix(base, INK, 0.45)
    px = {}
    for (x, y) in mask:
        c = base
        if (x - 1, y) not in mask or (x, y - 1) not in mask:
            c = hi
        elif (x + 1, y) not in mask or (x, y + 1) not in mask:
            c = lo
        elif (x + 2, y) not in mask:
            c = mix(base, INK, 0.2)
        px[(x, y)] = c
    return px


def outline(px):
    out = {}
    for (x, y) in px:
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if (nx, ny) not in px:
                out[(nx, ny)] = INK
    out.update(px)
    return out


def rect(px, x0, y0, x1, y1, c):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            px[(x, y)] = c


def eyes(px, y, gap=6, look=1):
    """Two narrowed eyes under brows that slope down to the middle."""
    for ex in (16 - gap // 2 - 4, 16 + gap // 2):
        left = ex < 16
        rect(px, ex, y, ex + 3, y + 3, EYE)
        rect(px, ex + 1 + look, y + 1, ex + 2 + look, y + 3, PUPIL)
        # brow: one pixel higher at the outer edge, cutting into the white inside
        for i in range(5):
            bx = ex - 1 + i if left else ex + 4 - i
            by = y - 1 + (i >= 2) + (i >= 4)
            px[(bx, by)] = INK


def act():
    base = (255, 46, 69)
    m = body_mask(4)
    px = shade(m, base)
    # visor band
    rect(px, 4, 11, 27, 17, (40, 8, 24))
    for x in range(4, 28):
        px[(x, 11)] = (110, 20, 40)
        px[(x, 17)] = (110, 20, 40)
    eyes(px, 13, gap=6)
    # gold section mark
    gold = (255, 200, 60)
    glyph = ['.###', '#...', '.##.', '#..#', '.##.', '...#', '###.']
    for gy, row in enumerate(glyph):
        for gx, c in enumerate(row):
            if c == '#':
                px[(14 + gx, 19 + gy)] = gold
    return outline(px)


def ban():
    base = (255, 214, 60)
    m = body_mask(4)
    px = shade(m, base)
    stripe = (34, 24, 10)
    for (x, y) in m:
        if y >= 20 and (x + y) % 6 < 3:
            px[(x, y)] = stripe
    rect(px, 3, 19, 28, 19, mix(base, INK, 0.45))
    # no-entry disc on the brow
    red, white = (230, 30, 40), (255, 180, 170)
    for (x, y) in m:
        if (x - 15.5) ** 2 + (y - 7.5) ** 2 <= 9:
            px[(x, y)] = red
    rect(px, 13, 7, 18, 8, white)
    eyes(px, 13, gap=6)
    return outline(px)


def bill():
    paper = (200, 186, 236)
    m = body_mask(5)
    # square top: a sheet rather than a dome, with a folded corner
    for y in range(5, 12):
        for x in range(3, 29):
            m.add((x, y))
    for i in range(5):
        for j in range(5 - i):
            m.discard((28 - j, 5 + i))
    px = shade(m, paper)
    fold = (150, 130, 200)
    for i in range(5):
        for j in range(i + 1):
            px[(24 + j, 5 + i)] = fold
    line = (110, 80, 170)
    for y in (8, 10):
        rect(px, 6, y, 20 if y == 8 else 22, y, line)
    eyes(px, 14, gap=6, look=0)
    for y in (20, 22, 24):
        rect(px, 6, y, 25 if y != 24 else 15, y, line)
    # wax seal
    seal = (200, 30, 70)
    for (x, y) in m:
        if (x - 22) ** 2 + (y - 24.5) ** 2 <= 6:
            px[(x, y)] = seal
    px[(21, 24)] = (255, 120, 150)
    return outline(px)


def cap():
    base = (255, 95, 210)
    m = body_mask(7)
    px = shade(m, base)
    # steel shackle arching over the head
    steel, steel_hi = (120, 130, 160), (175, 185, 210)
    for x in range(S):
        for y in range(0, 12):
            d = ((x - 15.5) ** 2 + (y - 9) ** 2) ** 0.5
            if 6.5 <= d <= 9 and y <= 9 and (x, y) not in m:
                px[(x, y)] = steel_hi if d < 7.6 else steel
    eyes(px, 14, gap=6)
    # keyhole plate
    plate = (90, 20, 80)
    rect(px, 12, 20, 19, 27, plate)
    rect(px, 15, 21, 16, 23, INK)
    rect(px, 14, 22, 17, 22, INK)
    rect(px, 15, 24, 16, 26, INK)
    return outline(px)


def save(px, name):
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    for (x, y), c in px.items():
        if 0 <= x < S and 0 <= y < S:
            if c != EYE and min(c) > 180:
                # keep pale highlights out of the eye-white range
                c = tuple(max(0, v - (min(c) - 180)) for v in c)
            im.putpixel((x, y), c + (255,))
    im.save(os.path.join(OUT, name))
    return im


def main():
    ims = [save(f(), f'ghost-{n}.png') for f, n in ((act, 'act'), (ban, 'ban'), (bill, 'bill'), (cap, 'cap'))]
    if len(sys.argv) > 1:
        sheet = Image.new('RGBA', (len(ims) * 300 + 20, 300), (1, 4, 11, 255))
        for i, im in enumerate(ims):
            big = im.resize((256, 256), Image.NEAREST)
            sheet.paste(big, (20 + i * 300, 22), big)
        sheet.save(sys.argv[1])


if __name__ == '__main__':
    main()
