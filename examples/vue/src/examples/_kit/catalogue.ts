// The widgets a sidebar offers: each kind with its size on the grid and what it shows. App data
// (X4): the grid holds only ids and boxes, the app maps each id to its kind. No grid and no styles.

/** A kind of widget the sidebar offers. */
export type WidgetKind = "kpi" | "chart" | "table" | "notes";

/** A widget the sidebar offers: its name, what it shows, and its size and limits on the grid. */
export interface CatalogueEntry {
    readonly kind: WidgetKind;
    readonly title: string;
    readonly description: string;
    readonly size: {
        readonly w: number;
        readonly h: number;
        readonly minW?: number;
        readonly minH?: number;
    };
}

export const CATALOGUE: readonly CatalogueEntry[] = [
    {
        kind: "kpi",
        title: "KPI",
        description: "One figure and its trend",
        size: { w: 3, h: 2, minW: 2, minH: 2 },
    },
    {
        kind: "chart",
        title: "Chart",
        description: "A line over eight weeks",
        size: { w: 6, h: 3, minW: 3, minH: 2 },
    },
    {
        kind: "table",
        title: "Table",
        description: "The latest orders",
        size: { w: 6, h: 4, minW: 4, minH: 3 },
    },
    {
        kind: "notes",
        title: "Notes",
        description: "A few lines of text",
        size: { w: 3, h: 3, minW: 2, minH: 2 },
    },
];

/** The catalogue's entry for a kind. */
export function entryOf(kind: WidgetKind): CatalogueEntry {
    return (
        CATALOGUE.find((entry) => entry.kind === kind) ??
        (CATALOGUE[0] as CatalogueEntry)
    );
}

/** Whether a value is a kind of the catalogue: a drop's `data` is the app's, checked here. */
export function isKind(value: unknown): value is WidgetKind {
    return CATALOGUE.some((entry) => entry.kind === value);
}

/** The rows a table widget shows. */
export const ORDERS = [
    { id: "#1042", customer: "Ada", total: "$129" },
    { id: "#1041", customer: "Grace", total: "$84" },
    { id: "#1040", customer: "Linus", total: "$312" },
    { id: "#1039", customer: "Margaret", total: "$58" },
] as const;

/** What a notes widget says. */
export const NOTE =
    "Ship the quarterly report on Friday. Ask design about the new chart colours.";

/**
 * A new widget id for a kind, readable in the layout and unused by it (`chart-3`): the smallest
 * number free. Ids are the app's (D14); one that says its kind lets the layout alone rebuild the
 * dashboard.
 */
export function freeId(
    layout: readonly { readonly id: string }[],
    kind: WidgetKind,
): string {
    const used = new Set(layout.map((item) => item.id));
    let n = 1;
    while (used.has(`${kind}-${n}`)) n += 1;
    return `${kind}-${n}`;
}

/** The kind an id was made for, from its prefix; `undefined` for an id this page did not make. */
export function kindOfId(id: string): WidgetKind | undefined {
    const kind = id.split("-")[0];
    return isKind(kind) ? kind : undefined;
}
