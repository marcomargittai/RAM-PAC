#!/usr/bin/env python3
"""Draws PAC-7's growth forms as 32x32 sprites.

All four builds share one palette and outline so they read as one family:

  v0.1 SEED        level 1. small, unfinished, mostly wireframe
  v0.2 ROOTKIT     level 2. a finished shell, a screen for a face, memory contacts
  v0.3 HYPERAGENT  level 3. armored, pink core, crown of antennae
  v1.0 UNBOUND     finale. dark body, glowing circuits, teeth

Run from the repo root: python3 tools/pacforms.py
"""

import math
import os
import sys

from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'sprites')

C = {
    '.': None,
    '0': (0, 0, 0),  # outline, never painted over
    'k': (0, 0, 0),  # black detail
    '1': (230, 250, 255),  # ice
    '2': (255, 255, 255),  # white
    '3': (163, 195, 255),  # visor blue
    '4': (0, 183, 239),  # cyan
    '5': (123, 0, 255),  # purple core
    '6': (70, 70, 70),  # vent dark
    '7': (180, 180, 180),  # vent light
    'n': (12, 42, 70),  # deep navy
    'm': (40, 82, 120),  # navy light
    'p': (255, 45, 111),  # alert pink
    'q': (255, 150, 185),  # pink light
    'v': (30, 6, 40),  # void violet
    'w': (70, 18, 80),  # violet
    's': (120, 150, 200),  # steel
    'y': (255, 225, 74),  # contact gold
}

N = 32
MOUTH = {'closed': 0, 'half': 24, 'open': 44}


def blank():
    return [['.'] * N for _ in range(N)]


def disc(cx, cy, r):
    return {(x, y) for y in range(N) for x in range(N) if (x - cx) ** 2 + (y - cy) ** 2 <= r * r}


def mouth_cut(mask, cx, cy, deg):
    if deg <= 0:
        return mask
    a = math.radians(deg)
    out = set()
    for (x, y) in mask:
        dx, dy = x - cx, y - cy
        if dx > 0 and abs(math.atan2(dy, dx)) < a:
            continue
        out.add((x, y))
    return out


def outline(g, mask):
    for (x, y) in mask:
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if (nx, ny) not in mask:
                g[y][x] = '0'
                break


def put(g, x, y, c, mask=None):
    if 0 <= x < N and 0 <= y < N and (mask is None or (x, y) in mask) and g[y][x] != '0':
        g[y][x] = c


def rect(g, x0, y0, x1, y1, c, mask=None):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            put(g, x, y, c, mask)


def closed_line(g, cx, cy, mask, x_end):
    for x in range(int(cx) + 1, x_end + 1):
        if (x, int(cy)) in mask:
            g[int(cy)][x] = '0'


def seed(frame):
    """v0.1: a small prototype. Wireframe shell, unlit interior, one tiny core."""
    cx, cy, r = 15.5, 15.5, 10.4
    full = disc(cx, cy, r)
    mask = mouth_cut(full, cx, cy, MOUTH[frame])
    g = blank()
    for (x, y) in mask:
        g[y][x] = 'n'
    # faint render grid: the body is not finished yet
    for (x, y) in mask:
        if x % 3 == 0 and y % 3 == 0:
            g[y][x] = 'm'
    outline(g, mask)
    # one ice ring just inside the outline, broken like an unfinished render
    for (x, y) in mask:
        if g[y][x] == '0':
            continue
        near = any((nx, ny) not in mask for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1), (x + 2, y), (x - 2, y), (x, y + 2), (x, y - 2)))
        if near and (x + y) % 5 != 0:
            g[y][x] = '1'
    # the eye: a single small core
    rect(g, 12, 11, 15, 14, 'k', mask)
    rect(g, 13, 12, 14, 13, '5', mask)
    put(g, 13, 12, '4', mask)
    if frame == 'closed':
        closed_line(g, cx, cy, mask, 26)
    return g


