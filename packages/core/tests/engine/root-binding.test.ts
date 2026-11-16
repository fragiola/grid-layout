import { describe, expect, it, vi } from "vitest";
import {
    breakpointInfoOf,
    breakpointKey,
    createGridLayoutRef,
    createGridLayoutRootBinding,
    type GridLayoutRootOptions,
    type Layout,
} from "../../src";
import { attachGridLayoutRef } from "../../src/engine/grid-layout-ref";

// The root's decisions, framework-free: every adapter's `Root` calls these steps (D3, D9). The
// adapters' own tests cover them through their components; these pin them without one.

const two: Layout = [
    { id: "a", x: 0, y: 0, w: 2, h: 1 },
    { id: "b", x: 2, y: 0, w: 2, h: 1 },
];

function bind(initial: GridLayoutRootOptions) {
    let props = initial;
    const binding = createGridLayoutRootBinding(() => props);
    return {
        binding,
        set(next: GridLayoutRootOptions) {
            props = next;
        },
    };
}

describe("the root binding", () => {
    it("makes the model and the engine from the first props", () => {
        const { binding } = bind({ defaultLayout: two, cols: 6 });
        expect(binding.model.get("layout")).toEqual(two);
        expect(binding.model.get("cols")).toBe(6);
        expect(binding.engine.get("geometry")).toBeUndefined();
    });

    it("tells a layout corrected on mount once, and a valid one never", () => {
        const onLayoutChange = vi.fn();
        const floating: Layout = [{ id: "a", x: 0, y: 3, w: 2, h: 1 }];
        const { binding } = bind({ layout: floating, onLayoutChange });
        const stop = binding.listenModel(() => {});
        binding.configure();
        binding.syncLayout();
        expect(onLayoutChange).toHaveBeenCalledTimes(1);
        expect(onLayoutChange.mock.calls[0]?.[0][0].y).toBe(0);
        stop();

        const told = vi.fn();
        const valid = bind({ layout: two, onLayoutChange: told }).binding;
        valid.listenModel(() => {});
        valid.configure();
        valid.syncLayout();
        expect(told).not.toHaveBeenCalled();
    });

    it("applies a new controlled layout without telling it, and asks a render to undo a change the parent did not take", () => {
        const onLayoutChange = vi.fn();
        const rerender = vi.fn();
        const root = bind({ layout: two, onLayoutChange });
        root.binding.listenModel(rerender);
        root.binding.syncLayout();
        const moved: Layout = [
            { id: "a", x: 0, y: 0, w: 2, h: 1 },
            { id: "b", x: 4, y: 0, w: 2, h: 1 },
        ];
        root.set({ layout: moved, onLayoutChange });
        root.binding.syncLayout();
        expect(root.binding.model.get("layout")).toEqual(moved);
        expect(onLayoutChange).not.toHaveBeenCalled();

        // a change of the user's: told once, and a render asked, the prop being controlled
        root.binding.model.run("item.move", { itemId: "a", x: 2, y: 1 });
        expect(onLayoutChange).toHaveBeenCalledTimes(1);
        expect(rerender).toHaveBeenCalledTimes(1);
        // the parent kept its prop: the next render puts it back, untold
        root.binding.syncLayout();
        expect(root.binding.model.get("layout")).toEqual(moved);
        expect(onLayoutChange).toHaveBeenCalledTimes(1);
    });

    it("configures the rules again only when one changes, maps compared by content", () => {
        const root = bind({ cols: { lg: 12 }, breakpoints: { lg: 0 } });
        const run = vi.spyOn(root.binding.model, "run");
        root.binding.configure();
        root.set({ cols: { lg: 12 }, breakpoints: { lg: 0 } });
        root.binding.configure();
        expect(run).toHaveBeenCalledTimes(1);
        root.set({ cols: { lg: 6 }, breakpoints: { lg: 0 } });
        root.binding.configure();
        expect(run).toHaveBeenCalledTimes(2);
        expect(root.binding.model.get("cols")).toBe(6);
    });

    it("throws the mount's error for rules that cannot be used", () => {
        const root = bind({});
        root.binding.configure();
        root.set({ cols: 0 });
        expect(() => root.binding.configure()).toThrow(/invalid options/);
    });
});

describe("the grid layout ref", () => {
    it("holds one grid at a time and lets it go", () => {
        const ref = createGridLayoutRef();
        const listener = vi.fn();
        ref.subscribe(listener);
        const { binding } = bind({});
        const grid = { model: binding.model, engine: binding.engine };
        const release = attachGridLayoutRef(ref, grid);
        expect(ref.current).toBe(grid);
        const error = vi.spyOn(console, "error").mockImplementation(() => {});
        attachGridLayoutRef(ref, { ...grid });
        expect(error).toHaveBeenCalledTimes(1);
        expect(ref.current).toBe(grid);
        release();
        expect(ref.current).toBeNull();
        expect(listener).toHaveBeenCalledTimes(2);
        error.mockRestore();
    });
});

describe("the breakpoint key", () => {
    it("is empty without a view, and stands for the breakpoint, the columns and the width", () => {
        const { binding } = bind({
            cols: { lg: 12, sm: 4 },
            breakpoints: { lg: 1000, sm: 0 },
        });
        expect(breakpointKey(undefined)).toBe("");
        expect(breakpointInfoOf(binding.model, "")).toBeUndefined();
        const view = binding.engine.adapter.getView();
        expect(breakpointInfoOf(binding.model, breakpointKey(view))).toEqual({
            breakpoint: view.breakpoint,
            cols: binding.model.get("cols"),
            width: 0,
        });
    });
});
