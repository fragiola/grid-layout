import { describe, expect, it } from "vitest";
import {
    dragHandlePart,
    itemPart,
    placeholderPart,
    resizeHandlePart,
    rootPart,
} from "../../src/engine/parts";
import type { GridLayoutView } from "../../src/engine/types";
import type { LayoutItem } from "../../src/layout/types";

// The parts as pure functions of a view: state through data-* (present or absent), structural
// style only, mirrored in right-to-left.

const a: LayoutItem = { id: "a", x: 0, y: 0, w: 2, h: 1 };
const s: LayoutItem = { id: "s", x: 2, y: 0, w: 1, h: 1, static: true };

function view(over: Partial<GridLayoutView> = {}): GridLayoutView {
    return {
        width: 400,
        height: 120,
        dir: "ltr",
        geometry: {
            width: 400,
            cols: 4,
            rowHeight: 50,
            gap: [10, 10],
            padding: [10, 10],
        },
        layout: [a, s],
        items: new Map([
            ["a", a],
            ["s", s],
        ]),
        rects: {
            a: { left: 10, top: 10, width: 185, height: 50 },
            s: { left: 205, top: 10, width: 87, height: 50 },
        },
        gesture: undefined,
        handled: new Set(),
        draggable: true,
        resizable: true,
        ...over,
    };
}

describe("the parts", () => {
    it("the root is relative and as tall as the layout, with its gesture as data", () => {
        expect(rootPart(view())).toEqual({
            state: {
                dragging: false,
                resizing: false,
                grabbed: false,
                dir: "ltr",
            },
            attributes: { "data-grid-layout-part": "root" },
            style: { position: "relative", height: 120 },
        });
        expect(rootPart(view({ height: 0 })).style).toEqual({
            position: "relative",
        });
    });

    it("an item is placed by a transform, sized, and says what it can do", () => {
        const part = itemPart(view(), "a");
        expect(part.attributes).toEqual({
            "data-grid-layout-part": "item",
            "data-item-id": "a",
            "data-draggable": "",
            "data-resizable": "",
        });
        expect(part.style).toEqual({
            position: "absolute",
            top: 0,
            left: 0,
            width: 185,
            height: 50,
            transform: "translate(10px, 10px)",
            boxSizing: "border-box",
        });
        expect(part.tabIndex).toBe(0);
        expect(itemPart(view(), "s").attributes).toEqual({
            "data-grid-layout-part": "item",
            "data-item-id": "s",
            "data-static": "",
        });
    });

    it("mirrors an item's place in right-to-left", () => {
        expect(itemPart(view({ dir: "rtl" }), "a").style.transform).toBe(
            `translate(${400 - 10 - 185}px, 10px)`,
        );
    });

    it("gives the tab stop to the drag handle, and the handles touch-action none", () => {
        const handled = view({ handled: new Set(["a"]) });
        expect(itemPart(handled, "a").tabIndex).toBe(-1);
        expect(dragHandlePart(handled, "a")).toMatchObject({
            tabIndex: 0,
            style: { touchAction: "none" },
            attributes: {
                "data-grid-layout-part": "drag-handle",
                "data-draggable": "",
            },
        });
        expect(resizeHandlePart(handled, "a", "bottom-end")).toEqual({
            state: {
                itemId: "a",
                side: "bottom-end",
                resizing: false,
                resizable: true,
            },
            attributes: {
                "data-grid-layout-part": "resize-handle",
                "data-side": "bottom-end",
            },
            style: { touchAction: "none" },
        });
        expect(resizeHandlePart(handled, "s", "end").state.resizable).toBe(
            false,
        );
    });

    it("shows the placeholder only during a gesture, above nothing and never taking the pointer", () => {
        expect(placeholderPart(view())).toBeUndefined();
        const gesture = {
            kind: "move" as const,
            source: "pointer" as const,
            itemId: "a",
            side: undefined,
            before: a,
            preview: [a, s],
            placeholder: { left: 205, top: 70, width: 185, height: 50 },
        };
        const during = view({ gesture });
        expect(placeholderPart(during)).toEqual({
            state: { itemId: "a", kind: "move" },
            attributes: {
                "data-grid-layout-part": "placeholder",
                "data-kind": "move",
            },
            style: {
                position: "absolute",
                top: 0,
                left: 0,
                width: 185,
                height: 50,
                transform: "translate(205px, 70px)",
                boxSizing: "border-box",
                pointerEvents: "none",
            },
        });
        expect(itemPart(during, "a")).toMatchObject({
            state: { dragging: true },
            attributes: { "data-dragging": "" },
            style: { zIndex: 1 },
        });
        expect(rootPart(during).attributes).toMatchObject({
            "data-dragging": "",
        });
    });
});
