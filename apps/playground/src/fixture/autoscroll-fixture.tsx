import {
    GridLayout,
    type Layout,
    useGridLayoutRef,
} from "@fragiola/grid-layout-react";
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";

// The unstyled auto-scroll fixture Playwright drives (Epic #13, R6): a grid far taller than its
// 300px scroll container, and a drag source beside it. Near the container's edges, a move, a
// resize and a drop scroll it.
//
// 8 columns on 800px, rows of 40px, a 10px gap. Item `a` (0,0 2×2) has a resize handle
// (`resize-a`); a column of items fills 30 rows below it. Beside: the layout as JSON (`layout`).

const START: Layout = [
    { id: "a", x: 0, y: 0, w: 2, h: 2 },
    ...Array.from({ length: 10 }, (_, index) => ({
        id: `t${index}`,
        x: 4,
        y: index * 3,
        w: 4,
        h: 3,
    })),
];

function Fixture() {
    const gridLayoutRef = useGridLayoutRef();
    const [current, setCurrent] = useState(START);
    return (
        <>
            <div data-testid="scroller">
                <GridLayout.Root
                    gridLayoutRef={gridLayoutRef}
                    cols={8}
                    rowHeight={40}
                    gap={[10, 10]}
                    defaultLayout={START}
                    onLayoutChange={setCurrent}
                    data-testid="grid"
                >
                    <GridLayout.Items>
                        {(item) => (
                            <GridLayout.Item
                                itemId={item.id}
                                data-testid={`item-${item.id}`}
                            >
                                {item.id}
                                {item.id === "a" && (
                                    <GridLayout.ResizeHandle
                                        side="bottom-end"
                                        data-testid="resize-a"
                                    />
                                )}
                            </GridLayout.Item>
                        )}
                    </GridLayout.Items>
                    <GridLayout.Placeholder data-testid="placeholder" />
                </GridLayout.Root>
            </div>
            <div>
                <GridLayout.DragSource
                    gridLayoutRef={gridLayoutRef}
                    item={{ w: 2, h: 1 }}
                    itemId="new"
                    data-testid="source"
                >
                    source
                </GridLayout.DragSource>
                <pre data-testid="layout">{JSON.stringify(current)}</pre>
            </div>
        </>
    );
}

export function mountAutoscrollFixture() {
    const root = document.getElementById("root");
    if (!root) throw new Error("no #root");
    createRoot(root).render(
        <StrictMode>
            <Fixture />
        </StrictMode>,
    );
}
