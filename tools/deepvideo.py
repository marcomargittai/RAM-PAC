"""Turns the field-notes sheets (carousel/deep/out/NN.png) into one short 4:5
video for X, where a post holds at most four images. Hard cuts, about a
second per sheet, with the menu music. Pause to read.

    python3 tools/deepvideo.py
"""
import glob
import os
import subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'carousel/deep/out')
HOLD = 1.1  # seconds per sheet
LAST = 2.0  # the closing sheet with the link stays a little longer

sheets = sorted(glob.glob(os.path.join(OUT, '[0-9][0-9].png')))
n = len(sheets)
holds = [HOLD] * (n - 1) + [LAST]
total = sum(holds)

args = ['ffmpeg', '-y', '-v', 'error']
for s, h in zip(sheets, holds):
    args += ['-loop', '1', '-framerate', '30', '-t', str(h), '-i', s]
args += ['-i', os.path.join(ROOT, 'public/audio/music-menu.mp3')]

chain = ''.join(f'[{i}:v]' for i in range(n)) + f'concat=n={n}:v=1:a=0,format=yuv420p[v];'
chain += f'[{n}:a]atrim=0:{total:.3f},afade=t=in:d=0.2,afade=t=out:st={total - 1.2:.3f}:d=1.2[a]'

args += ['-filter_complex', chain, '-map', '[v]', '-map', '[a]',
         '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-tune', 'stillimage', '-r', '30',
         '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-t', f'{total:.3f}',
         os.path.join(OUT, 'pac-ram-field-notes.mp4')]
subprocess.run(args, check=True)
print(f'{n} sheets, {total:.1f} s')
