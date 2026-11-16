// From Dockable (fragiola/dockable, packages/angular/src/lib/utils/views.ts), same author and licence.
// The views a template directive renders: one per key (an item, a cell), or one while a part is
// present (the placeholder, a resize handle, the drag preview), with a context whose fields are
// signals, and the element each view's template puts on the page.

import {
    type EmbeddedViewRef,
    effect,
    type Signal,
    signal,
    type TemplateRef,
    untracked,
    type ViewContainerRef,
    type WritableSignal,
} from "@angular/core";

/**
 * A template context whose fields are signals behind getters: a view reads them while it renders,
 * so setting a field renders that view again, and nothing else.
 */
export class SignalContext<V extends object> {
    private readonly fields: { [K in keyof V]: WritableSignal<V[K]> };

    constructor(initial: V) {
        const fields = {} as { [K in keyof V]: WritableSignal<V[K]> };
        for (const key of Object.keys(initial) as (keyof V)[]) {
            fields[key] = signal(initial[key]);
            Object.defineProperty(this, key, {
                enumerable: true,
                get: () => fields[key](),
            });
        }
        this.fields = fields;
    }

    /** Sets the fields that changed. */
    update(next: V): void {
        for (const key of Object.keys(next) as (keyof V)[]) {
            const field = this.fields[key];
            if (!Object.is(untracked(field), next[key])) {
                field.set(next[key]);
            }
        }
    }
}

/** A {@link SignalContext}, seen as the context type its template declares. */
export function signalContext<V extends object>(
    initial: V,
): SignalContext<V> & V {
    return new SignalContext(initial) as SignalContext<V> & V;
}

/** The context of a part template present only at times: its state (`let-state`). */
export interface PartContext<S> {
    /** the part's state (`let-state`) */
    $implicit: S;
    /** the same state (`let-state="state"`) */
    state: S;
}

/** A view of a template whose context is a {@link SignalContext}. */
export type ContextView<V extends object> = EmbeddedViewRef<
    SignalContext<V> & V
>;

/** Creates a view of `template` at `index` of `container`, its context made from `context`. */
export function createView<V extends object>(
    container: ViewContainerRef,
    template: TemplateRef<V>,
    context: V,
    index?: number,
): ContextView<V> {
    return container.createEmbeddedView(
        template as unknown as TemplateRef<SignalContext<V> & V>,
        signalContext(context),
        index === undefined ? undefined : { index },
    );
}

/** An entry of {@link KeyedViews.sync}: a key, and the context its view renders with. */
export interface KeyedItem<V extends object> {
    readonly key: string;
    readonly context: V;
}

/**
 * The views of a container, one per key, in the order of the last `sync`: a key that stays keeps
 * its view (moved when its place changed, its context updated), a new key creates one, a key that
 * goes destroys its view. As a keyed `@for`.
 */
export class KeyedViews<V extends object> {
    private readonly views = new Map<string, ContextView<V>>();

    constructor(
        private readonly container: ViewContainerRef,
        private readonly template: TemplateRef<V>,
    ) {}

    /** Syncs the views with `items`; `created` is told each new view. */
    sync(
        items: readonly KeyedItem<V>[],
        created?: (key: string, view: ContextView<V>) => void,
    ): void {
        untracked(() => {
            const keep = new Set(items.map((item) => item.key));
            for (const [key, view] of this.views) {
                if (!keep.has(key)) {
                    view.destroy();
                    this.views.delete(key);
                }
            }
            items.forEach((item, index) => {
                let view = this.views.get(item.key);
                if (!view) {
                    view = createView(
                        this.container,
                        this.template,
                        item.context,
                        index,
                    );
                    this.views.set(item.key, view);
                    created?.(item.key, view);
                    return;
                }
                if (this.container.indexOf(view) !== index) {
                    this.container.move(view, index);
                }
                view.context.update(item.context);
            });
        });
    }

    /** Every view, by key. */
    entries(): IterableIterator<[string, ContextView<V>]> {
        return this.views.entries();
    }
}

/**
 * The element a view's template puts on the page: its first root element. A part template
 * directive (`*gridLayoutPlaceholder`) writes the part onto it, as React merges its props into
 * the element it renders.
 */
export function elementOf(
    view: EmbeddedViewRef<unknown>,
    part: string,
): HTMLElement {
    const element = (view.rootNodes as Node[]).find(
        (node): node is HTMLElement => node.nodeType === 1,
    );
    if (!element) {
        throw new Error(`${part}: its template must hold an element`);
    }
    return element;
}

/**
 * One view of `template` while `context()` gives one (a part that is present only at times: the
 * placeholder, a resize handle, the drag preview): created when it appears, its context updated
 * while it stays, destroyed when it goes. Returns the element the view puts on the page.
 */
export function presentView<V extends object>(
    part: string,
    container: ViewContainerRef,
    template: TemplateRef<V>,
    context: () => V | undefined,
): Signal<HTMLElement | null> {
    const element = signal<HTMLElement | null>(null);
    let view: ContextView<V> | undefined;
    effect(() => {
        const next = context();
        untracked(() => {
            if (next === undefined) {
                view?.destroy();
                view = undefined;
                element.set(null);
                return;
            }
            if (view) {
                view.context.update(next);
                return;
            }
            view = createView(container, template, next);
            element.set(elementOf(view, part));
        });
    });
    return element.asReadonly();
}

/** The template of a part directive, or a clear error when it is put on an element. */
export function requireTemplate<V>(
    template: TemplateRef<V> | null,
    part: string,
    usage: string,
): TemplateRef<V> {
    if (!template) {
        throw new Error(`${part} goes on an ng-template: ${usage}`);
    }
    return template;
}
