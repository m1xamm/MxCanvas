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

## Stage 1.1 — Design pass and localization

- Theme tokens: --radius-outer 22px, --radius-seam 4px, --gap-cluster 4px, --gap-screen 8px, --radius-pill; old radius scale removed; motion 150/200/250ms; primary container tones added.
- Reusable Cluster (src/ui/Cluster.tsx + src/ui/cluster.css): horizontal/vertical, 4px gap, radii by position (first/middle/last/only), active children become pills with an animated radius.
- Shell rebuilt from floating blocks: left panel (tabs, page, layers/assets list) and right panel (language + zoom, then Position, Layout, Appearance, Fill, Stroke, Effects, Export) float 8px from the window edges; no borders, no dividers, separation by tone and gap only.
- Active tool and active segmented controls use the primary container tone and pill shape (animated radius), motion 150-250ms.
- i18n: ru and en typed dictionaries in src/i18n, t(key), language store with localStorage persistence and navigator.language detection, RU/EN switch in the right panel; document lang attribute follows the UI language; all UI strings moved out of components.
- Store moved to src/core/store.ts (pure TS), shared by the app store and the language store.
- Hotkeys stay on KeyboardEvent.code; new tests: V/H switching on a Cyrillic layout, hotkey map uses only physical codes, hotkeys only for available tools.
- Tests: 42 passing (previous suites + i18n + tool hotkeys). Not verified live: browser look of the new design and animated radii (no browser connected); Intl.PluralRules helper deferred until the first count-based string.

## Stage 2 — Document model, rectangle tool, rendering, history

- core/document: NodeId, SceneNode (id, type, name, parentId, children, local transform Mat2D, width, height, visible, locked, opacity) and RectangleNode (solid fills with RGB + opacity, cornerRadius); Document keeps nodes by id plus ordered root children, exposes getNode, addNode, removeNode, cached getWorldTransform invalidated on change, changeCount and subscribe; SceneNodeUnion stays easy to extend with frame/ellipse/text.
- core/commands + core/history: Command (label, execute, undo), History (execute, undo, redo, canUndo, canRedo, subscribe; a new command clears redo); CreateNodeCommand re-inserts at the original index on redo.
- Selection: selected NodeIds live in a Store (interaction/selection.ts); a created rectangle becomes the only selected node.
- Rectangle tool (R, KeyboardEvent.code): live draft preview kept outside the document until pointerup, then exactly one CreateNodeCommand; any drag direction, Shift = square, Alt = from center, movement under 3px = 100x100 click rectangle, Escape cancels the draft, tool switches to Move after creation; default fill #D9D9D9; name = localized shape word + counter (e.g. "Прямоугольник 1").
- render: Canvas2DRenderer draws visible nodes in tree order from world transforms with fill and clamped corner radius; pure collectVisibleNodes culling; 1px screen-space primary outline around selected nodes (no handles); draft preview drawn on top; re-render on document, selection and draft changes; TEMPORARY_TEST_RECT removed.
- UI: language switch moved off the right panel (which now keeps only zoom) into a Settings modal opened from a new main menu button (MxCanvas icon) at the top of the left panel; popup menu with the Settings item; dialog in cluster style (22px outer radius, rows as a vertical Cluster) with a Language row (Русский / English) and a close button.
- Undo/redo hotkeys by physical code: Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, Ctrl+Y; ignored in text inputs and while the settings dialog is open.
- Tests: 79 passing (document ops, world transforms, history, rect math, culling, rectangle drag math, controller gestures and hotkeys). Not verified live: drawing feel, draft preview look, settings dialog look.
