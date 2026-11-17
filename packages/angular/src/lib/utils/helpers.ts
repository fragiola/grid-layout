// From Dockable (fragiola/dockable, packages/angular/src/lib/utils/helpers.ts), same author and licence.
// What the directives share: the host element, the boolean inputs, the reads before the inputs are
// set, the listeners that run after the app's own, and how a core part is written onto an element.
// Unlike Dockable's `bindStructuralStyle`, a part's style is compared with what the directive wrote
// last, never with the element: during a gesture the engine writes the held item's geometry itself,
// and Angular must not write it back (D8).

import {
    DestroyRef,
    ElementRef,
    effect,
    inject,
    type Signal,
    untracked,
} from "@angular/core";
import type { StructuralStyle } from "@fragiola/grid-layout";

/** The host element of the directive being created. */
export function injectHost(): HTMLElement {
    return inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
}

/** Runs `teardown` when the directive (or component) being created is destroyed. */
export function onDestroy(teardown: () => void): void {
    inject(DestroyRef).onDestroy(teardown);
}

/** `true` for a bare attribute (`<div gridLayoutRoot autoSize>`), else the value as a boolean. */
export function booleanInput(value: unknown): boolean {
    return value === "" || (value !== "false" && Boolean(value));
}

/** Like {@link booleanInput}, keeping `undefined` (the core's default). */
export function optionalBoolean(value: unknown): boolean | undefined {
    return value === undefined || value === null
        ? undefined
        : booleanInput(value);
}

/** An id input that takes a bare attribute (`<span gridLayoutDragHandle>`) as no id. */
export function optionalId(value: unknown): string | undefined {
    return value === undefined || value === null || value === ""
        ? undefined
        : String(value);
}

/**
 * What `read` returns, or `fallback` while a required input it reads is not set yet. A part's
 * `state()` is read by bindings on its own element (`[class.held]="item.state().dragging"`), and
 * Angular applies an element's class and style bindings before it sets its directives' inputs: on
 * the first pass the input throws (NG0950). The read still tracks the input, so the computed that
 * calls this runs again once the input is set.
 */
export function beforeInputs<V>(fallback: V, read: () => V): V {
    try {
        return read();
    } catch (error) {
        if ((error as { code?: unknown } | null)?.code === -950)
            return fallback;
        throw error;
    }
}

/** A native listener per event, removed with the directive. */
export type Listeners = Readonly<Record<string, (event: Event) => void>>;

/**
 * Listens to `element` natively, after the app's own listeners: Angular registers a template's
 * `(pointerdown)` on the element as it creates it, before the directive's first `ngOnInit`, where
 * this is called. So the app's handler runs first and its `preventDefault` vetoes what the
 * engine would start (D4). Returns the remover.
 */
export function listenAfter(
    element: HTMLElement,
    listeners: Listeners,
): () => void {
    for (const [type, listener] of Object.entries(listeners)) {
        element.addEventListener(type, listener);
    }
    return () => {
        for (const [type, listener] of Object.entries(listeners)) {
            element.removeEventListener(type, listener);
        }
    };
}

const kebab = (key: string) =>
    key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

/** The core's structural style as CSS declarations: a number is in pixels, except `z-index`. */
export function cssOf(style: StructuralStyle): Map<string, string> {
    const out = new Map<string, string>();
    for (const [key, value] of Object.entries(style)) {
        if (value === undefined) continue;
        out.set(
            kebab(key),
            typeof value === "number" && key !== "zIndex"
                ? `${value}px`
                : String(value),
        );
    }
    return out;
}

/** What a writer puts on an element: a part's attributes and style, and the tab stop if any. */
export interface WrittenPart {
    readonly attributes: Readonly<Record<string, string>>;
    readonly style: StructuralStyle;
    readonly tabIndex?: number;
}

/**
 * Writes a part onto an element, and keeps it written as it changes: an attribute or a style key
 * is written only when its value differs from the one written last (the engine's own writes stay
 * untouched until the part's value changes), an attribute the part drops is removed, and a style
 * key it drops gets the app's own value back. The structural keys win over the app's static
 * `style`: they are written after the element is created. Every other attribute and key is the
 * app's, and so is a `tabindex` the app gives the element itself.
 */
export class PartWriter {
    private readonly attributes = new Map<string, string>();
    private readonly styles = new Map<string, string>();
    /** the app's value of each key the part took */
    private readonly originals = new Map<string, string>();

    constructor(readonly element: HTMLElement) {}

    write(part: WrittenPart): void {
        const element = this.element;
        const attributes = new Map(Object.entries(part.attributes));
        if (part.tabIndex !== undefined && !this.appTabIndex()) {
            attributes.set("tabindex", String(part.tabIndex));
        }
        for (const name of this.attributes.keys()) {
            if (!attributes.has(name)) {
                element.removeAttribute(name);
                this.attributes.delete(name);
            }
        }
        for (const [name, value] of attributes) {
            if (this.attributes.get(name) !== value) {
                element.setAttribute(name, value);
                this.attributes.set(name, value);
            }
        }
        const styles = cssOf(part.style);
        for (const name of this.styles.keys()) {
            if (!styles.has(name)) {
                this.restore(name);
                this.styles.delete(name);
            }
        }
        for (const [name, value] of styles) {
            if (!this.originals.has(name)) {
                this.originals.set(name, element.style.getPropertyValue(name));
            }
            if (this.styles.get(name) !== value) {
                element.style.setProperty(name, value);
                this.styles.set(name, value);
            }
        }
    }

    /**
     * Whether the element's `tabindex` is the app's (`tabindex="-1"`, `[attr.tabindex]`): one the
     * writer did not write. The app's wins, as its props do in React and its attributes in Vue;
     * the writer then forgets its own, and never removes the app's.
     */
    private appTabIndex(): boolean {
        const current = this.element.getAttribute("tabindex");
        if (current === null || current === this.attributes.get("tabindex"))
            return false;
        this.attributes.delete("tabindex");
        return true;
    }

    /** Takes everything written off the element: the attributes go, the app's style comes back. */
    clear(): void {
        for (const name of this.attributes.keys()) {
            this.element.removeAttribute(name);
        }
        this.attributes.clear();
        for (const name of this.styles.keys()) this.restore(name);
        this.styles.clear();
    }

    private restore(name: string): void {
        const previous = this.originals.get(name) ?? "";
        this.originals.delete(name);
        if (previous === "") this.element.style.removeProperty(name);
        else this.element.style.setProperty(name, previous);
    }
}

/**
 * Writes `part()` onto `element()` for as long as the directive lives, again whenever it changes
 * (nothing while it is `undefined`); a new element starts afresh, and the old one is cleared.
 */
export function bindPart(
    element: Signal<HTMLElement | null> | HTMLElement,
    part: () => WrittenPart | undefined,
): void {
    let writer: PartWriter | undefined;
    effect(() => {
        const target = typeof element === "function" ? element() : element;
        const next = part();
        untracked(() => {
            if (writer && writer.element !== target) {
                writer.clear();
                writer = undefined;
            }
            if (!target) return;
            writer ??= new PartWriter(target);
            if (next) writer.write(next);
            else writer.clear();
        });
    });
}
