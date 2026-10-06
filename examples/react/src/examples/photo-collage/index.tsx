"use client";

import {
    aspectRatio,
    GridLayout,
    type Layout,
    useGridLayout,
    useGridLayoutView,
} from "@fragiola/grid-layout-react";
import { wrapCompactor } from "@fragiola/grid-layout-react/compactors";
import { Shuffle } from "lucide-react";
import { useEffect, useState } from "react";
import { Clickable } from "#/components/atoms/clickable";
import { Artwork } from "../_kit/artwork";
import { seeded } from "../_kit/layouts";
import { PHOTOS, type Photo } from "./photos";
import * as styles from "./styles";

/**
 * The photos in `order`, one per row: the wrap compactor flows them into lines in that order
 * when the grid starts. Each keeps its ratio through its own `aspectRatio` constraint.
 */
function album(order: readonly Photo[]): Layout {
    return order.map((photo, index) => ({
        id: photo.id,
        x: 0,
        y: index,
        w: photo.w,
        h: 8,
        minW: 2,
        constraints: [{ name: "aspectRatio", args: [photo.ratio] }],
    }));
}

/** The album in a new order, the same for the same seed. */
function shuffled(seed: number): Photo[] {
    const random = seeded(seed);
    const order = [...PHOTOS];
    for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [order[i], order[j]] = [order[j] as Photo, order[i] as Photo];
    }
    return order;
}

const byId = new Map(PHOTOS.map((photo) => [photo.id, photo]));

// read when the grid is created: a new registry needs a new grid (a `key`)
const registry = { aspectRatio };

// A photo album laid out as a collage: the wrap compactor (from `/compactors`) flows the photos
// in reading order, like words, each keeping its own ratio. Drag a photo between two others and
// the ones after it move along; resize one and the flow makes room. Shuffle starts a new grid
// from another order.
export default function PhotoCollage() {
    const [seed, setSeed] = useState(0);
    return (
        <div className={styles.frame}>
            <div className={styles.toolbar}>
                <span className={styles.heading}>Summer in Porto</span>
                <span className={styles.count}>{PHOTOS.length} photos</span>
                <Clickable.Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSeed((value) => value + 1)}
                >
                    <Shuffle aria-hidden="true" />
                    Shuffle
                </Clickable.Button>
            </div>
            <GridLayout.Root
                // a new grid per order: `defaultLayout` is read when a grid starts
                key={seed}
                defaultLayout={album(seed === 0 ? PHOTOS : shuffled(seed))}
                compactor={wrapCompactor}
                constraintRegistry={registry}
                rowHeight={10}
                gap={[8, 8]}
                aria-label="Album"
                className={styles.root}
            >
                <KeepRatios />
                <GridLayout.Items>
                    {(item) => {
                        const photo = byId.get(item.id);
                        return photo ? (
                            <PhotoItem key={item.id} photo={photo} />
                        ) : null;
                    }}
                </GridLayout.Items>
                <GridLayout.Placeholder className={styles.placeholder} />
            </GridLayout.Root>
        </div>
    );
}

function PhotoItem({ photo }: { photo: Photo }) {
    return (
        <GridLayout.Item
            itemId={photo.id}
            aria-label={photo.caption}
            className={styles.photo(photo.tone)}
        >
            <Artwork
                seed={photo.seed}
                ratio={photo.ratio}
                className={styles.artwork}
                layers={styles.layers}
            />
            <span className={styles.caption}>{photo.caption}</span>
            <GridLayout.ResizeHandle
                side="bottom-end"
                aria-label={`Resize ${photo.caption}`}
                className={styles.resizeHandle}
            />
        </GridLayout.Item>
    );
}

/**
 * Workaround (docs/examples-gaps.md, E8): a pixel constraint applies when an item is moved or
 * resized, not when the layout loads or the grid's width changes, and the rows a ratio needs
 * depend on the width. Once the width is known, and whenever it changes, each constrained item
 * is resized to its own size with the engine's pixels, which settles its height.
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
