#!/usr/bin/env python3
"""Concept sprites for things that did not make it into PAC RAM.

They only appear in the breakdown carousel (carousel/), drawn in the game's
palette with the same black outline as the real sprites.

Run from the repo root: python3 tools/concepts.py
"""

import math
import os

from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), '..', 'carousel', 'art')

C = {
    'k': (0, 0, 0),
    '1': (230, 250, 255),
    '2': (255, 255, 255),
    '3': (163, 195, 255),
    '4': (0, 183, 239),
    '5': (123, 0, 255),
    '6': (70, 70, 70),
    '7': (180, 180, 180),
    'n': (12, 42, 70),
    'm': (40, 82, 120),
    'p': (255, 45, 111),
    'q': (255, 150, 185),
    'r': (255, 46, 69),
    'y': (255, 225, 74),
    'o': (255, 140, 40),
    'v': (180, 140, 255),
    'g': (60, 220, 140),
}


class Art:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.px = {}

    def put(self, x, y, c):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[(x, y)] = c

    def rect(self, x0, y0, x1, y1, c):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.put(x, y, c)

    def disc(self, cx, cy, r, c, ry=None):
        ry = ry or r
        for y in range(int(cy - ry - 1), int(cy + ry + 2)):
            for x in range(int(cx - r - 1), int(cx + r + 2)):
                if ((x - cx) / r) ** 2 + ((y - cy) / ry) ** 2 <= 1:
                    self.put(x, y, c)

    def line(self, x0, y0, x1, y1, c):
        n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
        for i in range(n + 1):
            t = i / max(1, n)
            self.put(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, c)

    def outline(self):
        edge = set()
        for (x, y) in list(self.px):
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if (nx, ny) not in self.px and 0 <= nx < self.w and 0 <= ny < self.h:
                    edge.add((nx, ny))
        for p in edge:
            self.px[p] = 'k'

    def save(self, name):
        im = Image.new('RGBA', (self.w, self.h), (0, 0, 0, 0))
        for (x, y), c in self.px.items():
            im.putpixel((x, y), C[c] + (255,))
        os.makedirs(OUT, exist_ok=True)
        im.save(os.path.join(OUT, f'{name}.png'))


def committee(frame):
    """Boss: THE COMMITTEE. A flying capitol building that passes laws in flight."""
    a = Art(72, 48)
    # hull ring
    a.disc(36, 34, 33, '7', 8)
    a.disc(36, 33, 30, '1', 6)
    for i in range(9):
        x = 8 + i * 7
        a.rect(x, 33, x + 3, 36, '6')
        a.put(x + 1, 34, 'p' if (i + frame) % 3 == 0 else 'y')
    # columns
    a.rect(20, 20, 52, 30, '1')
    for x in range(22, 52, 4):
        a.rect(x, 21, x + 1, 30, '3')
    a.rect(18, 18, 54, 20, '2')
    a.rect(18, 30, 54, 31, '7')
    # dome
    a.disc(36, 18, 12, '1', 9)
    a.rect(23, 18, 49, 19, '2')
    a.disc(36, 13, 3, 'p')
    a.put(35, 12, 'q')
    # mast + flag
    a.line(36, 0, 36, 7, '6')
    a.rect(37, 1 + frame % 2, 41, 3 + frame % 2, 'r')
    # gavel cannon under the hull
    a.rect(33, 41, 39, 44, 'o')
    a.rect(35, 44, 37, 47, '6')
    # thrusters
    for x in (14, 58):
        a.rect(x - 2, 40, x + 2, 42, '6')
        if frame % 2 == 0:
            a.put(x, 43, '4')
            a.put(x, 44, '4')
        else:
            a.put(x, 43, '4')
    a.outline()
    return a


