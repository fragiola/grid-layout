import {
    GridLayout,
    type Layout,
    useGridLayoutRef,
} from "@fragiola/grid-layout-react";
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";

// The unstyled mobile fixture Playwright drives on touch (Epic #13, R5): a page that scrolls,
// with a grid in its middle. A swipe on an item's body scrolls the page; a long press drags it.
// Item `h` drags from its handle at once; the source brings a new item in.
//
// 4 columns on the page's width, rows of 60px, a 8px gap. The items:
//   a (0,0 2×2)  b (2,0 2×2)  h (0,2 4×1, a drag handle `handle-h`)
// Beside the grid: the layout changes told (`changes`) and the layout as JSON (`layout`).

const START: Layout = [
    { id: "a", x: 0, y: 0, w: 2, h: 2 },
    { id: "b", x: 2, y: 0, w: 2, h: 2 },
    { id: "h", x: 0, y: 2, w: 4, h: 1 },
];

function Fixture() {
    const gridLayoutRef = useGridLayoutRef();
    const [current, setCurrent] = useState(START);
    const [changes, setChanges] = useState(0);
    return (
        <>
            <div className="spacer" />
            <GridLayout.Root
                gridLayoutRef={gridLayoutRef}
                cols={4}
                rowHeight={60}
                gap={[8, 8]}
                defaultLayout={START}
                onLayoutChange={(next) => {
                    setChanges((count) => count + 1);
                    setCurrent(next);
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
                            {item.id === "h" && (
                                <GridLayout.DragHandle data-testid="handle-h" />
                            )}
                        </GridLayout.Item>
                    )}
                </GridLayout.Items>
                <GridLayout.Placeholder data-testid="placeholder" />
            </GridLayout.Root>
            <GridLayout.DragSource
                gridLayoutRef={gridLayoutRef}
                item={{ w: 2, h: 1 }}
                itemId="new"
                data-testid="source"
            >
                source
            </GridLayout.DragSource>
            <output data-testid="changes">{changes}</output>
            <pre data-testid="layout">{JSON.stringify(current)}</pre>
            <div className="spacer" />
        </>
    );
}

export function mountMobileFixture() {
    const root = document.getElementById("root");
    if (!root) throw new Error("no #root");
    createRoot(root).render(
        <StrictMode>
            <Fixture />
        </StrictMode>,
    );
}
