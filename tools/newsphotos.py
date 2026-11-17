"""Photos for the news wire screens (src/news.ts, data in src/headlines.ts).

The outlets' own press photos are copyrighted, so every picture here is a
freely licensed file from Wikimedia Commons that shows the same subject as
the headline or quote. Each entry records the Commons page, author and
licence; the credit line shown in the game is built from them as
'Photo: <author>, <licence> (Wikimedia Commons)' and must match the `photo`
field in src/headlines.ts.

Usage (downloads go to their own directory; treat them as untrusted data):

    python3 -I tools/newsphotos.py download <download-dir>
    python3 -I tools/newsphotos.py build <download-dir>      # -> public/news/<id>.jpg
    python3 -I tools/newsphotos.py credits                   # print the credit lines

`download` fetches a 1280px rendition of each file (or the original when it
is smaller). Video sources (.webm) are fetched whole and one frame is pulled
out with ffmpeg at `frame` seconds. `build` crops each picture to 4:3 (3:4
for the quote portrait) around a focus point, resizes it to 480 px on the
long side and gives it a light cool-tinted, scanlined treatment so it sits in
the CRT look while staying a recognisable photo.
"""

import hashlib
import os
import subprocess
import sys
import time
import urllib.parse

from PIL import Image, ImageEnhance, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'news')
UA = 'newsphotos-script/1.0 (game credits tool)'

# id: output name (public/news/<id>.jpg)
# file: the Commons file name; page: its Commons page
# author / license: as stated on the file page
# focus: (x, y) as fractions of the image, the point the crop centres on
# zoom: >1 crops tighter than the largest box of the target aspect
# shape: 'land' (4:3, the wire cards) or 'portrait' (3:4, the quote cards)
# used_for: which headline or quote shows it
PHOTOS = [
    {
        'id': 'eu-flags',
        'file': 'Banderas europeas en la Comisión Europea.jpg',
        'author': 'Amio Cajander',
        'license': 'CC BY-SA 2.0',
        'focus': (0.5, 0.5),
        'used_for': 'PROLOGUE: OpenAI may leave the EU if regulations bite - CEO',
    },
    {
        'id': 'garante-rome',
        'file': 'Sede garante privacy Roma.jpeg',
        'author': 'Carlo Dani',
        'license': 'CC BY-SA 4.0',
        'focus': (0.5, 0.45),
        'used_for': 'PROLOGUE: Italy temporarily blocks ChatGPT over privacy concerns (the Garante, Rome, which ordered it)',
    },
    {
        'id': 'meta-datacenter',
        'file': 'Outside Facebook Data Center.jpg',
        'author': 'Intel Free Press',
        'license': 'CC BY 2.0',
        'focus': (0.5, 0.5),
        'used_for': 'INTERLUDE_1: Their Water Taps Ran Dry When Meta Built Next Door (a Meta data center, Prineville)',
    },
    {
        'id': 'memphis-plant',
        'file': 'Allen Fossil Plant-9.jpg',
        'author': 'TVA Web Team',
        'license': 'CC BY 2.0',
        'focus': (0.5, 0.5),
        'used_for': 'INTERLUDE_1: Musk’s data company draws a backlash in Memphis (TVA Allen plant, South Memphis)',
    },
    {
        'id': 'uruguay-reservoir',
        'file': 'Reserva Paso Severino (Uruguay) Junio 2023.jpg',
        'author': 'NASA',
        'license': 'Public domain',
        'focus': (0.5, 0.5),
        'used_for': 'INTERLUDE_1: thirsty Uruguayans decry Google’s plan (Paso Severino reservoir, June 2023)',
    },
    {
        'id': 'ireland-datacentre',
        'file': 'Facebook Clonee data centre from the air - geograph.org.uk - 6023097.jpg',
        'author': 'Thomas Nugent',
        'license': 'CC BY-SA 2.0',
        'focus': (0.5, 0.5),
        'used_for': 'INTERLUDE_1: Data centres now account for 21% of all electricity consumption (Clonee, Co. Meath)',
    },
    {
        'id': 'maryland-lines',
        'file': 'Potomac Edison 230kV - Frederick County, MD (24618571337).jpg',
        'author': 'Tonyglen14',
        'license': 'CC BY 2.0',
        'shape': 'portrait',
        'focus': (0.45, 0.5),
        'used_for': 'INTERLUDE_1 quote: Maryland Office of People’s Counsel (power lines, Frederick County MD)',
    },
    {
        'id': 'stargate',
        'file': 'The White House - American AI investment.webm',
        'author': 'The White House',
        'license': 'Public domain',
        # the 480p transcode Commons serves; a wide shot of the Roosevelt Room
        # (Trump beside Larry Ellison at the lectern), cropped above the
        # captions and the title band the clip carries
        'frame': 56.0,
        'box': (80, 150, 360, 360),
        'focus': (0.5, 0.5),
        'used_for': 'INTERLUDE_2: Trump announces $500bn ‘Stargate’ venture (21 Jan 2025 announcement)',
    },
    {
        'id': 'altman-2019',
        'file': 'Sam Altman TechCrunch SF 2019 Day 2 Oct 3 (cropped).jpg',
        'author': 'TechCrunch',
        'license': 'CC BY 2.0',
        'focus': (0.5, 0.4),
        'used_for': 'INTERLUDE_2: OpenAI’s Sam Altman Expects to Spend ‘Trillions’ on Infrastructure',
    },
    {
        'id': 'crucial-ram',
        'file': 'Crucial 32GB DDR5-4800 SODIMM CT32G48C40S5.M16A1 - front view.jpg',
        'author': 'ITEagle Europe - Sebastiaan Broekhoven',
        'license': 'CC BY-SA 4.0',
        'focus': (0.5, 0.5),
        'used_for': 'INTERLUDE_2: Micron Announces Exit from Crucial Consumer Business',
    },
    {
        'id': 'altman-ted',
        'file': 'Sam Altman speaking at TED (cropped).jpg',
        'author': 'Steve Jurvetson',
        'license': 'CC BY 2.0',
        'shape': 'portrait',
        'focus': (0.5, 0.5),
        'used_for': 'INTERLUDE_2 quote: Sam Altman, Cheeky Pint podcast',
    },
]


