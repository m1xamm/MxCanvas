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
- Make small commits: one per finished logical unit (3-8 per stage), never one giant commit per stage. Commit only when typecheck, test and build pass.
- Push to origin main right after every commit. If push fails, say why in the report.
- Commit message: English, imperative, lowercase, max ~50 characters, NO period at the end, one line, no body. Describe the concrete change.
  Good: `add canvas pan and zoom`, `fix zoom anchor at cursor`, `add rectangle tool`
  Bad: `Implemented comprehensive canvas functionality.`, `✨ feat: enhance rendering pipeline`, `Update files`
- No emojis, no "feat:/fix:" prefixes, no vague words (improve, enhance, comprehensive, robust, various, misc), no "Co-Authored-By" or "Generated with" lines, no mention of AI.
- Never commit node_modules, dist or secrets.

## Performance rules
- Render on demand (dirty flag + requestAnimationFrame), never a constant loop.
- Viewport culling. No per-frame allocations in hot paths. Cache text measurements and Path2D objects.
- Design hit-testing so a spatial index can be added later.
- Target: 60 fps with 5,000 simple nodes.

## UI / design
Figma UI3 layout, Material 3 Expressive look, dark gray theme.
Shape tokens in theme.css: --radius-outer: 22px, --radius-seam: 4px, --gap-cluster: 4px, --gap-screen: 8px.
Cluster pattern: related blocks sit in a cluster of separate tonal blocks 4px apart. The cluster's outer corners are 22px, corners where two blocks touch are 4px. One reusable `Cluster` (CSS utility + Preact component, horizontal and vertical) sets radii by position (first/middle/last/only). Use it for: toolbar buttons, left panel blocks, right panel sections (Position, Layout, Appearance, Fill, Stroke, Effects, Export), property rows, segmented controls.
Panels float 8px from the window edges. No 1px borders, no divider lines: separation is only the 4px gap and tone difference. Elevation is tonal; shadows only for popups and menus.
Active controls: primary container tone and pill shape (radius transition). Motion 150-250ms, emphasized easing.
All colors, spacing, radii, typography and motion come from CSS variables in src/ui/theme. Never hardcode them. Icons are our own inline SVG components.

## Localization
- UI languages: Russian (default) and English. All UI strings live in src/i18n/ru.ts and en.ts as typed dictionaries, accessed via `t(key)`. No hardcoded strings in components.
- Russian must be natural and use Figma's Russian terms (Слои, Ресурсы, Фрейм, Прямоугольник, Заливка, Обводка, Эффекты, Экспорт). Plurals via Intl.PluralRules.
- Language comes from navigator.language on first run, can be switched in the UI, persisted in localStorage.
- Hotkeys use KeyboardEvent.code (physical keys) so they work on the Russian layout.

## Figma behavior is the spec
When unsure how something should behave, copy Figma. Hotkeys: V move, R rectangle, O ellipse, L line, Shift+L arrow, T text, F frame, P pen, H hand, Space+drag pan, scroll = pan, Ctrl+scroll / pinch = zoom at cursor, Shift+0 zoom 100%, Shift+1 zoom to fit, Shift+2 zoom to selection, Ctrl+Z undo, Ctrl+Shift+Z redo, Ctrl+D duplicate, Ctrl+G group, Ctrl+Shift+G ungroup, Ctrl+Alt+G frame selection, Shift+A auto layout, Ctrl+Alt+K create component, Ctrl+] / Ctrl+[ bring forward / send backward.

## Working rules for the AI
- Do exactly the stage the user asked for. No extra features.
- Read PROGRESS.md first (if it exists). Append a short entry when the stage is done.
- Before saying "done" run `npm run typecheck`, `npm run test`, `npm run build` and fix all errors. Say honestly what does not work.
- No silent stubs or fake implementations: anything unfinished must be listed in the report.
- Do not refactor unrelated code. Do not change the architecture rules without asking.
- If a decision is ambiguous, ask the user (max 3 questions at once).
- Reply ONLY in Russian: chat messages, questions and the final report. Never switch to Chinese or any other language. Code and i18n keys stay English.
- Do not rush. Do exactly what the stage prompt says, no more, no less. Before the report, re-read the stage prompt and verify every task item is really implemented; list every skipped or partial item under "Broken or deviating".
- If the prompt does not say where a control or screen belongs, ask instead of guessing. Settings-type controls (language and similar) never go on the main screen.

## Report format (end of EVERY stage, in Russian)
The report is read by another AI to plan the next stage. Max 30 lines. No fluff, no repeating the task, no restating unchanged code.
1. Done: max 8 one-line bullets
2. Checks: typecheck / test / build, one line
3. Broken or deviating: honest list, or "none"
4. Changed API: signatures only of what was added or changed in this stage
5. Commits: list of messages
6. Manual check steps: max 5 lines