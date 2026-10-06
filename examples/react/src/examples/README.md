# Examples

Each folder is one example of the site's gallery (`fragiola.com/grid-layout/examples/<folder>`),
rendered alone by this app at `index.html?id=<folder>`.

```
src/examples/
  <slug>/index.tsx     the example (default export, "use client")
  <slug>/meta.ts       title, description, category, order, features, docs link, layout, height
  <slug>/styles.ts     how it looks: one class string (or state function) per part
  <slug>/*.ts(x)       optional sibling files, shown in the code panel
  _kit/                shared demo content and app logic (widget content, layout generators,
                       storage, announcements); no GridLayout assembly, no styles
  _themes/             the five themes (one CSS file each, values only) and their list
```

## Categories

The gallery groups examples by the feature they show (`CATEGORIES` in `meta-types.ts`, in sidebar
order; the site export contract calls a category a `level`). An example belongs where a reader
looking for its feature would search, and `order` is its place inside the category.

| category | what belongs in it |
|---|---|
| `getting-started` | the first grids: the smallest themed one, the bare primitives, a read-only grid |
| `layouts` | what the layout itself does: corrected on load, statics, adding and removing, saving |
| `drag-and-drop` | moving items: handles, controls that never drag, bounds |
| `resizing` | sizing items: the eight sides, minimum and maximum sizes |
| `constraints` | rules on where items go and what size they take: bounds, aspect ratios, snapping, custom rules |
| `compaction` | how items settle: vertical, horizontal, none, collisions, overlap |
| `keyboard` | moving and resizing without a pointer, and what is announced |
| `external-drop` | things from outside the grid becoming items: drag sources, a toolbox, drop rules, files |
| `responsive` | grids that adapt to their own width: breakpoints, a layout per breakpoint, saving them |
| `mobile` | grids on a phone: long press to move, page scrolling kept, touch sources |
| `styling` | how the grid looks when it is not about one feature: transitions, the placeholder, RTL |
| `apps` | several features together, as an app would put them: a dashboard builder |

## Adding an example

1. Create `src/examples/<slug>/index.tsx`, `meta.ts` and `styles.ts` (see `meta-types.ts`).
2. `pnpm dev` at the root lists it in the playground (`apps/playground`), with hot reload, the five
   themes and its source: `http://localhost:5173/?example=<slug>`. The embed alone is
   `pnpm --filter examples-react dev` (`http://localhost:5182/?id=<slug>`, it regenerates the
   loaders).
3. The smoke e2e visits it in the reference theme (every theme only for the representative
   examples in `e2e/smoke.spec.ts`; `E2E_ALL_THEMES=1` runs them all), and inside an iframe. Add
   a spec for its main behaviour in `e2e/examples/<slug>.spec.ts`.

## Anatomy of an example

A reader opens `index.tsx` and sees the logic first: what is rendered, how the grid layout is
assembled, which API is called. How it looks is one click away, in `styles.ts`. The code panel
shows the example's files, the shared demo content it imports and the theme's CSS, and nothing
else.

- **`index.tsx` renders `<GridLayout.Root>`** and the parts under it. Parts may be components in
  the same file or in sibling files of the same folder, never in a shared module: `_kit/` holds no
  GridLayout assembly (`tests/examples.test.ts`).
- **Classes in `styles.ts`**, beside `index.tsx`. It exports one `const` per styled part, named
  after the part (`root`, `item`, `dragHandle`, `resizeHandle`, `placeholder`, …): a class string,
  built with `cn()` when it is long or has conditions, or a function of the part's state. The
  `.tsx` files `import * as styles from "./styles"` and write `className={styles.item}`. No `.tsx`
  file of an example holds a class string or calls `cn()` (`tests/examples.test.ts`).
- **Classes are complete literals.** Tailwind finds a class by reading the source, so
  `` `palette-${tone}` `` is never generated: map a value to a full class instead.
- **A class that does a job beyond looks keeps a short comment** in `styles.ts`.
- **Accessible names inline**: each item's `aria-label`, each icon button's, the live region's.
- **Tokens, not values that differ per theme**: fonts, padding, corners, the placeholder, the
  handles and the focus ring read the `--gl-*` tokens each theme declares (listed in
  `_themes/<name>.css`). Geometry (columns, row height, gap) is the grid's own configuration,
  never a token.

## Rules

- **Copyable imports only**: `react`, `@fragiola/grid-layout-react` (it re-exports the core) and
  its opt-in `@fragiola/grid-layout-react/compactors` entry, `lucide-react`, Fragiola UI
  (`#/components/ui/*`, `#/components/atoms/*`, `#/lib/cn`), and relative files inside
  `src/examples/`. `#/` is the app's `src/`; `@name` is reserved for
  packages (site export contract, §6). `tests/examples.test.ts` enforces it.
- **Theme-agnostic**: style through palette roles (`bg-palette-base`, …) and the theme tokens
  (`--gl-*`), never fixed colours, so the example works in all five themes.
- **State as data**: style the package's state through `data-*` and ARIA only.
- **Accessible names**: every button has `aria-label` or text; the package renders none.
- **App policy stays in the app**: persistence, toolboxes, add and remove buttons, ids and
  announcement text live in the example or in `_kit/`, never in a package.
- **Workarounds are commented** in the code (users copy them) and listed in
  `docs/examples-gaps.md` at the repo root.
