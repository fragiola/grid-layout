# Gaps found while writing the examples

What the public surface could not express while the examples of Epic #1 were written, what each
example does meanwhile, and where it is (or will be) answered. An example's workaround is commented
in its code, where readers copy it.

| # | gap | the examples meanwhile | answered |
|---|---|---|---|
| E1 | Items rendered before the root was measured had no transform; an app's transition then animated them in from the corner on load. | — | Fixed in Epic #1: `GridLayout.Items` renders once the width is known (or given), so items mount in place. |
| E2 | A controlled layout replaced by a new one that needs correcting, but corrects to what the grid already shows, was not told: the app's state kept the uncorrected layout. | — | Fixed in Epic #1: a new prop the grid shows corrected is always told once. |
| E3 | There is no way to reach the model from outside `GridLayout.Root` (Data Grid has `gridRef`). | `messy-layout` and `add-remove-items` hold the layout in the app's state and change it there; `keyboard` puts its announcer inside the root. | Answered in Epic #9: `createGridLayoutRef()` / `useGridLayoutRef()`, given to the root, reach the model and engine from anywhere (`useGridLayout(ref)`). The drop examples use it; `messy-layout` and `add-remove-items` keep their controlled layout, still a valid pattern. |
| E4 | Adding an item "wherever there is room" from outside the root has no command to call. | `add-remove-items` adds it at `y: Infinity` (below everything) and lets compaction lift it. | Answered in Epic #9: through the ref, `item.add` without `x`/`y` takes the first free cell from anywhere (`drop-files` adds the rest of a drop so), and a keyboard drop brings a new item in at the first free cell. |
| E5 | With `allowOverlap`, what is drawn above what is the DOM order, which is the layout's order: there is no "bring to front". | `allow-overlap` keeps the layout's order; the item held is above the others only while it is held (`z-index`, structural). | App policy: reorder the layout (a later example). |
| E6 | A transition on `transform` lags the pointer while an item is held. | Every example turns its transition off while `data-dragging` or `data-resizing` is present. | By design: the look is the app's. Documented in the transitions guide. |
| E7 | A handle without a size has nothing to press: the primitives give it no box. | Every example sizes and places its handles in `styles.ts` (the fixtures use logical insets). | By design (D5). Documented in the resizing concept page. |
