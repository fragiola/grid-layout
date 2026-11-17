import {
    computed,
    DestroyRef,
    Directive,
    effect,
    inject,
    input,
    type OnInit,
    output,
    type Signal,
    untracked,
} from "@angular/core";
import {
    type DragSourceState,
    type DropDetails,
    type DropItem,
    dragSourcePart,
    dragSourceStatus,
    dropDetailsOf,
    type ExternalDrop,
    type GridLayoutRef,
    isDropFrom,
} from "@fragiola/grid-layout";
import { injectOptionalGridLayoutContext } from "../context";
import {
    bindPart,
    booleanInput,
    injectHost,
    listenAfter,
} from "../utils/helpers";
import { fromStore, gridOf } from "../utils/signals";

/**
 * A drag source, on the app's element anywhere on the page: `<div [gridLayoutDragSource]="{ w:
 * 2, h: 2 }">` (outside the root, with `[gridLayoutRef]`). Pressed and dragged, or Space/Enter
 * from the keyboard, it brings a new item into the grid (X1, X6); the drop runs one `item.add`.
 * A tab stop (`-1` while disabled), `touch-action: none`; `data-dragging`, `data-grabbed`,
 * `data-disabled`. Its press and keys go to the engine after the app's own listeners.
 */
@Directive({
    selector: "[gridLayoutDragSource]",
    exportAs: "gridLayoutDragSource",
})
export class GridLayoutDragSource implements OnInit {
    /** the new item's size and limits */
    readonly gridLayoutDragSource = input.required<DropItem>();
    /** the new item's id (default: the root's `createId`, else a random UUID) */
    readonly itemId = input<string | undefined>(undefined);
    /** the app's own data, told back in the gesture's events and `(dropped)` */
    readonly data = input<unknown>(undefined);
    /** where the item sits from the pointer, in pixels on screen (default: centred under it) */
    readonly dragOffset = input<ExternalDrop["dragOffset"]>(undefined);
    /** starts nothing, and is no tab stop */
    readonly disabled = input(false, { transform: booleanInput });
    /** the grid, for a source outside its root (inside one, the root around it) */
    readonly gridLayoutRef = input<GridLayoutRef | undefined>(undefined);
    /** an item from this source was added (React's `onDrop`; not the element's native `drop`) */
    readonly dropped = output<DropDetails>();

    private readonly host = injectHost();
    private readonly destroyRef = inject(DestroyRef);
    private readonly grid = gridOf(
        "[gridLayoutDragSource]",
        () => this.gridLayoutRef(),
        injectOptionalGridLayoutContext(),
    );
    /** only this source's part of the view: a gesture elsewhere changes nothing here */
    private readonly status = fromStore(
        () => this.grid()?.engine.adapter.subscribe,
        () =>
            dragSourceStatus(this.grid()?.engine.adapter.getView(), this.host),
    );
    private readonly part = computed(() => {
        this.status();
        return dragSourcePart(
            untracked(() => this.grid()?.engine.adapter.getView()),
            this.host,
            this.disabled(),
        );
    });

    /** what the source shows as `data-*` */
    readonly state: Signal<DragSourceState> = computed(() => this.part().state);

    constructor() {
        bindPart(this.host, () => this.part());
        // `(dropped)`: the drops this source started; leaving the page (or the grid going) ends
        // what it started
        effect((onCleanup) => {
            const engine = this.grid()?.engine;
            if (!engine) return;
            untracked(() => {
                const unsubscribe = engine.subscribe((event) => {
                    if (isDropFrom(event, this.host)) {
                        this.dropped.emit(dropDetailsOf(event));
                    }
                });
                onCleanup(() => {
                    unsubscribe();
                    engine.adapter.releaseSource(this.host);
                });
            });
        });
    }

    ngOnInit(): void {
        // inside a root or with a ref: a clear error as early as React's
        this.grid();
        const drop = (): ExternalDrop => ({
            item: this.gridLayoutDragSource(),
            itemId: this.itemId(),
            data: this.data(),
            dragOffset: this.dragOffset(),
        });
        const engine = () =>
            this.disabled() ? undefined : this.grid()?.engine;
        this.destroyRef.onDestroy(
            listenAfter(this.host, {
                pointerdown: (event) =>
                    engine()?.adapter.startExternalDrag(
                        event as PointerEvent,
                        this.host,
                        drop(),
                    ),
                keydown: (event) =>
                    engine()?.adapter.startExternalGrab(
                        event as KeyboardEvent,
                        this.host,
                        drop(),
                    ),
            }),
        );
    }
}
