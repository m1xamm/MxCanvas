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

## Stage 3 — Hit testing, selection, move, resize, delete

- Fixes: the selection is pruned after every history change (execute/undo/redo); the settings dialog traps focus (Tab cycles inside, Escape closes, focus returns to the menu button).
- Hit testing: pure hitTest(scene, worldPoint) returns the top-most visible unlocked node (children before parents, world transforms); collectNodesInRect and collectSelectableIds share the same traversal.
- Selection with the Move tool: click selects the top node, empty click clears, Shift+click toggles, Ctrl/Cmd+A selects all, Escape clears; hover draws a 1px accent outline; the marquee is a translucent accent rect with a 1px border, Shift adds the marquee result to the selection.
- Move: dragging moves the whole selection with live previews kept outside the document, pressing an unselected node selects it first, movement under 3px counts as a click, Shift locks the dominant axis, exactly one MoveNodesCommand per drag; arrows nudge 1px, Shift+arrows 10px.
- Resize: 1px accent bounds with 8 screen-space handles (constant 8px), Shift = proportional, Alt = from center, dragging past the opposite edge mirrors the nodes, a multi-selection scales proportionally inside the bounds, resize cursors over the handles, exactly one ResizeNodesCommand per drag; all math stays axis-aligned.
- Size label: an accent plate with "W × H" in px below the selection, visible whenever the selection is not empty and updated live while resizing.
- Delete: Delete/Backspace runs one DeleteNodesCommand (subtrees cached with parent and index, restored on undo), the selection is cleared, text fields keep their keys.
- Tests: 175 passing (hit testing, selection rules, move and resize math, box transforms, commands with undo/redo, controller gestures and hotkeys). Not verified live: look of the handles, the size plate and the resize cursors (no browser connected to the session).

## Stage 4 — Docked sidebars, toolbar groups, zoom menu, round handles

- Fix: arrow nudges pressed within 500ms of each other (key auto-repeat included) merge into one undoable command; Command.mergeWith plus a History merge window (injectable clock) do the merging, drag moves stay separate steps.
- UI3 layout: the canvas fills the window, both sidebars (240px) dock full height over it with a darker tonal surface and 22px corners only on the canvas side; the existing clusters sit inside with 8px padding, sidebar pointer events never reach the canvas.
- Left sidebar: main menu button, File/Assets tabs, a Pages block with "Page 1" and a Layers (or Assets) block with an empty state. Right sidebar: zoom dropdown, a Design tab and the placeholder property blocks.
- Toolbar: five Figma-like groups (Move: V/H/K, Frame: F/Shift+S/S, Shapes: R/L/Shift+L/O/polygon/star, Pen: P/Shift+P, Text: T). Each group is one button showing the last used tool with a chevron that opens a cluster popup listing the tools and hotkeys; unimplemented tools are disabled, V/H/R still work.
- Zoom menu: percentage dropdown with Zoom in (Ctrl+=), Zoom out (Ctrl+-), 100% (Shift+0), Fit (Shift+1) and Selection (Shift+2); pure fitBounds math sets the viewport so the bounds fit the free area between the sidebars with 64px padding, an empty document falls back to 100%.
- Handles: 10px circles in screen space with a white fill and a 1.5px accent border; the hovered handle grows to 1.25x over 120ms, animated by the renderer inside requestAnimationFrame.
- Tests: 205 passing (nudge merging, viewport fit math, toolbar group state and disabled tools, zoom hotkeys, handle hover tracking, plus the Stage 3 suites). Not verified live: the docked layout, popup menus and handle hover animation (no browser connected to the session).

## Stage 4.1 — Visual polish

- Screenshots: playwright devDependency + scripts/shots.mjs, `npm run shots` boots Vite and drives Chromium at 1440x900 deviceScaleFactor 2 (ru-RU) writing 12 PNGs to .shots/ (gitignored): initial, selected rectangle, hovered handle, main menu, settings dialog, zoom menu, all five tool flyouts and a narrow 1100x700 initial view.
- Shadows: every box-shadow/drop-shadow is gone and the --shadow-overlay token with it; popups and the dialog rely on tone only.
- Popups: src/ui/Popup.tsx renders into a document.body portal with fixed positioning, 8px anchor gap and window margin; flip/clamp math lives in src/ui/popup-position.ts as pure functions; 150ms fade+scale from the anchor's transform-origin, outside pointerdown and Escape close, focus enters the first enabled item and returns to the trigger, ArrowUp/Down/Home/End cycle items.
- Menu look: MenuItem rows (36px, 12px padding, 20px icon column, left label with ellipsis, right dim 11px hotkey, 200px min width) inside a vertical Cluster; the main menu, the zoom menu and all tool flyouts share the same rows; zoom items stay icon-free like Figma.
- Control states: one model for every control — hover 8% and pressed 12% via ::after state layers, focus-visible 2px primary ring with a 2px offset, disabled 38%, active controls in the primary container pill; browser button styles reset.
- Geometry, type and chrome: 4px spacing grid, 20px icons at 1.8 stroke in the 24px viewBox, the toolbar chevron badge sits in a 12px surface notch, Inter/system-ui stack with 12/16 and 11/14 type tokens, fixed line-heights and ellipsis, user-select none except inputs and textareas, thin themed scrollbars, no drag ghost.
- Motion: only transform/opacity transitions plus the pill radius transition AGENTS.md requires, durations from tokens.
- Fixed live with the screenshots: popups were clipped inside the sidebar before the portal, the first item kept the trigger focused until the placement was known, and the shots script now waits for the settled popup before clicking menu items.
- Tests: 214 passing (9 new for popup placement).

