"use client";

import {
    GridLayout,
    type GridLayoutRef,
    type Layout,
    useGridLayoutRef,
    useGridLayoutView,
} from "@fragiola/grid-layout-react";
import { WIDGETS, widget } from "../_kit/widgets";
import * as styles from "./styles";

const START: Layout = [
    { id: "revenue", x: 0, y: 0, w: 2, h: 1 },
    { id: "orders", x: 0, y: 1, w: 1, h: 1 },
    { id: "visitors", x: 1, y: 1, w: 1, h: 1 },
];

const SHEET = WIDGETS.slice(3, 9);

// A drag source starts at the touch (`touch-action: none` on it): no hold, as a handle. The
// sheet scrolls sideways from its edges, not from a source. From the keyboard, Enter on a source
// brings its widget in at the first free cell. Each source names its widget's own id: what the
// grid shows is the app's content for that id, and a widget on the grid is not offered again.
export default function WidgetSheet() {
    const gridLayoutRef = useGridLayoutRef();
    return (
        <div className={styles.frame}>
            <div className={styles.phone}>
                <div className={styles.screen}>
                    <GridLayout.Root
                        gridLayoutRef={gridLayoutRef}
                        cols={2}
                        rowHeight={84}
                        gap={[10, 10]}
                        defaultLayout={START}
                        aria-label="Your widgets"
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
                                        <span className={styles.title}>
                                            {content.title}
                                        </span>
                                        <span className={styles.value}>
                                            {content.value}
                                        </span>
                                    </GridLayout.Item>
                                );
                            }}
                        </GridLayout.Items>
                        <GridLayout.Placeholder
                            className={styles.placeholder}
                        />
                    </GridLayout.Root>
                </div>
                <Sheet gridLayoutRef={gridLayoutRef} />
                <GridLayout.DragPreview
                    gridLayoutRef={gridLayoutRef}
                    className={styles.preview}
                >
                    {(state) => widget(state.itemId).title}
                </GridLayout.DragPreview>
            </div>
        </div>
    );
}

/** The widgets the grid does not show yet, each a drag source with the widget's own id. */
function Sheet({ gridLayoutRef }: { gridLayoutRef: GridLayoutRef }) {
    const layout = useGridLayoutView(gridLayoutRef)?.layout ?? [];
    const left = SHEET.filter(
        (entry) => !layout.some((item) => item.id === entry.id),
    );
    return (
        <section aria-label="Widgets to add" className={styles.sheet}>
            <p className={styles.handle} aria-hidden="true" />
            <div className={styles.shelf}>
                {left.length === 0 && (
                    <p className={styles.empty}>Every widget is on the grid.</p>
                )}
                {left.map((entry) => (
                    <GridLayout.DragSource
                        key={entry.id}
                        gridLayoutRef={gridLayoutRef}
                        itemId={entry.id}
                        item={{ w: 1, h: 1 }}
                        aria-label={`Add ${entry.title}`}
                        className={styles.source}
                    >
                        <span className={styles.title}>{entry.title}</span>
                        <span className={styles.sourceValue}>
                            {entry.value}
                        </span>
                    </GridLayout.DragSource>
                ))}
            </div>
        </section>
    );
}
