import {
    Directive,
    effect,
    inject,
    TemplateRef,
    ViewContainerRef,
} from "@angular/core";
import type { LayoutItem } from "@fragiola/grid-layout";
import { injectGridLayoutContext } from "../context";
import { KeyedViews } from "../utils/views";

/** The context of the `[gridLayoutItems]` template. */
export interface ItemsContext {
    /** the item (`let-item`) */
    $implicit: LayoutItem;
    /** the same item (`let-item="item"`) */
    item: LayoutItem;
}

/**
 * The committed layout's items, in order: `<ng-template gridLayoutItems let-item><div
 * [gridLayoutItem]="item.id">…</div></ng-template>` (or `*gridLayoutItems="let item"`) renders
 * the template once per item, keyed by its id: the developer owns the recursion (D4). Nothing
 * renders until the root's width is known (or given): an item then mounts already in place, so an
 * app's transition never animates it in from the corner. It renders no element of its own.
 */
@Directive({ selector: "[gridLayoutItems]" })
export class GridLayoutItems {
    private readonly template = inject<TemplateRef<ItemsContext>>(TemplateRef, {
        optional: true,
    });

    constructor() {
        const context = injectGridLayoutContext("[gridLayoutItems]");
        if (!this.template) {
            throw new Error(
                "[gridLayoutItems] goes on an ng-template: <ng-template gridLayoutItems let-item>",
            );
        }
        const views = new KeyedViews(inject(ViewContainerRef), this.template);
        effect(() => {
            const view = context.view();
            const items = view.geometry ? view.layout : [];
            views.sync(
                items.map((item) => ({
                    key: item.id,
                    context: { $implicit: item, item },
                })),
            );
        });
    }

    static ngTemplateContextGuard(
        _directive: GridLayoutItems,
        _context: unknown,
    ): _context is ItemsContext {
        return true;
    }
}
