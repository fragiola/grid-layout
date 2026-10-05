# Grid Layout

A **headless** grid layout: items placed on a grid of columns and rows that people drag and resize,
with collision handling and compaction (dashboards, widget boards, bento layouts). It ships
behaviour, accessibility and composable primitives. It ships **no CSS, no icons, no handles, no
placeholder look and no text**. Styling belongs 100% to the consuming developer; the package never
assumes Tailwind, shadcn or anything else.

Its behaviour reference is React Grid Layout (`../react-grid-layout`, MIT). Its architecture is
Fragiola's, shared with Dockable (`../dockable`) and Data Grid (`../data-grid`): a framework-free
core, a typed model of commands, an engine per grid on screen, and React primitives under the
Dockable primitive contract, with the keyboard and right-to-left from day one.

Other adapters may follow React, so **every piece of logic that isn't rendering lives in the core**.

| package | name | contains | depends on |
|---|---|---|---|
| `packages/core` | `@fragiola/grid-layout` | the layout rules (geometry, collision, move, compaction), the typed model and its commands, the engine that binds one grid to the DOM | DOM only, zero runtime deps |
| `packages/react` | `@fragiola/grid-layout-react` | the `GridLayout.*` primitives and hooks over the core | peer `react`, `react-dom` (^19) |
| `apps/playground` | private | the dev app (every site example live, with themes and source), unstyled fixture pages driven by Playwright | both packages, `examples/react` |
| `examples/react`, `site` | private | the site's examples (the embed app) and pages, exported for fragiola.com | |

## Non-negotiable rules

These are the decisions of Epic #1. A change that breaks one is a decision for the maintainer, not
an implementation detail.

1. **Names (D1).** Packages `@fragiola/grid-layout` (core) and `@fragiola/grid-layout-react`; repo
   `fragiola/grid-layout`; fragiola.com slug `/grid-layout`; www `devUrl` `http://localhost:5182`.
   React namespace `GridLayout`; core creators `createGridLayoutModel` and
   `createGridLayoutEngine`. Every part carries `data-grid-layout-part`, items `data-item-id`.
   Example theme tokens are `--gl-*`, in examples only.
