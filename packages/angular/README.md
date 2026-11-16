# @fragiola/grid-layout-angular

Composable, unstyled Angular directives for [Grid Layout](https://fragiola.com/grid-layout): draggable, resizable grid layouts styled entirely by you.

```sh
pnpm add @fragiola/grid-layout-angular
```

```ts
import { Component, signal } from "@angular/core";
import { GRID_LAYOUT, type Layout } from "@fragiola/grid-layout-angular";

@Component({
    selector: "app-dashboard",
    imports: [GRID_LAYOUT],
    template: `
        <div gridLayoutRoot [(layout)]="layout" [cols]="12" [rowHeight]="64" aria-label="Dashboard">
            <ng-template gridLayoutItems let-item>
                <div [gridLayoutItem]="item.id" [attr.aria-label]="item.id">
                    {{ item.id }}
                    <div *gridLayoutResizeHandle="'bottom-end'" aria-label="Resize"></div>
                </div>
            </ng-template>
            <div *gridLayoutPlaceholder></div>
        </div>
    `,
})
export class Dashboard {
    readonly layout = signal<Layout>([
        { id: "a", x: 0, y: 0, w: 4, h: 2 },
        { id: "b", x: 4, y: 0, w: 4, h: 2 },
    ]);
}
```

Every primitive is a directive on an element you write: it adds the `data-*` state, the structural
style and the listeners, and you style the element with `class`, `style` and the `data-*`
attributes. The same parts, `data-*` attributes and behaviour as `@fragiola/grid-layout-react`, the
hooks as injection functions (`injectGridLayout`, `injectBreakpoint`, …), and the whole core
re-exported; `@fragiola/grid-layout-angular/compactors` re-exports the core's compactors. Needs
`@angular/core` ^22; standalone, signals, zoneless; ESM only (Angular Package Format).

Docs and examples: <https://fragiola.com/grid-layout>. MIT, see [LICENSE](LICENSE).
