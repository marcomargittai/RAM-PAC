#!/usr/bin/env bash
# Gives PAC-7's lines their machine voice. The raw takes from ElevenLabs live
# in tools/voice-raw; this writes the processed lines to public/audio.
#
#   dry     the voice, one semitone down
#   robot   the same voice with its phase zeroed (a mechanical buzz), ~35%
#   shadow  a low pitched-down double underneath, ~22%
#
# then a short metallic comb and loudness normalisation.
# Run from the repo root: tools/voice.sh [name ...]
set -euo pipefail
cd "$(dirname "$0")/.."
names=("$@")
if [ ${#names[@]} -eq 0 ]; then
  names=($(ls tools/voice-raw | sed 's/\.mp3$//'))
fi
for n in "${names[@]}"; do
  ffmpeg -hide_banner -loglevel error -y -i "tools/voice-raw/$n.mp3" -filter_complex "
    [0:a]aformat=sample_rates=44100:channel_layouts=mono,asetrate=44100*0.944,aresample=44100,atempo=1.059,apad=pad_dur=0.4,asplit=3[a][b][c];
    [b]afftfilt=real='hypot(re,im)':imag='0':win_size=1024:overlap=0.75,highpass=f=200,lowpass=f=5000,volume=0.35[robot];
    [c]asetrate=44100*0.75,aresample=44100,atempo=1.3333,lowpass=f=2400,volume=0.22[shadow];
    [a][robot][shadow]amix=inputs=3:normalize=0,
    aecho=0.85:0.55:11|17:0.22|0.14,
    highpass=f=80,
    acompressor=threshold=-22dB:ratio=3:attack=5:release=120,
    loudnorm=I=-29:TP=-3:LRA=9,aresample=44100
  " -ac 1 -b:a 128k "public/audio/$n.mp3"
  echo "voiced $n"
done
