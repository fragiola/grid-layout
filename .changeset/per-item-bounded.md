---
"@fragiola/grid-layout": minor
"@fragiola/grid-layout-react": minor
"@fragiola/grid-layout-vue": minor
"@fragiola/grid-layout-angular": minor
---

A layout item's `bounded` overrides the grid's for that item while it is dragged: `true` keeps it
inside the root on an unbounded grid, `false` lets it leave a bounded one (its release then reports
`outside`). `item.configure` sets it.
