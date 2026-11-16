// From Dockable (fragiola/dockable, packages/vue/src/utils/render.ts), same author and licence.
// How a primitive renders its element in Vue (D4): the consumer's attributes merged over the
// primitive's (listeners composed, internal first, the engine's last), structural style winning,
// `as` or the `render` scoped slot replacing the element; and the reactive reads an adapter needs.

import type { StructuralStyle } from "@fragiola/grid-layout";
import {
    type Component,
    type ComputedRef,
    type CSSProperties,
    camelize,
    computed,
    type FunctionalComponent,
    h,
    mergeProps,
    normalizeStyle,
    type Slot,
    shallowRef,
    type VNode,
    type VNodeChild,
    watchEffect,
} from "vue";

/** The core's structural style as a Vue style: Vue, unlike React, adds no unit to a number. */
export function toStyle(style: StructuralStyle): CSSProperties {
    const out: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(style)) {
        if (value === undefined) continue;
        out[key] =
            typeof value === "number" && key !== "zIndex"
                ? `${value}px`
                : value;
    }
    return out as CSSProperties;
}

/** The element behind a template ref: the element itself, or a component's root element. */
export function toElement(value: unknown): HTMLElement | null {
    if (value === null || typeof value !== "object") {
        return null;
    }
    // `nodeType`, not `instanceof HTMLElement`: an element may belong to another window
    if ((value as { nodeType?: unknown }).nodeType === 1) {
        return value as HTMLElement;
    }
    const root = (value as { $el?: unknown }).$el;
    return root !== null &&
        typeof root === "object" &&
        (root as { nodeType?: unknown }).nodeType === 1
        ? (root as HTMLElement)
        : null;
}

/** A function template ref, as a primitive puts it on its element. */
export type ElementRef = (value: unknown) => void;

/**
 * A function template ref that calls `attach` with the element once it is mounted, and the
 * cleanup it returns when the element goes away or `deps` change (then `attach` runs again). Vue
 * calls a function ref on every patch; only a change reaches `attach`.
 */
export function elementRef(
    attach: (element: HTMLElement) => (() => void) | undefined,
    deps: () => readonly unknown[] = () => [],
): ElementRef {
    let current: HTMLElement | null = null;
    let currentDeps: readonly unknown[] = [];
    let cleanup: (() => void) | undefined;
    return (value: unknown) => {
        const element = toElement(value);
        const next = element ? deps() : [];
        if (
            element === current &&
            next.length === currentDeps.length &&
            next.every((dep, i) => Object.is(dep, currentDeps[i]))
        ) {
            return;
        }
        cleanup?.();
        cleanup = undefined;
        current = element;
        currentDeps = next;
        if (element) {
            cleanup = attach(element);
        }
    };
}

/** A subscription: calls its listener on each change, returns the remover. */
export type Subscribe = (listener: () => void) => () => void;

/**
 * A value read from an external store, as a computed ref: it re-reads `getSnapshot` whenever the
 * store notifies (and whenever a reactive value it reads changes), and triggers its readers only
 * when the value changes. `subscribe` is read reactively (`undefined`: nothing to follow yet), so
 * the store it follows may change; the subscription ends with the component.
 */
export function useExternal<S>(
    subscribe: () => Subscribe | undefined,
    getSnapshot: () => S,
): ComputedRef<S> {
    const tick = shallowRef(0);
    watchEffect(
        (onCleanup) => {
            const each = subscribe();
            if (!each) return;
            onCleanup(
                each(() => {
                    tick.value++;
                }),
            );
        },
        { flush: "sync" },
    );
    return computed(() => {
        tick.value;
        return getSnapshot();
    });
}

/** A component (or a tag) a primitive renders instead of its own element: the `as` prop. */
export type AsProp = string | Component;

/** What a primitive's `render` scoped slot receives. */
export interface RenderSlotProps<State> {
    /**
     * what goes on your element (`v-bind="props"`): the primitive's `data-*`, listeners, its
     * structural style merged over your `class`/`style`, and its template ref
     */
    props: Record<string, unknown>;
    /** the primitive's state */
    state: State;
    /**
     * the primitive's content, as a node of one stable component (`<component :is="children" />`,
     * or `h(children)`): its type never changes between renders, so the content never remounts
     */
    children: VNode;
}

