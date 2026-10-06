"use client";

import {
    aspectRatio,
    GridLayout,
    type Layout,
    useGridLayout,
    useGridLayoutView,
} from "@fragiola/grid-layout-react";
import { useEffect } from "react";
import * as styles from "./styles";

// An item stores its own constraints as data, so the layout still saves as JSON: a name the
// grid's registry holds, with the factory's arguments. They come after the grid's (gridBounds,
// minMaxSize). aspectRatio keeps the ratio in pixels, the height following the width, as closely
// as whole rows allow.
const ratio = (value: number) => [{ name: "aspectRatio", args: [value] }];

const layout: Layout = [
    { id: "16:9 video", x: 0, y: 0, w: 4, h: 8, constraints: ratio(16 / 9) },
    { id: "4:3 photo", x: 4, y: 0, w: 3, h: 8, constraints: ratio(4 / 3) },
    { id: "1:1 square", x: 7, y: 0, w: 2, h: 7, constraints: ratio(1) },
    { id: "2:1 banner", x: 9, y: 0, w: 3, h: 6, constraints: ratio(2) },
    { id: "Free", x: 0, y: 8, w: 3, h: 3 },
];

// read when the grid is created: a new registry needs a new grid (a `key`)
const registry = { aspectRatio };

export default function AspectRatio() {
    return (
        <div className={styles.frame}>
            <GridLayout.Root
                defaultLayout={layout}
                constraintRegistry={registry}
                rowHeight={20}
                gap={[10, 10]}
                aria-label="Media with fixed ratios"
                className={styles.root}
            >
                <KeepRatios />
                <GridLayout.Items>
                    {(item) => (
                        <GridLayout.Item
                            itemId={item.id}
                            aria-label={item.id}
                            className={styles.item}
                        >
                            <span className={styles.title}>{item.id}</span>
                            <span className={styles.value}>
                                {item.w} × {item.h}
                            </span>
                            <GridLayout.ResizeHandle
                                side="bottom-end"
                                aria-label={`Resize ${item.id}`}
                                className={styles.resizeHandle}
                            />
                        </GridLayout.Item>
                    )}
                </GridLayout.Items>
                <GridLayout.Placeholder className={styles.placeholder} />
            </GridLayout.Root>
        </div>
    );
}

/**
 * Workaround: a pixel constraint applies when an item is moved or resized, not when the layout
 * loads or the grid's width changes, and the rows a ratio needs depend on the width. Once the
 * width is known, and whenever it changes, each constrained item is resized to its own size with
 * the engine's pixels, which settles its height.
 */
function KeepRatios() {
    const { model, engine } = useGridLayout();
    const { width } = useGridLayoutView();
    useEffect(() => {
        const geometry = engine.get("geometry");
        if (width === 0 || !geometry) return;
        for (const item of model.get("layout")) {
            if (!item.constraints?.length) continue;
            model.run(
                "item.resize",
                { itemId: item.id, w: item.w, h: item.h },
                { env: { geometry } },
            );
        }
    }, [model, engine, width]);
    return null;
}