2. **Own implementation, referenced source (D2).** `../react-grid-layout` (v2.2.4, MIT,
   "Copyright (c) 2016 Samuel Reed") is a **study reference: read-only, never modified, never
   copied wholesale**. A file whose algorithm or code is derived from it starts with a header
   naming the project, the upstream file, the copyright line and the MIT licence; the root
   `LICENSE` carries the project's full notice and each package ships an identical copy;
   `packages/core/tests/guard.test.ts` lists the derived files (`DERIVED`) and the notice lines
   (`NOTICES`). A behavioural test ported from its `test/spec/*` carries `react-grid-layout#<n>` in
   its name where an upstream issue exists. Code reused from Dockable or Data Grid carries the
   lighter header `// From Data Grid (fragiola/data-grid, <path>), same author and licence.`
   (or Dockable's).
3. **Hybrid state (D3).** The **model** holds the grid's rules and data: the items
   (`LayoutItem = { id, x, y, w, h, minW?, maxW?, minH?, maxH?, static?, draggable?, resizable? }`
   in grid units, `x` from the inline-start edge), `cols`, `maxRows` and the compaction (the
   compactor, `preventCollision`, `allowOverlap`). It stores layouts **per breakpoint** (one
   implicit breakpoint until responsive grids). Every change is a command through a middleware
   chain (`model.run` / `model.use`); reads go through `get`/`is` keys typed by a registry.
   **A committed layout is always valid**: inside the columns, no overlap unless `allowOverlap`, compacted. `maxRows` bounds what a gesture or a command asks for; pushes and compaction may settle items below it, as in React Grid Layout.
   An **engine** is one grid on screen: measurement, px↔grid geometry (`rowHeight`, `gap`,
   `padding`), container height (`autoSize`), gesture sessions and the preview layout, keyboard,
   focus and direction. `GridLayout.Root` takes declarative props, each controlled (`layout` +
   `onLayoutChange`) or uncontrolled (`defaultLayout`), mapped onto commands; the model and engine
   are reachable through `useGridLayout()`. **No child-key synchronisation** (React Grid Layout's
   `data-grid`): the model is the source of truth and the developer renders its items.
   - **One verb pattern** (Dockable's rule 13): the model and the engine share
     `run`/`can`/`check`/`get`/`is(key, payload)`. Keys are kebab-case. A command's key contains a
     dot (`item.move`); an engine action's never does (`cancel-gesture`). An id field is named
     `itemId`; a `get` key that takes an id ends in `-by` (`item-by { itemId }`).
4. **The primitive contract is Dockable's (D4).** One namespace (`GridLayout.Root`, …), hooks
   exported as the lower layer; `render`, never `asChild`; `ref` a plain prop; arbitrary props
   forwarded, handlers internal first then the consumer's; `className`/`style` a value or
   `(state) => value`; **inline style structural only**; state only through `data-*` and ARIA,
   present or absent; **no text and no accessible names**; part hooks return `{ state, props }`;
   the developer owns the recursion (a children function over the model's items).
5. **Geometry is behaviour, looks are not (D5).** `cols`, `rowHeight`, `gap`, `padding`, `maxRows`
   and `autoSize` are core configuration: they decide where items are. Colours, transitions,
   shadows, opacity, cursor, the look of the placeholder and handles, and announcement text are
   the app's. The packages ship no CSS file and no CSS variables.
6. **Layout rules (D6).** Pure functions under `packages/core/src/layout`: geometry, collision,
   sort, move-with-push (React Grid Layout's `moveElement` semantics), compaction as a strategy
   object `{ type, compact(items, cols) }` (vertical by default, horizontal, none), and
   normalisation of an incoming layout. **Inputs are never mutated** (tests feed frozen layouts).
   Every deliberate deviation from React Grid Layout is listed in `docs/walking-skeleton-report.md`.
7. **Interaction (D7).** Pointer Events with `setPointerCapture`, through the root's
   `ownerDocument`/`defaultView`: one path for mouse, touch and pen. **No HTML5 drag and drop for
   moves inside the grid, and no drag or resize library.** A press stays a click under a threshold
   (default 3 px). At most one preview per animation frame. Escape, `pointercancel`, a lost capture
   or a move with no button end a gesture with no command. A drag starts from the item body unless
   the item holds a `DragHandle`; native controls and `[contenteditable]` never start one, and a
   `data-grid-layout-no-drag` subtree opts out. `touch-action: none` on drag and resize handles is
   structural (unlike Data Grid: mobile is a goal here).
8. **A gesture does not render React (D8)** unless the preview layout changes. The engine writes
   the active item's transform imperatively; React never reconciles what the engine writes during
   a gesture.
9. **Callbacks (D9).** `onLayoutChange` fires **once per committed change**: never during a
   gesture, never twice, and on mount only when normalisation changed the given layout. Gesture
   callbacks receive immutable objects.
10. **Keyboard and accessibility are core behaviour (D10).** Each item is a tab stop (its
    `DragHandle` when it has one). Space or Enter grabs; Arrows move one cell; Shift+Arrows resize
    from the end and bottom edges; Space or Enter drops (one command); Escape or Tab cancels and
    restores. Arrows are visual (in RTL, ArrowRight moves toward inline-start). A consumer key
    handler can cancel or replace any key; middleware can refuse a move. Primitives set **no role,
    no name and no live-region text**: the engine emits grab, move, resize, drop and cancel events
    the app announces.
11. **Logical coordinates and RTL (D11).** `x` counts from the inline-start edge; resize sides are
    `top`, `bottom`, `start`, `end` and the corners (`top-start`, …). Direction comes from Root's
    `dir`, else the root's computed `direction`. The same Playwright spec runs against an LTR and
    an RTL fixture.
12. **Versions and tooling (D12).** pnpm 11, Node ≥ 24, Biome 2.5, TypeScript 7, tsdown, Vitest 5,
    Playwright, Vite 8, Tailwind v4 (apps only), React 19. Pin dependencies to exact versions
    published at least 7 days ago (`npm view <pkg> time`). The workspace packages resolve to their
    sources through the `@fragiola/source` export condition (`scripts/source-condition.ts`); the
    published `exports` are `publishConfig.exports`, without it. **No runtime dependency** in the
    core, and no drag, resize or gesture library anywhere in the packages.
13. **No global DOM in the core (D13).** The core never touches global `document`, `window`,
    `requestAnimationFrame` or `ResizeObserver`: it goes through the root's
    `ownerDocument`/`defaultView`. It has zero runtime dependencies and never imports `react`.
    Guard tests enforce all three.
14. **App policy stays in the app (D14).** Persistence, toolboxes, add and remove UI, undo, ids,
    announcement text and widget content belong to the examples (`_kit`), never to a package.

### External drop (Epic #9)

15. **Pointer sources, and native drags for foreign content (X1).** `GridLayout.DragSource`
    (`useDragSource`) is pointer-based: the engine owns its session (threshold, capture on the
    source, frames, Escape, cancel) through the root's document, as an internal move. It gives
    `item: { w, h, minW?, maxW?, minH?, maxH? }`, an optional `itemId`, opaque `data` and a
    `dragOffset`. **No HTML5 drag and drop for sources** (no touch). Native drags from other
    windows (files, links, text) go through the root's `dragenter`/`dragover`/`dragleave`/`drop`
    with an enter/leave counter, answered by `onExternalDrag(event)`: `{ w, h, data? }` accepts,
    `false` refuses (`data-drop-refused`), `undefined` lets it pass; asked again on the drop, when
    the files can be read (that answer can refuse and gives the data; the size stays the shown
    one). The drag image is the app's: `GridLayout.DragPreview`, kept at the pointer by the engine.
16. **Preview, then commit (X2).** A drop is a gesture of kind `drop`. Its preview is the model's
    dry run of `item.add` against the layout at the gesture's start, under the id the drop
    commits (made when the drop begins); it never enters the model nor `onLayoutChange`. The item is
    centred under the pointer, moved by `dragOffset`, bounded with `bounded`, mirrored in RTL.
    The drop runs **one** `item.add`, its id the source's `itemId`, else the engine's `createId`
    option's (Root's `createId`), else `crypto.randomUUID()` through the root's `defaultView`
    (D13). `createId` is the engine's, not the model's: the engine is what makes a drop's id, and
    an app's own `item.add` names its id (D14). Then `onDrop({
    item, data, layout })`, on the root and on the source.
17. **Dragging out is reported, never removed (X3).** Once a held item's centre leaves the root
    (past its sides or top, or further below its bottom than its own height with `autoSize`),
    `data-outside` marks the item and the root and the preview puts it back in its cell. A release
    there runs **no command**: `onDragStop` gets `outside: true` and `target` (the element under
    the pointer, past the held item). Removing it is the app's (D14). A `bounded` grid never lets
    an item out.
18. **The layout stays geometry (X4).** `LayoutItem` has no `data` and no generic: a drop's data
    travels only in the gesture's events and `onDrop`; the app maps ids to its content.
19. **`gridLayoutRef` (X5).** `createGridLayoutRef()` / `useGridLayoutRef()` (Data Grid's
    `createDataGridRef`): `current` is `{ model, engine }` while a `Root` given it as
    `gridLayoutRef` is mounted, `null` otherwise, and it tells when that changes. Hooks and parts
    outside the root take it (`useGridLayout(ref)`, `useGridLayoutView(ref)`,
    `useGridLayoutEvents(listener, ref)`, `DragSource`/`DragPreview`'s `gridLayoutRef`).
20. **Sources work from the keyboard (X6).** A `DragSource` is a tab stop. Space or Enter on it
    starts a keyboard gesture of kind `drop`: the new item enters the preview at the first free
    cell, already grabbed; Arrows move it, Shift+Arrows size it, Space or Enter drops it (one
    `item.add`) and the focus moves to the new item once it is mounted; Escape, Tab or the focus
    leaving gives up. Events are D10's (`grab`, `move`, `resize`, `drop`, `cancel`) with
    `external: true`; pointer and native drops tell `drop-start`, `drop-over`, `drop`,
    `drop-cancel`. No name and no text in the primitives.

### Responsive and mobile (Epic #13)

21. **Container width, not viewport (R1).** The breakpoint is the widest whose minimum is at most
    the grid's **own** measured width (React Grid Layout's must be exceeded: a recorded
    deviation); never a viewport media query. `Root` takes `breakpoint` (controlled, it overrides
    the width), `defaultBreakpoint` (before the grid is measured) and `onBreakpointChange(name,
    cols)`, told once per change. A width wavering at a threshold settles (24 px past it to cross
    back the threshold just crossed): no resize loop.
22. **One model shape (R2).** The model holds `breakpoints`, `cols` per breakpoint and a layout
    per breakpoint (one implicit `default` breakpoint without them). Commands `breakpoint.set`,
    `layouts.set`, `layouts.generate`; `item.*` and `layout.set` take an optional `breakpoint`;
    queries `cols`, `cols-by`, `layout-by`, `breakpoints`, `breakpoint-for`.
    `onLayoutChange(layout, layouts)` keeps its first argument and adds every breakpoint's.
23. **Generation (R3).** A breakpoint without a layout, made active, gets one right after as a
    command of its own (`layouts.generate`, middleware and `onLayoutChange` see it): the nearest
    larger breakpoint's layout, else the last active one's, settled in its columns (gaps
    collapse). Every breakpoint shows the same items: one added or removed on a breakpoint is on
    the others at their next activation (in the same `breakpoint.set`), each keeping its own
    places. A `grid.configure` that drops the active breakpoint makes the widest one active.
24. **Geometry per breakpoint (R4).** `gap`, `padding` and `rowHeight` take one value or one per
    breakpoint; they are engine options, never stored in the model.
25. **Touch activation (R5).** A touch on an item's **body** is held `touchDelay` (250 ms) within
    `touchTolerance` (5 px) before it drags, `data-pressing` on the item meanwhile; a touch that
    moves first is let go, so the page scrolls. Handles, resize handles and drag sources start at
    once (structural `touch-action: none`); item bodies get no `touch-action`. A touch that holds
    an item never scrolls the page (a non-passive `touchmove` guard on the root) and opens no
    long-press menu or selection. iOS's callout and selection styles (`-webkit-touch-callout`,
    `user-select`) are the app's CSS, as any look (D5).
26. **Edge auto-scroll (R6).** During a move, a resize or a drop from a drag source, near the
    edge of the nearest scrollable ancestor along each axis (else the page), within
    `autoScroll.threshold` (40 px, at most half the view) the engine scrolls up to
    `autoScroll.speed` (20 px) a frame, faster the deeper; the preview follows; it stops out of
    the zone, at the grid's end (half a held item past it, with `autoSize`) and with the gesture.
    `autoScroll: false` turns it off. Native drags are the browser's to scroll.

## Commands

| command | does |
|---|---|
| `pnpm install` | install dependencies |
| `pnpm check` | Biome lint + format + assist (non-mutating) |
| `pnpm check:fix` | Biome check with auto-fix |
| `pnpm typecheck` | `pnpm -r typecheck` (TypeScript 7, no emit) |
| `pnpm test` | Vitest: `core` (node), `react` (jsdom), `playground`, `examples-react`, `site` |
| `pnpm bench` | Vitest benchmarks (informative, not a gate) |
| `pnpm build` | `pnpm -r build` (tsdown for the packages, Vite for the apps), then the `.d.ts` check |
| `pnpm size` | the bundle sizes of every entry point (raw, gzip, min + gzip): a report, after `pnpm build` |
| `pnpm e2e` | Playwright: the playground (Chromium, Firefox, and `mobile`: Chromium on a phone with touch) and the examples app (Chromium); `PLAYWRIGHT_WEBKIT=1` adds WebKit on an iPhone (a non-blocking CI job) |
| `pnpm dev` | the playground on <http://localhost:5173>: every example live, the fixtures (`PLAYGROUND_PORT` moves it) |
| `pnpm site:export --base /grid-layout --out <dir>` | the site export for fragiola.com (contract v1.2, `../www/CONTRACT.md`), self-validated |
| `pnpm site:dev --base /grid-layout --port 5182` | the examples app with hot reload, under the base `www` proxies in dev |

## Repository layout

```
packages/core/      @fragiola/grid-layout        src/, tests/
packages/react/     @fragiola/grid-layout-react  src/, tests/
apps/playground/    src/                         the shell: catalog, sidebar, toolbar, stage, source
                    fixtures/<name>/             unstyled pages Playwright drives
                    e2e/, tests/                 Playwright specs, unit tests
examples/react/     src/examples/<slug>/         the site's examples (the embed app, Vite)
                    src/components, lib, …       Fragiola UI, vendored (scripts/vendor-fragiola.ts)
                    e2e/                         Playwright specs, also inside an iframe
site/               docs/                        the pages fragiola.com/grid-layout serves
                    export.ts, contract.ts       `pnpm site:export` and its validation
scripts/                                         the `.d.ts` check, the size report, the source condition
docs/                                            reports
```

## Playground

`pnpm dev` serves `apps/playground`: a local app to see the packages working, with hot reload on
the core, the React primitives and the examples. A sidebar, a theme switch (the five example
themes) and the source beside the stage; the state is in the URL
(`?example=<slug>&theme=<name>&code=1`).

- **Examples** live in `examples/react/src/examples` and are public: the site embeds them, readers
  copy them. The playground reads them in place (`import.meta.glob`, the `#/` alias and the
  pre-paint theme from `examples/react/vite.shared.ts`); it never keeps a second list.
