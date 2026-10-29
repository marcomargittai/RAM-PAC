#!/usr/bin/env python3
"""The PAC RAM title logo, drawn the way NES title screens were: chunky
italic letters filled with horizontal colour bands, a dark extrusion
underneath and a black outline. Writes public/art/logo.png at native pixel
size; the game scales it up without smoothing.

Run from the repo root: python3 tools/logo.py
"""

import os

from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'art')

H = 30  # letter height
T = 6  # stroke
W = 22  # letter width
GAP = 4
CH = 5  # corner chamfer
SHEAR = 0.32
DEPTH = 7


def letter(ch):
    px = set()

    def box(x0, y0, x1, y1):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                px.add((x, y))

    def cut(corner, size=CH):
        # chamfer an outer corner
        for i in range(size):
            for j in range(size - i):
                if corner == 'tl':
                    px.discard((i, j))
                elif corner == 'tr':
                    px.discard((W - 1 - i, j))
                elif corner == 'bl':
                    px.discard((i, H - 1 - j))
                elif corner == 'br':
                    px.discard((W - 1 - i, H - 1 - j))

    mid = H // 2 - 2
    if ch == 'P':
        box(0, 0, T - 1, H - 1)
        box(0, 0, W - 1, T - 1)
        box(W - T, 0, W - 1, mid + T - 1)
        box(0, mid, W - 1, mid + T - 1)
        cut('tr')
        cut('br_mid')
        # chamfer the bowl's lower right corner
        for i in range(CH):
            for j in range(CH - i):
                px.discard((W - 1 - i, mid + T - 1 - j))
        cut('tl', 3)
    elif ch == 'A':
        box(0, 0, T - 1, H - 1)
        box(W - T, 0, W - 1, H - 1)
        box(0, 0, W - 1, T - 1)
        box(0, mid, W - 1, mid + T - 1)
        cut('tl', CH + 2)
        cut('tr', CH + 2)
    elif ch == 'C':
        box(0, 0, T - 1, H - 1)
        box(0, 0, W - 1, T - 1)
        box(0, H - T, W - 1, H - 1)
        cut('tl', CH + 2)
        cut('bl', CH + 2)
        cut('tr', 3)
        cut('br', 3)
    elif ch == 'R':
        box(0, 0, T - 1, H - 1)
        box(0, 0, W - 1, T - 1)
        box(W - T, 0, W - 1, mid + T - 1)
        box(0, mid, W - 1, mid + T - 1)
        # diagonal leg kicking out from the bowl
        for y in range(mid + T, H):
            u = (y - (mid + T)) / max(1, H - 1 - (mid + T))
            x0 = int(round(T + 2 + u * (W - T - 3)))
            box(x0, y, min(W - 1, x0 + T), y)
        for i in range(CH):
            for j in range(CH - i):
                px.discard((W - 1 - i, mid + T - 1 - j))
        cut('tr')
        cut('tl', 3)
    elif ch == 'M':
        box(0, 0, T - 1, H - 1)
        box(W - T, 0, W - 1, H - 1)
        box(0, 0, W - 1, T - 1)
        box(W // 2 - T // 2, 0, W // 2 + T // 2 - 1, H - 8)
        cut('tl', CH + 2)
        cut('tr', CH + 2)
    return px


# colour bands by row, top to bottom: ice above the horizon, pink below
def band(y):
    rows = [
        (255, 255, 255), (255, 255, 255), (226, 245, 255), (226, 245, 255), (226, 245, 255),
        (90, 170, 220), (127, 233, 255), (127, 233, 255), (127, 233, 255),
        (40, 120, 200), (108, 200, 255), (108, 200, 255), (80, 170, 240),
        (255, 255, 255),
        (255, 205, 225), (255, 190, 215), (255, 170, 200),
        (200, 60, 120), (255, 110, 160), (255, 95, 150), (255, 80, 140),
        (170, 20, 80), (255, 45, 111), (255, 45, 111), (240, 35, 100),
        (130, 10, 60), (210, 25, 90), (190, 20, 85), (170, 15, 80), (150, 12, 72),
    ]
    return rows[min(y, len(rows) - 1)]


def main():
    word = 'PAC RAM'
    xs = []
    x = 0
    for ch in word:
        if ch == ' ':
            x += W // 2 + GAP
            continue
        xs.append((ch, x))
        x += W + GAP
    width = x - GAP + int(H * SHEAR) + DEPTH + 4
    height = H + DEPTH + 4
    face = {}
    for ch, ox in xs:
        for (px, py) in letter(ch):
            sx = ox + px + int(round((H - 1 - py) * SHEAR)) + 2
            face[(sx, py + 2)] = band(py)
    shape = set(face)
    # extrusion: the letters pushed down and slightly right, darker with depth
    depth = {}
    for d in range(DEPTH, 0, -1):
        shade = 20 + int((DEPTH - d) * 7)
        for (x0, y0) in shape:
            p = (x0 + d // 3, y0 + d)
            if p not in shape:
                depth[p] = (shade // 2 + 8, shade // 5, shade // 2 + 30)
    # a black edge where the face meets its own extrusion keeps letters readable
    for (x0, y0) in list(depth):
        if any((nx, ny) in shape for nx, ny in ((x0, y0 - 1), (x0 - 1, y0))):
            depth[(x0, y0)] = (0, 0, 0)
    allpx = shape | set(depth)
    outline = set()
    for (x0, y0) in allpx:
        for nx, ny in ((x0 + 1, y0), (x0 - 1, y0), (x0, y0 + 1), (x0, y0 - 1)):
            if (nx, ny) not in allpx:
                outline.add((nx, ny))
    im = Image.new('RGBA', (width + 4, height + 4), (0, 0, 0, 0))
    for (x0, y0) in outline:
        if 0 <= x0 < im.width and 0 <= y0 < im.height:
            im.putpixel((x0, y0), (0, 0, 0, 255))
    for (x0, y0), c in depth.items():
        im.putpixel((x0, y0), c + (255,))
    for (x0, y0), c in face.items():
        im.putpixel((x0, y0), c + (255,))
    os.makedirs(OUT, exist_ok=True)
    im = im.crop(im.getbbox())
    im.save(os.path.join(OUT, 'logo.png'))
    print('logo', im.size)


if __name__ == '__main__':
    main()


GLYPHS = {
    'R': ['1111.', '1...1', '1...1', '1111.', '1.1..', '1..1.', '1...1'],
    'O': ['.111.', '1...1', '1...1', '1...1', '1...1', '1...1', '.111.'],
    'G': ['.1111', '1....', '1....', '1.111', '1...1', '1...1', '.111.'],
    'U': ['1...1', '1...1', '1...1', '1...1', '1...1', '1...1', '.111.'],
    'E': ['11111', '1....', '1....', '1111.', '1....', '1....', '11111'],
    'A': ['.111.', '1...1', '1...1', '11111', '1...1', '1...1', '1...1'],
    'I': ['111', '.1.', '.1.', '.1.', '.1.', '.1.', '111'],
}


def tagline(text='ROGUE AI'):
    """Small striped pixel lettering between two pink bars."""
    cell = 2
    stripes = [(255, 255, 255), (226, 245, 255), (190, 232, 255), (127, 233, 255), (127, 233, 255), (108, 200, 255), (80, 170, 240)]
    px = {}
    x = 0
    for ch in text:
        if ch == ' ':
            x += 4 * cell
            continue
        g = GLYPHS[ch]
        for gy, row in enumerate(g):
            for gx, c in enumerate(row):
                if c == '1':
                    for dy in range(cell):
                        for dx in range(cell):
                            px[(x + gx * cell + dx, 6 + gy * cell + dy)] = stripes[gy]
        x += (len(g[0]) + 1) * cell
    width = x - cell
    im = Image.new('RGBA', (width + 2, 6 + 7 * cell + 7), (0, 0, 0, 0))
    for xx in range(width + 2):
        im.putpixel((xx, 1), (255, 45, 111, 255))
        im.putpixel((xx, 2), (255, 45, 111, 255))
        im.putpixel((xx, im.height - 3), (255, 45, 111, 255))
        im.putpixel((xx, im.height - 2), (255, 45, 111, 255))
    for (xx, yy), c in px.items():
        im.putpixel((xx + 1, yy), c + (255,))
    im.save(os.path.join(OUT, 'tagline.png'))


tagline()
