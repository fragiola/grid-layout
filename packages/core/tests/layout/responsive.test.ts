import { describe, expect, it } from "vitest";
import { noCompactor, verticalCompactor } from "../../src/layout/compact";
import {
    breakpointFor,
    generateLayout,
    sortBreakpoints,
} from "../../src/layout/responsive";
import type { Layout, LayoutRules } from "../../src/layout/types";
import { boxes, frozen } from "./helpers";

// Breakpoints by width and generated layouts, on frozen input (D6). Cases ported from React Grid
// Layout's test/spec/responsive-generation-test.ts, responsive-gap-collapse-test.tsx and
// responsive-settle-test.tsx where they hold.

const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 };
const rules = (cols: number): LayoutRules => ({
    cols,
    compactor: verticalCompactor,
});

describe("breakpoints by width", () => {
    it("sorts breakpoints by width, ascending", () => {
        expect(sortBreakpoints(BREAKPOINTS)).toEqual([
            "xxs",
            "xs",
            "sm",
            "md",
            "lg",
        ]);
    });

    it("gives the widest breakpoint whose minimum is at most the width (R1)", () => {
        expect(breakpointFor(BREAKPOINTS, 1300)).toBe("lg");
        expect(breakpointFor(BREAKPOINTS, 1000)).toBe("md");
        // React Grid Layout's must be exceeded: it says sm at exactly 996
        expect(breakpointFor(BREAKPOINTS, 996)).toBe("md");
        expect(breakpointFor(BREAKPOINTS, 0)).toBe("xxs");
    });

    it("gives the narrowest breakpoint under every minimum, and none without breakpoints", () => {
        expect(breakpointFor({ lg: 1200, md: 996 }, 500)).toBe("md");
        expect(breakpointFor({}, 500)).toBeUndefined();
    });
});

describe("generating a breakpoint's layout", () => {
    const lg = frozen([
        { id: "A", x: 0, y: 0, w: 12, h: 1 },
        { id: "C", x: 0, y: 2, w: 12, h: 1 },
    ]);

    it("collapses a mid-grid gap when generating a smaller layout (react-grid-layout#1744)", () => {
        const md = generateLayout({
            layouts: { lg },
            breakpoints: BREAKPOINTS,
            target: "md",
            from: "lg",
            rules: rules(10),
        });
        expect(boxes(md)).toEqual({ A: [0, 0, 10, 1], C: [0, 1, 10, 1] });
    });

    it("takes the nearest larger breakpoint's layout, else the last active one's, else a smaller one's", () => {
        const sm: Layout = frozen([{ id: "S", x: 0, y: 0, w: 2, h: 1 }]);
        const fromLarger = generateLayout({
            layouts: { lg, sm },
            breakpoints: BREAKPOINTS,
            target: "md",
            from: undefined,
            rules: rules(10),
        });
        expect(fromLarger.map((item) => item.id)).toEqual(["A", "C"]);
        const fromLast = generateLayout({
            layouts: { sm },
            breakpoints: BREAKPOINTS,
            target: "md",
            from: "sm",
            rules: rules(10),
        });
        expect(fromLast.map((item) => item.id)).toEqual(["S"]);
        const fromSmaller = generateLayout({
            layouts: { sm },
            breakpoints: BREAKPOINTS,
            target: "md",
            from: undefined,
            rules: rules(10),
        });
        expect(fromSmaller.map((item) => item.id)).toEqual(["S"]);
        expect(
            generateLayout({
                layouts: {},
                breakpoints: BREAKPOINTS,
                target: "md",
                from: undefined,
                rules: rules(10),
            }),
        ).toEqual([]);
    });

    it("keeps a stored layout as it is: a round trip comes back to it (react-grid-layout#2271)", () => {
        const settled = frozen([
            { id: "A", x: 0, y: 0, w: 12, h: 1 },
            { id: "C", x: 0, y: 1, w: 12, h: 1 },
        ]);
        const md = frozen([
            { id: "A", x: 2, y: 0, w: 4, h: 1 },
            { id: "C", x: 0, y: 1, w: 10, h: 1 },
        ]);
        expect(
            generateLayout({
                layouts: { lg: settled, md },
                breakpoints: BREAKPOINTS,
                target: "lg",
                from: "md",
                rules: rules(12),
            }),
        ).toBe(settled);
    });

    it("brings a stored layout up to date with the last active one's items", () => {
        const md = frozen([
            { id: "A", x: 2, y: 0, w: 4, h: 1 },
            { id: "gone", x: 6, y: 0, w: 2, h: 1 },
        ]);
        const next = generateLayout({
            layouts: { lg, md },
            breakpoints: BREAKPOINTS,
            target: "md",
            from: "lg",
            rules: rules(10),
        });
        // A keeps its md place; C comes in where lg has it, settled; gone goes
        expect(boxes(next)).toEqual({ A: [2, 0, 4, 1], C: [0, 1, 10, 1] });
    });

    it("leaves a gap a compactor keeps, as it would anywhere", () => {
        const md = generateLayout({
            layouts: { lg },
            breakpoints: BREAKPOINTS,
            target: "md",
            from: "lg",
            rules: { cols: 10, compactor: noCompactor },
        });
        expect(boxes(md)).toEqual({ A: [0, 0, 10, 1], C: [0, 2, 10, 1] });
    });
});