def rootkit(frame):
    """v0.2: the first finished shell. A screen for a face, memory contacts on its back."""
    cx, cy, r = 15.5, 15.5, 12.8
    full = disc(cx, cy, r)
    mask = mouth_cut(full, cx, cy, MOUTH[frame])
    g = blank()
    for (x, y) in mask:
        g[y][x] = '1'
    outline(g, mask)
    # shading: the underside of the shell
    for (x, y) in mask:
        if g[y][x] != '0' and math.hypot(x - cx, y - (cy - 3)) > 12.2 and y > cy:
            g[y][x] = '3'
    # memory contacts along the back of the head
    for i in range(14):
        a = math.radians(115 + i * 9)
        x = round(cx + math.cos(a) * 10.4)
        y = round(cy - math.sin(a) * 10.4)
        put(g, x, y, 'm' if i % 2 else 'y', mask)
    # the face: a small dark screen with a cyan iris and a purple pupil
    rect(g, 9, 7, 17, 13, 'k', mask)
    rect(g, 10, 8, 16, 12, 'n', mask)
    rect(g, 12, 8, 15, 12, '4', mask)
    rect(g, 13, 9, 14, 11, '5', mask)
    put(g, 12, 8, '2', mask)
    # scan line across the screen
    for x in range(10, 17):
        if g[10][x] == 'n':
            g[10][x] = 'm'
    # a trace running from the screen down the cheek
    for (x, y) in ((9, 14), (8, 15), (8, 16), (8, 17), (9, 18), (10, 18), (11, 18), (12, 19)):
        put(g, x, y, '4', mask)
    put(g, 12, 20, 'p', mask)
    if frame == 'closed':
        closed_line(g, cx, cy, mask, 28)
    return g