- **Fixtures** (`fixtures/<name>/`) are the unstyled pages Playwright drives; the sidebar links
  them.

## Provenance: React Grid Layout

`../react-grid-layout` is the behaviour reference: read it, never modify it, never copy it
wholesale. What Grid Layout takes from it is behaviour (how items push, how compaction settles, how
a resize anchors its opposite edge), checked by its behavioural tests where they hold. What it
leaves behind on purpose: in-place mutation of layouts, child-key synchronisation (`data-grid`),
`WidthProvider`, the shipped CSS, `react-draggable`/`react-resizable`, and the legacy v1 API.

## Conventions

- Biome: 4-space indent, double quotes, LF, trailing newline, organized imports.
- TypeScript strict with `noUncheckedIndexedAccess` and `verbatimModuleSyntax`.
  Do not relax it; a blanket `!` on every index access is not a fix.
- Commits are gitmoji-conventional: `✨ feat(core): …`, `🐛 fix(react): …`,
  `✅ test(core): …`, `🔧 chore: …`, `📝 docs: …`.
- Branches: `<type>/epic-<n>-<short-description>`; one worktree per Epic under `.worktrees/`.
- Unit tests live in each package's `tests/`, mirroring `src/`; type fixtures in `tests/types/`.
- Every exported member has a one-line `/** … */`; a file opens with a `//` header when its
  purpose or a design choice is not obvious from its name.

