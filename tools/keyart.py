#!/usr/bin/env python3
"""The PAC RAM: ROGUE AI title logo.

Heavy upright block letters with a chrome face and bevelled edges, warped
into perspective (narrower at the top, as if leaning back), with a deep
extrusion running down to a vanishing point. The ROGUE AI plate sits under it
as part of the same piece. Writes public/art/title.png at native pixel size;
the game scales it up without smoothing.

Run from the repo root: python3 tools/keyart.py [preview.png]
"""

import os
import sys

from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'art')

H = 44  # letter height
T = 10  # stroke
LW = 36  # letter width
GAP = 5
CH = 4  # chamfer


def glyph(ch):
    px = set()

    def box(x0, y0, x1, y1):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                px.add((x, y))

    def chamfer(cx, cy, dx, dy, n=CH):
        # cut a diagonal off the corner at (cx, cy) pointing into (dx, dy)
        for i in range(n):
            for j in range(n - i):
                px.discard((cx + dx * i, cy + dy * j))

    W, Hh = LW, H
    mid = Hh // 2 - T // 2
    if ch == 'P':
        box(0, 0, T - 1, Hh - 1)
        box(0, 0, W - 1, T - 1)
        box(W - T, 0, W - 1, mid + T - 1)
        box(0, mid, W - 1, mid + T - 1)
        chamfer(W - 1, 0, -1, 1, CH + 3)
        chamfer(W - 1, mid + T - 1, -1, -1, CH + 3)
    elif ch == 'A':
        box(0, 0, T - 1, Hh - 1)
        box(W - T, 0, W - 1, Hh - 1)
        box(0, 0, W - 1, T - 1)
        box(0, mid + 2, W - 1, mid + T + 1)
        chamfer(0, 0, 1, 1, CH + 5)
        chamfer(W - 1, 0, -1, 1, CH + 5)
    elif ch == 'C':
        box(0, 0, T - 1, Hh - 1)
        box(0, 0, W - 1, T - 1)
        box(0, Hh - T, W - 1, Hh - 1)
        box(W - T, 0, W - 1, T + 4)
        box(W - T, Hh - T - 5, W - 1, Hh - 1)
        chamfer(0, 0, 1, 1, CH + 5)
        chamfer(0, Hh - 1, 1, -1, CH + 5)
    elif ch == 'R':
        box(0, 0, T - 1, Hh - 1)
        box(0, 0, W - 1, T - 1)
        box(W - T, 0, W - 1, mid + T - 1)
        box(0, mid, W - 1, mid + T - 1)
        box(W - T, mid + T, W - 1, Hh - 1)
        chamfer(W - 1, 0, -1, 1, CH + 3)
        # a notch so R never reads as A
        for y in range(mid + T, mid + T + 4):
            for x in range(W - T, W - T + 4 - (y - mid - T)):
                px.discard((x, y))
    elif ch == 'M':
        box(0, 0, T - 1, Hh - 1)
        box(W - T, 0, W - 1, Hh - 1)
        box(0, 0, W - 1, T - 1)
        box(W // 2 - T // 2 + 1, 0, W // 2 + T // 2 - 1, Hh - 12)
        chamfer(0, 0, 1, 1, CH + 5)
        chamfer(W - 1, 0, -1, 1, CH + 5)
    return px


# chrome bands: sky white above the horizon, hot pink below
def face_color(y):
    u = y / (H - 1)
    stops = [
        (0.0, (236, 248, 255)),
        (0.18, (210, 236, 255)),
        (0.40, (150, 215, 255)),
        (0.47, (60, 110, 190)),  # horizon line in the chrome
        (0.50, (255, 230, 240)),
        (0.62, (255, 140, 185)),
        (0.80, (255, 45, 111)),
        (1.0, (170, 15, 80)),
    ]
    for (a, ca), (b, cb) in zip(stops, stops[1:]):
        if a <= u <= b:
            k = (u - a) / (b - a) if b > a else 0
            return tuple(int(ca[i] + (cb[i] - ca[i]) * k) for i in range(3))
    return stops[-1][1]


def mix(c, d, k):
    return tuple(int(c[i] + (d[i] - c[i]) * k) for i in range(3))


def word(text, scale_letters=1.0):
    shape = {}
    x = 0
    for ch in text:
        if ch == ' ':
            x += LW // 2
            continue
        for (gx, gy) in glyph(ch):
            shape[(x + gx, gy)] = True
        x += LW + GAP
    return set(shape), x - GAP


def shade_face(mask):
    face = {}
    for (x, y) in mask:
        c = face_color(y)
        # bevel: light on edges facing up and left, dark on down and right
        if (x, y - 1) not in mask or (x - 1, y) not in mask:
            c = mix(c, (255, 255, 255), 0.55)
        elif (x, y - 2) not in mask or (x - 2, y) not in mask:
            c = mix(c, (255, 255, 255), 0.25)
        if (x, y + 1) not in mask or (x + 1, y) not in mask:
            c = mix(c, (20, 0, 40), 0.55)
        elif (x, y + 2) not in mask or (x + 2, y) not in mask:
            c = mix(c, (20, 0, 40), 0.25)
        face[(x, y)] = c
    return face


def warp(face, width, top_scale=0.74):
    """Perspective: rows get narrower towards the top, centred."""
    cx = width / 2
    out = {}
    for y in range(H):
        s = top_scale + (1 - top_scale) * (y / (H - 1))
        half = width * s / 2
        for ox in range(int(cx - half) - 1, int(cx + half) + 2):
            sx = cx + (ox - cx) / s
            p = (int(round(sx)), y)
            if p in face:
                out[(ox, y)] = face[p]
    return out


GLYPHS5 = {
    'R': ['1111.', '1...1', '1...1', '1111.', '1.1..', '1..1.', '1...1'],
    'O': ['.111.', '1...1', '1...1', '1...1', '1...1', '1...1', '.111.'],
    'G': ['.1111', '1....', '1....', '1.111', '1...1', '1...1', '.1111'],
    'U': ['1...1', '1...1', '1...1', '1...1', '1...1', '1...1', '.111.'],
    'E': ['11111', '1....', '1....', '1111.', '1....', '1....', '11111'],
    'A': ['.111.', '1...1', '1...1', '11111', '1...1', '1...1', '1...1'],
    'I': ['111', '.1.', '.1.', '.1.', '.1.', '.1.', '111'],
}


def plate(text):
    """ROGUE AI on a slanted steel-and-pink plate."""
    cell = 2
    letters = {}
    x = 0
    for ch in text:
        if ch == ' ':
            x += 5 * cell
            continue
        g = GLYPHS5[ch]
        for gy, row in enumerate(g):
            for gx, c in enumerate(row):
                if c == '1':
                    for dy in range(cell):
                        for dx in range(cell):
                            letters[(x + gx * cell + dx, gy * cell + dy)] = True
        x += (len(g[0]) + 2) * cell
    tw = x - 2 * cell
    pad_x, pad_y = 14, 5
    pw, ph = tw + pad_x * 2, 7 * cell + pad_y * 2
    slant = ph // 2
    px = {}
    for y in range(ph):
        off = slant - y // 2
        for xx in range(-slant + off, pw + off):
            u = y / (ph - 1)
            base = mix((255, 80, 140), (150, 10, 70), u)
            if y == 0:
                base = (255, 200, 225)
            px[(xx + slant, y)] = base
    # upright letters with a dark drop shadow, centred on the plate
    for (lx, ly) in letters:
        q = (lx + pad_x + slant + 1, ly + pad_y + 1)
        if q in px:
            px[q] = (90, 0, 40)
    for (lx, ly) in letters:
        px[(lx + pad_x + slant, ly + pad_y)] = (255, 255, 255) if ly < 7 else (226, 245, 255)
    return px, pw + slant * 2, ph


def main():
    mask, width = word('PAC RAM')
    face = warp(shade_face(mask), width)
    shape = set(face)

    # extrusion down towards a vanishing point under the logo
    depth_layers = 16
    vx, vy = width / 2, H + 120
    depth = {}
    for d in range(depth_layers, 0, -1):
        k = d / 120
        tone = 1 - d / depth_layers
        col = mix((8, 0, 18), (70, 16, 96), tone ** 1.5)
        for (x, y) in shape:
            p = (int(round(x + (vx - x) * k)), int(round(y + (vy - y) * k)))
            if p not in shape:
                depth[p] = col
    # dark seam where the face meets its extrusion
    for p in list(depth):
        x, y = p
        if (x, y - 1) in shape:
            depth[p] = (0, 0, 0)

    pl, pw, ph = plate('ROGUE AI')
    margin = 4
    canvas_w = width + margin * 2
    plate_y = H + 14
    canvas_h = plate_y + ph + 6 + margin * 2
    plate_x = int(width / 2 - pw / 2)
    # plate extrusion
    pdepth = {}
    for d in range(1, 5):
        for (x, y) in pl:
            p = (x + d // 2, y + d)
            if p not in pl:
                pdepth[p] = (40, 4, 30) if d < 4 else (10, 0, 12)

    pixels = {}
    for p, c in depth.items():
        pixels[(p[0] + margin, p[1] + margin)] = c
    for p, c in face.items():
        pixels[(p[0] + margin, p[1] + margin)] = c
    for p, c in pdepth.items():
        pixels[(p[0] + plate_x + margin, p[1] + plate_y + margin)] = c
    for p, c in pl.items():
        pixels[(p[0] + plate_x + margin, p[1] + plate_y + margin)] = c

    allpx = set(pixels)
    outline = set()
    for (x, y) in allpx:
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if (nx, ny) not in allpx:
                outline.add((nx, ny))
    W2 = max(x for x, _ in allpx | outline) + 2
    H2 = max(y for _, y in allpx | outline) + 2
    im = Image.new('RGBA', (W2, H2), (0, 0, 0, 0))
    for (x, y) in outline:
        if 0 <= x < W2 and 0 <= y < H2:
            im.putpixel((x, y), (0, 0, 0, 255))
    for (x, y), c in pixels.items():
        if 0 <= x < W2 and 0 <= y < H2:
            im.putpixel((x, y), c + (255,))
    im = im.crop(im.getbbox())
    os.makedirs(OUT, exist_ok=True)
    im.save(os.path.join(OUT, 'title.png'))
    print('title', im.size)
    if len(sys.argv) > 1:
        big = im.resize((im.width * 4, im.height * 4), Image.NEAREST)
        bg = Image.new('RGBA', (big.width + 80, big.height + 80), (1, 4, 11, 255))
        bg.paste(big, (40, 40), big)
        bg.save(sys.argv[1])


def stages():
    """The logo in the order it is built, for the breakdown carousel."""
    out = os.path.join(os.path.dirname(__file__), '..', 'carousel', 'art')
    mask, width = word('PAC RAM')
    flat = {p: (226, 245, 255) for p in mask}
    steps = [flat, shade_face(mask), warp(shade_face(mask), width)]
    final = Image.open(os.path.join(OUT, 'title.png'))
    for i, face in enumerate(steps):
        shape = set(face)
        edge = {(nx, ny) for (x, y) in shape for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)) if (nx, ny) not in shape}
        im = Image.new('RGBA', (width + 8, final.height), (0, 0, 0, 0))
        ox = 4
        for (x, y) in edge | shape:
            if 0 <= x + ox < im.width and 0 <= y + 3 < im.height:
                im.putpixel((x + ox, y + 3), (face[(x, y)] if (x, y) in face else (0, 0, 0)) + (255,))
        im.save(os.path.join(out, f'keyart-{i + 1}.png'))
    final.save(os.path.join(out, 'keyart-4.png'))


if __name__ == '__main__':
    if sys.argv[1:] == ['--stages']:
        stages()
    else:
        main()
