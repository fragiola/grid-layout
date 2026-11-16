import {
    computed,
    Directive,
    effect,
    forwardRef,
    input,
    type Signal,
    untracked,
} from "@angular/core";
import { type ItemState, itemPart } from "@fragiola/grid-layout";
import {
    GRID_LAYOUT_ITEM,
    type GridLayoutItemContext,
    injectGridLayoutContext,
} from "../context";
import { beforeInputs, bindPart, injectHost } from "../utils/helpers";

/** An item's state before its id is set (see `beforeInputs`). */
const UNSET_ITEM_STATE: ItemState = {
    itemId: "",
    item: undefined,
    dragging: false,
    resizing: false,
    grabbed: false,
    outside: false,
    static: false,
    draggable: false,
    resizable: false,
    handled: false,
    placed: false,
};

/**
 * An item, on the app's element: `<div [gridLayoutItem]="item.id">`. Placed at its box (a
 * structural `transform`), a tab stop (unless it has a drag handle), dragged from its body; its
 * state in `data-*`. During a pointer gesture its geometry is the engine's: the directive writes
 * none of it until the gesture ends (D8).
 */
@Directive({
    selector: "[gridLayoutItem]",
    exportAs: "gridLayoutItem",
    providers: [
        {
            provide: GRID_LAYOUT_ITEM,
            useExisting: forwardRef(() => GridLayoutItem),
        },
    ],
})
export class GridLayoutItem implements GridLayoutItemContext {
    /** the item's id in the layout */
    readonly gridLayoutItem = input.required<string>();

    private readonly context = injectGridLayoutContext("[gridLayoutItem]");
    private readonly host = injectHost();

    readonly itemId: Signal<string> = computed(() => this.gridLayoutItem());

    private readonly part = computed(() =>
        itemPart(this.context.view(), this.gridLayoutItem()),
    );

    /** what the item shows as `data-*` */
    readonly state: Signal<ItemState> = computed(() =>
        beforeInputs(UNSET_ITEM_STATE, () => this.part().state),
    );

    constructor() {
        bindPart(this.host, () => this.part());
        // registered while it lives, again when its id changes
        effect((onCleanup) => {
            const itemId = this.gridLayoutItem();
            const { engine } = this.context.handle();
            untracked(() =>
                onCleanup(engine.adapter.registerItem(itemId, this.host)),
            );
        });
    }
}
