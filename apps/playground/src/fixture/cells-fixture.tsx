import { GridLayout, type Layout } from "@fragiola/grid-layout-react";
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";

// The unstyled grid cells fixture Playwright drives (Epic #18, K6): `GridLayout.Cells` under the
// items, as many rows as the layout reaches plus one (`auto`).
//
//   ?dir=rtl     right-to-left
//
// 12 columns on a 960px root, rows of 40px, a 10px gap and padding. The items:
//   a (0,0 2×2)   b (3,0 1×1)   c (5,1 3×1)
// Beside the grid: the layout as JSON (`layout`).

const START: Layout = [
    { id: "a", x: 0, y: 0, w: 2, h: 2 },
    { id: "b", x: 3, y: 0, w: 1, h: 1 },
    { id: "c", x: 5, y: 1, w: 3, h: 1 },
];

const dir =
    new URLSearchParams(location.search).get("dir") === "rtl" ? "rtl" : "ltr";

function Fixture() {
    const [current, setCurrent] = useState(START);
    return (
        <>
            <GridLayout.Root
                dir={dir}
                cols={12}
                rowHeight={40}
                gap={[10, 10]}
                defaultLayout={START}
                allowOverlap
                onLayoutChange={setCurrent}
                data-testid="grid"
            >
                <GridLayout.Cells />
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
            </GridLayout.Root>
            <pre data-testid="layout">{JSON.stringify(current)}</pre>
        </>
    );
}

export function mountCellsFixture() {
    const root = document.getElementById("root");
    if (!root) throw new Error("no #root");
    createRoot(root).render(
        <StrictMode>
            <Fixture />
        </StrictMode>,
    );
}