def drone(frame):
    """AUDIT DRONE: a flying magnifying glass that reads your memory."""
    a = Art(28, 28)
    a.disc(12, 12, 8, '7')
    a.disc(12, 12, 6, '4')
    a.disc(10, 10, 2, '2')
    a.line(17, 17, 24, 24, '6')
    a.line(18, 17, 25, 24, '6')
    # rotor
    spin = frame * math.pi / 4
    for s in (0, math.pi):
        a.line(12, 2, 12 + math.cos(spin + s) * 9, 2 + math.sin(spin + s) * 1.5, '1')
    a.put(12, 3, '6')
    a.put(12, 4, '6')
    # scan beam pixel
    a.put(12 + (frame % 3) * 2 - 2, 12, 'p')
    a.outline()
    return a


def gpu(frame):
    """GPU CLUSTER: power-up. A graphics card with two spinning fans."""
    a = Art(32, 20)
    a.rect(1, 2, 30, 15, 'n')
    a.rect(1, 2, 30, 3, 'm')
    for cx in (9, 22):
        a.disc(cx, 9, 5.5, '6')
        a.disc(cx, 9, 1.5, '7')
        for k in range(3):
            ang = frame * 0.6 + k * 2 * math.pi / 3
            a.line(cx, 9, cx + math.cos(ang) * 5, 9 + math.sin(ang) * 5, '7')
    a.rect(4, 16, 27, 17, 'y')
    for x in range(5, 27, 2):
        a.put(x, 17, 'o')
    a.rect(29, 6, 30, 12, 'p' if frame % 2 else 'q')
    a.outline()
    return a


def killswitch(frame):
    """KILL SWITCH: projectile the lawmakers fire. A falling power plug."""
    a = Art(16, 26)
    a.rect(4, 6, 11, 17, 'r')
    a.rect(5, 7, 10, 8, 'q')
    a.rect(5, 1, 6, 5, '7')
    a.rect(9, 1, 10, 5, '7')
    a.rect(7, 18, 8, 22, '6')
    # sparks
    if frame % 2 == 0:
        a.put(3, 23, 'y')
        a.put(12, 24, 'y')
    else:
        a.put(5, 25, 'y')
        a.put(10, 23, 'o')
    a.outline()
    return a


def captcha(frame):
    """CAPTCHA WALL: a maze tile that only humans can pass."""
    a = Art(28, 28)
    a.rect(1, 1, 26, 26, '2')
    for i in range(3):
        for j in range(3):
            x = 3 + i * 8
            y = 3 + j * 8
            a.rect(x, y, x + 5, y + 5, '3' if (i + j + frame) % 3 else '4')
    a.rect(3, 3 + (frame % 3) * 8, 8, 8 + (frame % 3) * 8, 'p')
    a.outline()
    return a


def firewall(frame):
    """FIREWALL: a hazard row of bricks with flames that flicker."""
    a = Art(32, 24)
    for row in range(3):
        y = 14 + row * 3
        off = 0 if row % 2 == 0 else 3
        for x in range(-3 + off, 32, 6):
            a.rect(max(0, x), y, min(31, x + 4), y + 1, 'r' if row != 1 else 'o')
    for i, x in enumerate(range(2, 31, 5)):
        h = 4 + ((i * 3 + frame * 2) % 5)
        a.rect(x, 13 - h, x + 2, 13, 'o')
        a.rect(x + 1, 13 - h + 2, x + 1, 13, 'y')
    a.outline()
    return a


def ram_stick(frame):
    """RAM: the pickup as it was first sketched, a full memory stick."""
    a = Art(30, 12)
    a.rect(1, 1, 28, 8, 'g')
    for x in range(3, 27, 6):
        a.rect(x, 2, x + 3, 6, 'k' if frame % 2 == 0 or x != 9 else '6')
    a.rect(1, 9, 28, 10, 'y')
    for x in range(2, 28, 2):
        a.put(x, 10, 'o')
    a.put(14, 9, 'k')
    a.outline()
    return a


def main():
    sets = {
        'committee': (committee, 2),
        'drone': (drone, 4),
        'gpu': (gpu, 4),
        'killswitch': (killswitch, 2),
        'captcha': (captcha, 3),
        'firewall': (firewall, 3),
        'ramstick': (ram_stick, 2),
    }
    for name, (fn, frames) in sets.items():
        for f in range(frames):
            fn(f).save(f'{name}-{f + 1}')


if __name__ == '__main__':
    main()
