import {
    computed,
    Directive,
    effect,
    inject,
    input,
    type OnInit,
    type Signal,
    TemplateRef,
    untracked,
    ViewContainerRef,
} from "@angular/core";
import {
    type DragPreviewState,
    dragPreviewPart,
    type GridLayoutRef,
} from "@fragiola/grid-layout";
import { injectOptionalGridLayoutContext } from "../context";
import { bindPart } from "../utils/helpers";
import { gridOf, requireRootOrRef, viewOf } from "../utils/signals";
import { type PartContext, presentView, requireTemplate } from "../utils/views";

/** A `gridLayoutRef` input that takes a bare attribute as none. */
function optionalRef(value: unknown): GridLayoutRef | undefined {
    return value === "" || value === null || value === undefined
        ? undefined
        : (value as GridLayoutRef);
}

/**
 * What follows the pointer while it brings a new item, on the app's element: `<div
 * *gridLayoutDragPreview="let state">` inside the root, or `*gridLayoutDragPreview="gridLayoutRef;
 * let state"` anywhere. The element is rendered only during a pointer drop, `position: fixed` and
 * kept at the pointer by the engine (its `transform`); `data-over`, `data-drop-refused`. What it
 * shows is the app's, from its state (the drop's `data`).
 */
@Directive({ selector: "[gridLayoutDragPreview]" })
export class GridLayoutDragPreview implements OnInit {
    /** the grid, for a preview outside its root (inside one, the root around it) */
    readonly gridLayoutDragPreview = input(undefined, {
        transform: optionalRef,
    });

    private readonly around = injectOptionalGridLayoutContext();
    private readonly grid = gridOf(
        () => this.gridLayoutDragPreview(),
        this.around,
    );
    private readonly view = viewOf(this.grid);
    private readonly part = computed(() => dragPreviewPart(this.view()));

    /** the preview's state, `undefined` while no pointer brings an item */
    readonly state: Signal<DragPreviewState | undefined> = computed(
        () => this.part()?.state,
    );

    constructor() {
        const template = requireTemplate(
            inject<TemplateRef<PartContext<DragPreviewState>>>(TemplateRef, {
                optional: true,
            }),
            "[gridLayoutDragPreview]",
            '<div *gridLayoutDragPreview="let state">',
        );
        const element = presentView(
            "[gridLayoutDragPreview]",
            inject(ViewContainerRef),
            template,
            () => {
                const state = this.state();
                return state && { $implicit: state, state };
            },
        );
        bindPart(element, () => this.part());
        // the engine keeps the element at the pointer while it is rendered
        effect((onCleanup) => {
            const target = element();
            const engine = this.grid()?.engine;
            if (!target || !engine) return;
            untracked(() =>
                onCleanup(engine.adapter.registerDragPreview(target)),
            );
        });
    }

    ngOnInit(): void {
        // inside a root or with a ref: a clear error as early as React's, once the inputs are set
        requireRootOrRef(
            "[gridLayoutDragPreview]",
            this.gridLayoutDragPreview(),
            this.around,
        );
    }

    static ngTemplateContextGuard(
        _directive: GridLayoutDragPreview,
        _context: unknown,
    ): _context is PartContext<DragPreviewState> {
        return true;
    }
}
