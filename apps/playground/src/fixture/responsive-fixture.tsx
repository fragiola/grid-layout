import { GridLayout, type Layout } from "@fragiola/grid-layout-react";
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";

// The unstyled responsive fixture Playwright drives (Epic #13, R1–R3): a grid in a container
// whose width the buttons set (the window never changes), four breakpoints, the lg layout given
// and the others generated.
//
//   ?breakpoint=xs   the breakpoint, controlled
//
// Breakpoints lg ≥ 996, md ≥ 768, sm ≥ 480, xs ≥ 0; columns 12, 10, 6, 4; rows of 40px, a 10px
// gap and padding. Beside the grid: the breakpoint changes told (`switches`), the layout
// changes told (`changes`) and every breakpoint's layout as JSON (`layouts`).

const BREAKPOINTS = { lg: 996, md: 768, sm: 480, xs: 0 };
const COLS = { lg: 12, md: 10, sm: 6, xs: 4 };
const WIDTHS = [1100, 900, 600, 400];

const LG: Layout = [
    { id: "a", x: 0, y: 0, w: 4, h: 2 },
    { id: "b", x: 4, y: 0, w: 4, h: 2 },
    { id: "c", x: 8, y: 0, w: 4, h: 2 },
    // a gap above: generated layouts collapse it (react-grid-layout#1744)
    { id: "d", x: 0, y: 2, w: 12, h: 1 },
];

const params = new URLSearchParams(location.search);

function Fixture() {
    const [width, setWidth] = useState(1100);
    const [switches, setSwitches] = useState<string[]>([]);
    const [changes, setChanges] = useState(0);
    const [layouts, setLayouts] = useState<Record<string, Layout>>({ lg: LG });
    const controlled = params.get("breakpoint") ?? undefined;
    return (
        <>
            <p>
                {WIDTHS.map((each) => (
                    <button
                        key={each}
                        type="button"
                        data-testid={`width-${each}`}
                        onClick={() => setWidth(each)}
                    >
                        {each}px
                    </button>
                ))}
            </p>
            <div data-testid="container" style={{ width }}>
                <GridLayout.Root
                    breakpoints={BREAKPOINTS}
                    cols={COLS}
                    rowHeight={40}
                    gap={[10, 10]}
                    defaultLayouts={{ lg: LG }}
                    breakpoint={controlled}
                    onBreakpointChange={(breakpoint) =>
                        setSwitches((all) => [...all, breakpoint])
                    }
                    onLayoutChange={(_layout, all) => {
                        setChanges((count) => count + 1);
                        setLayouts({ ...all });
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
                </GridLayout.Root>
            </div>
            <output data-testid="switches">{switches.join(",")}</output>
            <output data-testid="changes">{changes}</output>
            <pre data-testid="layouts">{JSON.stringify(layouts)}</pre>
        </>
    );
}

export function mountResponsiveFixture() {
    const root = document.getElementById("root");
    if (!root) throw new Error("no #root");
    createRoot(root).render(
        <StrictMode>
            <Fixture />
        </StrictMode>,
    );
}
