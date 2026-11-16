# Grid Layout

A headless grid layout for React, Vue and Angular: items on a grid of columns and rows that people drag and resize,
pushing each other out of the way and settling as they go. Dashboards, widget boards, bento
layouts. It ships behaviour, accessibility and composable primitives, and no CSS, icons, handles
or text: you bring the styling.

The keyboard (grab, move, resize, drop) and right-to-left layouts are built in, and every change to
the layout is a command you can veto or rewrite.

| package | what it is |
|---|---|
| [`@fragiola/grid-layout`](packages/core) | framework-agnostic core: layout rules (collision, move, compaction), typed model and commands, the engine |
| [`@fragiola/grid-layout-react`](packages/react) | composable React 19 primitives over the core |
| [`@fragiola/grid-layout-vue`](packages/vue) | the same primitives as Vue 3.5 components and composables |
| [`@fragiola/grid-layout-angular`](packages/angular) | the same primitives as Angular 22 attribute directives and injection functions |

Its behaviour follows [React Grid Layout](https://github.com/react-grid-layout/react-grid-layout)
(MIT), a study reference: see [LICENSE](LICENSE).

## Running it

Requires Node ≥ 24 and pnpm 11.

```sh
pnpm install
pnpm dev        # playground on http://localhost:5173: every example live
pnpm check      # lint + format
pnpm typecheck
pnpm test       # unit and component tests
pnpm build
pnpm e2e        # Playwright
```

Contributors and agents: read [AGENTS.md](AGENTS.md) first.
