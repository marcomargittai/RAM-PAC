#!/usr/bin/env python3
"""Pixel cursors for the game, in the CRT palette.

arrow    the default pointer: ice fill, black outline
pointer  over anything clickable: alert pink, with a spark
Drawn on a 16x16 grid and saved at 2x. Run from the repo root:
python3 tools/cursors.py
"""

import os

from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'cursors')

ARROW = [
    'X...............',
    'XX..............',
    'X1X.............',
    'X11X............',
    'X111X...........',
    'X1111X..........',
    'X11111X.........',
    'X111111X........',
    'X1111111X.......',
    'X11111111X......',
    'X11111XXXXX.....',
    'X11X11X.........',
    'X1X.X11X........',
    'XX..X11X........',
    '.....X11X.......',
    '.....XXX........',
]

SPARK = [(12, 1), (12, 3), (11, 2), (13, 2), (12, 2)]


def draw(fill, shade, extra=()):
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    for y, row in enumerate(ARROW):
        for x, c in enumerate(row):
            if c == 'X':
                im.putpixel((x, y), (0, 0, 0, 255))
            elif c == '1':
                # a darker edge on the right side gives the arrow some depth
                right = x + 1 < 16 and ARROW[y][x + 1] == 'X'
                im.putpixel((x, y), (shade if right else fill) + (255,))
    for (x, y, c) in extra:
        im.putpixel((x, y), c + (255,))
    return im.resize((32, 32), Image.NEAREST)


def main():
    os.makedirs(OUT, exist_ok=True)
    draw((226, 245, 255), (108, 200, 255)).save(os.path.join(OUT, 'arrow.png'))
    spark = [(x, y, (255, 45, 111) if (x, y) != (12, 2) else (255, 255, 255)) for (x, y) in SPARK]
    draw((255, 45, 111), (190, 20, 80), spark).save(os.path.join(OUT, 'pointer.png'))


if __name__ == '__main__':
    main()
