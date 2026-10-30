"""Cut the PAC RAM trailer: 30 fps, 1080x1920, cuts on the 128 BPM grid of the
music (take 3, trimmed so the drop lands at frame 119)."""
import os, random, shutil, subprocess
from PIL import Image, ImageChops, ImageEnhance

S = os.path.dirname(os.path.abspath(__file__))
OUT = f'{S}/tr/seq'
W, H = 1080, 1920
BOARD = (548, 783)  # board centre in a full frame
random.seed(7)

def src(kind, i):
    return {'a': f'{S}/tr/a/{i:05d}.png', 'b': f'{S}/tr/b/{i:05d}.png', 'v': f'{S}/vid/frames/{i:05d}.png'}[kind] if kind != 'v' or True else None

def load(kind, i):
    return Image.open(src(kind, i)).convert('RGB')

def zoom(im, z, c=BOARD):
    if z == 1:
        return im
    cw, ch = W / z, H / z
    x = min(max(c[0] - cw / 2, 0), W - cw)
    y = min(max(c[1] - ch / 2, 0), H - ch)
    return im.crop((int(x), int(y), int(x + cw), int(y + ch))).resize((W, H), Image.LANCZOS)

def glitch(im, n=4, amp=40):
    im = im.copy()
    for _ in range(n):
        y = random.randint(0, H - 120)
        h = random.randint(20, 120)
        band = im.crop((0, y, W, y + h))
        im.paste(band, (random.choice([-1, 1]) * random.randint(amp // 2, amp), y))
    r, g, b = im.split()
    return Image.merge('RGB', (ImageChops.offset(r, 8, 0), g, ImageChops.offset(b, -8, 0)))

TXT = {k: Image.open(f'{S}/tr/txt/{k}.png').convert('RGBA') for k in ['t1', 't2', 't3', 't4', 't5', 't6', 'end']}

def overlay(im, key, age, life):
    t = TXT[key]
    s = 1.12 if age == 0 else 1.05 if age == 1 else 1.0
    if s != 1:
        tw, th = int(W * s), int(H * s)
        t = t.resize((tw, th), Image.LANCZOS).crop(((tw - W) // 2, (th - H) // 2, (tw - W) // 2 + W, (th - H) // 2 + H))
    fade = 1.0 if age < life - 2 else (0.55 if age == life - 2 else 0.2)
    if fade < 1:
        a = t.split()[3].point(lambda v: int(v * fade))
        t.putalpha(a)
    base = im.convert('RGBA')
    base.alpha_composite(t)
    return base.convert('RGB')

# shots: (frames as (kind, index) list, zoom start, zoom end, centre, darken)
def rng(kind, a, b, step=1):
    return [(kind, i) for i in range(a, b, step)]

shots = [
    # build: 0-118
    (rng('a', 0, 60), 1.35, 1.55, BOARD, 0.55),
    (rng('v', 186, 245), 1.25, 1.45, (540, 760), 0.8),
    # drop at 119
    (rng('b', 10, 52), 1.3, 1.2, BOARD, 1),          # chase, board 3
    (rng('b', 125, 167), 1.15, 1.25, BOARD, 1),      # SURGE flash and scatter
    (rng('b', 218, 246), 1.9, 2.1, (548, 760), 1),   # eating at the house
    (rng('v', 238, 294, 2), 1.2, 1.35, (540, 760), 1),  # rewrite, fast
    (rng('v', 633, 689, 2), 1.0, 1.1, (540, 900), 1),   # PAC-7 grows to fill the screen
    (rng('v', 696, 752, 2), 1.0, 1.0, (540, 960), 1),  # glass breaks, CRT collapses
    (rng('b', 330, 450, 12) + rng('b', 456, 476, 2) + rng('b', 556, 619, 6), 1.0, 1.0, (540, 960), 1),  # takeover
]
# text: key -> (first frame, last frame)
TEXT = {'t1': (6, 56), 't2': (64, 116), 't3': (124, 152), 't4': (172, 200), 't5': (234, 256), 't6': (292, 314)}
FLASH = {119: 0.9, 120: 0.55, 121: 0.25}
END_AT, TOTAL = 346, 420

shutil.rmtree(OUT, ignore_errors=True)
os.makedirs(OUT)
n = 0
cuts = []
for frames, z0, z1, c, dark in shots:
    cuts.append(n)
    for k, (kind, i) in enumerate(frames):
        im = zoom(load(kind, i), z0 + (z1 - z0) * k / max(1, len(frames) - 1), c)
        if dark < 1:
            im = ImageEnhance.Brightness(im).enhance(dark)
        if n >= 119 and k < 2 and n not in FLASH:
            im = glitch(im, 5 if k == 0 else 2)
        if n in FLASH:
            im = Image.blend(im, Image.new('RGB', (W, H), (235, 246, 255)), FLASH[n])
        for key, (a, b) in TEXT.items():
            if a <= n <= b:
                im = overlay(im, key, n - a, b - a + 1)
        im.save(f'{OUT}/{n:05d}.png')
        n += 1
print('action ends at', n, 'cuts', cuts)
assert n == END_AT, n
end = TXT['end'].convert('RGB')
for k in range(TOTAL - END_AT):
    im = end
    if k < 3:
        im = Image.blend(glitch(end, 6 - 2 * k), Image.new('RGB', (W, H), (235, 246, 255)), 0.5 - k * 0.15)
    im.save(f'{OUT}/{n:05d}.png')
    n += 1
print('total', n, n / 30, 's')
