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
    type ResizeHandleState,
    type ResizeSide,
    resizeHandlePart,
} from "@fragiola/grid-layout";
import {
    injectGridLayoutContext,
    injectHandleItemId,
    requireHandleItemId,
} from "../context";
import { beforeInputs, bindPart, optionalId } from "../utils/helpers";
import { type PartContext, presentView, requireTemplate } from "../utils/views";

/** A resize handle's state before its side is set (see `beforeInputs`). */
const UNSET_RESIZE_STATE: ResizeHandleState = {
    itemId: "",
    side: "bottom-end",
    resizing: false,
    resizable: false,
};

/**
 * A side or corner its item is resized from, on the app's element: `<div
 * *gridLayoutResizeHandle="'bottom-end'">` inside an item (`; itemId: id` names another). The
 * element is rendered only while its item can be resized; `data-side`, `data-resizing`,
 * `touch-action: none`. Where it sits and how it looks are the app's.
 */
@Directive({ selector: "[gridLayoutResizeHandle]" })
export class GridLayoutResizeHandle implements OnInit {
    /** the side or corner it pulls */
    readonly gridLayoutResizeHandle = input.required<ResizeSide>();
    /** the item it resizes (default: the item it is inside of) */
    readonly gridLayoutResizeHandleItemId = input(undefined, {
        transform: optionalId,
    });

    private readonly context = injectGridLayoutContext(
        "[gridLayoutResizeHandle]",
    );
    private readonly itemId = injectHandleItemId(() =>
        this.gridLayoutResizeHandleItemId(),
    );
    private readonly part = computed(() => {
        const itemId = this.itemId();
        return itemId === undefined
            ? undefined
            : resizeHandlePart(
                  this.context.view(),
                  itemId,
                  this.gridLayoutResizeHandle(),
              );
    });

    /** what the handle shows as `data-*`; `resizable` false: it renders nothing */
    readonly state: Signal<ResizeHandleState> = computed(() =>
        beforeInputs(
            UNSET_RESIZE_STATE,
            () => this.part()?.state ?? UNSET_RESIZE_STATE,
        ),
    );

    constructor() {
        const template = requireTemplate(
            inject<TemplateRef<PartContext<ResizeHandleState>>>(TemplateRef, {
                optional: true,
            }),
            "[gridLayoutResizeHandle]",
            "<div *gridLayoutResizeHandle=\"'bottom-end'\">",
        );
        const element = presentView(
            "[gridLayoutResizeHandle]",
            inject(ViewContainerRef),
            template,
            () => {
                const state = this.part()?.state;
                return state?.resizable
                    ? { $implicit: state, state }
                    : undefined;
            },
        );
        bindPart(element, () => this.part());
        // registered while it is rendered, again when its item or its side changes
        effect((onCleanup) => {
            const target = element();
            if (!target) return;
            const itemId = this.itemId();
            if (itemId === undefined) return;
            const side = this.gridLayoutResizeHandle();
            const { engine } = this.context.handle();
            untracked(() =>
                onCleanup(
                    engine.adapter.registerResizeHandle(itemId, side, target),
                ),
            );
        });
    }

    ngOnInit(): void {
        // as early as React's: with its first inputs, not at the first render
        requireHandleItemId("[gridLayoutResizeHandle]", this.itemId());
    }

    static ngTemplateContextGuard(
        _directive: GridLayoutResizeHandle,
        _context: unknown,
    ): _context is PartContext<ResizeHandleState> {
        return true;
    }
}
