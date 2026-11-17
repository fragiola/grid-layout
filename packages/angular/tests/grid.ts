// The grid most tests render: a root with each item labelled by its id, a resize handle in each
// item and a placeholder. Its `options` input is the root's inputs and outputs, as React's props
// (`setInput(fixture, "options", …)` changes them).

import { Component, computed, input } from "@angular/core";
import type {
    Breakpoints,
    Compactor,
    ConstraintRegistry,
    Direction,
    DropDetails,
    ExternalDragAnswer,
    GestureEvent,
    GridLayoutRef,
    Layout,
    LayoutConstraint,
} from "../src/public-api";
import { type BreakpointChange, GRID_LAYOUT } from "../src/public-api";
import { GEOMETRY } from "./helpers";

/** The root's inputs and outputs, as React's `RootProps`. */
export interface GridOptions {
    layout?: Layout;
    defaultLayout?: Layout;
    layouts?: Readonly<Record<string, Layout>>;
    defaultLayouts?: Readonly<Record<string, Layout>>;
    breakpoints?: Breakpoints;
    breakpoint?: string;
    defaultBreakpoint?: string;
    cols?: number | Readonly<Record<string, number>>;
    maxRows?: number;
    compactor?: Compactor;
    preventCollision?: boolean;
    allowOverlap?: boolean;
    constraints?: readonly LayoutConstraint[];
    constraintRegistry?: ConstraintRegistry;
    width?: number;
    rowHeight?: number | Readonly<Record<string, number>>;
    gap?: readonly [number, number];
    padding?: readonly [number, number];
    autoSize?: boolean;
    draggable?: boolean;
    resizable?: boolean;
    bounded?: boolean;
    dir?: Direction;
    gridLayoutRef?: GridLayoutRef;
    externalDrag?: (event: DragEvent) => ExternalDragAnswer;
    createId?: () => string;
    onLayoutChange?: (layout: Layout) => void;
    onLayoutsChange?: (layouts: Readonly<Record<string, Layout>>) => void;
    onBreakpointChange?: (change: BreakpointChange) => void;
    onDragStart?: (event: GestureEvent) => void;
    onDragMove?: (event: GestureEvent) => void;
    onDragStop?: (event: GestureEvent) => void;
    onResizeStart?: (event: GestureEvent) => void;
    onResizeStop?: (event: GestureEvent) => void;
    onDropped?: (drop: DropDetails) => void;
    onPointerDown?: (event: PointerEvent) => void;
}

@Component({
    selector: "test-grid",
    imports: [GRID_LAYOUT],
    template: `
        <div
            gridLayoutRoot
            aria-label="dashboard"
            [layout]="o().layout"
            [defaultLayout]="o().defaultLayout"
            [layouts]="o().layouts"
            [defaultLayouts]="o().defaultLayouts"
            [breakpoints]="o().breakpoints"
            [breakpoint]="o().breakpoint"
            [defaultBreakpoint]="o().defaultBreakpoint"
            [cols]="o().cols"
            [maxRows]="o().maxRows"
            [compactor]="o().compactor"
            [preventCollision]="o().preventCollision"
            [allowOverlap]="o().allowOverlap"
            [constraints]="o().constraints"
            [constraintRegistry]="o().constraintRegistry"
            [width]="o().width"
            [rowHeight]="o().rowHeight"
            [gap]="o().gap"
            [padding]="o().padding"
            [autoSize]="o().autoSize"
            [draggable]="o().draggable"
            [resizable]="o().resizable"
            [bounded]="o().bounded"
            [dir]="o().dir"
            [gridLayoutRef]="o().gridLayoutRef"
            [externalDrag]="o().externalDrag"
            [createId]="o().createId"
            (layoutChange)="o().onLayoutChange?.($event)"
            (layoutsChange)="o().onLayoutsChange?.($event)"
            (breakpointChange)="o().onBreakpointChange?.($event)"
            (dragStart)="o().onDragStart?.($event)"
            (dragMove)="o().onDragMove?.($event)"
            (dragStop)="o().onDragStop?.($event)"
            (resizeStart)="o().onResizeStart?.($event)"
            (resizeStop)="o().onResizeStop?.($event)"
            (dropped)="o().onDropped?.($event)"
            (pointerdown)="o().onPointerDown?.($event)"
        >
            <ng-template gridLayoutItems let-item>
                <div [gridLayoutItem]="item.id" [attr.aria-label]="item.id">
                    {{ item.id }}
                    <div
                        *gridLayoutResizeHandle="'bottom-end'"
                        [attr.aria-label]="'resize ' + item.id"
                    ></div>
                </div>
            </ng-template>
            <div *gridLayoutPlaceholder aria-label="placeholder"></div>
        </div>
    `,
})
export class Grid {
    readonly options = input<GridOptions>({});
    protected readonly o = computed(() => ({ ...GEOMETRY, ...this.options() }));
}
