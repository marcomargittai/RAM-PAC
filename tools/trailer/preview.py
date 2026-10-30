"""The portfolio preview: a calm, silent, looping 4:5 clip of gameplay only
(no text, nothing from the finale). Long shots joined by short dissolves, and
the end dissolves into the first frame so the loop has no seam.
Writes frames to <scratch>/tr/pv; encode with ffmpeg (see README)."""
import os, shutil, sys
from PIL import Image

S = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.abspath(__file__))
OUT = f'{S}/tr/pv'
W, H = 864, 1080
CROP_W, CROP_H = 1080, 1350
FADE = 8

def src(kind, i):
    return {'a': f'{S}/tr/a/{i:05d}.png', 'b': f'{S}/tr/b/{i:05d}.png', 'v': f'{S}/vid/frames/{i:05d}.png'}[kind]

def frame(kind, i, top, z):
    im = Image.open(src(kind, i)).convert('RGB').crop((0, top, CROP_W, top + CROP_H))
    if z != 1:
        cw, ch = CROP_W / z, CROP_H / z
        im = im.crop((int((CROP_W - cw) / 2), int((CROP_H - ch) / 2), int((CROP_W + cw) / 2), int((CROP_H + ch) / 2)))
    return im.resize((W, H), Image.LANCZOS)

# (kind, first, last, crop top, zoom start, zoom end)
SHOTS = [
    ('v', 4, 84, 40, 1.0, 1.06),      # title art
    ('a', 0, 74, 110, 1.05, 1.15),    # board 1
    ('v', 196, 294, 60, 1.0, 1.08),   # the rewrite
    ('b', 118, 270, 110, 1.05, 1.15), # board 3: surge, laws flee and get eaten
]
clips = []
for kind, a, b, top, z0, z1 in SHOTS:
    n = b - a
    clips.append([frame(kind, a + k, top, z0 + (z1 - z0) * k / (n - 1)) for k in range(n)])

shutil.rmtree(OUT, ignore_errors=True)
os.makedirs(OUT)
seq = list(clips[0])
for c in clips[1:]:
    for k in range(FADE):
        seq[-FADE + k] = Image.blend(seq[-FADE + k], c[k], (k + 1) / (FADE + 1))
    seq += c[FADE:]
# loop: the last frames dissolve into the first
for k in range(FADE):
    seq[-FADE + k] = Image.blend(seq[-FADE + k], seq[k], (k + 1) / (FADE + 1))
seq = seq[FADE:]
for n, im in enumerate(seq):
    im.save(f'{OUT}/{n:05d}.png')
print(len(seq), 'frames', len(seq) / 30, 's')