## Stage 5 — Control state radii, canvas dot grid, layers panel

- Control states: the state layer and the focus ring follow the control's own radius (cluster 22/4, active pill) — `.tool-group__main` inherits the group radius and animates it, so hover, pressed and focus-visible are never square on toolbar buttons or chevrons.
- Canvas grid: pure math in src/core/canvas-grid.ts (step = 8 * 2^k, the smallest step whose on-screen spacing is at least 20 CSS px; alpha eased between 0.35 and 1 with a log-space triangle wave so octave changes never pop); the renderer batches all dots into one path of device-pixel-snapped 1px squares over the visible region only, color from the new `--color-canvas-grid-dot` token.
- Settings: a "Сетка на холсте" row with a Material 3 pill switch (src/ui/Switch.tsx), on by default, persisted in localStorage under `mxcanvas.canvasGrid` (src/app/settings.ts).
- Layers panel: flat list of root nodes topmost first, 32px rows, 2px gaps, 12px corners, type icon, ellipsized name, hover-only eye and lock buttons that stay visible when off, primary-container selection; click, Ctrl/Cmd+click, Shift+click range, empty-space clear; two-way selection sync with scroll-into-view; row hover draws the canvas hover outline; F2 or double click renames inline (Enter commits one RenameNodeCommand, Escape and blur cancel); drag reorder with a 2px accent drop indicator and one ReorderNodesCommand; virtualized rows (src/core/layers.ts); Ctrl/Cmd+Shift+H / +L toggle hidden and locked, Ctrl+] / Ctrl+[ / Ctrl+Shift+] / Ctrl+Shift+[ reorder by KeyboardEvent.code; hidden nodes are not rendered or hit-tested and leave the selection; SetNodeVisibleCommand, SetNodeLockedCommand, RenameNodeCommand and ReorderNodesCommand are all undoable.
- Fixes found by the screenshots: the layers list is now measured through a callback ref (an empty document renders no list, so the virtual window of a fresh panel stayed at the overscan size); the CanvasStage tool sync moved from a deferred effect to a layout effect, because a stale deferred effect could overwrite a hotkey tool right before the drag.
- Screenshots: `npm run shots` writes 24 PNGs now (toolbar hover/pressed/focus-visible/active close-ups, the grid at 100% and 125% zoom, layers single and multi selection, hovered row, inline rename, hidden + locked row, drag indicator).
- Tests: 273 passing (grid math, display order, range selection, reorder and virtualization math, the four new commands with undo/redo, layer click rules, controller hotkeys).

## Stage 6 — Contrast, color ladder, Material icons, pixel grid, properties panel, motion

- Task 0: AGENTS.md now documents Material Symbols Rounded as the only icon source and the logo assets.
- Task 1: one tonal ladder in theme.css (canvas #141414, sidebar #212121, block #2a2a2a, popup #333333, raised #3d3d3d, primary container as selected); every non-token color outside theme.css is gone; layer rows are the cluster blocks themselves on the sidebar tone with index-based outer/seam corners and pill selection; layerRowCorners is pure math with tests.
- Task 2: logos moved to src/assets/logo-light.svg (used in the dark UI) and logo-dark.svg, page title and two prefers-color-scheme favicon links; all icons replaced by vendored Material Symbols Rounded SVGs in src/ui/icons with one semantic map and one Icon component (filled variants for active tools, hidden layers and locked layers); old inline icon modules deleted.
- Task 3: pixel grid math (src/core/pixel-grid.ts) draws 1 device pixel lines on world integers from 400% zoom, easing in until 800%, one batched snapped path with the new --color-canvas-pixel-grid token; Settings row «Пиксельная сетка» persisted in localStorage and Ctrl+' (Code Quote) toggles it; tests for the math and the hotkey.

- Task 4 (part 1): pure color math (hex/rgb/hsv, paint cloning, css strings) and the safe number expression parser with formatting, both tested.

- Task 4 (part 2): paints gained a visibility flag and nodes a constrainProportions lock; document setters for fills, opacity, corner radius and constrain proportions; mergeable SetFills/SetOpacity/SetCornerRadius commands plus SetConstrainProportions, all covered by undo/redo tests; the renderer now draws every visible fill bottom to top.
- Task 4 (part 3): selection box helpers with ratio and minimum size, mergeable resize commands, pure fill summaries; the right Design panel now has NumberField rows (scrub, arrows with shift and alt steps, expressions, escape, mixed placeholders), a lock-proportions toggle, fill rows with swatch, hex, percent, eye and remove, and a live custom color picker (SV square, hue, alpha, hex) with math covered by tests.
- Task 5: motion tokens (short/fast/medium/long, emphasized and spring easings, press scale) drive a sliding toolbar indicator, press scale on controls, one-time staggered sidebar block entrance, 20 ms popup item staggering, dialog scale and backdrop fade, a spring switch thumb, fade-in of newly created layer rows, radius morphing of layer rows and a scale-in of the canvas size badge; everything animates transform, opacity or radius only, honours prefers-reduced-motion and adds no per-frame work.
- Task 6 (stretch): pure align and distribute math with tests, applied through the existing resize command, with an Align block of six align and two distribute buttons in the Design panel for multi-selection.
