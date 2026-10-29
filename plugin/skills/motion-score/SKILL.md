---
name: motion-score
description: Score a code-drawn animation with sound synthesized in code (Web Audio OfflineAudioContext, no samples) from its frame events, then measure the decoded audio - hit offsets vs frame+1, dB over bed, LUFS, true peak, band energy, phone band, seam - and iterate with measured follow-ups. Use when the user wants sound, music, sfx or a soundtrack for an animation.
---

# Score from frame numbers

`LAB` = two directories above this skill's base directory. Read `$LAB/reference/sound.md` first.

1. Picture is locked first (audit passing). Read `window.__events` (or the timeline table).
2. Write the sound prompt (shape in sound.md) into `SOUND.md`, mapping every event frame to a sound, the bed by bar,
   BPM/key, levels and the master spec. Log it in RECEIPTS.md under `## Sound prompt`.
3. Implement `window.renderAudio({sampleRate, secs})` in the scene (or a sibling `score.html`) with an
   OfflineAudioContext: cosine-phase tones, 0.5-1 ms attacks, hit target sample `(frame+1)/fps*sr`, no waveshapers on
   hits, loop tails wrapped across the seam, DC removed. Render a separate bed-only pass when `{bedOnly:true}` is passed
   so hit-over-bed can be measured.
4. Render and measure:
   ```bash
   node "$LAB/scripts/score.mjs" anim.html --out out/score.wav --passes 2 --dc
   node "$LAB/scripts/score.mjs" anim.html --out out/bed.wav --passes 2 --dc --bed-only   # if supported by the page
   node "$LAB/scripts/audio-measure.mjs" out/score.wav --from-page anim.html --fps <fps> --bed out/bed.wav --json
   ```
5. Spawn **motion-mixer** (`motion-lab:motion-mixer`) with the plugin root path (`LAB`), the measurement JSON and SOUND.md. It returns numbered
   sound follow-ups that quote measurements. Apply, re-measure; log under `## Sound follow-ups` by round.
6. Done when: every hit offset within 0..+1 ms of frame+1, hits 3-6 dB over bed, -14 ± 1 LUFS, TP ≤ -1 dBTP,
   < 50% energy under 60 Hz, seam step inaudible.
7. Mux: `node "$LAB/scripts/export.mjs" mp4 --audio out/score.wav --loudnorm`, then re-run audio-measure on the MP4
   with `--video` to catch codec padding.

You cannot listen; never claim something "sounds" good. Report measurements.
