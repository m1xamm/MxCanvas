# MxCanvas — AGENTS.md

## What this is
MxCanvas is a browser-based vector design editor that reproduces Figma's core behavior and UI layout as exactly as possible (free-tier features only). The user is not a professional developer and vibe-codes with you.
Talk to the user in Russian. Code, identifiers and UI strings are in English.

## Scope
IN: infinite canvas; pages; frames and groups; rectangle, ellipse, line, arrow, polygon, star; pen/vector paths; text; fills (solid, gradient, image), strokes, corner radius, effects (shadows, blur), opacity, blend modes; constraints; auto layout; basic components and variants; styles; layers panel; alignment/distribution; smart guides and snapping; rulers; undo/redo; export PNG/SVG; save/load project file (JSON).
OUT (never build): Dev Mode, multiplayer/cloud/accounts, community plugins, FigJam, AI features, branching, any paid-only Figma feature.

## Tech
TypeScript (strict) + Vite + Preact for UI panels. Canvas 2D renderer behind a `Renderer` interface (so a WebGL renderer can replace it later). Vitest for unit tests. No other runtime dependency without asking the user first.

## Architecture
- src/core/: pure TypeScript, NO DOM access. Document model (node tree), geometry/matrices, commands + history, serialization.
- src/render/: Renderer interface + Canvas2D implementation. Reads the document, never mutates it.
- src/interaction/: input handling, tools, selection, snapping.
- src/ui/: Preact components (toolbar, layers, properties) and theme.
- src/app/: wiring and entry point.
Rules:
1. Every document change goes through a Command (execute/undo). UI and tools never mutate nodes directly.
2. Each node stores a local 2D affine transform relative to its parent; world transforms are derived and cached.
3. Document JSON has a `version` field and stays forward-compatible.
4. World coordinates are float px. screen = world * zoom + pan.

## Clean code
- NO comments anywhere in code: no line comments, no block comments, no JSDoc, no TODO/FIXME, no commented-out code. Only tool directives that cannot be avoided (like `@ts-expect-error`) are allowed.
- The code must explain itself: precise names, small single-purpose functions, early returns, no magic numbers (named constants), no dead code, no unused exports.
- Keep files under ~300 lines; split bigger ones. Prefer plain data + pure functions in core.
- Do not leave debug logs (`console.log`) in committed code.

## Git
- Remote: https://github.com/m1xamm/MxCanvas.git (origin). Branch: main.
- Commit after each finished logical unit of work, and always at the end of a stage, only when typecheck, test and build pass. Never push unless the user asks.
- Commit message: English, imperative, lowercase, max ~50 characters, NO period at the end, one line, no body. Describe the concrete change.
  Good: `add canvas pan and zoom`, `fix zoom anchor at cursor`, `add rectangle tool`
  Bad: `Implemented comprehensive canvas functionality.`, `✨ feat: enhance rendering pipeline`, `Update files`, `Refactor and improve code`
- No emojis, no "feat:/fix:" prefixes, no vague words (improve, enhance, comprehensive, robust, various, misc), no "Co-Authored-By" or "Generated with" lines, no mention of AI.
- Never commit node_modules, dist or secrets. Keep .gitignore correct.

## Performance rules
- Render on demand (dirty flag + requestAnimationFrame), never a constant loop.
- Viewport culling. No per-frame allocations in hot paths. Cache text measurements and Path2D objects.
- Design hit-testing so a spatial index can be added later.
- Target: 60 fps with 5,000 simple nodes.

## UI / design
Match Figma UI3 layout: floating toolbar at bottom center, left panel (Layers / Assets, pages), right panel (Design tab with sections like Position, Layout, Appearance, Fill, Stroke, Effects, Export).
Visual style: Material 3 Expressive, dark gray theme by default, rounded surfaces, tonal elevation, short smooth motion.
All colors, spacing, radii, typography and motion come from CSS variables in src/ui/theme. Never hardcode colors in components. Icons are our own inline SVG components (no icon library without asking).

## Figma behavior is the spec
When unsure how something should behave, copy Figma. Hotkeys: V move, R rectangle, O ellipse, L line, Shift+L arrow, T text, F frame, P pen, H hand, Space+drag pan, scroll = pan, Ctrl+scroll / pinch = zoom at cursor, Shift+0 zoom 100%, Shift+1 zoom to fit, Shift+2 zoom to selection, Ctrl+Z undo, Ctrl+Shift+Z redo, Ctrl+D duplicate, Ctrl+G group, Ctrl+Shift+G ungroup, Ctrl+Alt+G frame selection, Shift+A auto layout, Ctrl+Alt+K create component, Ctrl+] / Ctrl+[ bring forward / send backward.

## Working rules for the AI
- Do exactly the stage the user asked for. No extra features.
- Read PROGRESS.md first (if it exists). Append a short entry when the stage is done.
- Before saying "done" run `npm run typecheck`, `npm run test`, `npm run build` and fix all errors. Say honestly what does not work.
- No silent stubs or fake implementations: anything unfinished must be listed in the report.
- Do not refactor unrelated code. Do not change the architecture rules without asking.
- If a decision is ambiguous, ask the user (max 3 questions at once).

## Report format (end of EVERY stage, in Russian)
1. What was done (bullets)
2. Files created/changed
3. How to run and manually check it (steps)
4. Results of typecheck / test / build
5. What does not work, compromises, deviations from the stage
6. Current src/ tree + key types/interfaces (signatures only, not full code)
7. Commits made in this stage (list of messages)
8. Risks and suggestions for the next stage