## Type safety

- **No `any` in public types.** A guard test checks the core's exported declarations, and
  `pnpm build` checks every package's emitted `.d.ts` (`scripts/check-dts.ts`).
- **Result objects, not throws**, for anything a caller can get wrong: a command returns
  `{ ok: true, value } | { ok: false, error }`.
- **Type fixtures** go in `tests/types/` (checked by `tsc`, not run): `@ts-expect-error` marks
  what must not compile.

## Code quality

Every change keeps the packages small, simple and fast (Data Grid's Epic #62 checklist). Before
writing code:

- **Reuse first.** Look for the helper that already exists before writing one. Logic needed twice
  becomes one function; a helper several modules use goes in a small shared module.
- **The core grows only for the grid layout's own job.** What is not (announcement text, ids,
  persistence) is the app's.
- **Simple over clever.** No flag that duplicates other state, no defensive branch that cannot
  happen, no wrapper with a single caller unless its name says something the code does not.
- **Hot paths allocate nothing they do not need**: the pointer move handler, the preview, the
  per-item hooks. Nothing runs per frame that can run per preview change (D8).
- **Size is watched.** `pnpm size` (after `pnpm build`; CI prints it too) reports each entry point;
  a PR says when one grows noticeably, and why.
- **Tests share their setup**, never a copy.

