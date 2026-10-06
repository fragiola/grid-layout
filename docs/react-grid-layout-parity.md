# React Grid Layout parity

What Grid Layout does for each thing React Grid Layout offers: each of its examples, and each
feature of its v2 API. Decision P1 of Epic #22 sets the bar: **parity is behaviour, not API**. A
feature has parity when an app can get the same behaviour, through an example of ours or through
our API, even when the names and shapes differ. What we leave out on purpose is recorded with its
reason. What we neither have nor exclude is a **gap**, listed at the end with a proposal, for the
maintainer to decide.

The reference is React Grid Layout 2.2.4 (`../react-grid-layout`, read-only), its source as of
2026-10-05: `test/examples` (00–21), the Playwright harness (`test/e2e`), `src/core/types.ts`,
`src/react/components`, `src/react/hooks`, `src/extras`, `src/legacy`, `CHANGELOG.md`, `codemaps/`,
`rfcs/` and `.out-of-scope/`. Its known bugs and what we do about each are in
[`react-grid-layout-issues.md`](react-grid-layout-issues.md); where we depart from it on purpose
is in [`walking-skeleton-report.md`](walking-skeleton-report.md#deliberate-deviations-from-react-grid-layout)
(deviations 1–16).

Each row says how Grid Layout covers the feature:

- **example**: an example in the gallery (`/examples/<slug>`, in `examples/react/src/examples`)
  shows it.
- **API**: our API does it; the row names how.
- **by design**: one of our decisions (D1–D14, X1–X6, R1–R6, K1–K6 in `AGENTS.md`) gives the
  behaviour another way, or makes the feature unneeded.
- **excluded**: left out on purpose; the reason is in [Exclusions](#exclusions).
- **gap**: none of the above; see [Gaps](#gaps).

## Summary

| section | rows | example | API | by design | excluded | gap |
|---|---|---|---|---|---|---|
| [Examples](#examples) | 27 | 26 | 0 | 0 | 1 | 0 |
| [Layout item](#layout-item) | 16 | 6 | 7 | 2 | 0 | 1 |
| [Grid](#grid) | 10 | 4 | 5 | 1 | 0 | 0 |
| [Drag](#drag) | 7 | 4 | 2 | 1 | 0 | 0 |
| [Resize](#resize) | 4 | 3 | 1 | 0 | 0 | 0 |
| [Drop](#drop) | 8 | 5 | 2 | 0 | 0 | 1 |
| [Compaction](#compaction) | 13 | 7 | 4 | 0 | 2 | 0 |
| [Constraints](#constraints) | 13 | 6 | 6 | 1 | 0 | 0 |
| [Responsive](#responsive) | 10 | 5 | 4 | 1 | 0 | 0 |
| [Positioning](#positioning) | 5 | 1 | 0 | 1 | 3 | 0 |
| [Callbacks](#callbacks) | 12 | 7 | 5 | 0 | 0 | 0 |
| [Hooks](#hooks) | 5 | 2 | 2 | 1 | 0 | 0 |
| [Components and extras](#components-and-extras) | 9 | 5 | 0 | 0 | 4 | 0 |
| [Core functions](#core-functions) | 20 | 0 | 16 | 4 | 0 | 0 |
| **total** | **159** | **81** | **54** | **12** | **10** | **2** |

## Examples

React Grid Layout's examples (`test/examples`, titles from `examples/util/vars.js`) and its
Playwright harness (`test/e2e`).

| # | React Grid Layout | Grid Layout | status | notes |
|---|---|---|---|---|
| 00 | Showcase (responsive, compaction toggle, every resize corner, drop from outside, a static item) | [`responsive-layouts`](/examples/responsive-layouts), [`compaction-modes`](/examples/compaction-modes), [`resize-handles`](/examples/resize-handles), [`drag-from-outside`](/examples/drag-from-outside), [`static-items`](/examples/static-items); together in [`dashboard-builder`](/examples/dashboard-builder) and [`analytics-dashboard`](/examples/analytics-dashboard) | example | one showcase split into the features it mixes |
| 01 | Basic | [`hello-grid`](/examples/hello-grid) | example | |
| 02 | No Dragging | [`read-only`](/examples/read-only) | example | `draggable={false}`, `resizable={false}` |
| 03 | Messy | [`messy-layout`](/examples/messy-layout) | example | normalisation on mount, told once (D9) |
| 04 | Grid Item Properties (`data-grid`) | — | excluded | `data-grid` child sync ([E1](#exclusions)); the layout prop is [`hello-grid`](/examples/hello-grid), a controlled one [`controlled-layout`](/examples/controlled-layout) |
| 05 | Static Elements | [`static-items`](/examples/static-items) | example | a static never moves, even when draggable (deviation 5) |
| 06 | Dynamic Add/Remove | [`add-remove-items`](/examples/add-remove-items) | example | add and remove UI is the app's (D14) |
| 07 | LocalStorage | [`save-restore`](/examples/save-restore), [`named-layouts`](/examples/named-layouts) | example | persistence is the app's (D14) |
| 08 | Responsive with LocalStorage | [`responsive-persistence`](/examples/responsive-persistence) | example | `onLayoutChange(layout, layouts)` (R2) |
| 09 | Minimum and Maximum Width/Height | [`min-max-size`](/examples/min-max-size) | example | the example's text says limits that contradict each other (`minW > maxW`) throw; here they do not: the minimum wins (`minMaxSize`); only a limit that is not a whole number of cells is a `layoutProblems` error |
| 10 | Dynamic Minimum and Maximum Width/Height (`onResize` mutating the item) | [`dynamic-min-max`](/examples/dynamic-min-max) | example | a middleware on `item.resize` instead of a mutation (D3, K3) |
| 11 | Toolbox | [`toolbox`](/examples/toolbox), [`widget-sidebar`](/examples/widget-sidebar) | example | an item dragged off the grid is reported, never removed (X3) |
| 12 | Drag From Outside | [`drag-from-outside`](/examples/drag-from-outside), [`drop-files`](/examples/drop-files), [`drop-rules`](/examples/drop-rules) | example | pointer drag sources, native drags only for files and other windows (X1) |
| 13 | Bounded | [`bounded`](/examples/bounded) | example | |
| 14 | Bootstrap-style Responsive Grid | [`bootstrap-style`](/examples/bootstrap-style) | example | |
| 15 | Scale (`transformScale`) | [`scaled-container`](/examples/scaled-container) | example | the scale is read off the grid's box (K5) |
| 16 | Allow Overlap | [`allow-overlap`](/examples/allow-overlap) | example | |
| 17 | All Resizable Handles | [`resize-handles`](/examples/resize-handles) | example | logical sides: `top`, `bottom`, `start`, `end` and corners (D11) |
| 18 | Compactor Showcase | [`compaction-modes`](/examples/compaction-modes), [`fast-compactors`](/examples/fast-compactors), [`wrap-flow`](/examples/wrap-flow), [`custom-compactor`](/examples/custom-compactor) | example | |
| 19 | Pluggable Constraints | [`constraint-presets`](/examples/constraint-presets) | example | constraints apply to every command, not only gestures (deviation 13) |
| 20 | Aspect Ratio Constraints | [`aspect-ratio`](/examples/aspect-ratio), [`bento-portfolio`](/examples/bento-portfolio), [`photo-collage`](/examples/photo-collage) | example | |
| 21 | Custom Constraints | [`custom-constraints`](/examples/custom-constraints) | example | |
| e2e | harness: renders grid items at expected positions | [`hello-grid`](/examples/hello-grid); `packages/react/tests/root.test.tsx` | example | |
| e2e | harness: dragging an item moves it and fires `onLayoutChange` | `apps/playground/e2e/grid.spec.ts`: drags an item, pushes the one it lands on, and tells the change once | example | in Chromium and Firefox, LTR and RTL |
| e2e | harness: a resize handle changes the item's size | [`resize-handles`](/examples/resize-handles); `grid.spec.ts` | example | every side, LTR and RTL |
| e2e | harness: CSS transforms are applied (not `top`/`left`) | [`unstyled`](/examples/unstyled) | example | an item is always placed by a structural `transform` (D4) |
| e2e | touch external-drop adapter | [`widget-sheet`](/examples/widget-sheet); `apps/playground/e2e/mobile.spec.ts`: a drag source drops on touch | example | drag sources are pointer-based, so touch needs no adapter (X1) |

## Layout item

React Grid Layout's `LayoutItem` (`src/core/types.ts`) against ours (`packages/core/src/layout/types.ts`).

| React Grid Layout | Grid Layout | status | notes |
|---|---|---|---|
| `i` | `id` | API | |
| `x`, `y`, `w`, `h` | the same | example | [`hello-grid`](/examples/hello-grid); `x` counts from the inline-start edge (D11) |
| `minW`, `maxW` | the same | example | [`min-max-size`](/examples/min-max-size) |
| `minH`, `maxH` | the same | example | [`min-max-size`](/examples/min-max-size) |
| `static` | `static` | example | [`static-items`](/examples/static-items); wins over `draggable` (deviation 5) |
| `isDraggable` | `draggable` | example | [`read-only`](/examples/read-only) |
| `isResizable` | `resizable` | example | [`home-screen`](/examples/home-screen) |
| `resizeHandles` (per item) | the `GridLayout.ResizeHandle` parts the app renders in that item | API | the developer owns the recursion (D4): each item renders the sides it wants |
| `isBounded` (per item) | — | gap | [G1](#gaps); the grid-wide `bounded` and an item's `containerBounds` constraint cover part of it |
| `constraints` (objects) | `constraints`: names or `{ name, args }` from Root's `constraintRegistry` | API | K3: a layout stays data and serialises |
| `moved` (internal) | — | by design | a working flag of the move algorithm; ours keeps it on a working copy, never on the layout (D6) |
| `y: Infinity` (add at the bottom) | the same, or `item.add` without `x`/`y` (first free cell) | API | [`add-remove-items`](/examples/add-remove-items); placed below everything under every compactor (react-grid-layout#2161) |
| immutable layouts (`readonly LayoutItem[]`) | the same, enforced | by design | D6: inputs are never mutated; tests feed frozen layouts (react-grid-layout#2182) |
| item order | kept as given | API | the drawing order is the layout's order |
| children keyed by `i` | `GridLayout.Items` children function keyed by `id` | API | D3, D4 |
| per-item content | the app's: it maps ids to content | API | X4: the layout stays geometry |

## Grid

`gridConfig` (`GridConfig`) and the legacy flat props, against Root's props.

| React Grid Layout | Grid Layout | status | notes |
|---|---|---|---|
| `width` (required) | `width` (optional) | API | the root measures itself; `width` fixes it for server rendering and tests |
| `gridConfig.cols` / `cols` | `cols` | example | [`hello-grid`](/examples/hello-grid); one value or one per breakpoint |
| `gridConfig.rowHeight` / `rowHeight` | `rowHeight` | example | [`ops-monitor`](/examples/ops-monitor); also per breakpoint (R4) |
| `gridConfig.margin` / `margin` | `gap` (`[inline, block]`) | API | also per breakpoint (R4) |
| `gridConfig.containerPadding` / `containerPadding` (`null`: the margin) | `padding` (default: `gap`) | API | also per breakpoint (R4) |
| `gridConfig.maxRows` / `maxRows` | `maxRows` | example | [`kanban-free-form`](/examples/kanban-free-form), [`constraint-presets`](/examples/constraint-presets); bounds what is asked, as React Grid Layout's (deviation 8) |
| `autoSize` | `autoSize` | example | [`long-dashboard`](/examples/long-dashboard); an empty layout's height is the padding alone (deviation 9) |
| `className`, `style` | the same, a value or `(state) => value` | API | D4 |
| `innerRef` | `ref` (a plain prop) | API | D4, React 19 |
| `defaultGridConfig`, `defaultDragConfig`, `defaultResizeConfig`, `defaultDropConfig` | the same defaults (12 columns, rows of 150px, a `[10, 10]` gap, a 3px threshold), documented on each prop | by design | P1: an exported defaults object is API, not behaviour |

## Drag

`dragConfig` (`DragConfig`) and the legacy flat props.

| React Grid Layout | Grid Layout | status | notes |
|---|---|---|---|
| `dragConfig.enabled` / `isDraggable` | `draggable` | example | [`read-only`](/examples/read-only) |
| `dragConfig.bounded` / `isBounded` | `bounded` | example | [`bounded`](/examples/bounded) |
| `dragConfig.handle` / `draggableHandle` (a selector) | `GridLayout.DragHandle` | example | [`drag-handle`](/examples/drag-handle), [`analytics-dashboard`](/examples/analytics-dashboard); the handle is the item's tab stop |
| `dragConfig.cancel` / `draggableCancel` (a selector) | native controls and `[contenteditable]` never drag; `data-grid-layout-no-drag` opts a subtree out | example | [`drag-handle`](/examples/drag-handle) ("controls never drag"), D7 |
| `dragConfig.threshold` (3; the legacy `ReactGridLayout` 0) | `threshold` (3, everywhere) | API | one Root, responsive or not |
| `dragConfig.allowMobileScroll` / `allowMobileScroll` | a touch on an item's body is held `touchDelay` before it drags, so the page scrolls | by design | R5: [`mobile-dashboard`](/examples/mobile-dashboard), [`home-screen`](/examples/home-screen) |
| edge auto-scroll while dragging (2.2) | `autoScroll` | API | R6: [`long-dashboard`](/examples/long-dashboard) |

## Resize

`resizeConfig` (`ResizeConfig`) and the legacy flat props.

| React Grid Layout | Grid Layout | status | notes |
|---|---|---|---|
| `resizeConfig.enabled` / `isResizable` | `resizable` | example | [`read-only`](/examples/read-only) |
| `resizeConfig.handles` / `resizeHandles` (`n`, `s`, `e`, `w`, corners; default `['se']`) | `GridLayout.ResizeHandle` with `side` (`top`, `bottom`, `start`, `end`, `top-start`, …) | example | [`resize-handles`](/examples/resize-handles); logical sides (D11): `e` is `end` in LTR, `start` in RTL |
| `resizeConfig.handleComponent` / `resizeHandle` | `ResizeHandle`'s `render`, `className`, children | example | [`resize-handles`](/examples/resize-handles), [`styling-showcase`](/examples/styling-showcase); the package draws no handle (D5) |
| a resize anchors its opposite edge | the same, for every side | API | deviation 3 (react-grid-layout#2203) |

## Drop

`dropConfig` (`DropConfig`), `droppingItem`, `onDrop` and `onDropDragOver`.

| React Grid Layout | Grid Layout | status | notes |
|---|---|---|---|
| `dropConfig.enabled` / `isDroppable` | `GridLayout.DragSource` (pointer, keyboard); `onExternalDrag` for native drags | example | [`drag-from-outside`](/examples/drag-from-outside), [`drop-files`](/examples/drop-files) (X1) |
| `dropConfig.defaultItem` / `droppingItem` | the source's `item` (`{ w, h, min…, max… }`), or the `{ w, h }` `onExternalDrag` answers | example | [`widget-sidebar`](/examples/widget-sidebar) |
| `droppingItem.i` | the source's `itemId`, else Root's `createId`, else a random UUID | API | X2 |
| `dropConfig.onDragOver` / `onDropDragOver` → `{ w, h }`, `false` | `onExternalDrag(event)` → `{ w, h, data? }`, `false`, `undefined` | example | [`drop-files`](/examples/drop-files); asked again on the drop, when files can be read (X1) |
| `onDropDragOver` → `dragOffsetX`, `dragOffsetY` | a drag source's `dragOffset`; `onExternalDrag`'s answer takes `dragOffset` too | API | added by Epic #22 (G2, a small option) |
| `dropConfig.touchEnabled`, `touchDragSource` (`[data-rgl-draggable]`) | drag sources are pointer-based: touch works as a mouse does | example | [`widget-sheet`](/examples/widget-sheet) (X1) |
| the dropped item centred on the pointer (2.1) | the same, moved by `dragOffset`, mirrored in RTL | API | X2 |
| refusing a drop | `onExternalDrag` → `false`, or a middleware on `item.add` | example | [`drop-rules`](/examples/drop-rules) |

## Compaction

The `Compactor` interface, the built-in compactors, `compactType`, `preventCollision` and
`allowOverlap`.

| React Grid Layout | Grid Layout | status | notes |
|---|---|---|---|
| `compactor` | `compactor` | example | [`compaction-modes`](/examples/compaction-modes) |
| `verticalCompactor` (default) | `verticalCompactor` (default) | example | [`compaction-modes`](/examples/compaction-modes) |
| `horizontalCompactor` | `horizontalCompactor` | example | [`compaction-modes`](/examples/compaction-modes); a move toward the start swaps (react-grid-layout#2252) |
| `noCompactor` | `noCompactor` | example | [`kanban-free-form`](/examples/kanban-free-form); free mode never leaves items overlapping (deviation 2) |
| `Compactor` (`{ type, allowOverlap, preventCollision?, compact }`) | `Compactor` (`{ type, compact, overlap? }`); `createCompactor(type, order, settle)` | example | [`custom-compactor`](/examples/custom-compactor); `allowOverlap` and `preventCollision` are grid rules, not the compactor's |
| `preventCollision` | `preventCollision` | example | [`compaction-modes`](/examples/compaction-modes), [`kanban-free-form`](/examples/kanban-free-form) |
| `allowOverlap` | `allowOverlap` | example | [`allow-overlap`](/examples/allow-overlap) |
| `verticalOverlapCompactor`, `horizontalOverlapCompactor`, `noOverlapCompactor` | `allowOverlap` with any compactor | API | React Grid Layout's overlap compactors compact nothing; ours skip a compactor not flagged `overlap` under `allowOverlap` (K4) |
| `compactType` (legacy: `vertical`, `horizontal`, `wrap`, `null`) | `compactor` | excluded | the legacy v1 API ([E2](#exclusions)) |
| `verticalCompact` (legacy, removed in v2) | `compactor={noCompactor}` | excluded | the legacy v1 API ([E2](#exclusions)) |
| `getCompactor(type, allowOverlap, preventCollision)` | `compactor` plus the two rules | API | a convenience for the legacy props |
| `compactItemVertical`, `compactItemHorizontal`, `resolveCompactionCollision` (helpers for custom compactors) | `createCompactor`'s `settle(item, { placed, cols })`, `firstCollision`, `collisions` | API | [`custom-compactor`](/examples/custom-compactor) |
| compaction around statics, layouts with gaps | the same | API | react-grid-layout#1309, PR #2194 |

## Constraints

React Grid Layout's pluggable constraints (`rfcs/0002-pluggable-constraints.md`, 2.1) against K1–K3.

| React Grid Layout | Grid Layout | status | notes |
|---|---|---|---|
| `constraints` (grid-level) | `constraints` | example | [`constraint-presets`](/examples/constraint-presets) |
| `defaultConstraints` (`gridBounds`, `minMaxSize`) | the same | example | [`constraint-presets`](/examples/constraint-presets) |
| `gridBounds` | the same | API | `maxRows` is its clamp (deviation 13) |
| `minMaxSize` | the same | API | |
| `containerBounds` | the same, padding counted | example | [`constraint-presets`](/examples/constraint-presets); bounds a resize too (react-grid-layout#1779) |
| `boundedX`, `boundedY` | the same | example | [`constraint-presets`](/examples/constraint-presets); the columns stay a hard rule |
| `aspectRatio(r)` | the same, padding counted | example | [`aspect-ratio`](/examples/aspect-ratio) |
| `snapToGrid(sx, sy?)` | the same | example | [`custom-constraints`](/examples/custom-constraints) |
| `minSize`, `maxSize` | the same | API | |
| `LayoutConstraint.constrainPosition(item, x, y, ctx)`, `constrainSize(item, w, h, handle, ctx)` | `position(item, ctx)`, `size(item, ctx, side)`: the item carries the proposed place or size | API | K1; `side` is logical |
| `ConstraintContext` (`cols`, `maxRows`, `containerWidth`, `containerHeight`, `rowHeight`, `margin`, `layout`) | `{ cols, maxRows, layout, geometry, height }` | API | K2: the pixels come with the run (`env`) |
| `applyPositionConstraints`, `applySizeConstraints` | every placing command applies them (`item.move`, `item.resize`, `item.place`, `item.add`) | API | K1: the keyboard, drops and `model.run` obey them too (deviation 13) |
| constraints applied during gestures only | constraints applied by every placing command | by design | K1, deviation 13: a command can never place an item a gesture could not |

## Responsive

`ResponsiveGridLayout` / `Responsive` and `useResponsiveLayout`, against one Root with breakpoints
(R1–R4).

| React Grid Layout | Grid Layout | status | notes |
|---|---|---|---|
| `breakpoints` (`{ lg: 1200, … }`) | `breakpoints` | example | [`responsive-layouts`](/examples/responsive-layouts); the grid's own width at a breakpoint's minimum picks it (R1, deviation 12) |
| `cols` per breakpoint | `cols` (a number or one per breakpoint) | example | [`responsive-layouts`](/examples/responsive-layouts) |
| `layouts` | `layouts` (controlled) / `defaultLayouts` | example | [`responsive-persistence`](/examples/responsive-persistence) |
| `breakpoint` (controlled) | `breakpoint`; `defaultBreakpoint` before the first measure | example | [`container-breakpoints`](/examples/container-breakpoints) |
| `margin`, `containerPadding` per breakpoint | `gap`, `padding` (and `rowHeight`) per breakpoint | example | [`mobile-dashboard`](/examples/mobile-dashboard) (R4) |
| a missing breakpoint's layout generated from the nearest larger one | the same, as a command of its own (`layouts.generate`), gaps collapsed | API | R3 (react-grid-layout#1744) |
| an item added on one breakpoint appears on the others | the same, at their next activation, keeping its size | API | R3 (react-grid-layout#2110) |
| `DEFAULT_BREAKPOINTS`, `DEFAULT_COLS` | none: one implicit breakpoint until the app names them | by design | R2; Root's `breakpoints` documents React Grid Layout's values |
| `sortBreakpoints`, `getBreakpointFromWidth`, `getColsFromBreakpoint` | `sortBreakpoints`, `breakpointFor` / `model.get("breakpoint-for")`, `model.get("cols-by")` | API | |
| `findOrGenerateResponsiveLayout` | `generateLayout` | API | |

## Positioning

| React Grid Layout | Grid Layout | status | notes |
|---|---|---|---|
| `positionStrategy` (`transformStrategy`, `absoluteStrategy`, custom `calcStyle`, `calcDragPosition`) | an item is always placed by a structural `transform`, from logical coordinates | excluded | [E5](#exclusions) |
| `useCSSTransforms` (legacy: `false` for `top`/`left`) | — | excluded | [E5](#exclusions) |
| `transformScale` (legacy) / `createScaledStrategy(scale)` | the scale read off the root's box at each gesture; `scale` overrides | example | [`scaled-container`](/examples/scaled-container) (K5, deviation 15) |
| `setTransform`, `setTopLeft`, `perc` | `itemPart`, `placeholderPart`: the structural style each part gets | excluded | [E5](#exclusions); the style is the parts' (D4) |
| right-to-left (none: `transformDirection` existed in v1 only) | `dir`, logical `x` and sides | by design | D11: [`rtl-layout`](/examples/rtl-layout) |

## Callbacks

React Grid Layout's `EventCallback` is `(layout, oldItem, newItem, placeholder, event, element)`.
Ours receive one immutable `GestureEvent`: `{ type, source, itemId, layout, before, item,
nativeEvent, external, data, outside, target, origin }`; the placeholder's pixels are the gesture's
(`engine.get("gesture").placeholder`), the element is the one with `data-item-id`.

| React Grid Layout | Grid Layout | status | notes |
|---|---|---|---|
| `onLayoutChange(layout)` | `onLayoutChange(layout, layouts)` | example | [`controlled-layout`](/examples/controlled-layout); once per committed change, never during a gesture (D9) |
| `onLayoutChange(layout, layouts)` (responsive) | the same | example | [`responsive-persistence`](/examples/responsive-persistence) |
| `onDragStart`, `onDrag`, `onDragStop` | the same names, with a `GestureEvent` | example | [`event-log`](/examples/event-log) |
| `onResizeStart`, `onResize`, `onResizeStop` | the same names, with a `GestureEvent` | example | [`event-log`](/examples/event-log); a pointer gesture's events carry `nativeEvent` (react-grid-layout#2264) |
| `GridResizeEvent.handle` | `engine.get("gesture").side` | API | logical |
| `onDrop(layout, item, event)` | `onDrop({ item, data, layout })`, on Root and on the source | example | [`drag-from-outside`](/examples/drag-from-outside) |
| `onDropDragOver(event)` | `onExternalDrag(event)` | example | [`drop-files`](/examples/drop-files) |
| `onBreakpointChange(breakpoint, cols)` | the same | example | [`responsive-layouts`](/examples/responsive-layouts) |
| `onWidthChange(width, margin, cols, padding)` | `useGridLayoutView()`: `width` and `geometry` (`cols`, `gap`, `padding`) re-render the component that reads them | API | the real gap and padding, not a hard-coded `[10, 10]` |
| every command, outside gestures | `model.subscribe` (a `CommandEvent` with the state before and after) | API | [`event-log`](/examples/event-log), [`undo-redo`](/examples/undo-redo) |
| gesture events outside the root | `useGridLayoutEvents(listener, ref)`, `engine.subscribe` | API | [`keyboard`](/examples/keyboard) |
| refusing a change (none: React Grid Layout reverts in `onLayoutChange`) | `model.use` middleware: `veto()`, or rewrite the payload | API | [`middleware`](/examples/middleware) |

## Hooks

| React Grid Layout | Grid Layout | status | notes |
|---|---|---|---|
| `useContainerWidth({ measureBeforeMount, initialWidth, debounceTimeout })` → `{ width, mounted, containerRef, measureWidth }` | Root measures itself, once a frame; `useGridLayoutView().width`; `defaultBreakpoint` before the first measure; `width` for server rendering | by design | a width wavering at a threshold settles (R1); nothing to debounce |
| `useGridLayout({ layout, cols, compactor, … })` → state and drag/resize/drop handlers | `createGridLayoutModel` + `createGridLayoutEngine`, reached through `useGridLayout()` (`{ model, engine }`), `useGesture()`, `useGridLayoutView()` | API | the engine owns the gesture sessions (D3) |
| `useGridLayout` result: `isInteracting`, `containerHeight`, `dragState`, `resizeState`, `dropState` | `useGesture()` (the gesture or `undefined`), `useGridLayoutView().height` | API | |
| `useResponsiveLayout({ width, breakpoints, cols, layouts, … })` → `{ layout, layouts, breakpoint, cols, setLayoutForBreakpoint, setLayouts, sortedBreakpoints }` | `useBreakpoint()`; `model.run("layout.set", { layout, breakpoint })`, `model.run("layouts.set", …)`; `sortBreakpoints` | example | [`responsive-layouts`](/examples/responsive-layouts), [`undo-redo`](/examples/undo-redo) |
| reaching the grid from outside it (none: hoisted state) | `gridLayoutRef` (`createGridLayoutRef`, `useGridLayoutRef`) | example | [`remote-control`](/examples/remote-control), [`named-layouts`](/examples/named-layouts) (X5) |

## Components and extras

| React Grid Layout | Grid Layout | status | notes |
|---|---|---|---|
| `GridLayout` / `ReactGridLayout` (default export) | `GridLayout.Root` | example | [`hello-grid`](/examples/hello-grid) |
| `ResponsiveGridLayout` / `Responsive` | `GridLayout.Root` with `breakpoints` | example | [`responsive-layouts`](/examples/responsive-layouts) (R2) |
| `GridItem` | `GridLayout.Item` (`useItem`) | example | [`hello-grid`](/examples/hello-grid) |
| the drag placeholder (`.react-grid-placeholder`) | `GridLayout.Placeholder` (`data-kind`) | example | [`styling-showcase`](/examples/styling-showcase); its look is the app's (D5) |
| `GridBackground` (`react-grid-layout/extras`, SVG) | `GridLayout.Cells` / `useCells(rows)` | example | [`grid-background`](/examples/grid-background), [`kanban-free-form`](/examples/kanban-free-form); K6, deviation 15 |
| `WidthProvider` (legacy) | — | excluded | [E3](#exclusions) |
| the legacy `ReactGridLayout` and `ResponsiveReactGridLayout` (`react-grid-layout/legacy`) | — | excluded | [E2](#exclusions) |
| `css/styles.css`, `react-resizable/css/styles.css` | — | excluded | [E4](#exclusions) |
| `react-draggable`, `react-resizable` | — | excluded | [E6](#exclusions) |

## Core functions

`react-grid-layout/core` is framework-free, like ours. Parity is behaviour, not API (P1): a
helper we keep internal is still applied by the commands. The fast and wrap compactors are in
[Compaction](#compaction) and the `./compactors` entry (K4).

| React Grid Layout | Grid Layout | status | notes |
|---|---|---|---|
| `bottom` | `bottom` | API | |
| `getLayoutItem` | `model.get("item-by", { itemId })` | API | |
| `getStatics` | `layout.filter((item) => item.static)` | by design | not worth an export |
| `cloneLayout`, `cloneLayoutItem`, `modifyLayout`, `withLayoutItem` | — | by design | D6: nothing is mutated, so nothing is cloned; changes are commands |
| `collides`, `getFirstCollision`, `getAllCollisions` | `collides`, `firstCollision`, `collisions`; `model.get("collisions-by")` | API | |
| `sortLayoutItems`, `sortLayoutItemsByRowCol`, `sortLayoutItemsByColRow` | `createCompactor`'s `order` (`row`, `column`) | API | the sort itself is internal |
| `moveElement` | `moveItem`, `item.move` | API | the same push semantics (D6) |
| `moveElementAwayFromCollision` | — | by design | internal to `moveItem` |
| `correctBounds` | `normaliseLayout` | API | |
| `validateLayout` | `layoutProblems` | API | a list of problems, never a throw (result objects) |
| `calcGridColWidth` | `columnWidth` | API | |
| `calcGridItemPosition`, `calcGridItemWHPx` | `itemPixels`; `engine.get("item-rect-by")` | API | gaps exact to the pixel (PR #2150, react-grid-layout#2141) |
| `calcXY`, `calcXYRaw` | `cellAt`; `engine.get("cell-at")` | API | |
| `calcWH`, `calcWHRaw` | `unitsAt` | API | |
| `calcGridCellDimensions` | `gridCells`, `engine.get("cells")` | API | K6 |
| `resizeItemInDirection` | `resizeRect`, `sideEdges` | API | logical sides |
| `clamp` | — | by design | a one-liner, not the grid's job |
| `getIndentationValue` (a margin per breakpoint) | `PerBreakpoint<T>` options | API | R4 |
| `compact` (unexported since #2213) | `compactLayout`, `compactor.compact` | API | |
| `Layout`, `LayoutItem`, `Compactor`, `CompactType`, `LayoutConstraint`, `ConstraintContext`, `Breakpoints`, `ResizeHandleAxis` types | `Layout`, `LayoutItem`, `Compactor`, `CompactType`, `LayoutConstraint`, `ConstraintContext`, `Breakpoints`, `ResizeSide` | API | |

## Exclusions

Decided by Epic #1 (`AGENTS.md`, Provenance) and confirmed by P1 (E1–E5); E6 is the Provenance
section's too. Each is behaviour an app gets another way, or a look the package does not own.

- **E1. `data-grid` child sync.** React Grid Layout reads each child's `data-grid` prop and keeps
  the layout in step with the children's keys. Here the model is the source of truth and the
  developer renders its items (D3, "no child-key synchronisation"): two sources of truth for one
  layout are what made its controlled layouts drift. An app passes `layout` (controlled) or
  `defaultLayout`; [`controlled-layout`](/examples/controlled-layout).
- **E2. The legacy v1 API** (`react-grid-layout/legacy`: flat props, `compactType`,
  `verticalCompact`, the legacy components and their own defaults). One Root with the v2 shapes
  (D3, D4); the legacy wrappers even disagree with each other (the `threshold`: 0 in
  `ReactGridLayout`, 3 in `ResponsiveReactGridLayout`).
- **E3. `WidthProvider`.** Root measures its own width through its `ResizeObserver` (D13, R1);
  `width` fixes it for server rendering and tests.
- **E4. The CSS files.** The packages ship no CSS and no CSS variables (D5); every look is the
  app's, through `data-*` and `render`: [`unstyled`](/examples/unstyled),
  [`styling-showcase`](/examples/styling-showcase).
- **E5. `positionStrategy`, `useCSSTransforms` and their helpers.** An item is placed by a
  structural `transform` from logical coordinates (D4, D11); a scaled ancestor is read off the
  grid's box (K5), which replaces `createScaledStrategy` and `transformScale`; right-to-left is
  `dir`, not a strategy. A custom `calcStyle` would let an app break the structural style the
  contract holds, and `top`/`left` would cost a layout per frame (D8).
- **E6. `react-draggable` and `react-resizable`.** Gestures are Pointer Events with pointer
  capture, one path for mouse, touch and pen (D7); no drag, resize or gesture library anywhere in
  the packages (D12).

## Gaps

React Grid Layout features with neither an equivalent nor an exclusion. P1 makes each a stop
condition: the maintainer decides before this Epic adds any API beyond a small option.

- **G1. A per-item `isBounded`.** React Grid Layout's `LayoutItem.isBounded` keeps one item inside
  the container while the others may leave it. Here `bounded` is grid-wide (the drawn item is held
  inside the root, X3's drag-out never happens); per item, a `containerBounds` constraint (K3)
  bounds where the item lands, but the drawn item still follows the pointer off the grid and X3
  puts it back. **Proposal:** an optional `bounded?: boolean` on `LayoutItem`, overriding Root's
  `bounded` for that item as `draggable` and `resizable` already do (read by the engine in
  `bound()` and the X3 check). It is a flag, not geometry, like the two it sits beside.
- **G2. A drag offset for native drags** (closed in this Epic). `onDropDragOver` can answer
  `dragOffsetX`/`dragOffsetY` for any HTML5 drag; `onExternalDrag`'s answer now takes
  `dragOffset?: { x, y }`, used as a drag source's is (a small option, P1).

G1 waits for the maintainer: it adds a field to `LayoutItem` (D3). It is on the roadmap.