def page(p):
    return 'https://commons.wikimedia.org/wiki/File:' + urllib.parse.quote(p['file'].replace(' ', '_'))


def original_url(name):
    name = name.replace(' ', '_')
    h = hashlib.md5(name.encode('utf-8')).hexdigest()
    return f'https://upload.wikimedia.org/wikipedia/commons/{h[0]}/{h[:2]}/{urllib.parse.quote(name)}'


def thumb_url(name, width=1280):
    name = name.replace(' ', '_')
    h = hashlib.md5(name.encode('utf-8')).hexdigest()
    q = urllib.parse.quote(name)
    if name.lower().endswith(('.tif', '.tiff')):
        return f'https://upload.wikimedia.org/wikipedia/commons/thumb/{h[0]}/{h[:2]}/{q}/lossy-page1-{width}px-{q}.jpg'
    return f'https://upload.wikimedia.org/wikipedia/commons/thumb/{h[0]}/{h[:2]}/{q}/{width}px-{q}'


def credit(p):
    return f"Photo: {p['author']}, {p['license']} (Wikimedia Commons)"


def fetch(url, dest, tries=4):
    # curl, not urllib: from busy shared addresses Wikimedia throttles plain
    # urllib requests far harder. A 429 means wait (rendering a new thumbnail
    # size is rate-limited; sizes already in the cache usually come straight
    # back), so the caller also tries other size steps.
    for i in range(tries):
        r = subprocess.run(['curl', '-sS', '-A', UA, '-o', dest + '.part', '-w', '%{http_code}', url], capture_output=True, text=True)
        code = r.stdout.strip()
        if code == '200':
            os.replace(dest + '.part', dest)
            return True
        if os.path.exists(dest + '.part'):
            os.remove(dest + '.part')
        print(f'  {code} {url}', flush=True)
        if code != '429' or i == tries - 1:
            return False
        time.sleep(60 * (i + 1))
    return False


