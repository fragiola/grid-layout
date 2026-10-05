import {
    GridLayout,
    type Layout,
    useGridLayout,
    useGridLayoutEvents,
    useGridLayoutRef,
    veto,
} from "@fragiola/grid-layout-react";
import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

// The unstyled external drop fixture Playwright drives (Epic #9): drag sources in a sidebar
// **outside** the root, reaching it through a `gridLayoutRef`; a root that accepts files from the
// OS and refuses any other native drag; a trash that removes an item dragged onto it. The same
// page left-to-right and right-to-left (`?dir=rtl`).
//
// 12 columns on a 960px root, rows of 40px, a 10px gap and padding. The items:
//   a (0,0 2×2)  b (2,0 2×2)  c (4,0 2×1)
// The sources:
//   source-note     2×1, data "note"
//   source-chart    3×2, data "chart"
//   source-refused  2×1, id "refused": a middleware refuses it, always
//   source-wide     2×1, id "wide": a middleware widens it to 4 columns
// Beside the grid: the commits to the layout (`changes`), the layout as JSON (`layout`), the last
// preview a drop showed (`preview`), the drops told to `onDrop` (`drops`) and the items thrown in
// the trash (`trashed`).

const START: Layout = [
    { id: "a", x: 0, y: 0, w: 2, h: 2 },
    { id: "b", x: 2, y: 0, w: 2, h: 2 },
    { id: "c", x: 4, y: 0, w: 2, h: 1 },
];

const params = new URLSearchParams(location.search);
const dir = params.get("dir") === "rtl" ? "rtl" : "ltr";

/** The rules a middleware adds: one source always refused, one widened. */
function Rules() {
    const { model } = useGridLayout();
    useEffect(
        () =>
            model.use((ctx, next) => {
                if (ctx.command !== "item.add") return next();
                if (ctx.payload.item.id === "refused") return veto();
                if (ctx.payload.item.id === "wide") {
                    ctx.payload = { item: { ...ctx.payload.item, w: 4 } };
                }
                return next();
            }),
        [model],
    );
    return null;
}

/** The last layout a drop previewed, written straight to the page: telling it renders nothing. */
function Preview() {
    useGridLayoutEvents((event) => {
        if (!event.external) return;
        const output = document.querySelector('[data-testid="preview"]');
        if (output) output.textContent = JSON.stringify(event.layout);
    });
    return null;
}

function Fixture() {
    const gridLayoutRef = useGridLayoutRef();
    const trash = useRef<HTMLDivElement>(null);
    const [current, setCurrent] = useState(START);
    const [changes, setChanges] = useState(0);
    const [drops, setDrops] = useState<unknown[]>([]);
    const [trashed, setTrashed] = useState<string[]>([]);
    return (
        <div className="page">
            <aside>
                <GridLayout.DragSource
                    gridLayoutRef={gridLayoutRef}
                    item={{ w: 2, h: 1 }}
                    data="note"
                    data-testid="source-note"
                >
                    note
                </GridLayout.DragSource>
                <GridLayout.DragSource
                    gridLayoutRef={gridLayoutRef}
                    item={{ w: 3, h: 2 }}
                    data="chart"
                    data-testid="source-chart"
                >
                    chart
                </GridLayout.DragSource>
                <GridLayout.DragSource
                    gridLayoutRef={gridLayoutRef}
                    item={{ w: 2, h: 1 }}
                    itemId="refused"
                    data="refused"
                    data-testid="source-refused"
                >
                    refused
                </GridLayout.DragSource>
                <GridLayout.DragSource
                    gridLayoutRef={gridLayoutRef}
                    item={{ w: 2, h: 1 }}
                    itemId="wide"
                    data="wide"
                    data-testid="source-wide"
                >
                    wide
                </GridLayout.DragSource>
                <div ref={trash} data-testid="trash">
                    trash
                </div>
                <GridLayout.DragPreview
                    gridLayoutRef={gridLayoutRef}
                    data-testid="drag-preview"
                >
                    {(state) => String(state.data)}
                </GridLayout.DragPreview>
            </aside>
            <div>
                <GridLayout.Root
                    gridLayoutRef={gridLayoutRef}
                    dir={dir}
                    cols={12}
                    rowHeight={40}
                    gap={[10, 10]}
                    defaultLayout={START}
                    onLayoutChange={(next) => {
                        setChanges((count) => count + 1);
                        setCurrent(next);
                    }}
                    onExternalDrag={(event) =>
                        event.dataTransfer?.types.includes("Files")
                            ? {
                                  w: 2,
                                  h: 1,
                                  data: Array.from(
                                      event.dataTransfer.files,
                                      (file) => file.name,
                                  ),
                              }
                            : false
                    }
                    onDrop={({ item, data }) =>
                        setDrops((all) => [...all, { id: item.id, data }])
                    }
                    onDragStop={(event) => {
                        const target = event.target;
                        if (
                            event.outside &&
                            target &&
                            trash.current?.contains(target)
                        ) {
                            gridLayoutRef.current?.model.run("item.remove", {
                                itemId: event.itemId,
                            });
                            setTrashed((all) => [...all, event.itemId]);
                        }
                    }}
                    data-testid="grid"
                >
                    <GridLayout.Items>
                        {(item) => (
                            <GridLayout.Item
                                itemId={item.id}
                                data-testid={`item-${item.id}`}
                            >
                                {item.id}
                            </GridLayout.Item>
                        )}
                    </GridLayout.Items>
                    <GridLayout.Placeholder data-testid="placeholder" />
                    <Rules />
                    <Preview />
                </GridLayout.Root>
                <output data-testid="changes">{changes}</output>
                <pre data-testid="layout">{JSON.stringify(current)}</pre>
                <pre data-testid="preview" />
                <pre data-testid="drops">{JSON.stringify(drops)}</pre>
                <pre data-testid="trashed">{JSON.stringify(trashed)}</pre>
            </div>
        </div>
    );
}

export function mountExternalFixture() {
    document.documentElement.dir = dir;
    const root = document.getElementById("root");
    if (!root) throw new Error("no #root");
    createRoot(root).render(
        <StrictMode>
            <Fixture />
        </StrictMode>,
    );
}
