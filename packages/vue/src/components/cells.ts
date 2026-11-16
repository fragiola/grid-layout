import type { CellRows, CellState } from "@fragiola/grid-layout";
import { useCells } from "../composables/use-cells";
import {
    definePrimitive,
    type GridLayoutComponent,
    type PrimitiveProps,
    type SlotFunction,
} from "../utils/primitive";
import { type RenderSlot, renderElement } from "../utils/render";

export interface CellsProps extends PrimitiveProps {
    /** how many rows: a number, or `auto` (default), the layout's bottom plus one */
    rows?: CellRows | undefined;
}

export interface CellsSlots extends RenderSlot<CellState> {
    /** what each cell holds, from its state: `v-slot="{ cell }"` */
    default?: SlotFunction<{ cell: CellState }>;
}

/**
 * The grid's cells, one element each (K6): a background the app draws, placed as a 1 × 1 item
 * there, with structural style only. `class`, `style`, `as` and the `render` slot apply to each
 * cell.
 */
export const Cells: GridLayoutComponent<CellsProps, CellsSlots> =
    definePrimitive<CellsProps, CellsSlots>(
        "Cells",
        ["rows", "as"],
        (props, { attrs, slots }) => {
            const cells = useCells(() => props.rows);
            return () =>
                cells.value.map((cell) => {
                    const { style, ...own } = cell.props;
                    const node = renderElement({
                        tag: "div",
                        as: props.as,
                        attrs,
                        render: slots.render,
                        state: cell.state,
                        props: {
                            ...own,
                            key: `${cell.state.x},${cell.state.y}`,
                        },
                        style,
                        children: () => slots.default?.({ cell: cell.state }),
                    });
                    return node;
                });
        },
    );
