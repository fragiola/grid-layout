import {
    type Compactor,
    GridLayout,
    horizontalCompactor,
    type Layout,
    noCompactor,
    verticalCompactor,
} from "@fragiola/grid-layout-react";
import { Profiler, StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";

// The unstyled grid layout Playwright drives (D11): the same page left-to-right (`fixtures/basic`)
// and right-to-left (`fixtures/rtl`), configured by the query string, so one spec runs against
// both.
//
//   ?compactor=vertical  how the layout settles: vertical (default), horizontal or none
//   &prevent=1           preventCollision
//   &controlled=1        the layout held in the fixture's state (`layout` + `onLayoutChange`)
//
// 12 columns on a 960px root, rows of 40px, a 10px gap and padding. The items:
//   a (0,0 2×2)  dragged from its body, with all eight resize handles (`resize-a-<side>`)
//   b (2,0 2×2)  plain
//   c (4,0 2×2)  a drag handle (`handle-c`, its tab stop) and a field (`field-c`)
//   s (6,0 2×1)  static
//   d (0,2 4×1)  plain
// Beside the grid: a bounded toggle (`bounded`), the commits to the layout (`changes`), the
// commits of the items (`renders`) and the layout as JSON (`layout`).

const SIDES = [
    "top",
    "bottom",
    "start",
    "end",
    "top-start",
    "top-end",
    "bottom-start",
    "bottom-end",
] as const;

const START: Layout = [
    { id: "a", x: 0, y: 0, w: 2, h: 2 },
    { id: "b", x: 2, y: 0, w: 2, h: 2 },
    { id: "c", x: 4, y: 0, w: 2, h: 2 },
    { id: "s", x: 6, y: 0, w: 2, h: 1, static: true },
    { id: "d", x: 0, y: 2, w: 4, h: 1 },
];

const COMPACTORS: Record<string, Compactor> = {
    vertical: verticalCompactor,
    horizontal: horizontalCompactor,
    none: noCompactor,
};

const params = new URLSearchParams(location.search);

let renders = 0;

/** Counts a commit of an item, written straight to the page: counting renders nothing. */
function counted() {
    renders++;
    const output = document.querySelector('[data-testid="renders"]');
    if (output) output.textContent = String(renders);
}

function Fixture({ dir }: { dir: "ltr" | "rtl" }) {
    const controlled = params.get("controlled") === "1";
    const [layout, setLayout] = useState(START);
    const [current, setCurrent] = useState(START);
    const [changes, setChanges] = useState(0);
    const [bounded, setBounded] = useState(false);
    return (
        <>
            <GridLayout.Root
                dir={dir}
                cols={12}
                rowHeight={40}
                gap={[10, 10]}
                compactor={COMPACTORS[params.get("compactor") ?? "vertical"]}
                preventCollision={params.get("prevent") === "1"}
                bounded={bounded}
                {...(controlled ? { layout } : { defaultLayout: START })}
                onLayoutChange={(next) => {
                    setChanges((count) => count + 1);
                    setCurrent(next);
                    if (controlled) setLayout(next);
                }}
                data-testid="grid"
            >
                <GridLayout.Items>
                    {(item) => (
                        <Profiler id={item.id} onRender={counted}>
                            <GridLayout.Item
                                itemId={item.id}
                                data-testid={`item-${item.id}`}
                            >
                                {item.id === "a"
                                    ? SIDES.map((side) => (
                                          <GridLayout.ResizeHandle
                                              key={side}
                                              side={side}
                                              data-testid={`resize-a-${side}`}
                                          />
                                      ))
                                    : null}
                                {item.id === "c" ? (
                                    <>
                                        <GridLayout.DragHandle data-testid="handle-c" />
                                        <input
                                            data-testid="field-c"
                                            aria-label="field"
                                        />
                                    </>
                                ) : null}
                            </GridLayout.Item>
                        </Profiler>
                    )}
                </GridLayout.Items>
                <GridLayout.Placeholder data-testid="placeholder" />
            </GridLayout.Root>
            <label>
                <input
                    type="checkbox"
                    data-testid="bounded"
                    checked={bounded}
                    onChange={(event) => setBounded(event.target.checked)}
                />
                bounded
            </label>
            <output data-testid="changes">{changes}</output>
            <output data-testid="renders">0</output>
            <pre data-testid="layout">{JSON.stringify(current)}</pre>
        </>
    );
}

export function mountGridFixture(dir: "ltr" | "rtl") {
    const root = document.getElementById("root");
    if (!root) throw new Error("no #root");
    createRoot(root).render(
        <StrictMode>
            <Fixture dir={dir} />
        </StrictMode>,
    );
}
