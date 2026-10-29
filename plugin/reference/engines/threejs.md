# Engine: three.js

Use for anything 3D: product shots, mascots, liquid/chrome shaders, scenes.

## OUTPUT line
`one self-contained HTML file, three.js 0.160.0 via jsDelivr importmap, 1080x1080, 60 fps, 6 s loop (360 frames)`

Pin the version in the importmap (both `three` and `three/addons/`):
```html
<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
"three/addons/":"https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"}}</script>
```

## Rules
- `renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })` so screenshots capture the frame.
- Never use `THREE.Clock` or `renderer.setAnimationLoop` for renders. `renderAt(t)` sets every transform, uniform and
  camera from t, then calls `renderer.render(scene, camera)` (or the composer) exactly once.
- Shader time uniforms take t (and must be periodic in the loop length for loops).
- Seed all noise; per-frame grain uses the frame index as seed.
- Post: tone mapping stated in the prompt: ACES filmic or AgX on the pinned 0.160.0 (`NeutralToneMapping` needs
  r162 or later; bump the pin in the prompt if you want it); bloom only on named emissives with a threshold ≥ 1.0.
- Bake environments (PMREM from a studio built in code) once before `__ready`.
- Give the camera numbers: fov 30-50, orbit range + easing, push-ins with time + easing; never parked.
- Name materials with numbers: `MeshPhysicalMaterial({ color, roughness: 0.38, clearcoat: 0.35 })`, chrome
  `metalness 1, roughness 0.05`.

## Known traps
- r160 `TextGeometry`: extrusion depth is `height`; a `depth` param is overwritten (letters come out 50 deep).
- Fonts for TextGeometry: load from the pinned `examples/fonts/` path, e.g. `helvetiker_bold.typeface.json`.
- Shadows flicker between frames if the shadow camera moves with the object; fix its frustum.
- Motion blur: use the renderer's `--subframes <n> --shutter 0.5` (n from the fastest rotation, see motion-export)
  (linear-light average = 180° shutter) instead of
  a post-process blur.
- `--gpu` for heavy scenes; software rendering is exact but slow.

## __probe for 3D
Project world positions to screen and expose them: `{ heroX, heroY, heroScreenW, lidAngle, budY, camDist }`, so audits
can check "nothing leaves the frame" and "lid shuts exactly at frame 300".
