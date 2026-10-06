# React Grid Layout issues: its known bugs and hazards, and what Grid Layout does about them

React Grid Layout is Grid Layout's behaviour reference (D2). This report lists its known bugs and
hazards, the open issues of its tracker worth tracking, and the closed ones whose lesson Grid
Layout keeps, with a verdict for each. Every entry Grid Layout pins with a test has one whose name
carries `react-grid-layout#<n>`, so `grep -rn "react-grid-layout#<n>" packages apps` finds it; the
[regression matrix](#regression-matrix) maps each to its test. What Grid Layout offers for each
React Grid Layout feature is in [`react-grid-layout-parity.md`](react-grid-layout-parity.md), and
where it departs from React Grid Layout on purpose is in
[`walking-skeleton-report.md`](walking-skeleton-report.md#deliberate-deviations-from-react-grid-layout).

The survey was taken on 2026-10-05 against the source of React Grid Layout 2.2.4
(`../react-grid-layout`, read-only, at `cbac265`) and its tracker
([react-grid-layout/react-grid-layout](https://github.com/react-grid-layout/react-grid-layout/issues)),
read with `gh` and never written to. The verdicts describe Grid Layout's code as of that date.

## Stats

- The tracker's newest issue is #2302. **19 issues are open**; one of them
  ([#2302](https://github.com/react-grid-layout/react-grid-layout/issues/2302)) is about the
  project's own build, so 18 are about the library, and this report covers all 18.
- Most open issues predate 2.0 (a TypeScript rewrite, released 2025-12-09): 15 of the 18 were
  opened before it. 13 carry `bug` and 5 `enhancement`; an AI triage bot has labelled 11
  `needs-info` (most ask for a reproduction on 2.2.4) and 7 `ready-for-human`.
- This report has **63 entries** (14 hazards, 18 open issues, 31 closed issues and decisions;
  the open #1984 and the closed #2182 point back to their hazard) and cites 75 issues and pull
  requests.

## Verdicts

- **solved by design**: one of Grid Layout's decisions (named) removes the cause.
- **tested**: Grid Layout has (or had to rule out) the failure, and a test pins the behaviour. Its
  name carries `react-grid-layout#<n>`, or, for an entry with no upstream number, the entry names
  the test and its file. A tested entry is often solved by design too.
- **kept**: Grid Layout behaves as React Grid Layout does, on purpose (the decision is named).
- **not applicable**: the problem cannot arise here, or is a feature request whose policy belongs to
  the app (D14).
- **bug**: Grid Layout has it too. The test is written and skipped (`it.skip`) until the fix
  lands.

| verdict | entries |
|---|---|
| tested | 34 |
| solved by design | 24 |
| kept | 4 |
| not applicable | 1 |

## Hazards

The hazards Epic #22 names: what React Grid Layout's design invites, with or without an issue.

### In-place mutation

React Grid Layout's v1 core mutated layouts in place (`moveElement`, `correctBounds`, the
compactors), and 2.x still writes through `Mutable<LayoutItem>` casts, on copies each function
must remember to make. A frozen layout from a state library threw
[#2182](https://github.com/react-grid-layout/react-grid-layout/issues/2182) ("Cannot assign to read
only property 'x'") and left the drag stuck; v2's changelog made callback items read-only, so
`onResize` mutations that apps relied on (example 10) stopped working.

**Verdict: tested**, and solved by design (D6: inputs are never mutated, an unchanged item is the
caller's own object, deviation 6). Every layout rule's test feeds deep-frozen layouts, and
`packages/core/tests/model/model.test.ts` runs every command over frozen layouts and never writes to
them (react-grid-layout#2182). A rule that depends on the moment is a middleware (example
[`dynamic-min-max`](/examples/dynamic-min-max)), never a mutation.

### `onLayoutChange` firing twice after a drag

[#1984](https://github.com/react-grid-layout/react-grid-layout/issues/1984) (open, 9 comments):
`onLayoutChange` fires two or three times per move, the later calls with the old layout, so an app
that saves on it overwrites the new layout; the advice is to save on `onDragStop` instead.

**Verdict: tested**, and solved by design (D9: once per committed change, never during a gesture,
on mount only when normalisation changed the layout; deviation 7). `packages/react/tests/root.test.tsx`:
uncontrolled: a drop stands, and onLayoutChange is told once (react-grid-layout#1984); in a browser,
`apps/playground/e2e/grid.spec.ts`: drags an item, pushes the one it lands on, and tells the change
once.

### No layout change in the middle of an external drop

[#2219](https://github.com/react-grid-layout/react-grid-layout/issues/2219) (a meta issue over
[#1862](https://github.com/react-grid-layout/react-grid-layout/issues/1862) and
[#1893](https://github.com/react-grid-layout/react-grid-layout/issues/1893)): while something was
dragged in from outside, `onLayoutChange` fired on drag enter and leave with the dropping
placeholder in the layout, so a layout saved there kept an item that was never dropped. Fixed in
`3db8224`.

**Verdict: tested**, and solved by design (X2: a drop's preview is the model's dry run of
`item.add` and never enters the model nor `onLayoutChange`). `packages/react/tests/external.test.tsx`:
tells no layout change and loops no update while a source goes in and out (react-grid-layout#2219,
…).

### A drop on a scrolled grid

[#2143](https://github.com/react-grid-layout/react-grid-layout/issues/2143): dragging from outside
over a grid scrolled down placed the preview, and the drop, away from the pointer by the scroll.
Fixed in `4bd4d7b`.

**Verdict: tested.** The engine reads the root's box on screen (`getBoundingClientRect`) at each
frame, so every scroll, the page's or an ancestor's, is in it. `packages/core/tests/engine/drop.test.ts`:
drops where the pointer is on a grid scrolled out of the top of the view (react-grid-layout#2143).

### Responsive gaps and seeding

[#1744](https://github.com/react-grid-layout/react-grid-layout/issues/1744): a layout generated for
a smaller breakpoint kept the larger one's gaps and overflowed.
[#2110](https://github.com/react-grid-layout/react-grid-layout/issues/2110): an item added on a
small breakpoint shrank on a larger one, whose layout was generated from it (fixed in `a07190c` by
re-seeding from `data-grid`).

**Verdict: tested**, and solved by design (R3: generation settles the layout in its columns, gaps
collapse; an item added on one breakpoint is added on the others at their next activation, each
keeping its own places). `packages/core/tests/layout/responsive.test.ts`: collapses a mid-grid gap
when generating a smaller layout (react-grid-layout#1744); `packages/core/tests/model/responsive.test.ts`:
keeps the size of an item added on a smaller breakpoint on a larger one (react-grid-layout#2110);
`apps/playground/e2e/responsive.spec.ts`: generates a missing layout once, without gaps.

### Resizing from the top

[#2203](https://github.com/react-grid-layout/react-grid-layout/issues/2203): resizing the bottom
item of a stack up from its top edge moved it up, because a north resize was resolved as a user's
move. Its siblings, [#2027](https://github.com/react-grid-layout/react-grid-layout/issues/2027) and
[#2063](https://github.com/react-grid-layout/react-grid-layout/issues/2063): an item shifting while
resized from the start.

**Verdict: tested**, and solved by design (deviation 3: a resize keeps the box its handle gives and
pushes what it covers past its far edge; the opposite edge stays put).
`packages/core/tests/layout/edit.test.ts`: keeps the bottom edge when shrinking from the top
(react-grid-layout#2203); `packages/core/tests/engine/engine.test.ts`: pulls the `<side>` side, the
opposite edge anchored, every side in LTR and RTL.

### The free-mode swap

[#1982](https://github.com/react-grid-layout/react-grid-layout/issues/1982): without compaction, an
item dropped onto another pushed it a full height down, leaving a large gap. Fixed in `595d34e`; a
sibling, [#2131](https://github.com/react-grid-layout/react-grid-layout/issues/2131).

**Verdict: tested.** The free-mode swap is tight, and an overlap React Grid Layout leaves is pushed
down instead (deviation 2). `packages/core/tests/layout/move.test.ts`: pushes a collider in free mode
only until it clears a partial overlap, swaps equal-size items in free mode, leaves no large gap on
a partial overlap in free mode (react-grid-layout#1982); `packages/core/tests/engine/constraints.test.ts`:
snapToGrid(3) without compaction (react-grid-layout#1982).

### Wrap collisions

[#2252](https://github.com/react-grid-layout/react-grid-layout/issues/2252): with `wrapCompactor`, an
item dragged toward the start onto its neighbour did not swap, and items larger than a cell could
overlap. Fixed in `761d4d1`.

**Verdict: tested** (deviation 14: the wrap compactor resolves moves horizontally; the standard
horizontal compactor got the same fix). `packages/core/tests/compactors/wrap.test.ts`: four tests
named react-grid-layout#2252; `packages/core/tests/layout/move.test.ts`: react-grid-layout#2252 swaps
the two under horizontal compaction.

### `y: Infinity`

[#2161](https://github.com/react-grid-layout/react-grid-layout/issues/2161): an item added with
`y: Infinity` landed at the top-left, over other items, under horizontal compaction and none.
Fixed in `280d2e1`.

**Verdict: tested.** `packages/core/tests/layout/normalise.test.ts`: places y: Infinity below
everything before it (react-grid-layout#2161), whatever the compactor.

### A sub-pixel width loop

[#2271](https://github.com/react-grid-layout/react-grid-layout/issues/2271): resizing a zoomed page
across a breakpoint looped forever ("Maximum update depth exceeded"): fractional widths measured on
either side of a threshold, and each breakpoint's layout fed back into the next. Fixed in 2.2.4
(`de0a91d`, PR #2273).

**Verdict: tested**, and solved by design (R1: the root measures whole pixels once a frame, and a
width wavering at a threshold needs 24px more to cross back; R3: a stored layout is kept as it is).
`packages/core/tests/engine/responsive.test.ts`: settles a sub-pixel width wavering at a threshold,
once a measure: no loop (react-grid-layout#2271); `packages/core/tests/layout/responsive.test.ts`:
keeps a stored layout as it is: a round trip comes back to it (react-grid-layout#2271).

### "Maximum update depth exceeded" loops

[#2204](https://github.com/react-grid-layout/react-grid-layout/issues/2204) and
[#2210](https://github.com/react-grid-layout/react-grid-layout/issues/2210): dragging from outside
into the grid, and out of it without releasing, looped React's updates (fixed by PR
[#2208](https://github.com/react-grid-layout/react-grid-layout/pull/2208), PR #2214 and PR #2220).
[#2202](https://github.com/react-grid-layout/react-grid-layout/issues/2202): `useResponsiveLayout`
looped when `layouts` was written inline (fixed by PR
[#2209](https://github.com/react-grid-layout/react-grid-layout/pull/2209)).

**Verdict: tested**, and solved by design (D8: the engine owns gesture sessions and React renders
only when the preview changes; Root compares a controlled layout by content, not identity).
`packages/react/tests/external.test.tsx`: tells no layout change and loops no update while a source
goes in and out (react-grid-layout#2219, react-grid-layout#2204, react-grid-layout#2210);
`packages/react/tests/responsive.test.tsx`: takes layouts written inline at every render, with no
update loop (react-grid-layout#2202).

### A hard-coded margin in `useResponsiveLayout`

`src/react/hooks/useResponsiveLayout.ts` calls `onWidthChange(width, [10, 10], cols, null)`: the
margin and padding it reports are constants, not the grid's. No upstream issue.

**Verdict: tested** (a descriptive name), and solved by design (R4: `gap`, `padding` and
`rowHeight` are engine options, one value or one per breakpoint; `useGridLayoutView().geometry`
reports the ones in use). `packages/core/tests/engine/responsive.test.ts`: places items with the
breakpoint's own row height, gap and padding (R4).

### The empty layout's height with `autoSize`

`GridLayout.tsx` sizes the container as `rows × rowHeight + (rows − 1) × margin + 2 × padding`, so
an empty layout is `2 × padding − margin` tall: a negative row gap. No upstream issue.

**Verdict: tested** (a descriptive name), deviation 9: an empty layout's height is the padding
alone. `packages/core/tests/layout/geometry.test.ts`: is the padding alone for an empty layout.

### `threshold` and `bounded` across the legacy components

The legacy `ReactGridLayout` sets the drag `threshold` to 0 for v1 compatibility, while the legacy
`ResponsiveReactGridLayout` leaves it at v2's 3px, so the same props drag differently in a
responsive grid. In 2.2.4 both pass `isBounded` alike, but `bounded` lives in `dragConfig` in v2
and as a flat prop in the legacy API, and a per-item `isBounded` on top.

**Verdict: solved by design.** One Root, responsive or not (R2), with one set of options
(`threshold` 3 by default, `bounded` grid-wide); no legacy API (exclusion E2 in the parity
report). A per-item `bounded` is gap G1 there.

## Open issues

Every open issue about the library, newest first, as of 2026-10-05.

| issue | what it reports | verdict |
|---|---|---|
| [#2263](https://github.com/react-grid-layout/react-grid-layout/issues/2263) Dropping element from outside mid-drag causes placeholder to freeze | a controlled app that updates its state in `onDrop` sees the dropping placeholder stay | **tested**: the placeholder is the engine's gesture, not React state, and the gesture ends with the release whatever the drop's listeners set. `packages/react/tests/external.test.tsx`: clears the drop and drags again when a controlled parent takes the drop (react-grid-layout#2263) |
| [#2262](https://github.com/react-grid-layout/react-grid-layout/issues/2262) droppingItem not removed on leaving the grid while the button is held (dev mode) | the dropping item stays after the drag leaves the grid | **tested**: off the grid the preview goes back to the layout at the drop's start (X3). `packages/core/tests/engine/drop.test.ts`: removes the preview off the grid, and drops nothing there (react-grid-layout#2262) |
| [#2241](https://github.com/react-grid-layout/react-grid-layout/issues/2241) Unable to provide custom resize handle in v2 | a custom `handleComponent` renders beside the default handle | **solved by design** (D4, D5): there is no default handle; the app renders `GridLayout.ResizeHandle` with its own `render` and look |
| [#2156](https://github.com/react-grid-layout/react-grid-layout/issues/2156) Tiles jump to next line when compaction is horizontal | dragging a tile over others and back leaves them moved | **tested** (deviation 1: every preview is computed from the layout at the gesture's start). `packages/core/tests/engine/engine.test.ts`: leaves a horizontal layout as it was when an item is dragged over others and back (react-grid-layout#2156) |
| [#2151](https://github.com/react-grid-layout/react-grid-layout/issues/2151) Unexpected reordering when dragging (regression since 1.4.0) | items away from the drag jump into it, and stay reordered when it comes back | **tested** (deviation 1). `engine.test.ts`: leaves the layout as it was when an item is dropped where it started (react-grid-layout#1968, react-grid-layout#2151) |
| [#2097](https://github.com/react-grid-layout/react-grid-layout/issues/2097) Grid item stuck on mobile while resizing near the edge | a touch resize never ends | **solved by design** (D7: pointer capture; `pointercancel`, a lost capture or a move with no button end the gesture). `engine.test.ts`: cancels on Escape, pointercancel, a lost capture and a move with no button |
| [#2096](https://github.com/react-grid-layout/react-grid-layout/issues/2096) isBounded=true breaks tile positioning when moving | with the default padding, a bounded tile moves away from the pointer | **tested**: a bounded item is kept inside the root's box, measured in the same pixels the pointer is. `engine.test.ts`: keeps a bounded item under the pointer, reaching the last columns with padding (react-grid-layout#2096, react-grid-layout#2133) |
| [#2053](https://github.com/react-grid-layout/react-grid-layout/issues/2053) Bug with moving items breakpoints | a short item dragged down onto a tall one swaps only near the tall one's bottom | **tested**: from the gesture's start, the swap comes two rows in, whatever the tall item's height (the push itself is `moveElement`'s, D6). `packages/core/tests/layout/move.test.ts`: swaps a short item moved down onto a tall one before it reaches the tall one's bottom (react-grid-layout#2053) |
| [#2023](https://github.com/react-grid-layout/react-grid-layout/issues/2023) Drop onto another widget | a drop that replaces the item it lands on | **not applicable**: a policy (D14). The pieces are there: a middleware on `item.add` sees the cell and `model.get("collisions-by")`, and can refuse; the app replaces in `onDrop` |
| [#2014](https://github.com/react-grid-layout/react-grid-layout/issues/2014) Items move when clicked, with thin columns and a margin | a click (or a few pixels) shifts an item one column | **tested**: a press under the threshold is a click; a short drag finds the item's own cell. `engine.test.ts`: keeps an item in its cell after a short drag on thin columns with a wide gap (react-grid-layout#2014) |
| [#2002](https://github.com/react-grid-layout/react-grid-layout/issues/2002) In RTL, shrinking a resize makes it bigger | RTL resize runs backwards | **solved by design** (D11: logical sides, the engine mirrors pixels). `engine.test.ts`: pulls the `<side>` side, the opposite edge anchored (rtl), for all eight sides; the same Playwright spec runs on an RTL fixture |
| [#1984](https://github.com/react-grid-layout/react-grid-layout/issues/1984) onLayoutChange is always called twice | see [the hazard](#onlayoutchange-firing-twice-after-a-drag) | **tested** (react-grid-layout#1984) |
| [#1907](https://github.com/react-grid-layout/react-grid-layout/issues/1907) The resize handle is not reachable from the keyboard | no keyboard resize | **solved by design** (D10: each item is a tab stop; Shift+Arrows resize, Space or Enter drops). [`keyboard`](/examples/keyboard) |
| [#1841](https://github.com/react-grid-layout/react-grid-layout/issues/1841) Firefox: the dropped item is undefined in `onDrop` | HTML5 drag events lose the dropping item in Firefox | **solved by design** (X1: drag sources are pointer-based, never HTML5 drag and drop; native drags are only for other windows). `apps/playground/e2e/external.spec.ts` runs in Firefox |
| [#1838](https://github.com/react-grid-layout/react-grid-layout/issues/1838) Firefox: the drop preview lags | `dragover` throttling in Firefox | **solved by design** (X1, D7: pointer events, at most one preview per frame) |
| [#1794](https://github.com/react-grid-layout/react-grid-layout/issues/1794) RTL support | none in v2 | **solved by design** (D11): [`rtl-layout`](/examples/rtl-layout) |
| [#1790](https://github.com/react-grid-layout/react-grid-layout/issues/1790) Compact both horizontally and vertically | a compactor that does both | **kept** (D6, K4): neither library builds one in; a compactor is a strategy object, and `createCompactor` writes one ([`custom-compactor`](/examples/custom-compactor)) |
| [#1767](https://github.com/react-grid-layout/react-grid-layout/issues/1767) `dataTransfer` is empty in `onDropDragOver` | browsers protect a native drag's data until the drop | **solved by design** (X1): a drag source's `data` travels in the gesture's events; `onExternalDrag` is asked again on the drop, when the files can be read |

## Closed issues and decisions worth tracking

Fixed upstream, or decided out of scope there; each is a failure Grid Layout must not have.

| issue | what it reported | verdict |
|---|---|---|
| [#2291](https://github.com/react-grid-layout/react-grid-layout/issues/2291) onDragStop dropped when the release comes before the drag's first render | press, a move past the threshold and the release back to back: no `onDragStop`, the placeholder stuck | **tested**: the engine handles the gesture synchronously, not through React state. `engine.test.ts`: commits a release that comes before the drag's first frame (react-grid-layout#2291) |
| [#2235](https://github.com/react-grid-layout/react-grid-layout/issues/2235) Resizing is visually not limited to minW, maxW, minH, maxH | the resized item is drawn past its limits; only the drop is limited | **tested** (fixed in Epic #22): see [below](#a-bug-found-react-grid-layout2235) |
| [#2264](https://github.com/react-grid-layout/react-grid-layout/issues/2264) The event passed to `onResize` is undefined | | **solved by design**: every pointer `GestureEvent` carries `nativeEvent` |
| [#2232](https://github.com/react-grid-layout/react-grid-layout/issues/2232), [#2089](https://github.com/react-grid-layout/react-grid-layout/issues/2089), [#2187](https://github.com/react-grid-layout/react-grid-layout/issues/2187) No scrolling while dragging | | **solved by design** (R6: edge auto-scroll of the nearest scrollable ancestor). `apps/playground/e2e/autoscroll.spec.ts` |
| [#2233](https://github.com/react-grid-layout/react-grid-layout/issues/2233) The mouse drifts away from the resize handle | | **solved by design** (D7: the size comes from the gesture's start and the pointer, no `react-resizable`) |
| [#2240](https://github.com/react-grid-layout/react-grid-layout/issues/2240) Rendering lag in v2 | | **solved by design** (D8: no React commit while a drag stays over one cell). `packages/react/tests/root.test.tsx`: renders no React commit while a drag stays over one cell |
| [#2213](https://github.com/react-grid-layout/react-grid-layout/issues/2213) Custom compactors never called | | **solved by design** (D6: the compactor is a strategy object the model calls). [`custom-compactor`](/examples/custom-compactor) |
| [#2211](https://github.com/react-grid-layout/react-grid-layout/issues/2211) The drop placeholder differs between `GridLayout` and `Responsive` | | **solved by design** (R2: one Root) |
| [#2244](https://github.com/react-grid-layout/react-grid-layout/issues/2244) No `ref` on `Responsive` | | **solved by design** (D4: `ref` is a plain prop of every part) |
| [#2254](https://github.com/react-grid-layout/react-grid-layout/issues/2254) Debounce responsive width updates | | **solved by design** (R1: measured once a frame; a width wavering at a threshold settles) |
| [#1959](https://github.com/react-grid-layout/react-grid-layout/issues/1959) "ResizeObserver loop completed with undelivered notifications" | | **solved by design** (D13: the engine measures in the next frame, once, through the root's window) |
| [#1341](https://github.com/react-grid-layout/react-grid-layout/issues/1341), [#1401](https://github.com/react-grid-layout/react-grid-layout/issues/1401), [#2136](https://github.com/react-grid-layout/react-grid-layout/issues/2136) A click starts a drag | | **tested** (D7: a press stays a click under 3px). `engine.test.ts`: stays a click under the threshold (react-grid-layout#1341, react-grid-layout#1401); `grid.spec.ts`: a press that barely moves is a click, not a drag |
| [#2141](https://github.com/react-grid-layout/react-grid-layout/issues/2141) A one-pixel gap with a margin of 0 | rounding each size apart | **tested**: a neighbour starts exactly `gap` after an item ends. `packages/core/tests/layout/geometry.test.ts`: keeps every gap exactly 0px, none at 0 (react-grid-layout#2141, PR #2150) |
| [#1968](https://github.com/react-grid-layout/react-grid-layout/issues/1968) Dragged and put back, an item's x and y change | | **tested** (react-grid-layout#1968, with #2151) |
| [#2133](https://github.com/react-grid-layout/react-grid-layout/issues/2133), [#2101](https://github.com/react-grid-layout/react-grid-layout/issues/2101) A bounded drag leaves the cursor | | **tested** (react-grid-layout#2133, with #2096) |
| [#2148](https://github.com/react-grid-layout/react-grid-layout/issues/2148) The drop placeholder is offset from the pointer | | **tested** (X2: centred under the pointer, moved by `dragOffset`). `drop.test.ts`: places the item centred under the pointer, moved by the drag offset, mirrored in rtl (react-grid-layout#2148) |
| [#1793](https://github.com/react-grid-layout/react-grid-layout/issues/1793) The page does not scroll on touch over draggable items (`allowMobileScroll`) | | **tested** (R5: a touch on a body is held before it drags). `packages/core/tests/engine/touch.test.ts`: lets the page scroll when it moves before it is held long enough (react-grid-layout#1793); `apps/playground/e2e/mobile.spec.ts` |
| [#1756](https://github.com/react-grid-layout/react-grid-layout/issues/1756) No drop from outside on touch | HTML5 drag and drop has no touch | **solved by design** (X1: drag sources are pointer-based). `mobile.spec.ts`: a drag source drops on touch |
| [#1779](https://github.com/react-grid-layout/react-grid-layout/issues/1779) `isBounded` does not bound a resize | | **tested**. `packages/core/tests/layout/constraints.test.ts`: four tests named react-grid-layout#1779 |
| [#2173](https://github.com/react-grid-layout/react-grid-layout/issues/2173) An unexpected rearrangement on a push to the north | | **tested**. `move.test.ts`: moves down from the pushed item's own row on a collision to the north (react-grid-layout#2173) |
| [#1606](https://github.com/react-grid-layout/react-grid-layout/issues/1606) `allowOverlap` | | **tested**. `move.test.ts`: lets items overlap under allowOverlap, in a new layout (react-grid-layout#1606) |
| [#1309](https://github.com/react-grid-layout/react-grid-layout/issues/1309) Compaction around scattered statics | | **tested**. `packages/core/tests/layout/compact.test.ts`: compacts around statics scattered through the layout (react-grid-layout#1309) |
| [#2164](https://github.com/react-grid-layout/react-grid-layout/issues/2164) Moving dynamic items moves static ones | | **solved by design** (deviation 5: a static never moves, by a person or by compaction). `grid.spec.ts`: a static item never moves, and the others go around it |
| [#2182](https://github.com/react-grid-layout/react-grid-layout/issues/2182) "Cannot assign to read only property 'x'" | | **tested**: see [the hazard](#in-place-mutation) |
| [#2104](https://github.com/react-grid-layout/react-grid-layout/issues/2104) Cannot remove a dragged item when the layout is controlled | | **solved by design** (X3: a release off the grid runs no command and reports `outside` and `target`; the app removes it). [`toolbox`](/examples/toolbox) |
| [#2131](https://github.com/react-grid-layout/react-grid-layout/issues/2131) Free mode moves items on the y axis | | **solved by design**: the free-mode swap of [#1982](#the-free-mode-swap) (deviation 2) |
| [#2044](https://github.com/react-grid-layout/react-grid-layout/issues/2044) `maxRows` still lets rows be added | | **kept** (D3, deviation 8): `maxRows` bounds what a gesture or a command asks for; pushes and compaction may settle items below it. `containerBounds` or a middleware is the hard bound |
| [#1964](https://github.com/react-grid-layout/react-grid-layout/issues/1964) Resize neighbours instead of pushing them (`.out-of-scope/resize-neighbors.md`) | | **kept**: a layout policy (D14); a middleware on `item.resize` or a custom compactor can do it |
| [#1998](https://github.com/react-grid-layout/react-grid-layout/issues/1998) A placeholder threshold (`.out-of-scope/drop-target-threshold.md`) | | **kept**: the placeholder is the cell under the pointer; `onExternalDrag` or a middleware can refuse until the app's own test passes |
| [#2063](https://github.com/react-grid-layout/react-grid-layout/issues/2063) A resize shifts the item | | **solved by design**: see [resizing from the top](#resizing-from-the-top) |
| [#2027](https://github.com/react-grid-layout/react-grid-layout/issues/2027) Dragging the left resize handle shifts the item | | **solved by design**: see [resizing from the top](#resizing-from-the-top) |

## A bug found: react-grid-layout#2235

**Input.** An item `{ id: "a", x: 0, y: 0, w: 2, h: 2, minW: 2, maxW: 3 }` on the harness's grid
(12 columns on 1200px, a 10px gap), its `end` resize handle pulled six columns to the right.

**Expected.** As React Grid Layout 2.2 does (`GridItem.tsx`, `minConstraints`/`maxConstraints`,
#2235): the item is drawn no wider than `maxW` (and no narrower than `minW`) while the pointer
pulls past it, so what the person sees is what they get.

**Actual.** The item is drawn 783px wide, following the pointer, while the placeholder (the
model's dry run) is 288px, three columns; the release commits `w: 3`. Shrinking past `minW` draws it
narrower than two columns the same way.

**Diagnosis.** `frame()` in `packages/core/src/engine/engine.ts` writes the held item's pixel size
from the pointer, clamped only at 0 (`Math.max(width, 0)`); only the target (`resizeRect`, then the
model's constraints) is limited. The drawn size should be clamped to the item's `minW`/`maxW`/
`minH`/`maxH` in pixels (and the columns), as React Grid Layout does; whether it should also follow
the grid's other constraints (an aspect ratio, `containerBounds`) is the maintainer's call, since a
constraint is a grid-unit rule (K1).

**Fix.** The engine draws the held item within what it can land at: the item's limits in pixels
(while the grid's constraints keep `minMaxSize`) and the columns its fixed edge leaves, the opposite
edge kept. Other constraints (an aspect ratio) still show in the placeholder only.

**Test.** `packages/core/tests/engine/engine.test.ts`: draws a resized item no wider than its maxW,
no narrower than its minW (react-grid-layout#2235).

## Regression matrix

One row per issue Grid Layout pins with a test named after it. Every test passes. Paths are relative to the repository root.

| issue | React Grid Layout failure | test (file: name) | status |
|---|---|---|---|
| [#2182](https://github.com/react-grid-layout/react-grid-layout/issues/2182) | a frozen layout throws on a drag | `packages/core/tests/model/model.test.ts`: runs every command over frozen layouts and never writes to them (react-grid-layout#2182) | pass |
| [#1984](https://github.com/react-grid-layout/react-grid-layout/issues/1984) | `onLayoutChange` twice per move | `packages/react/tests/root.test.tsx`: uncontrolled: a drop stands, and onLayoutChange is told once (react-grid-layout#1984) | pass |
| [#2219](https://github.com/react-grid-layout/react-grid-layout/issues/2219), [#2204](https://github.com/react-grid-layout/react-grid-layout/issues/2204), [#2210](https://github.com/react-grid-layout/react-grid-layout/issues/2210) | layout changes, and update loops, while a drag from outside goes in and out | `packages/react/tests/external.test.tsx`: tells no layout change and loops no update while a source goes in and out (react-grid-layout#2219, react-grid-layout#2204, react-grid-layout#2210) | pass |
| [#2202](https://github.com/react-grid-layout/react-grid-layout/issues/2202) | an update loop with inline `layouts` | `packages/react/tests/responsive.test.tsx`: takes layouts written inline at every render, with no update loop (react-grid-layout#2202) | pass |
| [#2263](https://github.com/react-grid-layout/react-grid-layout/issues/2263) | the placeholder freezes after a drop a controlled parent takes | `packages/react/tests/external.test.tsx`: clears the drop and drags again when a controlled parent takes the drop (react-grid-layout#2263) | pass |
| [#2262](https://github.com/react-grid-layout/react-grid-layout/issues/2262) | the dropping item stays after leaving the grid | `packages/core/tests/engine/drop.test.ts`: removes the preview off the grid, and drops nothing there (react-grid-layout#2262) | pass |
| [#2143](https://github.com/react-grid-layout/react-grid-layout/issues/2143) | a drop on a scrolled grid lands off the pointer | `packages/core/tests/engine/drop.test.ts`: drops where the pointer is on a grid scrolled out of the top of the view (react-grid-layout#2143) | pass |
| [#2148](https://github.com/react-grid-layout/react-grid-layout/issues/2148) | the drop placeholder is offset | `packages/core/tests/engine/drop.test.ts`: places the item centred under the pointer, moved by the drag offset, mirrored in rtl (react-grid-layout#2148) | pass |
| [#1744](https://github.com/react-grid-layout/react-grid-layout/issues/1744) | a generated layout keeps the gaps | `packages/core/tests/layout/responsive.test.ts`: collapses a mid-grid gap when generating a smaller layout (react-grid-layout#1744) | pass |
| [#2110](https://github.com/react-grid-layout/react-grid-layout/issues/2110) | an item added on a small breakpoint shrinks on a larger one | `packages/core/tests/model/responsive.test.ts`: keeps the size of an item added on a smaller breakpoint on a larger one (react-grid-layout#2110) | pass |
| [#2271](https://github.com/react-grid-layout/react-grid-layout/issues/2271) | a sub-pixel width loops across a breakpoint | `packages/core/tests/engine/responsive.test.ts`: settles a sub-pixel width wavering at a threshold, once a measure: no loop (react-grid-layout#2271)<br>`packages/core/tests/layout/responsive.test.ts`: keeps a stored layout as it is: a round trip comes back to it (react-grid-layout#2271) | pass |
| [#2203](https://github.com/react-grid-layout/react-grid-layout/issues/2203) | a north resize moves the item | `packages/core/tests/layout/edit.test.ts`: keeps the bottom edge when shrinking from the top (react-grid-layout#2203) | pass |
| [#1982](https://github.com/react-grid-layout/react-grid-layout/issues/1982) | a large gap after a free-mode overlap | `packages/core/tests/layout/move.test.ts`: pushes a collider in free mode only until it clears a partial overlap; swaps equal-size items in free mode; leaves no large gap on a partial overlap in free mode (react-grid-layout#1982)<br>`packages/core/tests/engine/constraints.test.ts`: snapToGrid(3) without compaction: the free mode's swap may move the snapped item (react-grid-layout#1982) | pass |
| [#2252](https://github.com/react-grid-layout/react-grid-layout/issues/2252) | wrap: no swap toward the start, items overlapping | `packages/core/tests/compactors/wrap.test.ts`: react-grid-layout#2252 leaves no two items on one cell when one is dragged earlier; … when one is dropped on another; lands the item dragged earlier where it was dropped; lands the item dropped on another where it was dropped<br>`packages/core/tests/layout/move.test.ts`: react-grid-layout#2252 swaps the two under horizontal compaction | pass |
| [#2161](https://github.com/react-grid-layout/react-grid-layout/issues/2161) | `y: Infinity` lands at the top | `packages/core/tests/layout/normalise.test.ts`: places y: Infinity below everything before it (react-grid-layout#2161) | pass |
| [#2291](https://github.com/react-grid-layout/react-grid-layout/issues/2291) | a release before the first render drops `onDragStop` | `packages/core/tests/engine/engine.test.ts`: commits a release that comes before the drag's first frame (react-grid-layout#2291) | pass |
| [#1968](https://github.com/react-grid-layout/react-grid-layout/issues/1968), [#2151](https://github.com/react-grid-layout/react-grid-layout/issues/2151) | an item put back where it started leaves the layout changed | `packages/core/tests/engine/engine.test.ts`: leaves the layout as it was when an item is dropped where it started (react-grid-layout#1968, react-grid-layout#2151) | pass |
| [#2156](https://github.com/react-grid-layout/react-grid-layout/issues/2156) | horizontal: tiles jump during a drag over them | `packages/core/tests/engine/engine.test.ts`: leaves a horizontal layout as it was when an item is dragged over others and back (react-grid-layout#2156) | pass |
| [#2014](https://github.com/react-grid-layout/react-grid-layout/issues/2014) | a click moves an item on thin columns | `packages/core/tests/engine/engine.test.ts`: keeps an item in its cell after a short drag on thin columns with a wide gap (react-grid-layout#2014) | pass |
| [#2096](https://github.com/react-grid-layout/react-grid-layout/issues/2096), [#2133](https://github.com/react-grid-layout/react-grid-layout/issues/2133) | a bounded drag leaves the pointer | `packages/core/tests/engine/engine.test.ts`: keeps a bounded item under the pointer, reaching the last columns with padding (react-grid-layout#2096, react-grid-layout#2133) | pass |
| [#2053](https://github.com/react-grid-layout/react-grid-layout/issues/2053) | a short item swaps with a tall one only near its bottom | `packages/core/tests/layout/move.test.ts`: swaps a short item moved down onto a tall one before it reaches the tall one's bottom (react-grid-layout#2053) | pass |
| [#2141](https://github.com/react-grid-layout/react-grid-layout/issues/2141) | a one-pixel gap with no margin | `packages/core/tests/layout/geometry.test.ts`: keeps every gap exactly ${gap}px, none at 0 (react-grid-layout#2141, PR #2150) | pass |
| [#1341](https://github.com/react-grid-layout/react-grid-layout/issues/1341), [#1401](https://github.com/react-grid-layout/react-grid-layout/issues/1401) | a click starts a drag | `packages/core/tests/engine/engine.test.ts`: stays a click under the threshold (react-grid-layout#1341, react-grid-layout#1401) | pass |
| [#1793](https://github.com/react-grid-layout/react-grid-layout/issues/1793) | no page scroll on touch over items | `packages/core/tests/engine/touch.test.ts`: lets the page scroll when it moves before it is held long enough (react-grid-layout#1793) | pass |
| [#1779](https://github.com/react-grid-layout/react-grid-layout/issues/1779) | a bounded grid does not bound a resize | `packages/core/tests/layout/constraints.test.ts`: keeps the height inside the visible grid; keeps the width inside the columns from end sides; falls back to maxRows when the height is 0; leaves a size that fits unchanged (react-grid-layout#1779) | pass |
| [#2173](https://github.com/react-grid-layout/react-grid-layout/issues/2173) | a push to the north rearranges the grid | `packages/core/tests/layout/move.test.ts`: moves down from the pushed item's own row on a collision to the north (react-grid-layout#2173) | pass |
| [#1606](https://github.com/react-grid-layout/react-grid-layout/issues/1606) | `allowOverlap` | `packages/core/tests/layout/move.test.ts`: lets items overlap under allowOverlap, in a new layout (react-grid-layout#1606) | pass |
| [#1309](https://github.com/react-grid-layout/react-grid-layout/issues/1309) | compaction around scattered statics | `packages/core/tests/layout/compact.test.ts`: compacts around statics scattered through the layout (react-grid-layout#1309) | pass |
| [#2235](https://github.com/react-grid-layout/react-grid-layout/issues/2235) | a resize is drawn past the item's limits | `packages/core/tests/engine/engine.test.ts`: draws a resized item no wider than its maxW, no narrower than its minW (react-grid-layout#2235) | passes (fixed in Epic #22) |
| — (hazard) | `onWidthChange` reports a hard-coded `[10, 10]` margin | `packages/core/tests/engine/responsive.test.ts`: places items with the breakpoint's own row height, gap and padding (R4) | pass |
| — (hazard) | an empty layout is `2 × padding − gap` tall | `packages/core/tests/layout/geometry.test.ts`: is the padding alone for an empty layout | pass |
