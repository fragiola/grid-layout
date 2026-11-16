// The root: one grid layout, on the app's own element. It creates the model and the engine once,
// from its first inputs, writes the root part onto the element, maps the inputs onto commands (D3)
// and tells the app what changed (D9). Every decision is the core's root binding; this directive
// calls its steps where Angular runs code after a render.

import {
    afterRenderEffect,
    computed,
    Directive,
    effect,
    forwardRef,
    input,
    type OnInit,
    output,
    type Signal,
    signal,
    untracked,
} from "@angular/core";
import {
    attachGridLayoutRef,
    type Breakpoints,
    type Compactor,
    type ConstraintRegistry,
    createGridLayoutRootBinding,
    type Direction,
    type DropDetails,
    type ExternalDragAnswer,
    type GestureEvent,
    type GridLayoutEngineOptions,
    type GridLayoutHandle,
    type GridLayoutRef,
    type GridLayoutRootBinding,
    type GridLayoutRootOptions,
    type GridLayoutView,
    type Layout,
    type LayoutConstraint,
    type PerBreakpoint,
    type RootState,
    rootPart,
} from "@fragiola/grid-layout";
import { GRID_LAYOUT_CONTEXT, type GridLayoutContext } from "../context";
import {
    bindPart,
    injectHost,
    listenAfter,
    onDestroy,
    optionalBoolean,
} from "../utils/helpers";

/** What `(breakpointChange)` emits: the active breakpoint and its columns. */
export interface BreakpointChange {
    readonly breakpoint: string;
    readonly cols: number;
}

/** `autoScroll`: `false` (or `"false"`) turns it off, an object tunes it, `true` is the default. */
export type AutoScrollInput = GridLayoutEngineOptions["autoScroll"];

/** A number input that takes an attribute's string too (`maxRows="4"`), keeping `undefined`. */
function optionalNumber(value: unknown): number | undefined {
    if (value === undefined || value === null || value === "") return undefined;
    return typeof value === "number" ? value : Number(value);
}

function autoScrollInput(value: unknown): AutoScrollInput {
    return typeof value === "object" && value !== null
        ? (value as AutoScrollInput)
        : optionalBoolean(value) === false
          ? false
          : undefined;
}

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

/** The view before the grid exists (before the root's inputs are set): nothing to render. */
const UNBOUND_VIEW: GridLayoutView = {
    width: 0,
    breakpoint: "",
    height: 0,
    dir: "ltr",
    geometry: undefined,
    layout: [],
    items: new Map(),
    rects: {},
    gesture: undefined,
    handled: new Set(),
    draggable: false,
    resizable: false,
    dropRefused: false,
};

/**
 * The grid layout, on the element it fills (`<div gridLayoutRoot [defaultLayout]="layout">`): a
 * positioned box its items are placed in, as tall as the layout with `autoSize`. Its inputs are
 * React's `Root` props; `[(layout)]` and `[(layouts)]` pair the controlled inputs with
 * `(layoutChange)` and `(layoutsChange)`, told once per committed change (D9).
 */
