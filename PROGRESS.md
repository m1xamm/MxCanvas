# MxCanvas Progress

## Stage 1 — App shell, theme, infinite canvas with pan/zoom

- Scaffolded the project: npm + Vite + TypeScript (strict) + Preact + Vitest; scripts: dev, build, typecheck, test.
- Added Material 3 dark gray theme tokens as CSS variables (surfaces, on-surface, outline, primary, radii, spacing, type scale, motion) in src/ui/theme/theme.css.
- Built the Figma UI3 shell: left panel with Layers/Assets tabs (placeholders), right panel with Design tab and the live zoom percentage, floating bottom toolbar with 8 inline SVG tool icons.
- Toolbar: only Move (V) and Hand (H) switch the active tool; the other six tools are visual only and disabled.
- core: 2D affine Matrix utilities (multiply, translation, scaling, rotation, applyToPoint, invert) and Viewport (pan, zoom, screen<->world); zoom clamped to 2%..25600%.
- render: Renderer interface + Canvas2DRenderer with devicePixelRatio handling, ResizeObserver resize, dirty-flag requestAnimationFrame rendering, canvas background from a theme token and one temporary hardcoded test rectangle.
- interaction: wheel = pan, Shift+wheel = horizontal pan, Ctrl+wheel and trackpad pinch = zoom at cursor, Space+drag, middle mouse drag and the Hand tool = pan, Shift+0 = zoom 100%.
- Zoom percentage in the right panel updates live while panning/zooming.
- Tests: 33 passing (matrix, viewport incl. cursor-anchored zoom, wheel math, canvas controller with faked DOM).
