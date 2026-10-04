"use client";

import { GridLayout, type Layout } from "@fragiola/grid-layout-react";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { Clickable } from "#/components/atoms/clickable";
import { dashboard } from "../_kit/layouts";
import { WIDGETS, widget } from "../_kit/widgets";
import * as styles from "./styles";

// The layout in the app's state (controlled): adding is a new item in it, at no row in
// particular (`y: Infinity`, below everything: compaction lifts it where there is room);
// removing is the item gone from it. The remove button is a control: pressing it never drags.
export default function AddRemoveItems() {
    const [layout, setLayout] = useState<Layout>(() => dashboard().slice(0, 4));
    const next = WIDGETS.find(
        (entry) => !layout.some((item) => item.id === entry.id),
    );
    const add = () => {
        if (!next) return;
        setLayout([
            ...layout,
            { id: next.id, x: 0, y: Number.POSITIVE_INFINITY, w: 4, h: 2 },
        ]);
    };
    const remove = (id: string) =>
        setLayout(layout.filter((item) => item.id !== id));
    return (
        <div className={styles.frame}>
            <div className={styles.toolbar}>
                <p className={styles.note}>{layout.length} widgets</p>
                <Clickable.Button size="sm" onClick={add} disabled={!next}>
                    <Plus aria-hidden="true" />
                    Add {next ? next.title : "widget"}
                </Clickable.Button>
            </div>
            <GridLayout.Root
                layout={layout}
                onLayoutChange={setLayout}
                rowHeight={56}
                gap={[12, 12]}
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
                                        aria-label={`Remove ${content.title}`}
                                        onClick={() => remove(item.id)}
                                    >
                                        <X aria-hidden="true" />
                                    </Clickable.Button>
                                </span>
                                <span className={styles.value}>
                                    {content.value}
                                </span>
                                <GridLayout.ResizeHandle
                                    side="bottom-end"
                                    aria-label={`Resize ${content.title}`}
                                    className={styles.resizeHandle}
                                />
                            </GridLayout.Item>
                        );
                    }}
                </GridLayout.Items>
                <GridLayout.Placeholder className={styles.placeholder} />
            </GridLayout.Root>
        </div>
    );
}
