import { GridLayout } from "@fragiola/grid-layout-react";
import { GripVertical } from "lucide-react";
import type { ReactNode } from "react";
import * as styles from "./styles";

/**
 * A widget's frame: its header is the grip it moves by (and its tab stop), with a short reading
 * beside it; the corner resizes it.
 */
export function Card({
    id,
    title,
    aside,
    children,
    ...rest
}: {
    id: string;
    title: string;
    /** a short reading at the header's end */
    aside?: ReactNode;
    children: ReactNode;
    /** state the app marks the tile with (`data-critical`) */
    "data-critical"?: "" | undefined;
}) {
    return (
        <GridLayout.Item
            itemId={id}
            aria-label={title}
            className={styles.item}
            {...rest}
        >
            <span className={styles.header}>
                <GridLayout.DragHandle
                    aria-label={`Move ${title}`}
                    className={styles.handle}
                >
                    <GripVertical aria-hidden="true" className={styles.grip} />
                    <span className={styles.title}>{title}</span>
                </GridLayout.DragHandle>
                {aside === undefined ? null : (
                    <span className={styles.aside}>{aside}</span>
                )}
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
