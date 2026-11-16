import type { CellRows, CellState } from "@fragiola/grid-layout";
import type { ReactNode } from "react";
import { type CellHookResult, useCells } from "../hooks/use-cells";
import { type DivPrimitiveProps, useRenderElement } from "../utils/use-render";

/** `GridLayout.Cells`' props: how many rows, what each cell holds, and each cell element's own. */
export type CellsProps = DivPrimitiveProps<CellState> & {
    /** how many rows: a number, or `auto` (default), the layout's bottom plus one */
    rows?: CellRows | undefined;
    /** what each cell holds, from its state */
    children?: ((cell: CellState) => ReactNode) | undefined;
};

/**
 * The grid's cells, one element each (K6): a background the app draws, placed as a 1 × 1 item
 * there, with structural style only. `className`, `style` and `render` apply to each cell.
 */
export function Cells(props: CellsProps) {
    const { rows, children, ...rest } = props;
    const cells = useCells(rows);
    return cells.map((cell) => (
        <Cell key={`${cell.state.x},${cell.state.y}`} cell={cell} props={rest}>
            {children?.(cell.state)}
        </Cell>
    ));
}

function Cell({
    cell,
    props,
    children,
}: {
    cell: CellHookResult;
    props: DivPrimitiveProps<CellState>;
    children?: ReactNode;
}) {
    return useRenderElement("div", props, {
        state: cell.state,
        props: cell.props,
        children,
    });
}
