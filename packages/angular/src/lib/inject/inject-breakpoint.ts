import { computed, type Signal } from "@angular/core";
import {
    type BreakpointInfo,
    breakpointInfoOf,
    breakpointKey,
    type GridLayoutRef,
} from "@fragiola/grid-layout";
import { injectRootOrRef } from "../context";
import { fromStore, gridOf } from "../utils/signals";

/**
 * The grid's breakpoint, its columns and its width, inside a root or (through its
 * `gridLayoutRef`) from anywhere; `undefined` from outside before a root holds the ref.
 */
export function injectBreakpoint(): Signal<BreakpointInfo>;
export function injectBreakpoint(
    gridLayoutRef: GridLayoutRef | undefined,
): Signal<BreakpointInfo | undefined>;
export function injectBreakpoint(
    gridLayoutRef?: GridLayoutRef,
): Signal<BreakpointInfo | undefined> {
    const grid = gridOf(
        () => gridLayoutRef,
        injectRootOrRef("injectBreakpoint", gridLayoutRef),
    );
    // only these three: a gesture's preview changes elsewhere tell nothing here
    const key = fromStore(
        () => grid()?.engine.adapter.subscribe,
        () => breakpointKey(grid()?.engine.adapter.getView()),
    );
    return computed(() => {
        const current = grid();
        return current ? breakpointInfoOf(current.model, key()) : undefined;
    });
}