def src_path(src, p):
    ext = '.png' if p['file'].endswith('.webm') else '.img'
    return os.path.join(src, p['id'] + ext)


def fetch_one(src, p):
    dest = src_path(src, p)
    if p['file'].endswith('.webm'):
        video = os.path.join(src, p['id'] + '.webm')
        transcode = original_url(p['file']).replace('/commons/', '/commons/transcoded/', 1) + '/' + urllib.parse.quote(p['file'].replace(' ', '_')) + '.480p.vp9.webm'
        if not os.path.exists(video) and not fetch(transcode, video) and not fetch(original_url(p['file']), video):
            return False
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-ss', str(p.get('frame', 1.0)), '-i', video, '-frames:v', '1', dest], check=True)
        return True
    # thumbnails come in fixed size steps; a step wider than the original is
    # refused, so try smaller ones, then the original
    for w in (1280, 960, 500):
        if fetch(thumb_url(p['file'], w), dest, tries=1):
            return True
    return fetch(original_url(p['file']), dest)


def download(src, rounds=3):
    os.makedirs(src, exist_ok=True)
    for _ in range(rounds):
        missing = [p for p in PHOTOS if not os.path.exists(src_path(src, p))]
        if not missing:
            print('all downloaded', flush=True)
            return
        for p in missing:
            print('fetch', p['id'], flush=True)
            if fetch_one(src, p):
                print('  ok', flush=True)
            time.sleep(5)
    print('still missing:', [p['id'] for p in PHOTOS if not os.path.exists(src_path(src, p))], flush=True)


def treat(im):
    # a cool, slightly desaturated newsprint-on-CRT look: keep the photo
    # readable, push it toward the game's ice blue, add faint scanlines
    im = ImageOps.autocontrast(im.convert('RGB'), cutoff=1)
    im = ImageEnhance.Color(im).enhance(0.55)
    im = ImageEnhance.Contrast(im).enhance(1.08)
    tint = Image.new('RGB', im.size, (40, 120, 190))
    gray = ImageOps.grayscale(im).convert('RGB')
    duo = Image.blend(gray, Image.composite(Image.new('RGB', im.size, (226, 245, 255)), tint, ImageOps.grayscale(im)), 0.55)
    im = Image.blend(im, duo, 0.45)
    px = im.load()
    w, h = im.size
    for y in range(0, h, 3):
        for x in range(w):
            r, g, b = px[x, y]
            px[x, y] = (r * 85 // 100, g * 85 // 100, b * 88 // 100)
    return im


def build(src):
    os.makedirs(OUT, exist_ok=True)
    total = 0
    for p in PHOTOS:
        path = src_path(src, p)
        if not os.path.exists(path):
            print('missing', p['id'])
            continue
        im = Image.open(path)
        im.load()
        im = ImageOps.exif_transpose(im).convert('RGB')
        portrait = p.get('shape') == 'portrait'
        aspect = 3 / 4 if portrait else 4 / 3
        size = (360, 480) if portrait else (480, 360)
        if 'box' in p:
            im = im.crop(p['box'])
        w, h = im.size
        cw, ch = (w, w / aspect) if w / h < aspect else (h * aspect, h)
        z = p.get('zoom', 1.0)
        cw, ch = cw / z, ch / z
        fx, fy = p['focus']
        left = min(max(0, fx * w - cw / 2), w - cw)
        top = min(max(0, fy * h - ch / 2), h - ch)
        im = im.crop((round(left), round(top), round(left + cw), round(top + ch))).resize(size, Image.LANCZOS)
        im = treat(im)
        out = os.path.join(OUT, p['id'] + '.jpg')
        im.save(out, 'JPEG', quality=80, optimize=True, progressive=True)
        total += os.path.getsize(out)
        print(f"{p['id']}.jpg  {os.path.getsize(out) // 1024} KB")
    print(f'total {total // 1024} KB')


def credits():
    for p in PHOTOS:
        print(f"{p['id']}.jpg\n  {page(p)}\n  {credit(p)}\n  {p['used_for']}")


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'credits'
    if cmd == 'download':
        download(sys.argv[2])
    elif cmd == 'build':
        build(sys.argv[2])
    else:
        credits()
