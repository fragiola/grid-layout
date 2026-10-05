// @vitest-environment node
import type { Layout } from "@fragiola/grid-layout";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createGridLayoutRef, GridLayout } from "../src";

const layout: Layout = [{ id: "a", x: 1, y: 0, w: 2, h: 1 }];

function Grid(props: { width?: number }) {
    return (
        <GridLayout.Root
            rowHeight={50}
            gap={[10, 10]}
            defaultLayout={layout}
            {...props}
        >
            <GridLayout.Items>
                {(item) => (
                    <GridLayout.Item itemId={item.id}>
                        {item.id}
                    </GridLayout.Item>
                )}
            </GridLayout.Items>
            <GridLayout.Placeholder />
        </GridLayout.Root>
    );
}

describe("server rendering", () => {
    it("renders the root without a document, and the items once a width is known", () => {
        const html = renderToString(<Grid />);
        expect(html).toContain('data-grid-layout-part="root"');
        // items mount already placed, on the client once the root is measured
        expect(html).not.toContain('data-grid-layout-part="item"');
    });

    it("places items when given a width", () => {
        const html = renderToString(<Grid width={1200} />);
        expect(html).toContain("translate(109px, 10px)");
    });

    it("renders a drag source outside a root, and no drag preview", () => {
        const gridLayoutRef = createGridLayoutRef();
        const html = renderToString(
            <>
                <GridLayout.DragSource
                    gridLayoutRef={gridLayoutRef}
                    item={{ w: 1, h: 1 }}
                />
                <GridLayout.DragPreview gridLayoutRef={gridLayoutRef} />
                <Grid width={1200} />
            </>,
        );
        expect(html).toContain('data-grid-layout-part="drag-source"');
        expect(html).toContain('tabindex="0"');
        expect(html).not.toContain("drag-preview");
    });

    it("renders a responsive root at its default breakpoint, without a width", () => {
        const html = renderToString(
            <GridLayout.Root
                breakpoints={{ lg: 996, sm: 0 }}
                cols={{ lg: 12, sm: 6 }}
                defaultBreakpoint="sm"
                defaultLayouts={{ sm: layout }}
            />,
        );
        expect(html).toContain('data-breakpoint="sm"');
    });
});