/** Renders a primitive's content inside its `render` slot: one component type for every render. */
const PrimitiveChildren: FunctionalComponent<{
    content?: (() => VNodeChild) | undefined;
}> = (props) => props.content?.();
PrimitiveChildren.props = ["content"];

/** The slots every primitive accepts: `render` replaces its element. */
export interface RenderSlot<State> {
    /** replaces the rendered element (never `asChild`): bind `props` on your own element */
    render?: (scope: RenderSlotProps<State>) => VNode[];
}

interface RenderOptions<State> {
    /** the element rendered by default */
    tag: string;
    /** the consumer's `as` prop */
    as?: AsProp | undefined;
    /** the consumer's fallthrough attributes: `class`, `style`, listeners, `aria-*`, … */
    attrs: Record<string, unknown>;
    /** the consumer's `render` slot */
    render?: Slot | undefined;
    state: State;
    /** the primitive's own props: `data-*`, `tabindex`, listeners */
    props: Record<string, unknown>;
    /** the primitive's template ref */
    ref?: ElementRef | undefined;
    /** structural style: always wins over the consumer's */
    style?: CSSProperties | undefined;
    /** style keys the consumer may not set (the engine writes them) */
    reserved?: readonly string[] | undefined;
    /**
     * listeners that run last, after the consumer's (the grid's keys and presses, which
     * `preventDefault` before them cancels)
     */
    after?: Record<string, unknown> | undefined;
    /** the primitive's content */
    children?: (() => VNodeChild) | undefined;
}

/**
 * Renders a primitive's element: merges the consumer's attributes over the primitive's
 * (listeners composed, internal first, `after` last; classes joined; structural style keys win),
 * puts the primitive's template ref on it, and applies `as` or the `render` slot.
 */
export function renderElement<State>(
    options: RenderOptions<State>,
): VNodeChild {
    const { attrs, state, children } = options;
    const { style: consumerStyle, ...external } = attrs;
    const merged = options.after
        ? mergeProps(options.props, external, options.after)
        : mergeProps(options.props, external);
    const ownStyle = styleObject(consumerStyle);
    for (const key of options.reserved ?? []) {
        delete ownStyle[key];
    }
    // structural keys win, an undefined one included (it removes the consumer's, as in React)
    const style: Record<string, unknown> = { ...ownStyle, ...options.style };
    for (const [key, value] of Object.entries(style)) {
        if (value === undefined) {
            delete style[key];
        }
    }
    if (Object.keys(style).length > 0) {
        merged.style = style;
    }
    if (options.ref) {
        merged.ref = options.ref;
    }
    if (options.render) {
        return options.render({
            props: merged,
            state,
            children: h(PrimitiveChildren, { content: children }),
        } satisfies RenderSlotProps<State>);
    }
    const as = options.as ?? options.tag;
    if (typeof as === "string") {
        return h(as, merged, children ? [children()] : undefined);
    }
    return h(as, merged, children ? { default: children } : undefined);
}

/**
 * A consumer's `style` (an object, an array or a CSS string) as one object with camelCase keys
 * (custom properties kept), so the structural keys can win over it.
 */
export function styleObject(style: unknown): Record<string, unknown> {
    const normalized = normalizeStyle(style);
    const result: Record<string, unknown> = {};
    if (typeof normalized === "string") {
        for (const declaration of normalized.split(/;(?![^(]*\))/g)) {
            const index = declaration.indexOf(":");
            if (index > 0) {
                const name = declaration.slice(0, index).trim();
                result[name.startsWith("--") ? name : camelize(name)] =
                    declaration.slice(index + 1).trim();
            }
        }
    } else if (normalized) {
        for (const [name, value] of Object.entries(normalized)) {
            result[name.startsWith("--") ? name : camelize(name)] = value;
        }
    }
    return result;
}
