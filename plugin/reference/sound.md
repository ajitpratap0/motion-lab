# Sound from frame numbers

The model can't hear. It scores from frame numbers and checks by measuring decoded audio. That works.

## Rules
- The picture must work muted first: the feed autoplays silent.
- Every sound synthesized in code (Web Audio `OfflineAudioContext`), no samples, no downloads.
- Each hit's first waveform peak lands **1 frame after** its visual event (light beats sound; a sound before its
  picture feels wrong sooner than one slightly late).
- Hits 3-6 dB over the bed (K-weighted RMS, first 60 ms after frame + 1; `audio-measure --bed` reports it as
  `db_over_bed` with `weighting: "K"`).
- Nothing important above 8 kHz; mono-safe.
- Master: 48 kHz stereo WAV, ≈ -14 LUFS integrated, true peak ≤ -1 dBTP, seamless at the loop seam.
- Phones play almost nothing under 150 Hz: keep < 50% of the energy under 60 Hz and check the 200 Hz-6 kHz
  "phone band" loudness. Play bass notes an octave up, give the kick a 150-200 Hz knock.

## Sound prompt shape
```
Score this <secs> s loop, <N> frames at <fps> fps. Synthesize everything with the Web Audio API in
window.renderAudio(), no samples. <BPM> BPM, <bars> bars, key <key>. Each hit lands 1 frame after its visual event.
Bed: <kick/shaker/bass/pad pattern by frame or bar, chord roots per bar>.
Events (from window.__events):
  <frame>: <name> — <sound: click, body Hz, thump Hz / swish / ting partials / riser frames a-b>
  ...
Hits 3-6 dB over the bed, nothing above 8 kHz, mono-safe. Render twice, keep the second pass.
48 kHz stereo WAV, about -14 LUFS, peak -1 dBTP, no click at the seam. Mux into the MP4 and check every hit in its
decoded audio.
```

## Timing-exact synthesis
- Hit target sample = `(frame + 1) / fps × sampleRate`. At 60 fps / 48 kHz that is `(F+1) × 800`.
- Start tones in **cosine phase** with a 0.5-1 ms attack so the first crest is on the target sample.
- No waveshapers or saturation on hits: they shift peaks 4-10 ms.
- Kicks: a 3 ms transient (falls to 65% within 3 ms) so the largest peak is the first.
- A limiter that takes > 1.5 dB off a hit means partials crest on the same sample: change phase or level.
- Remove DC: subtract each channel's loop mean.
- Seamless loop: wrap tails that cross the seam back onto the start (render 2 loops, keep the second).

## Measure, then fix (`audio-measure.mjs`)
Reports per event: peak offset (ms) from frame+1 (measured on mix minus bed when `--bed` is given, so the bed's own
peaks can't masquerade as hits; without `--bed` the basis is the full mix and is flagged `offset_basis: "mix"`),
dB over bed (with `--bed`), integrated LUFS, dBTP, band energy split, median frequency, phone-band LUFS, seam step and codec padding vs video. Write sound follow-ups quoting these
numbers ("kick peaks 5 ms late", "push-in swell only -9.3 dB over bed"), exactly like picture follow-ups.

## Mux
`export.mjs mp4 --audio out/score.wav --loudnorm` → AAC 192k, `-shortest`, +faststart.
For a single-loop MP4, add a 2 ms raised-cosine fade to the first/last 96 samples; keep the seamless WAV as master.
