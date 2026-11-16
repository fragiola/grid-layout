// Type fixtures, checked by `ngc` (strict templates), never run: the template directives'
// contexts, the injection functions' overloads and the root's two-way bindings. `@ts-expect-error`
// marks what must not compile.
import { Component, type Signal, signal } from "@angular/core";
import {
    type BreakpointInfo,
    type CellsContext,
    createGridLayoutRef,
    GRID_LAYOUT,
    GridLayoutCells,
    type GridLayoutHandle,
    GridLayoutItems,
    GridLayoutPlaceholder,
    type GridLayoutView,
    type ItemsContext,
    injectBreakpoint,
    injectGridLayout,
    injectGridLayoutView,
    type Layout,
    type LayoutItem,
    type PartContext,
    type PlaceholderState,
} from "../../src/public-api";

declare const context: unknown;

// the context guards narrow each template's context
declare const items: GridLayoutItems;
if (GridLayoutItems.ngTemplateContextGuard(items, context)) {
    const typed: ItemsContext = context;
    const item: LayoutItem = typed.$implicit;
    const id: string = item.id;
    void id;
    // @ts-expect-error an item has no data
    void item.data;
}

declare const cells: GridLayoutCells;
if (GridLayoutCells.ngTemplateContextGuard(cells, context)) {
    const typed: CellsContext = context;
    const x: number = typed.cell.x;
    void x;
}

declare const placeholder: GridLayoutPlaceholder;
if (GridLayoutPlaceholder.ngTemplateContextGuard(placeholder, context)) {
    const typed: PartContext<PlaceholderState> = context;
    // @ts-expect-error a kind is one of the gestures'
    const kind: "other" = typed.state.kind;
    void kind;
}

// the injection functions: inside a root the grid is there, through a ref it may not be
export function injections() {
    const inside: Signal<GridLayoutHandle> = injectGridLayout();
    const ref = createGridLayoutRef();
    // @ts-expect-error through a ref, the grid is `null` until a root holds it
    const outside: Signal<GridLayoutHandle> = injectGridLayout(ref);
    const view: Signal<GridLayoutView> = injectGridLayoutView();
    const viewOutside: Signal<GridLayoutView | undefined> =
        injectGridLayoutView(ref);
    const breakpoint: Signal<BreakpointInfo> = injectBreakpoint();
    // @ts-expect-error through a ref, the breakpoint may not be known yet
    const breakpointOutside: Signal<BreakpointInfo> = injectBreakpoint(ref);
    return [inside, outside, view, viewOutside, breakpoint, breakpointOutside];
}

// a template that uses every directive, checked with strict templates
@Component({
    selector: "test-typed",
    imports: [GRID_LAYOUT],
    template: `
        <div gridLayoutRoot [(layout)]="layout" [cols]="12" [rowHeight]="50" autoSize preventCollision maxRows="8">
            <ng-template gridLayoutItems let-item>
                <div [gridLayoutItem]="item.id" #part="gridLayoutItem" [class.held]="part.state().dragging">
                    <span gridLayoutDragHandle></span>
                    <div *gridLayoutResizeHandle="'bottom-end'; let state" [class.on]="state.resizing"></div>
                </div>
            </ng-template>
            <div *gridLayoutPlaceholder="let state" [attr.data-app-kind]="state.kind"></div>
            <div *gridLayoutCells="let cell; rows: 4" [attr.data-app-x]="cell.x"></div>
        </div>
        <div [gridLayoutDragSource]="{ w: 2, h: 1 }" [gridLayoutRef]="ref" [data]="'note'" disabled></div>
        <div *gridLayoutDragPreview="ref; let state">{{ state.over }}</div>
    `,
})
export class Typed {
    readonly layout = signal<Layout>([]);
    readonly ref = createGridLayoutRef();
}