A review checks:

1. Nothing is duplicated: logic needed twice is one function.
2. An existing helper is reused where one fits.
3. The core grows only for the grid layout's own job.
4. A hot path allocates and computes nothing it does not need.
5. The size report: what it adds, and why, in the PR.

## The primitive contract (`@fragiola/grid-layout-react`)

Every primitive follows the same rules. Tests enforce them; keep it that way.

- **`render`, never `asChild`.** `render={<section />}` merges the primitive's props into the
  element; `render={(props, state) => …}` receives them plus the state.
- **`ref` is a plain prop** (React 19) and is merged with the primitive's own.
- **Arbitrary props are forwarded.** Consumer handlers compose with the internal ones: internal
  first, then the consumer's.
- **`className` and `style` accept a value or a `(state) => value` function.** Consumer style is
  merged *under* the structural style: structural keys always win.
- **Structural inline style only** (a component test holds the list): `position`, `top`, `left`,
  `width`, `height`, `transform` and `box-sizing` place a box; `z-index` keeps a held item (and the
  drag preview) above the others; `touch-action: none` makes a handle's and a drag source's touch
  a drag; `pointer-events: none` keeps the placeholder and the drag preview out of the pointer's
  way. Nothing cosmetic: transitions, cursors, colours, shadows
  and the handles' look are the app's.