@Directive({
    selector: "[gridLayoutRoot]",
    exportAs: "gridLayoutRoot",
    providers: [
        {
            provide: GRID_LAYOUT_CONTEXT,
            useExisting: forwardRef(() => GridLayoutRoot),
        },
    ],
})
export class GridLayoutRoot implements GridLayoutContext, OnInit {
    /** the active breakpoint's layout, controlled: pair it with `(layoutChange)` */
    readonly layout = input<Layout | undefined>(undefined);
    /** the layout the grid starts with, uncontrolled (read once) */
    readonly defaultLayout = input<Layout | undefined>(undefined);
    /** every breakpoint's layout, controlled: pair it with `(layoutsChange)` */
    readonly layouts = input<Readonly<Record<string, Layout>> | undefined>(
        undefined,
    );
    /** every breakpoint's layout the grid starts with, uncontrolled (read once) */
    readonly defaultLayouts = input<
        Readonly<Record<string, Layout>> | undefined
    >(undefined);
    /** the breakpoints: each one's minimum width of the grid itself (R1) */
    readonly breakpoints = input<Breakpoints | undefined>(undefined);
    /** the active breakpoint, controlled: it overrides the measured width */
    readonly breakpoint = input<string | undefined>(undefined);
    /** the breakpoint before the grid is measured */
    readonly defaultBreakpoint = input<string | undefined>(undefined);
    /** the columns: one number, or one per breakpoint (default 12) */
    readonly cols = input<
        number | Readonly<Record<string, number>> | undefined
    >(undefined);
    /** the rows a gesture or a command may ask for */
    readonly maxRows = input(undefined, { transform: optionalNumber });
    /** how the layout settles (default: vertical) */
    readonly compactor = input<Compactor | undefined>(undefined);
    /** a move never pushes another item */
    readonly preventCollision = input(undefined, {
        transform: optionalBoolean,
    });
    /** items may overlap */
    readonly allowOverlap = input(undefined, { transform: optionalBoolean });
    /** the grid's constraints (default `defaultConstraints`); keep the array stable */
    readonly constraints = input<readonly LayoutConstraint[] | undefined>(
        undefined,
    );
    /** the constraints an item names, read once */
    readonly constraintRegistry = input<ConstraintRegistry | undefined>(
        undefined,
    );
    /** a row's height in pixels, or one per breakpoint */
    readonly rowHeight = input<PerBreakpoint<number> | undefined>(undefined);
    /** the gap between items `[x, y]`, or one per breakpoint */
    readonly gap = input<PerBreakpoint<readonly [number, number]> | undefined>(
        undefined,
    );
    /** the padding inside the root `[x, y]`, or one per breakpoint */
    readonly padding = input<
        PerBreakpoint<readonly [number, number]> | undefined
    >(undefined);
    /** the root is as tall as its layout (default true) */
    readonly autoSize = input(undefined, { transform: optionalBoolean });
    /** the grid's width, instead of measuring it */
    readonly width = input(undefined, { transform: optionalNumber });
    /** people may drag items (default true) */
    readonly draggable = input(undefined, { transform: optionalBoolean });
    /** people may resize items (default true) */
    readonly resizable = input(undefined, { transform: optionalBoolean });
    /** an item never leaves the grid */
    readonly bounded = input(undefined, { transform: optionalBoolean });
    /** pixels a press moves before it drags (default 3) */
    readonly threshold = input(undefined, { transform: optionalNumber });
    /** milliseconds a touch holds an item's body before it drags (default 250) */
    readonly touchDelay = input(undefined, { transform: optionalNumber });
    /** pixels a holding touch may move (default 5) */
    readonly touchTolerance = input(undefined, { transform: optionalNumber });
    /** edge auto-scroll: `false` turns it off, an object tunes it */
    readonly autoScroll = input(undefined, { transform: autoScrollInput });
    /** the direction: the engine's and the element's `dir` (default: the computed one) */
    readonly dir = input<Direction | undefined>(undefined);
    /** the root's scale on screen, instead of measuring it */
    readonly scale = input(undefined, { transform: optionalNumber });
    /**
     * the grid, reachable from outside the root: its `current` is `{ model, engine }` while this
     * root lives (from `createGridLayoutRef()`)
     */
    readonly gridLayoutRef = input<GridLayoutRef | undefined>(undefined);
    /**
     * answers a native drag from outside the page (files, links, text): `{ w, h, data? }` accepts,
     * `false` refuses, `undefined` lets it pass (React's `onExternalDrag`)
     */
    readonly externalDrag = input<
        ((event: DragEvent) => ExternalDragAnswer) | undefined
    >(undefined);
    /** the id of an item a drop adds (default: a random UUID) */
    readonly createId = input<(() => string) | undefined>(undefined);

    /** the active breakpoint's layout changed (once per committed change): `[(layout)]` */
    readonly layoutChange = output<Layout>();
    /** the layouts changed (once per committed change): `[(layouts)]` */
    readonly layoutsChange = output<Readonly<Record<string, Layout>>>();
    /** the active breakpoint changed (once per change) */
    readonly breakpointChange = output<BreakpointChange>();
    /** a pointer started moving an item */
    readonly dragStart = output<GestureEvent>();
    /** a moved item's preview changed (React's `onDrag`) */
    readonly dragMove = output<GestureEvent>();
    /** a pointer released a moved item */
    readonly dragStop = output<GestureEvent>();
    /** a pointer started resizing an item */
    readonly resizeStart = output<GestureEvent>();
    /** a resized item's preview changed (React's `onResize`) */
    readonly resizeMove = output<GestureEvent>();
    /** a pointer released a resized item */
    readonly resizeStop = output<GestureEvent>();
    /** an item from outside was added (React's `onDrop`; not the element's native `drop`) */
    readonly dropped = output<DropDetails>();

    private readonly host = injectHost();
    /** the core's binding, made from the first inputs (in `ngOnInit`) */
    private readonly bound = signal<GridLayoutRootBinding | undefined>(
        undefined,
    );
    /** bumped whenever the engine tells a new view */
    private readonly tick = signal(0);
    /** bumped when a controlled root must apply its inputs again */
    private readonly forced = signal(0);
    /** what the root undoes when it goes */
    private readonly stops: (() => void)[] = [];

    readonly handle: Signal<GridLayoutHandle> = computed(() => {
        const binding = this.bound();
        if (!binding) {
            throw new Error(
                "[gridLayoutRoot]: the grid is made from the root's inputs, once they are set: read it in an effect, a computed or a handler, not in a constructor",
            );
        }
        return { model: binding.model, engine: binding.engine };
    });

    readonly view: Signal<GridLayoutView> = computed(() => {
        const binding = this.bound();
        if (!binding) return UNBOUND_VIEW;
        this.tick();
        return binding.engine.adapter.getView();
    });

    private readonly part = computed(() => rootPart(this.view()));

    /** what the root shows as `data-*` */
    readonly state: Signal<RootState> = computed(() => this.part().state);

