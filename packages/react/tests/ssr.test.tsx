// @vitest-environment node
import type { Layout } from "@fragiola/grid-layout";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GridLayout } from "../src";

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
    it("renders without a document, items unplaced until measured", () => {
        const html = renderToString(<Grid />);
        expect(html).toContain('data-grid-layout-part="item"');
        expect(html).not.toContain("translate(");
    });

    it("places items when given a width", () => {
        const html = renderToString(<Grid width={1200} />);
        expect(html).toContain("translate(109px, 10px)");
    });
});
