// The grid layout's model: its items and its rules (D3). Every change is a command through a
// middleware chain; reads go through `get` and `is` keys, typed by the registries below.

import type { NewLayoutItem } from "../layout/edit";
import type {
    Compactor,
    Layout,
    LayoutItem,
    LayoutRules,
    ResizeSide,
} from "../layout/types";

/** The breakpoint of a grid that declares none: its one layout. */
export const DEFAULT_BREAKPOINT = "default";

/** The model's state: immutable, a new object per committed change. */
export interface GridLayoutState {
    /** the columns */
    readonly cols: number;
    /** the rows a gesture may reach (`Infinity`: unbounded) */
    readonly maxRows: number;
    /** how the layout settles after every change */
    readonly compactor: Compactor;
    /** a move or resize into an occupied cell is refused instead of pushing */
    readonly preventCollision: boolean;
    /** items may overlap: nothing is pushed and nothing settles */
    readonly allowOverlap: boolean;
    /** the breakpoint whose layout the grid shows and edits */
    readonly breakpoint: string;
    /** the layout of each breakpoint (one, {@link DEFAULT_BREAKPOINT}, until responsive grids) */
    readonly layouts: Readonly<Record<string, Layout>>;
}

/** What `createGridLayoutModel` starts from. */
export interface GridLayoutModelOptions {
    /** the items (checked, corrected and settled; an invalid layout throws) */
    layout?: Layout | undefined;
    /** the columns (default 12) */
    cols?: number | undefined;
    /** the rows a gesture may reach (default: unbounded) */
    maxRows?: number | undefined;
    /** how the layout settles (default: `verticalCompactor`) */
    compactor?: Compactor | undefined;
    preventCollision?: boolean | undefined;
    allowOverlap?: boolean | undefined;
}

/** The fields of an item `item.configure` changes: its limits and its flags, never its place. */
export type ItemSettings = Partial<
    Pick<
        LayoutItem,
        "minW" | "maxW" | "minH" | "maxH" | "static" | "draggable" | "resizable"
    >
>;

/** The rules `grid.configure` changes. */
export type GridSettings = Partial<
    Pick<
        GridLayoutState,
        "cols" | "maxRows" | "compactor" | "preventCollision" | "allowOverlap"
    >
>;

/** Every command: its payload and the value it returns. */
export interface CommandMap {
    /** replaces the layout (checked, corrected and settled). Returns it */
    "layout.set": {
        payload: { readonly layout: Layout };
        result: { readonly layout: Layout };
    };
    /**
     * adds an item at its `x`/`y`, pushing what is there, or at the first free cell when it names
     * none (its id unused). Returns it, as placed
     */
    "item.add": {
        payload: { readonly item: NewLayoutItem };
        result: { readonly item: LayoutItem };
    };
    /** removes an item. Returns its id */
    "item.remove": {
        payload: { readonly itemId: string };
        result: { readonly itemId: string };
    };
    /**
     * moves an item to a cell inside the grid, pushing what it lands on (a static is refused;
     * under `preventCollision`, an occupied cell is a `collision`). Returns the item, settled
     */
    "item.move": {
        payload: {
            readonly itemId: string;
            readonly x: number;
            readonly y: number;
        };
        result: { readonly item: LayoutItem };
    };
    /**
     * resizes an item from `side` (default `bottom-end`), the opposite edge staying put, within
     * its limits and the grid, pushing what it grows into. Returns the item, settled
     */
    "item.resize": {
        payload: {
            readonly itemId: string;
            readonly w: number;
            readonly h: number;
            readonly side?: ResizeSide | undefined;
        };
        result: { readonly item: LayoutItem };
    };
    /** changes an item's limits and flags; its size comes back within the new limits */
    "item.configure": {
        payload: { readonly itemId: string; readonly settings: ItemSettings };
        result: { readonly item: LayoutItem };
    };
    /** changes the grid's rules; every layout is corrected and settled under them */
    "grid.configure": {
        payload: { readonly settings: GridSettings };
        result: { readonly rules: LayoutRules };
    };
}

/** A command's name. */
export type CommandName = keyof CommandMap;

/** A command's payload. */
export type PayloadOf<C extends CommandName> = CommandMap[C]["payload"];

/** A command's value. */
export type ResultOf<C extends CommandName> = CommandMap[C]["result"];

/** Why a command did not apply. */
export type CommandErrorCode =
    /** no command has this name */
    | "unknown_command"
    /** the payload is not what the command takes */
    | "invalid_payload"
    /** the item the payload names does not exist */
    | "not_found"
    /** a rule forbids it: a static item moved or resized */
    | "refused"
    /** under `preventCollision`, the move or resize lands on another item */
    | "collision"
    /** a middleware vetoed it */
    | "vetoed"
    /** it was issued while another command ran, and will run after it */
    | "queued"
    /** a middleware threw */
    | "middleware_error";