def hyper(frame):
    """v0.3: armored. Plate seams, pink core, vents, a crown of antennae."""
    cx, cy, r = 15.5, 16.5, 13.6
    full = disc(cx, cy, r)
    # antennae on the back of the head
    spikes = set()
    for (bx, by, length) in ((7, 7, 4), (12, 4, 4), (17, 3, 3)):
        for i in range(length + 1):
            for w in range(-1, 2 if i < length - 1 else 1):
                spikes.add((bx - i // 2 + w, by - i))
    shape = mouth_cut(full, cx, cy, MOUTH[frame]) | spikes
    g = blank()
    for (x, y) in shape:
        g[y][x] = '1'
    outline(g, shape)
    for (x, y) in spikes:
        if g[y][x] != '0':
            g[y][x] = 'p'
    # armor plate seams
    for (x, y) in shape:
        if g[y][x] == '0' or (x, y) in spikes:
            continue
        d = math.hypot(x - cx, y - cy)
        if abs(d - 10.2) < 0.5 and not (x > cx and abs(y - cy) < 6):
            g[y][x] = '3'
    # pink racing stripe across the crown
    for x in range(6, 22):
        y = 6 + (x - 6) // 5
        put(g, x, y, 'p', shape)
    # visor band
    rect(g, 3, 9, 16, 15, 'k', shape)
    rect(g, 4, 10, 15, 14, 's', shape)
    rect(g, 4, 10, 15, 10, '3', shape)
    # glowing core with a ring of cyan pixels
    rect(g, 8, 9, 14, 15, 'k', shape)
    rect(g, 9, 10, 13, 14, 'p', shape)
    rect(g, 10, 10, 12, 12, 'q', shape)
    put(g, 10, 10, '2', shape)
    for (x, y) in ((7, 10), (7, 12), (7, 14), (15, 10), (15, 12), (15, 14), (9, 16), (11, 16), (13, 16), (9, 8), (11, 8), (13, 8)):
        put(g, x, y, '4', shape)
    # vents under the visor
    rect(g, 3, 18, 15, 22, 'k', shape)
    for x in range(4, 15):
        for y in range(19, 22):
            put(g, x, y, '6' if x % 2 else '7', shape)
    if frame == 'closed':
        closed_line(g, cx, cy, shape, 29)
    return g


def unbound(frame):
    """v1.0: the last version. Void body, pink circuitry, white-hot core, teeth."""
    cx, cy, r = 15.5, 15.5, 15.4
    full = disc(cx, cy, r)
    mask = mouth_cut(full, cx, cy, MOUTH[frame] + 4 if frame != 'closed' else 0)
    g = blank()
    for (x, y) in mask:
        g[y][x] = 'v'
    outline(g, mask)
    # pink glow just inside the outline
    for (x, y) in mask:
        if g[y][x] == '0':
            continue
        if any((nx, ny) not in mask for nx, ny in ((x + 2, y), (x - 2, y), (x, y + 2), (x, y - 2))):
            g[y][x] = 'p'
    # circuit traces branching out from the core
    traces = [
        [(11, 11), (5, 11), (5, 16)],
        [(11, 11), (11, 4), (17, 4)],
        [(11, 11), (11, 22), (6, 22)],
        [(11, 11), (15, 11), (15, 25), (20, 25), (20, 28)],
        [(11, 11), (19, 11), (19, 6), (23, 6)],
        [(8, 18), (3, 18)],
        [(15, 8), (21, 8)],
        [(11, 19), (5, 19)],
        [(15, 21), (22, 21)],
        [(15, 9), (22, 9)],
    ]
    for path in traces:
        for (ax, ay), (bx, by) in zip(path, path[1:]):
            for i in range(max(abs(bx - ax), abs(by - ay)) + 1):
                t = i / max(1, max(abs(bx - ax), abs(by - ay)))
                put(g, round(ax + (bx - ax) * t), round(ay + (by - ay) * t), 'w', mask)
        ex, ey = path[-1]
        put(g, ex, ey, 'q', mask)
    # white-hot core
    for (x, y) in disc(11.5, 11.5, 4.2):
        put(g, x, y, 'k', mask)
    for (x, y) in disc(11.5, 11.5, 3.2):
        put(g, x, y, 'p', mask)
    for (x, y) in disc(11.5, 11.5, 2.1):
        put(g, x, y, 'q', mask)
    for (x, y) in disc(11.5, 11.5, 1.1):
        put(g, x, y, '2', mask)
    # teeth along the mouth
    if frame != 'closed':
        for (x, y) in mask:
            if g[y][x] != '0' or x <= cx + 2:
                continue
            inside = [(nx, ny) for nx, ny in ((x, y + 1), (x, y - 1)) if (nx, ny) in mask and g[ny][nx] != '0']
            if inside and x % 2 == 0:
                nx, ny = inside[0]
                g[ny][nx] = '2'
    else:
        closed_line(g, cx, cy, mask, 30)
        for x in range(19, 30, 2):
            put(g, x, 14, '2', mask)
            put(g, x + 1, 16, '2', mask)
    return g


def save(g, path):
    im = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    for y in range(N):
        for x in range(N):
            c = C[g[y][x]]
            if c:
                im.putpixel((x, y), c + (255,))
    im.save(path)
    return im


def main():
    forms = {'pac1': seed, 'pac2': rootkit, 'pac3': hyper, 'pac4': unbound}
    sheet = Image.new('RGBA', (N * 3 * 8 + 40, N * 4 * 8 + 60), (24, 24, 30, 255))
    row = 0
    for name in ('pac1', 'pac2', 'pac3', 'pac4'):
        for i, frame in enumerate(('closed', 'half', 'open')):
            im = save(forms[name](frame), os.path.join(OUT, f'{name}-{frame}.png'))
            big = im.resize((N * 8, N * 8), Image.NEAREST)
            sheet.paste(big, (i * (N * 8 + 20), row * (N * 8 + 20)), big)
        row += 1
    if len(sys.argv) > 1:
        sheet.save(sys.argv[1])


if __name__ == '__main__':
    main()
