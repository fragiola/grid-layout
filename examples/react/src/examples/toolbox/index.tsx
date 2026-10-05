"use client";

import {
    GridLayout,
    type GridLayoutRef,
    useGridLayoutEvents,
    useGridLayoutRef,
} from "@fragiola/grid-layout-react";
import { Archive } from "lucide-react";
import { type RefObject, useRef, useState } from "react";
import { Clickable } from "#/components/atoms/clickable";
import { dashboard } from "../_kit/layouts";
import { type Stowed, stow, unstow } from "../_kit/toolbox";
import { widget } from "../_kit/widgets";
import * as styles from "./styles";

const layout = dashboard();

// Taking a widget off the grid is the app's (D14): the grid reports a release outside it
// (`onDragStop` with `outside` and the element under the pointer), and the app removes the item
// and keeps it, with its size, in the toolbox. Each widget there is a drag source with the
// widget's own id: dropped back, the same widget comes back. From the keyboard: the button on a
// widget puts it away; Tab to it in the toolbox and press Enter to bring it back.
export default function Toolbox() {
    const gridLayoutRef = useGridLayoutRef();
    const toolbox = useRef<HTMLElement>(null);
    const [stowed, setStowed] = useState<readonly Stowed[]>([
        { id: "refunds", w: 4, h: 2 },
    ]);
    const putAway = (id: string) => {
        const model = gridLayoutRef.current?.model;
        const item = model?.get("item-by", { itemId: id });
        if (!model || !item) return;
        model.run("item.remove", { itemId: id });
        setStowed((all) => stow(all, item));
    };
    return (
        <div className={styles.frame}>
            <Shelf
                gridLayoutRef={gridLayoutRef}
                shelf={toolbox}
                stowed={stowed}
            />
            <GridLayout.Root
                gridLayoutRef={gridLayoutRef}
                defaultLayout={layout}
                rowHeight={48}
                gap={[12, 12]}
                // released off the grid, over the toolbox: put away
                onDragStop={(event) => {
                    const target = event.target;
                    if (
                        event.outside &&
                        target &&
                        toolbox.current?.contains(target)
                    )
                        putAway(event.itemId);
                }}
                // back from the toolbox: it leaves it
                onDrop={({ item }) => setStowed((all) => unstow(all, item.id))}
                aria-label="Dashboard"
                className={styles.root}
            >
                <GridLayout.Items>
                    {(item) => {
                        const content = widget(item.id);
                        return (
                            <GridLayout.Item
                                itemId={item.id}
                                aria-label={content.title}
                                className={styles.item}
                            >
                                <span className={styles.header}>
                                    <span className={styles.title}>
                                        {content.title}
                                    </span>
                                    <Clickable.Button
                                        size="sm"
                                        variant="icon"
                                        aria-label={`Put ${content.title} in the toolbox`}
                                        onClick={() => putAway(item.id)}
                                    >
                                        <Archive aria-hidden="true" />
                                    </Clickable.Button>
                                </span>
                                <span className={styles.value}>
                                    {content.value}
                                </span>
                            </GridLayout.Item>
                        );
                    }}
                </GridLayout.Items>
                <GridLayout.Placeholder className={styles.placeholder} />
            </GridLayout.Root>
        </div>
    );
}

/** The toolbox: where widgets go when they leave the grid, each one a drag source back in. */
function Shelf({
    gridLayoutRef,
    shelf,
    stowed,
}: {
    gridLayoutRef: GridLayoutRef;
    shelf: RefObject<HTMLElement | null>;
    stowed: readonly Stowed[];
}) {
    // a widget held over the toolbox: it shows it would take it
    const open = useHeldOver(gridLayoutRef, shelf);
    return (
        <section
            ref={shelf}
            aria-label="Toolbox"
            data-open={open ? "" : undefined}
            className={styles.toolbox}
        >
            <p className={styles.heading}>Toolbox</p>
            {stowed.length === 0 ? (
                <p className={styles.empty}>
                    Drag a widget here to put it away.
                </p>
            ) : (
                stowed.map((entry) => {
                    const title = widget(entry.id).title;
                    return (
                        <GridLayout.DragSource
                            key={entry.id}
                            gridLayoutRef={gridLayoutRef}
                            itemId={entry.id}
                            item={{ w: entry.w, h: entry.h }}
                            aria-label={`${title}, in the toolbox`}
                            className={styles.source}
                        >
                            {title}
                        </GridLayout.DragSource>
                    );
                })
            )}
        </section>
    );
}

/**
 * Whether a widget held off the grid is over `target` now: the pointer is the grid's while it
 * holds a widget, so the drag's own events say where it is.
 */
function useHeldOver(
    gridLayoutRef: GridLayoutRef,
    target: RefObject<HTMLElement | null>,
): boolean {
    const [over, setOver] = useState(false);
    useGridLayoutEvents((event) => {
        const at = event.nativeEvent;
        const box = target.current?.getBoundingClientRect();
        setOver(
            event.type === "drag" &&
                event.outside &&
                box !== undefined &&
                at instanceof MouseEvent &&
                at.clientX >= box.left &&
                at.clientX <= box.right &&
                at.clientY >= box.top &&
                at.clientY <= box.bottom,
        );
    }, gridLayoutRef);
    return over;
}
