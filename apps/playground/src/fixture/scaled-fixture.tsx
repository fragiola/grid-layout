import { GridLayout, type Layout } from "@fragiola/grid-layout-react";
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";

// The unstyled scaled-container fixture Playwright drives (Epic #18, K5): the grid inside a parent
// drawn at `transform: scale()`, with no `scale` prop, so the engine reads the scale off the root.
//
//   ?scale=0.5   the parent's scale (default 1)
//   &dir=rtl     right-to-left
//
// 12 columns on a 960px root, rows of 40px, a 10px gap and padding, before the scale. The items:
//   a (0,0 2×2) with a bottom-end resize handle (`resize-a`)   b (2,0 2×2)   c (4,0 2×1)
// Beside the grid: the layout as JSON (`layout`).

const START: Layout = [
    { id: "a", x: 0, y: 0, w: 2, h: 2 },
    { id: "b", x: 2, y: 0, w: 2, h: 2 },
    { id: "c", x: 4, y: 0, w: 2, h: 1 },
];

const params = new URLSearchParams(location.search);
const scale = Number(params.get("scale") ?? 1);
const dir = params.get("dir") === "rtl" ? "rtl" : "ltr";

function Fixture() {
    const [current, setCurrent] = useState(START);
    return (
        <>
            <div data-testid="canvas" style={{ transform: `scale(${scale})` }}>
                <GridLayout.Root
                    dir={dir}
                    cols={12}
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
            <pre data-testid="layout">{JSON.stringify(current)}</pre>
        </>
    );
}

export function mountScaledFixture() {
    const root = document.getElementById("root");
    if (!root) throw new Error("no #root");
    createRoot(root).render(
        <StrictMode>
            <Fixture />
        </StrictMode>,
    );
}