    constructor() {
        bindPart(this.host, () => this.part());
        // the element's `dir` is the input's, when it is given
        effect(() => {
            const dir = this.dir();
            if (dir && this.host.getAttribute("dir") !== dir) {
                this.host.setAttribute("dir", dir);
            }
        });
        // The engine measures the root as it attaches: once the page is rendered, the element is
        // in the document (Vue's root waits for `onMounted`, React's ref for its commit). Then,
        // after each render that changed an input: the engine's options, the ref, the rules, the
        // controlled layouts and layout.
        let mounted = false;
        const stops = this.stops;
        let heldRef: GridLayoutRef | undefined;
        let releaseRef: (() => void) | undefined;
        const holdRef = (binding: GridLayoutRootBinding) => {
            const next = this.gridLayoutRef();
            if (next === heldRef) return;
            releaseRef?.();
            heldRef = next;
            releaseRef = heldRef
                ? attachGridLayoutRef(heldRef, {
                      model: binding.model,
                      engine: binding.engine,
                  })
                : undefined;
        };
        afterRenderEffect(() => {
            const binding = this.bound();
            // every input: a change runs the steps again
            this.read();
            this.forced();
            if (!binding) return;
            untracked(() => {
                if (!mounted) {
                    mounted = true;
                    stops.push(binding.engine.adapter.attach(this.host));
                    binding.setOptions();
                    holdRef(binding);
                    // controlled: a change the parent does not take is undone at its next
                    // render, which this forces (a parent that ignores the change may not render)
                    stops.push(
                        binding.listenModel(() =>
                            this.forced.update((value) => value + 1),
                        ),
                    );
                    stops.push(binding.listenEngine());
                } else {
                    binding.setOptions();
                    holdRef(binding);
                }
                binding.configure();
                binding.syncLayouts();
                binding.syncLayout();
            });
        });
        onDestroy(() => {
            for (const stop of stops.splice(0).reverse()) stop();
            releaseRef?.();
            releaseRef = undefined;
            heldRef = undefined;
        });
    }

    ngOnInit(): void {
        // the model and the engine, made from the first inputs; the steps keep them in line with
        // the latest ones (the core's, so every adapter decides the same)
        const binding = createGridLayoutRootBinding(() => this.read());
        const { engine } = binding;
        const unsubscribe = engine.adapter.subscribe(() => {
            this.tick.update((value) => value + 1);
        });
        // the engine's presses, keys and native drags, after the app's own listeners:
        // `preventDefault` vetoes a gesture or a key
        const unlisten = listenAfter(this.host, {
            pointerdown: (event) =>
                engine.adapter.pointerdown(event as PointerEvent),
            keydown: (event) => engine.adapter.keydown(event as KeyboardEvent),
            dragenter: (event) => engine.adapter.dragenter(event as DragEvent),
            dragover: (event) => engine.adapter.dragover(event as DragEvent),
            dragleave: (event) => engine.adapter.dragleave(event as DragEvent),
            drop: (event) => engine.adapter.drop(event as DragEvent),
        });
        this.stops.push(unsubscribe, unlisten);
        this.bound.set(binding);
    }

    /** The inputs as the core reads them, the callbacks told through the outputs. */
    private read(): GridLayoutRootOptions {
        return {
            layout: this.layout(),
            defaultLayout: this.defaultLayout(),
            layouts: this.layouts(),
            defaultLayouts: this.defaultLayouts(),
            // the app gets layouts it owns: changing them in place never reaches the model (D3)
            onLayoutChange: (layout, layouts) => {
                this.layoutChange.emit(copyLayout(layout));
                this.layoutsChange.emit(copyLayouts(layouts));
            },
            breakpoints: this.breakpoints(),
            breakpoint: this.breakpoint(),
            defaultBreakpoint: this.defaultBreakpoint(),
            onBreakpointChange: (breakpoint, cols) =>
                this.breakpointChange.emit({ breakpoint, cols }),
            cols: this.cols(),
            maxRows: this.maxRows(),
            compactor: this.compactor(),
            preventCollision: this.preventCollision(),
            allowOverlap: this.allowOverlap(),
            constraints: this.constraints(),
            constraintRegistry: this.constraintRegistry(),
            rowHeight: this.rowHeight(),
            gap: this.gap(),
            padding: this.padding(),
            autoSize: this.autoSize(),
            width: this.width(),
            draggable: this.draggable(),
            resizable: this.resizable(),
            bounded: this.bounded(),
            threshold: this.threshold(),
            touchDelay: this.touchDelay(),
            touchTolerance: this.touchTolerance(),
            autoScroll: this.autoScroll(),
            dir: this.dir(),
            scale: this.scale(),
            onDragStart: (event) => this.dragStart.emit(event),
            onDrag: (event) => this.dragMove.emit(event),
            onDragStop: (event) => this.dragStop.emit(event),
            onResizeStart: (event) => this.resizeStart.emit(event),
            onResize: (event) => this.resizeMove.emit(event),
            onResizeStop: (event) => this.resizeStop.emit(event),
            onExternalDrag: this.externalDrag(),
            onDrop: (drop) => this.dropped.emit(drop),
            createId: this.createId(),
        };
    }
}
