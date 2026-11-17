import {
    computed,
    Directive,
    inject,
    type Signal,
    TemplateRef,
    ViewContainerRef,
} from "@angular/core";
import { type PlaceholderState, placeholderPart } from "@fragiola/grid-layout";
import { injectGridLayoutContext } from "../context";
import { bindPart } from "../utils/helpers";
import { type PartContext, presentView, requireTemplate } from "../utils/views";

/**
 * Where the held item would land, on the app's element: `<div *gridLayoutPlaceholder="let
 * state">`. The element is rendered only during a gesture (for a drop, only while it would land:
 * over the grid, not refused), at that box; `data-kind` tells the gesture's kind. Its look is the
 * app's.
 */
@Directive({ selector: "[gridLayoutPlaceholder]" })
export class GridLayoutPlaceholder {
    private readonly context = injectGridLayoutContext(
        "[gridLayoutPlaceholder]",
    );
    private readonly part = computed(() =>
        placeholderPart(this.context.view()),
    );

    /** the placeholder's state, `undefined` while there is none */
    readonly state: Signal<PlaceholderState | undefined> = computed(
        () => this.part()?.state,
    );

    constructor() {
        const template = requireTemplate(
            inject<TemplateRef<PartContext<PlaceholderState>>>(TemplateRef, {
                optional: true,
            }),
            "[gridLayoutPlaceholder]",
            '<div *gridLayoutPlaceholder="let state">',
        );
        const element = presentView(
            "[gridLayoutPlaceholder]",
            inject(ViewContainerRef),
            template,
            () => {
                const state = this.state();
                return state && { $implicit: state, state };
            },
        );
        bindPart(element, () => this.part());
    }

    static ngTemplateContextGuard(
        _directive: GridLayoutPlaceholder,
        _context: unknown,
    ): _context is PartContext<PlaceholderState> {
        return true;
    }
}
