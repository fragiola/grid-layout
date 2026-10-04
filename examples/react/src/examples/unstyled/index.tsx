"use client";

import { GridLayout } from "@fragiola/grid-layout-react";
import { dashboard } from "../_kit/layouts";
import { widget } from "../_kit/widgets";
import * as styles from "./styles";

const layout = dashboard();

// The primitives with nothing on top: no theme, no colours, a one-pixel outline so the boxes can
// be seen. Everything the grid layout does is here; everything it looks like is up to you.
export default function Unstyled() {
    return (
        <GridLayout.Root
            defaultLayout={layout}
            rowHeight={56}
            aria-label="Unstyled grid"
        >
            <GridLayout.Items>
                {(item) => (
                    <GridLayout.Item
                        itemId={item.id}
                        aria-label={widget(item.id).title}
                        className={styles.item}
                    >
                        {widget(item.id).title}
                        <GridLayout.ResizeHandle
                            side="bottom-end"
                            aria-label={`Resize ${widget(item.id).title}`}
                            className={styles.resizeHandle}
                        />
                    </GridLayout.Item>
                )}
            </GridLayout.Items>
            <GridLayout.Placeholder className={styles.placeholder} />
        </GridLayout.Root>
    );
}
