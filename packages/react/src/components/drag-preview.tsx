import type { DragPreviewState } from "@fragiola/grid-layout";
import type { ReactNode } from "react";
import { useDragPreview } from "../hooks/use-drag-preview";
import type { GridLayoutRef } from "../utils/grid-layout-ref";
import { type DivPrimitiveProps, useRenderElement } from "../utils/use-render";

/** `GridLayout.DragPreview`'s props: its grid, its children, and an element's own. */
export type DragPreviewProps = DivPrimitiveProps<DragPreviewState> & {
    /** the grid, for a preview outside its root (inside one, the root around it) */
    gridLayoutRef?: GridLayoutRef | undefined;
    /** what it shows: the app's, or a function of its state (the drop's `data`) */
    children?: ReactNode | ((state: DragPreviewState) => ReactNode);
};

/**
 * What follows the pointer while it brings a new item: rendered only then, kept at the pointer by
 * the engine (`position: fixed`, so no transformed ancestor). Its look is the app's.
 */
export function DragPreview(props: DragPreviewProps) {
    const { gridLayoutRef, ...rest } = props;
    const preview = useDragPreview(gridLayoutRef);
    // the app's functions of the state run only while there is one
    return preview ? <ShownPreview {...rest} preview={preview} /> : null;
}

function ShownPreview(
    props: Omit<DragPreviewProps, "gridLayoutRef"> & {
        preview: NonNullable<ReturnType<typeof useDragPreview>>;
    },
) {
    const { preview, children, ...rest } = props;
    const { ref, ...internal } = preview.props;
    return useRenderElement("div", rest, {
        state: preview.state,
        props: internal,
        ref,
        children:
            typeof children === "function" ? children(preview.state) : children,
        // the engine writes its transform
        drop: ["transform"],
    });
}
