import { GridLayout } from "@fragiola/grid-layout-react";
import { GripVertical } from "lucide-react";
import type { ReactNode } from "react";
import * as styles from "./styles";

/**
 * A widget's frame: its header is the grip it moves by (and its tab stop), with room for the
 * widget's own controls beside it; the corner resizes it.
 */
export function Card({
    id,
    title,
    controls,
    children,
}: {
    id: string;
    title: string;
    /** a filter, beside the grip: a native control, so it never starts a drag */
    controls?: ReactNode;
    children: ReactNode;
}) {
    return (
        <GridLayout.Item itemId={id} aria-label={title} className={styles.item}>
            <span className={styles.header}>
                <GridLayout.DragHandle
                    aria-label={`Move ${title}`}
                    className={styles.handle}
                >
                    <GripVertical aria-hidden="true" className={styles.grip} />
                    <span className={styles.title}>{title}</span>
                </GridLayout.DragHandle>
                {controls}
            </span>
            {children}
            <GridLayout.ResizeHandle
                side="bottom-end"
                aria-label={`Resize ${title}`}
                className={styles.resizeHandle}
            />
        </GridLayout.Item>
    );
}
