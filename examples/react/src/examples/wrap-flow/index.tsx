"use client";

import { GridLayout, type Layout } from "@fragiola/grid-layout-react";
import { wrapCompactor } from "@fragiola/grid-layout-react/compactors";
import { useState } from "react";
import { Clickable } from "#/components/atoms/clickable";
import * as styles from "./styles";

const SENTENCE =
    "Tiles flow in reading order like words of a paragraph wrapping at the last column drag one and everything after it shifts";

/**
 * One tile per word, the long ones two cells wide, each on its own row: the compactor flows them
 * into lines when the grid starts, in this order.
 */
const START: Layout = SENTENCE.split(" ").map((word, index) => ({
    id: word,
    x: 0,
    y: index,
    w: word.length >= 7 ? 2 : 1,
    h: 1,
}));

// The wrap compactor (an opt-in, from `/compactors`) lays items out like words in a paragraph:
// in reading order, each in the first free cells after the one before, wrapping at the last
// column. Dropping a tile between two others reorders the flow: everything after it moves along.
// Fewer or more columns reflow the same order.
export default function WrapFlow() {
    const [cols, setCols] = useState(6);
    return (
        <div className={styles.frame}>
            <div className={styles.toolbar}>
                <span className={styles.option}>
                    <Clickable.Button
                        size="sm"
                        variant="outline"
                        aria-label="Fewer columns"
                        disabled={cols <= 3}
                        onClick={() => setCols(cols - 1)}
                    >
                        −
                    </Clickable.Button>
                    <output aria-label="Columns" className={styles.count}>
                        {cols}
                    </output>
                    <Clickable.Button
                        size="sm"
                        variant="outline"
                        aria-label="More columns"
                        disabled={cols >= 10}
                        onClick={() => setCols(cols + 1)}
                    >
                        +
                    </Clickable.Button>
                    <span>columns</span>
                </span>
            </div>
            <GridLayout.Root
                defaultLayout={START}
                cols={cols}
                compactor={wrapCompactor}
                rowHeight={44}
                gap={[8, 8]}
                aria-label="Sentence"
                className={styles.root}
            >
                <GridLayout.Items>
                    {(item) => (
                        <GridLayout.Item
                            itemId={item.id}
                            aria-label={item.id}
                            className={styles.item}
                        >
                            {item.id}
                        </GridLayout.Item>
                    )}
                </GridLayout.Items>
                <GridLayout.Placeholder className={styles.placeholder} />
            </GridLayout.Root>
        </div>
    );
}