export interface CommandError {
    readonly code: CommandErrorCode;
    readonly message: string;
}

/** Why a command did not apply. */
export interface CommandFailure {
    readonly ok: false;
    readonly error: CommandError;
}

/** What a command returns: its value, or why it did not apply. It never throws on bad input. */
export type CommandResult<R> =
    | { readonly ok: true; readonly value: R }
    | CommandFailure;

/**
 * What a middleware sees: a union discriminated by `command`, so checking the command narrows the
 * payload (`if (ctx.command === "item.move") ctx.payload.x`).
 */
export type CommandContext = {
    [C in CommandName]: {
        readonly command: C;
        /** the payload; assign a new object to rewrite it before calling `next` */
        payload: PayloadOf<C>;
        /** `model.can`/`model.check`: nothing will be committed; do not cause side effects */
        readonly dryRun: boolean;
        /** the committed state the command applies to */
        readonly state: GridLayoutState;
    };
}[CommandName];

/**
 * Runs around every command, engine-issued or not: veto (return an error without calling `next`),
 * rewrite (assign `ctx.payload`, then call `next`) or observe (call `next` and look at its result).
 * Returning `undefined` passes on `next`'s result when it was called, and vetoes when it was not.
 */
export type Middleware = (
    ctx: CommandContext,
    next: () => CommandResult<unknown>,
) => CommandResult<unknown> | undefined;

/** What a listener receives: one event per committed command that changed the state. */
export interface CommandEvent {
    readonly command: CommandName;
    /** the payload as the handler received it (after any middleware rewrote it) */
    readonly payload: unknown;
    /** the command's value */
    readonly result: unknown;
    readonly before: GridLayoutState;
    readonly after: GridLayoutState;
}

export type CommandListener = (event: CommandEvent) => void;

/** What `model.get` reads: each key's payload (`undefined` for none) and result. */
export interface QueryMap {
    /** the active breakpoint's layout */
    layout: { payload: undefined; result: Layout };
    /** an item of the active layout */
    "item-by": {
        payload: { readonly itemId: string };
        result: LayoutItem | undefined;
    };
    /** the row just below the lowest item of the active layout */
    bottom: { payload: undefined; result: number };
    /** the items of the active layout an item overlaps (none, unless `allowOverlap`) */
    "collisions-by": {
        payload: { readonly itemId: string };
        result: Layout;
    };
    /** what every layout change obeys: columns, rows, compaction and collisions */
    rules: { payload: undefined; result: LayoutRules };
    /** the active breakpoint */
    breakpoint: { payload: undefined; result: string };
    /** every breakpoint's layout */
    layouts: { payload: undefined; result: Readonly<Record<string, Layout>> };
}

export type QueryKey = keyof QueryMap;

/** What `model.is` answers. */
export interface QuestionMap {
    /** whether the item is static: it never moves */
    "item-static-by": { readonly itemId: string };
    /** whether a person may drag the item: it exists, is not static, and not `draggable: false` */
    "item-draggable-by": { readonly itemId: string };
    /** whether a person may resize the item: it exists, is not static, and not `resizable: false` */
    "item-resizable-by": { readonly itemId: string };
}

export type QuestionKey = keyof QuestionMap;

/** The payload of a command that takes none. */
export type NoPayload = Record<string, never>;

/** The arguments after a key: the payload, optional when the key takes none. */
export type PayloadArgs<P> = [P] extends [undefined]
    ? []
    : NoPayload extends P
      ? [payload?: P]
      : [payload: P];

/** The grid layout's model: its state, the verbs that change and read it, and its listeners. */
export interface GridLayoutModel {
    /** the committed state */
    readonly state: GridLayoutState;
    /** runs a command through the middleware and commits it */
    run<C extends CommandName>(
        command: C,
        ...args: PayloadArgs<PayloadOf<C>>
    ): CommandResult<ResultOf<C>>;
    /** whether the command would apply (a dry run through the middleware) */
    can<C extends CommandName>(
        command: C,
        ...args: PayloadArgs<PayloadOf<C>>
    ): boolean;
    /** the command's result without committing it (a dry run through the middleware) */
    check<C extends CommandName>(
        command: C,
        ...args: PayloadArgs<PayloadOf<C>>
    ): CommandResult<ResultOf<C>>;
    /** reads a value */
    get<K extends QueryKey>(
        key: K,
        ...args: PayloadArgs<QueryMap[K]["payload"]>
    ): QueryMap[K]["result"];
    /** answers a question */
    is<K extends QuestionKey>(key: K, payload: QuestionMap[K]): boolean;
    /** adds a middleware, last in the chain; returns its remover */
    use(middleware: Middleware): () => void;
    /** listens to committed changes; returns the remover */
    subscribe(listener: CommandListener): () => void;
}
