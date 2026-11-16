import type { LayoutItem } from "@fragiola/grid-layout";
import { Fragment, type ReactNode } from "react";
import { useViewContext } from "../context";

export interface ItemsProps {
    /** renders one item, keyed by its id */
    children: (item: LayoutItem) => ReactNode;
}

/**
 * The committed layout's items, in order: `children` renders each one. Nothing renders until the
 * root's width is known (or given): an item then mounts already in place, so an app's transition
 * never animates it in from the corner.
 */
export function Items({ children }: ItemsProps) {
    const view = useViewContext("Items");
    if (!view.geometry) return null;
    return view.layout.map((item) => (
        <Fragment key={item.id}>{children(item)}</Fragment>
    ));
}
