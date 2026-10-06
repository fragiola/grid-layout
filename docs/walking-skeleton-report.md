# Walking skeleton report (Epic #1)

What the walking skeleton set out to prove, what held, what it measured, where it departs from
React Grid Layout on purpose, and what it hands to the next Epics.

## The bets

| # | bet | held? | how we know |
|---|---|---|---|
| 1 | **Pure, immutable layout rules.** Collision, move-with-push and compaction are pure functions that never mutate their input, and hold against React Grid Layout's spec. | Yes | React Grid Layout's move, collision, compaction and geometry cases are ported (`packages/core/tests/layout`), every one on deep-frozen input. A property test runs 600 random commands per compactor and checks the layout stays valid, settled and in bounds after each. |
| 2 | **An engine that moves items without fighting React.** During a gesture the engine draws the held item; React commits only when the preview changes; a gesture ends in one command. | Yes | Zero React commits while a drag stays over one cell, in jsdom (`packages/react/tests/root.test.tsx`) and in Chromium and Firefox (`apps/playground/e2e/grid.spec.ts`, a render counter on the fixture). The hand-off at release does not flicker: the command runs before the session ends, so the item goes straight to where it landed. |
| 3 | **One interaction pipeline for every input.** Mouse, touch and pen through pointer events; the keyboard runs the same commands. | Yes | The same Playwright spec drives mouse gestures in Chromium and Firefox, and real touch input (Chromium's, through the DevTools protocol) drags a drag handle and pulls a resize handle. Pointer and keyboard give the same layout for the same move (`packages/core/tests/engine/engine.test.ts`). |
| 4 | **Logical coordinates from day one.** `x` from the inline start, logical resize sides, right-to-left a mirror. | Yes | One spec runs against a left-to-right and a right-to-left fixture: every resize side, drags, the keyboard and bounds. Nothing in the layout rules knows the direction; the engine mirrors pixels only. |
| 5 | **`render` + `data-*` + structural style are the whole styling contract.** | Yes, with the gaps below | Sixteen themed examples in five themes style items, handles, the placeholder, transitions and a lift entirely from outside. A component test holds the inline style allow-list; the packages ship no CSS. |

## Numbers

Measured on the development machine (`pnpm bench`, `pnpm size`); informative, not gates.

| what | result |
|---|---|
| core, min + gzip | 9.9 KB (61.4 KB raw) |
| React package, min + gzip | 2.7 KB (+0.2 KB runtime chunk) |
| vertical compaction, 100 items | 0.38 ms mean |
| vertical compaction, 1,000 items | 47 ms mean |
| horizontal compaction, 1,000 items | 28 ms mean |
| one move with push, then settle, 1,000 items | 28 ms mean |
| React commits during a drag inside one cell | 0 |
| React commits per preview change | 1 |
| unit and component tests | 299 (core 184, React 31, the rest the apps, examples and site) |
| e2e | 80 in the playground (Chromium, Firefox, touch), 81 in the examples app, 100 in all themes |

The standard compactors are O(n²): fine for dashboards (tens of items), slow past a few hundred
items per preview. The fast compactors of Epic #18 address large layouts.

## Deliberate deviations from React Grid Layout

1. **Previews are computed from the layout at the gesture's start**, every frame; React Grid Layout
   applies each move to the previous one. Pointer, keyboard and the committed command give the same
   layout by construction, and a preview does not depend on the path the pointer took.
2. **Free mode never leaves items overlapping.** Where React Grid Layout's `moveElement` gives up
   on a collision without compaction, the pushed item moves down; `noCompactor` pushes down what
   would overlap (React Grid Layout's clones the layout as it is).
3. **A resize keeps the box its handle gives** and pushes what it covers past its far edge. React
   Grid Layout resolves a start or top resize as a user's move, whose free-mode swap made the
   resized item jump, and leaves end and bottom resizes to the compaction's reading order, which let
   a taller neighbour starting higher push the resized item down.
4. **An item left of the first column keeps its width** when corrected; React Grid Layout sets it to
   the grid's width.
5. **A static item never moves**, even with `draggable: true` (React Grid Layout's `isDraggable`
   overrides `static`).
6. **No input is ever mutated**, and an unchanged item is the caller's own object; React Grid
   Layout mutates layouts in place in `moveElement`, `correctBounds` and the compactors.
7. **`onLayoutChange` fires once per committed change**, never during a gesture, and on mount only
   when the layout was corrected; React Grid Layout can fire it twice after a drag.
8. **`maxRows` is the same as React Grid Layout's**: it bounds what a gesture or a command asks
   for, while pushes and compaction may settle items below it. A hard bound would have to refuse
   pushes; it is left for the constraints Epic (#18).
9. **An empty layout's height is the padding alone** (React Grid Layout gives `2 × padding − gap`).
10. **No child-key synchronisation** (`data-grid`), no `WidthProvider`, no stylesheet, no
   `react-draggable` or `react-resizable`, no legacy API: the model is the source of truth, the root
   measures itself, and the look is the app's.
11. **An item dragged off the grid goes back** (added by Epic #9, X3). Once the held item's
    centre leaves the root (past its sides or its top, or further below its bottom than its own
    height with `autoSize`), the preview returns it to its cell and a release there runs no
    command. `drag-stop` reports `outside` and the element under the pointer, so the app can remove
    it. React Grid Layout clamps the item to the edge cell. A `bounded` grid never lets an item out.
12. **Breakpoints by the grid's own width, at their minimum** (added by Epic #13, R1). The
    breakpoint for a width is the widest whose minimum is at most the width; React Grid Layout's
    must be exceeded (at 996 px it says `sm`, here `md`). Every breakpoint shows the same items:
    one added or removed on a breakpoint is added or removed on the others at their next
    activation, while each keeps its own places. A width wavering at a threshold (a scrollbar)
    settles: crossing back the threshold just crossed needs 24 px more.
13. **Constraints are model rules** (added by Epic #18, K1–K3). React Grid Layout applies them
    during gestures only; here every command that places or sizes an item does, so the keyboard,
    drops and `model.run` obey them, and a preview is its commit's dry run. The columns stay a hard
    rule: whatever the constraints say (`boundedY`, none at all), an item stays inside them, at
    row 0 or below, on whole cells. `maxRows` is `gridBounds`' clamp instead of an
    `invalid_payload`. An item stores its own constraints as names (with a factory's `args`)
    resolved from a registry, never as objects, so a layout serialises. A factory given bad values
    returns an `invalid` constraint instead of throwing. `aspectRatio` and `containerBounds` count
    the padding. Without an engine's pixels (a plain `model.run`), `aspectRatio` does nothing and
    `containerBounds` bounds by `maxRows`, and the result names them in `skipped`. A constraint
    receives the item with the proposed place (or size) in it, and a resize side is logical.
14. **The opt-in compactors** (added by Epic #18, K4). Each works on a copy (an unmoved item keeps
    its object, the input's order is kept). The wrap compactor resolves moves horizontally
    (react-grid-layout#2252, fixed for the standard horizontal compactor too: a move toward the
    start onto a neighbour swaps them) and gives an item cells free for its whole size, so items
    larger than a cell never overlap. The fast vertical compactor leaves an item outside the
    columns on its row (React Grid Layout's rises to minus infinity); the fast horizontal one
    places an item as wide as the grid at the first row free at the start, with no warning. A
    compactor flagged `overlap` runs under `allowOverlap`; any other is skipped there.
15. **Scale is read, not configured** (added by Epic #18, K5): the root's box on screen against its
    layout size, at each gesture's start, replaces `transformScale` and `createScaledStrategy`; a
    `scale` option overrides it. **Cells replace `GridBackground`** (K6): one element per cell,
    placed by the grid, drawn by the app; no SVG, no colours.
16. **What React Grid Layout does not have**: the keyboard (grab, move, resize, drop, cancel),
    logical sides and right-to-left, middleware that can refuse a gesture's landing (the preview
    shows the item going back), and `item.place` for a move and a resize at once.

## What the examples could not express

Recorded in [`examples-gaps.md`](examples-gaps.md). Two were fixed in this Epic (items animating in
on load; a corrected controlled layout not always told). Open:

- **No way to reach the model from outside the root** (Data Grid's `gridRef`): the examples hold the
  layout in their state, or put the part that needs the model inside the root.
- **No "add wherever there is room" from outside the root**: the examples add at `y: Infinity`.
- **No bring-to-front with `allowOverlap`**: the drawing order is the layout's order.

## Found on the way

- Firefox starts its own drag of a text selection when an item is pressed, which cancelled the
  pointer: while a press or a gesture is live, the browser's drag is prevented and a selection is
  cleared when the drag begins.
- Firefox releases pointer capture when the pointer leaves the window, which cancels the gesture as
  designed (D7); Chromium keeps the capture.
- A Profiler around `Items` from outside does not see updates that reach the items through context
  only: the fixture counts each item's commits instead.

## For the next Epics

- **External drop (#9)**: the engine's sessions and the preview/commit split extend to a drag that
  starts outside the root; `item.add` already takes a cell or the first free one. A `gridLayoutRef`
  (outside access) fits here, since sources live outside the root.
- **Responsive and mobile (#13)**: the model already stores layouts per breakpoint. Item bodies on
  touch need long-press activation; handles already take touch.
- **Parity (#22)**: the deviations above are the parity audit's starting list.
