// The root: one grid layout. It creates the model and the engine once, renders the view, maps the
// declarative props onto commands (D3) and tells the app what changed (D9). Every decision is the
// core's root binding; this component calls its steps where Vue runs code after a render.

import {
    attachGridLayoutRef,
    createGridLayoutRootBinding,
    type GridLayoutRef,
    type GridLayoutRootOptions,
    type Layout,
    type RootState,
    rootPart,
} from "@fragiola/grid-layout";
import {
    computed,
    getCurrentInstance,
    onBeforeUnmount,
    onMounted,
    onUpdated,
    provide,
    toRaw,
} from "vue";
import { GridLayoutKey, ViewKey } from "../context";
import {
    definePrimitive,
    type GridLayoutComponent,
    type PrimitiveProps,
    type SlotFunction,
} from "../utils/primitive";
import {
    elementRef,
    type RenderSlot,
    renderElement,
    toStyle,
    useExternal,
} from "../utils/render";

export type { RootState };

/**
 * `GridLayout.Root`'s props: React's, with Vue's names for the callbacks a parent listens to.
 * `v-model:layout` and `v-model:layouts` pair the controlled props with `update:layout` and
 * `update:layouts`; `@layout-change` gives both, as React's `onLayoutChange`.
 */
export interface RootProps extends PrimitiveProps, GridLayoutRootOptions {
    /**
     * the grid, reachable from outside the root: its `current` is `{ model, engine }` while this
     * root is mounted (from `useGridLayoutRef()` or `createGridLayoutRef()`)
     */
    gridLayoutRef?: GridLayoutRef | undefined;
    /** `v-model:layout`: the active breakpoint's layout changed (once per committed change) */
    "onUpdate:layout"?: ((layout: Layout) => void) | undefined;
    /** `v-model:layouts`: the layouts changed (once per committed change) */
    "onUpdate:layouts"?:
        | ((layouts: Readonly<Record<string, Layout>>) => void)
        | undefined;
}

export interface RootSlots extends RenderSlot<RootState> {
    /** the grid's content: `GridLayout.Items`, a `GridLayout.Placeholder`, `GridLayout.Cells` */
    default?: SlotFunction<{ state: RootState }>;
}

/** Every prop the root takes, in the core's order. */
const PROPS = [
    "layout",
    "defaultLayout",
    "layouts",
    "defaultLayouts",
    "onLayoutChange",
    "onUpdate:layout",
    "onUpdate:layouts",
    "breakpoints",
    "breakpoint",
    "defaultBreakpoint",
    "onBreakpointChange",
    "cols",
    "maxRows",
    "compactor",
    "preventCollision",
    "allowOverlap",
    "constraints",
    "constraintRegistry",
    "rowHeight",
    "gap",
    "padding",
    "autoSize",
    "width",
    "draggable",
    "resizable",
    "bounded",
    "threshold",
    "touchDelay",
    "touchTolerance",
    "autoScroll",
    "dir",
    "scale",
    "onDragStart",
    "onDrag",
    "onDragStop",
    "onResizeStart",
    "onResize",
    "onResizeStop",
    "gridLayoutRef",
    "onExternalDrag",
    "onDrop",
    "createId",
    "as",
] as const satisfies readonly (keyof RootProps)[];

/** The props a bare attribute sets to `true` (`<GridLayout.Root prevent-collision>`). */
const BOOLEANS = [
    "preventCollision",
    "allowOverlap",
    "autoSize",
    "draggable",
    "resizable",
    "bounded",
    "autoScroll",
] as const satisfies readonly (keyof RootProps)[];

/** A layout the app owns: its own array and items, so changing them never reaches the model. */
function copyLayout(layout: Layout): Layout {
    return layout.map((item) => ({ ...item }));
}

/** Layouts per breakpoint the app owns, each copied as `copyLayout` does. */
function copyLayouts(
    layouts: Readonly<Record<string, Layout>>,
): Readonly<Record<string, Layout>> {
    return Object.fromEntries(
        Object.entries(layouts).map(([name, each]) => [name, copyLayout(each)]),
    );
}

/** The grid layout: a positioned box its items are placed in, as tall as the layout. */
export const Root: GridLayoutComponent<RootProps, RootSlots> = definePrimitive<
    RootProps,
    RootSlots
