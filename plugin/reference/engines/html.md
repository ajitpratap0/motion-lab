# Engine: plain HTML / CSS / SVG / Canvas 2D

Use for one idea under ~10 seconds in 2D: type, shapes, UI, logo stings. Zero installs.

## OUTPUT line
`one self-contained HTML file, no libraries, 1080x1080, 24 fps, 6 s loop (144 frames)`

## Patterns
- CSS keyframes and WAAPI are frozen by the renderer through `document.getAnimations()`; set
  `animation-play-state` normally, the renderer pauses and seeks them. No `transition:`.
- Canvas 2D: all drawing inside `renderAt(t)`; clear and redraw the full frame every call.
- SVG: drive attributes from `renderAt(t)` or use WAAPI on SVG elements; SMIL is not frozen reliably, avoid it.
- Fonts: Google Fonts with `&display=block`; await `document.fonts.ready` before `__ready`.
- Size the root to the exact canvas (`html,body{margin:0;width:1080px;height:1080px;overflow:hidden}`).
- Split text into per-letter spans for staggers; stagger with `animation-delay` computed from tokens.
- Snap resting text to whole pixels (`transform: translate(round(x)px, ...)`).

## GSAP inside plain HTML
GSAP 3.12.5 (all plugins free, incl. SplitText, MorphSVG, DrawSVG). Build a paused master timeline and seek it:
```js
const tl = gsap.timeline({ paused: true, repeat: 0 });
// ... tl.to(...) ...
window.renderAt = (t) => { tl.seek(t, false); };   // suppressEvents=false is fine; no callbacks with side effects
```
Never let GSAP run on its own ticker for renders: `gsap.ticker.lagSmoothing(0)` and keep the timeline paused.
