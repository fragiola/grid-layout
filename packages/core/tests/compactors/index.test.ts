// What every compactor of the entry promises (the `Compactor` contract): its input is never
// mutated, an item it does not move keeps its object, the items keep their order, and an empty
// layout stays empty. Then how `compactLayout` picks them under `allowOverlap`.

import { describe, expect, test } from "vitest";
import {
    createCompactor,
    fastHorizontalCompactor,
    fastHorizontalOverlapCompactor,
    fastVerticalCompactor,
    fastVerticalOverlapCompactor,
    wrapCompactor,
    wrapOverlapCompactor,
} from "../../src/compactors";
import { compactLayout } from "../../src/layout/edit";
import type { Compactor } from "../../src/layout/types";
import { frozen, get } from "../layout/helpers";
import { messyLayout, randomLayout, withStatics } from "./layouts";

const compactors: Record<string, Compactor> = {
    fastVerticalCompactor,
    fastVerticalOverlapCompactor,
    fastHorizontalCompactor,
    fastHorizontalOverlapCompactor,
    wrapCompactor,
    wrapOverlapCompactor,
    "createCompactor (stays)": createCompactor("vertical", "row", () => {}),
};

describe.each(Object.entries(compactors))("%s", (_, compactor) => {
    test("never mutates its input", () => {
        for (let seed = 1; seed <= 10; seed++) {
            // deep-frozen: a write throws
            const layout = withStatics(messyLayout(60, 12, seed), 4);
            const copy = structuredClone(layout);
            compactor.compact(layout, 12);
            expect(layout).toEqual(copy);
        }
    });

    test("keeps the object of every item it does not move, and the order", () => {
        for (let seed = 1; seed <= 10; seed++) {
            const layout = withStatics(randomLayout(40, 12, seed), 3);
            const compacted = compactor.compact(layout, 12);
            expect(compacted.map((item) => item.id)).toEqual(
                layout.map((item) => item.id),
            );
            compacted.forEach((item, index) => {
                const source = layout[index];
                if (
                    source !== undefined &&
                    source.x === item.x &&
                    source.y === item.y &&
                    source.w === item.w &&
                    source.h === item.h
                ) {
                    expect(item).toBe(source);
                } else {
                    expect(item).toEqual({ ...source, x: item.x, y: item.y });
                }
            });
        }
    });

    test("keeps static items' objects", () => {
        const layout = withStatics(messyLayout(30, 12, 5), 5);
        const compacted = compactor.compact(layout, 12);
        for (const item of layout.filter((entry) => entry.static)) {
            expect(get(compacted, item.id)).toBe(item);
        }
    });

    test("handles an empty layout", () => {
        expect(compactor.compact(frozen([]), 12)).toEqual([]);
    });
});

describe("the overlap compactors", () => {
    test("are the ones with `overlap: true`", () => {
        expect(fastVerticalOverlapCompactor.overlap).toBe(true);
        expect(fastHorizontalOverlapCompactor.overlap).toBe(true);
        expect(wrapOverlapCompactor.overlap).toBe(true);
        expect(fastVerticalCompactor.overlap).toBeUndefined();
        expect(fastHorizontalCompactor.overlap).toBeUndefined();
        expect(wrapCompactor.overlap).toBeUndefined();
    });

    test("resolve moves as their non-overlap twins", () => {
        expect(fastVerticalOverlapCompactor.type).toBe(
            fastVerticalCompactor.type,
        );
        expect(fastHorizontalOverlapCompactor.type).toBe(
            fastHorizontalCompactor.type,
        );
        expect(wrapOverlapCompactor.type).toBe(wrapCompactor.type);
    });
});

describe("compactLayout under allowOverlap", () => {
    // a gap above a, and b overlapping a
    const layout = frozen([
        { id: "a", x: 0, y: 3, w: 2, h: 2 },
        { id: "b", x: 0, y: 4, w: 2, h: 2 },
    ]);
    const settle = (compactor: Compactor) =>
        compactLayout(layout, { cols: 12, compactor, allowOverlap: true });

    test("skips a compactor that is not made for overlaps", () => {
        expect(settle(fastVerticalCompactor)).toBe(layout);
        expect(settle(fastHorizontalCompactor)).toBe(layout);
        expect(settle(wrapCompactor)).toBe(layout);
    });

    test("runs an overlap compactor", () => {
        const settled = settle(fastVerticalOverlapCompactor);
        expect(get(settled, "a")).toMatchObject({ x: 0, y: 0 });
        expect(settled).not.toBe(layout);
    });

    test("runs wrapOverlapCompactor, which moves nothing", () => {
        expect(settle(wrapOverlapCompactor)).toBe(layout);
    });

    test("runs the non-overlap compactors without allowOverlap", () => {
        const settled = compactLayout(layout, {
            cols: 12,
            compactor: fastVerticalCompactor,
        });
        expect(get(settled, "a")).toMatchObject({ y: 0 });
        expect(get(settled, "b")).toMatchObject({ y: 2 });
    });
});