- **State only through `data-*` and ARIA**, present or absent (never `"false"`). Every part
  carries `data-grid-layout-part`, every item `data-item-id`; e2e selectors use them, never class
  names.
- **No text and no names.** Primitives render only their children and set no `aria-label` or role
  of their own.
- **The developer owns the recursion**: `Items` is a children function over the model's items,
  keyed by id.
- **The parts** (`GridLayout.*`, each over its hook):
  - `Root` (`useGridLayout`, `useGridLayoutView`): a `div` positioned `relative`, as tall as the
    layout with `autoSize`; `data-breakpoint` (the active breakpoint's name), `data-dragging`,
    `data-resizing`, `data-grabbed`, `data-dropping`, `data-drop-refused`, `data-outside`. Its `dir` prop is the engine's direction and the
    element's `dir`. It takes `gridLayoutRef`, `onExternalDrag`, `onDrop` and `createId`.
  - `Item` (`useItem`): placed by a `transform`; `data-item-id`, `data-dragging`,
    `data-resizing`, `data-grabbed`, `data-outside`, `data-pressing` (a touch holds it before it
    drags), `data-static`, `data-draggable`, `data-resizable`. It is the
    tab stop (`tabIndex` 0), or `-1` once it has a drag handle.
  - `DragHandle` (`useDragHandle`): the only place its item drags from once there is one, and the
    item's tab stop; `data-dragging`, `data-grabbed`, `data-draggable`.
  - `ResizeHandle` (`useResizeHandle`): a `side` (`top`, `bottom`, `start`, `end` or a corner);
    `data-side`, `data-resizing`; renders nothing while its item cannot be resized. Where it
    sits and how it looks are the app's (the fixtures use logical insets).
  - `Placeholder` (`usePlaceholder`): only during a gesture, at the box the held item would land
    in; `data-kind` (`move`, `resize`, `keyboard`, `drop`); a drop shows none off the grid or
    refused.
  - `DragSource` (`useDragSource`): anywhere on the page (outside the root through
    `gridLayoutRef`); a tab stop (`-1` when `disabled`), `touch-action: none`; `data-dragging`,
    `data-grabbed`, `data-disabled`; its press and keys go to the engine after the app's own.
  - `DragPreview` (`useDragPreview`): only during a pointer drop, `position: fixed` and kept at
    the pointer by the engine (its `transform`); `data-over`, `data-drop-refused`; its children
    (or a function of its state, the drop's `data`) are the app's.
- **The ref** (`createGridLayoutRef` / `useGridLayoutRef`): one mounted `Root` holds it at a time.
- **`useBreakpoint()`** (or `useBreakpoint(gridLayoutRef)` from outside): `{ breakpoint, cols,
  width }`.
- **Presses and keys go to the engine after the consumer.** `Root` calls the engine's
  `pointerdown` and `keydown` after the consumer's `onPointerDown`/`onKeyDown` (on `Root` or its
  `render` element): `preventDefault` vetoes a gesture or replaces a key. During a pointer gesture,
  Escape reaches the engine from the document after the app's own handlers.
- **The held item's geometry is the engine's during a pointer gesture**: React keeps the item's
  props at its starting box, the engine writes its `transform` (and size) itself, and puts the box
  back when the gesture ends.

## Site

The docs and examples are served by `fragiola.com/grid-layout`, built by the `www` repo from this
repo's **site export** (`../www/CONTRACT.md`, v1.2). This repo only provides: the pages
(`site/docs`, base-free links, the v1.2 vocabulary), the gallery configuration (`examples.json`)
and the examples app (`examples/react`, built for `<base>/embed/react/`). `www` owns the shell,
the gallery chrome, the code panel and search. A page's `title` is at most 60 characters and
never repeats "Grid Layout"; its `description` is 50–160 characters, plain words, no `: ` (YAML);
a page body has no `#` and never skips a heading level; `pnpm site:export` checks all of it.
Examples import internal modules through `#/…` (never `@/…`). Every HTML file of the examples app
carries `<meta name="robots" content="noindex">`.

In dev the playground resolves both packages to their sources through the `@fragiola/source`
export condition; production builds use `dist`.
