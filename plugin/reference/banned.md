# Motion ban list

Without design direction, the model falls back on a few default styles. "Avoid a generic AI look" only swaps one
default for another. What works: ban the exact patterns by name, check which defaults the first render used anyway,
and extend this list in the project's `motion-lab.json` (`banned` array).

## Starting list
- purple or blue gradients; dark navy "space" backgrounds unless directed
- glow, glow orbs, halo rings, bloom used as decoration, neon, lens flares
- floating particles as decoration
- generic spinning turntables / constantly rotating hero products
- everything fading in at once
- fade-and-slide-up on every element
- centered-everything layouts
- text that moves while it is being read
- made-up taglines or copy the brief did not supply
- linear easing on moves
- every element bouncing (overshoot on text, opacity or color)
- changing everything on every beat

## Keep the list alive
After every first render, the reviewer names each default it sees ("halo ring behind the product", "particles drifting
up") and you add it here or to the project's ban list. Re-render. The list is the project's memory of its own taste.
