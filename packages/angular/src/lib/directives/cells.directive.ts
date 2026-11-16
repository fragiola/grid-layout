import {
    Directive,
    effect,
    inject,
    input,
    TemplateRef,
    ViewContainerRef,
} from "@angular/core";
import type { CellRows, CellState } from "@fragiola/grid-layout";
import { injectGridLayoutContext } from "../context";
import { PartWriter } from "../utils/helpers";
import { cellsOf } from "../utils/signals";
import { elementOf, KeyedViews, requireTemplate } from "../utils/views";

/** The context of the `[gridLayoutCells]` template. */
export interface CellsContext {
    /** the cell: its column and row (`let-cell`) */
    $implicit: CellState;
    /** the same cell (`let-cell="cell"`) */
    cell: CellState;
}

/** A `rows` input that takes a bare attribute or an attribute's string. */
function rowsInput(value: unknown): CellRows | undefined {
    if (value === undefined || value === null || value === "") return undefined;
    if (value === "auto") return "auto";
    return typeof value === "number" ? value : Number(value);
}

/**
 * The grid's cells (K6), cells of the developer's element: `<div *gridLayoutCells="let cell">`
 * (`; rows: 4`, default `auto`: the layout's bottom, the preview's during a gesture, plus one)
 * renders its element once per cell, row by row, placed as a 1 × 1 item there: a background the
 * app draws. `data-x`, `data-y`; structural position only. None before the root is measured.
 */
@Directive({ selector: "[gridLayoutCells]" })
export class GridLayoutCells {
    /** how many rows: a number, or `auto` (default) */
    readonly gridLayoutCellsRows = input(undefined, { transform: rowsInput });

    private readonly context = injectGridLayoutContext("[gridLayoutCells]");

    /** every cell as the core places it, made again only when the cells move */
    readonly cells = cellsOf(this.context, () => this.gridLayoutCellsRows());

    constructor() {
        const template = requireTemplate(
            inject<TemplateRef<CellsContext>>(TemplateRef, { optional: true }),
            "[gridLayoutCells]",
            '<div *gridLayoutCells="let cell">',
        );
        const views = new KeyedViews(inject(ViewContainerRef), template);
        const writers = new Map<string, PartWriter>();
        effect(() => {
            const parts = new Map(
                this.cells().map((cell) => [
                    `${cell.state.x},${cell.state.y}`,
                    cell,
                ]),
            );
            views.sync(
                [...parts].map(([key, cell]) => ({
                    key,
                    context: { $implicit: cell.state, cell: cell.state },
                })),
            );
            // each cell's element gets its part (a view kept keeps its writer)
            for (const [key, view] of views.entries()) {
                const element = elementOf(view, "[gridLayoutCells]");
                let writer = writers.get(key);
                if (writer?.element !== element) {
                    writer = new PartWriter(element);
                    writers.set(key, writer);
                }
                const part = parts.get(key);
                if (part) writer.write(part);
            }
            for (const key of writers.keys()) {
                if (!parts.has(key)) writers.delete(key);
            }
        });
    }

    static ngTemplateContextGuard(
        _directive: GridLayoutCells,
        _context: unknown,
    ): _context is CellsContext {
        return true;
    }
}