>(
    "Root",
    PROPS,
    (props, { attrs, slots }) => {
        // the props as the core reads them: the layout told to `v-model` as well
        // The layouts go in raw (a parent's `ref` hands a reactive proxy, which the model must
        // not keep) and come out as copies (a parent that mutates its `ref` in place must not
        // reach the model's committed layout, D3): the model is changed only by commands.
        const read = (): GridLayoutRootOptions => ({
            ...props,
            layout: props.layout && toRaw(props.layout),
            layouts: props.layouts && toRaw(props.layouts),
            defaultLayout: props.defaultLayout && toRaw(props.defaultLayout),
            defaultLayouts: props.defaultLayouts && toRaw(props.defaultLayouts),
            onLayoutChange: (layout, layouts) => {
                const own = copyLayout(layout);
                const ownLayouts = copyLayouts(layouts);
                props["onUpdate:layout"]?.(own);
                props["onUpdate:layouts"]?.(ownLayouts);
                props.onLayoutChange?.(own, ownLayouts);
            },
        });
        // the model and the engine, made from the first props; the steps below keep them in line
        // with the latest ones (the core's, so every adapter decides the same)
        const binding = createGridLayoutRootBinding(read);
        const { model, engine } = binding;
        const context = { model, engine };
        const view = useExternal(
            () => engine.adapter.subscribe,
            () => engine.adapter.getView(),
        );
        provide(GridLayoutKey, context);
        provide(ViewKey, view);

        const instance = getCurrentInstance();
        const stops: (() => void)[] = [];
        let heldRef: GridLayoutRef | undefined;
        let releaseRef: (() => void) | undefined;
        // outside the root, the grid is reachable once it is mounted (X5), first: the callbacks
        // the steps below may call find it
        const holdRef = () => {
            // the ref itself, not a reactive proxy of it (a parent's `reactive` state may hold
            // it): the core knows the ref it made
            const next = props.gridLayoutRef && toRaw(props.gridLayoutRef);
            if (next === heldRef) return;
            releaseRef?.();
            heldRef = next;
            releaseRef = heldRef
                ? attachGridLayoutRef(heldRef, context)
                : undefined;
        };
        // after each render: the engine's options, the rules, the controlled layouts and layout
        const afterRender = () => {
            binding.setOptions();
            holdRef();
            binding.configure();
            binding.syncLayouts();
            binding.syncLayout();
        };
        // The engine measures the root as it attaches: Vue sets a ref while it mounts, before the
        // tree is in the document (a width of 0 until the next resize frame, and a native drag
        // in that window would find a grid not measured yet). So the root attaches once the
        // component is mounted, as React's ref does after its commit.
        let mounted = false;
        let pending: HTMLElement | undefined;
        let detach: (() => void) | undefined;
        const attach = elementRef((element) => {
            if (mounted) return engine.adapter.attach(element);
            pending = element;
            return () => {
                if (pending === element) pending = undefined;
                detach?.();
                detach = undefined;
            };
        });
        onMounted(() => {
            // the root first, as React attaches it before its effects run
            mounted = true;
            if (pending) detach = engine.adapter.attach(pending);
            pending = undefined;
            binding.setOptions();
            holdRef();
            // controlled: a change the parent does not take is undone at its next render, which
            // this forces (a parent that ignores the change may not render again)
            stops.push(
                binding.listenModel(() => instance?.proxy?.$forceUpdate()),
            );
            stops.push(binding.listenEngine());
            binding.configure();
            binding.syncLayouts();
            binding.syncLayout();
        });
        onUpdated(afterRender);
        onBeforeUnmount(() => {
            for (const stop of stops.splice(0)) stop();
            releaseRef?.();
            releaseRef = undefined;
            heldRef = undefined;
        });

        const part = computed(() => rootPart(view.value));
        return () => {
            const { state, attributes, style } = part.value;
            return renderElement({
                tag: "div",
                as: props.as,
                attrs,
                render: slots.render,
                state,
                ref: attach,
                props: {
                    ...attributes,
                    ...(props.dir ? { dir: props.dir } : {}),
                },
                style: toStyle(style),
                // the engine's after the app's own listeners: `preventDefault` vetoes a gesture
                // or a key
                after: {
                    onPointerdown: (event: PointerEvent) =>
                        engine.adapter.pointerdown(event),
                    onKeydown: (event: KeyboardEvent) =>
                        engine.adapter.keydown(event),
                    onDragenter: (event: DragEvent) =>
                        engine.adapter.dragenter(event),
                    onDragover: (event: DragEvent) =>
                        engine.adapter.dragover(event),
                    onDragleave: (event: DragEvent) =>
                        engine.adapter.dragleave(event),
                    onDrop: (event: DragEvent) => engine.adapter.drop(event),
                },
                children: () => slots.default?.({ state }),
            });
        };
    },
    [...BOOLEANS],
);
