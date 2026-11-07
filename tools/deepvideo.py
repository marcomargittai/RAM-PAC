"""Turns the field-notes sheets (carousel/deep/out/NN.png) into one 4:5 video
for X, where a post holds at most four images. Each sheet holds long enough
to read or pause on, with a short fade between sheets and the menu music.

    python3 tools/deepvideo.py
"""
import glob
import os
import subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'carousel/deep/out')
HOLD = 4.0  # seconds each sheet is fully on screen
FADE = 0.3

sheets = sorted(glob.glob(os.path.join(OUT, '[0-9][0-9].png')))
n = len(sheets)
total = n * HOLD + FADE

args = ['ffmpeg', '-y', '-v', 'error']
for s in sheets:
    args += ['-loop', '1', '-framerate', '30', '-t', str(HOLD + FADE), '-i', s]
args += ['-i', os.path.join(ROOT, 'public/audio/music-menu.mp3')]

chain = []
prev = '[0:v]'
for i in range(1, n):
    out = f'[v{i}]'
    chain.append(f'{prev}[{i}:v]xfade=transition=fade:duration={FADE}:offset={i * (HOLD + FADE) - FADE * i:.3f}{out}')
    prev = out
chain.append(f'{prev}format=yuv420p[v]')
chain.append(f'[{n}:a]atrim=0:{total:.3f},afade=t=in:d=0.6,afade=t=out:st={total - 2.5:.3f}:d=2.5[a]')

args += ['-filter_complex', ';'.join(chain), '-map', '[v]', '-map', '[a]',
         '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-tune', 'stillimage', '-r', '30',
         '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-t', f'{total:.3f}',
         os.path.join(OUT, 'pac-ram-field-notes.mp4')]
subprocess.run(args, check=True)
print(f'{n} sheets, {total:.1f} s')
