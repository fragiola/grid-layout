import {
    computed,
    Directive,
    effect,
    input,
    type OnInit,
    type Signal,
    untracked,
} from "@angular/core";
import { type DragHandleState, dragHandlePart } from "@fragiola/grid-layout";
import {
    injectGridLayoutContext,
    injectHandleItemId,
    requireHandleItemId,
} from "../context";
import { bindPart, injectHost, optionalId } from "../utils/helpers";

/** A drag handle's state before its item is known (see `injectHandleItemId`). */
const UNSET_HANDLE_STATE: DragHandleState = {
    itemId: "",
    dragging: false,
    grabbed: false,
    draggable: false,
};

/**
 * A drag handle, on the app's element: `<button gridLayoutDragHandle>` inside an item (or
 * `[gridLayoutDragHandle]="itemId"` elsewhere). Once there is one, it is the only place its item
 * drags from, and the item's tab stop; `touch-action: none`.
 */
@Directive({
    selector: "[gridLayoutDragHandle]",
    exportAs: "gridLayoutDragHandle",
})
export class GridLayoutDragHandle implements OnInit {
    /** the item it drags (default: the item it is inside of) */
    readonly gridLayoutDragHandle = input(undefined, { transform: optionalId });

    private readonly context = injectGridLayoutContext(
        "[gridLayoutDragHandle]",
    );
    private readonly host = injectHost();
    private readonly itemId = injectHandleItemId(() =>
        this.gridLayoutDragHandle(),
    );

    private readonly part = computed(() => {
        const itemId = this.itemId();
        return itemId === undefined
            ? undefined
            : dragHandlePart(this.context.view(), itemId);
    });

    /** what the handle shows as `data-*` */
    readonly state: Signal<DragHandleState> = computed(
        () => this.part()?.state ?? UNSET_HANDLE_STATE,
    );

    constructor() {
        bindPart(this.host, () => this.part());
        effect((onCleanup) => {
            const itemId = this.itemId();
            if (itemId === undefined) return;
            const { engine } = this.context.handle();
            untracked(() =>
                onCleanup(engine.adapter.registerDragHandle(itemId, this.host)),
            );
        });
    }

    ngOnInit(): void {
        // as early as React's: with its first inputs, not at the first render
        requireHandleItemId("[gridLayoutDragHandle]", this.itemId());
    }
}
