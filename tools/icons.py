#!/usr/bin/env python3
"""Builds the site icons from PAC-7's last build (public/sprites/pac4-half.png).

favicon.svg is drawn from the sprite's pixels as rects so it stays sharp at
any size; the PNGs are the same art at fixed sizes for older browsers and
home screens. Run from the repo root: python3 tools/icons.py
"""

import os

from PIL import Image, ImageFilter

ROOT = os.path.join(os.path.dirname(__file__), '..', 'public')
BG = (6, 2, 12)
PINK = (255, 45, 111)


def sprite():
    im = Image.open(os.path.join(ROOT, 'sprites', 'pac4-half.png')).convert('RGBA')
    return im.crop(im.getbbox())


def svg(art):
    w, h = art.size
    pad = 6
    size = max(w, h) + pad * 2
    ox = (size - w) / 2
    oy = (size - h) / 2
    rects = []
    for y in range(h):
        x = 0
        while x < w:
            p = art.getpixel((x, y))
            if p[3] < 128:
                x += 1
                continue
            run = 1
            while x + run < w and art.getpixel((x + run, y)) == p:
                run += 1
            rects.append(f'<rect x="{x + ox:g}" y="{y + oy:g}" width="{run}" height="1" fill="#{p[0]:02x}{p[1]:02x}{p[2]:02x}"/>')
            x += run
    body = ''.join(rects)
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" shape-rendering="crispEdges">
<defs><filter id="g" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur in="SourceAlpha" stdDeviation="1.3" result="b"/><feFlood flood-color="#ff2d6f" flood-opacity="0.9"/><feComposite operator="in" in2="b" result="glow"/><feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<radialGradient id="bg" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#1a0614"/><stop offset="1" stop-color="#06020c"/></radialGradient></defs>
<rect width="{size}" height="{size}" rx="{size * 0.22:g}" fill="url(#bg)"/>
<g filter="url(#g)">{body}</g>
</svg>
'''


def png(art, size, glow=True, pad_ratio=0.14, rounded=True):
    scale = max(1, int((size * (1 - pad_ratio * 2)) // max(art.size)))
    big = art.resize((art.width * scale, art.height * scale), Image.NEAREST)
    out = Image.new('RGBA', (size, size), BG + (255,))
    if rounded:
        mask = Image.new('L', (size, size), 0)
        from PIL import ImageDraw
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, size - 1, size - 1), radius=int(size * 0.22), fill=255)
        out.putalpha(mask)
    x = (size - big.width) // 2
    y = (size - big.height) // 2
    if glow:
        halo = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        tint = Image.new('RGBA', big.size, PINK + (255,))
        halo.paste(tint, (x, y), big.split()[3])
        halo = halo.filter(ImageFilter.GaussianBlur(size / 18))
        out = Image.alpha_composite(out, halo)
    out.alpha_composite(big, (x, y))
    return out


def main():
    art = sprite()
    with open(os.path.join(ROOT, 'favicon.svg'), 'w') as f:
        f.write(svg(art))
    # at 32 px the sprite is drawn 1:1, no room for a halo
    small = Image.new('RGBA', (32, 32), BG + (255,))
    small.alpha_composite(art, ((32 - art.width) // 2, (32 - art.height) // 2))
    small.save(os.path.join(ROOT, 'favicon-32.png'))
    png(art, 180, rounded=False).save(os.path.join(ROOT, 'apple-touch-icon.png'))
    png(art, 512).save(os.path.join(ROOT, 'icon-512.png'))


if __name__ == '__main__':
    main()
