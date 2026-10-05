"use client";

import { GridLayout } from "@fragiola/grid-layout-react";
import { GripVertical, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Clickable } from "#/components/atoms/clickable";
import { dashboard } from "../_kit/layouts";
import { widget } from "../_kit/widgets";
import * as styles from "./styles";

const layout = dashboard().slice(0, 4);

// Each card drags only from its grip: a DragHandle makes itself the only place the item moves
// from, and the item's tab stop. The card's body is the app's: a field to type in and a button
// to press, neither of which ever starts a drag.
export default function DragHandle() {
    return (
        <div className={styles.frame}>
            <GridLayout.Root
                defaultLayout={layout}
                rowHeight={76}
                gap={[12, 12]}
                aria-label="Cards with handles"
                className={styles.root}
            >
                <GridLayout.Items>
                    {(item) => <Card key={item.id} id={item.id} />}
                </GridLayout.Items>
                <GridLayout.Placeholder className={styles.placeholder} />
            </GridLayout.Root>
        </div>
    );
}

function Card({ id }: { id: string }) {
    const content = widget(id);
    const [refreshed, setRefreshed] = useState(0);
    return (
        <GridLayout.Item
            itemId={id}
            aria-label={content.title}
            className={styles.item}
        >
            <span className={styles.header}>
                <GridLayout.DragHandle
                    aria-label={`Move ${content.title}`}
                    aria-roledescription="drag handle"
                    className={styles.handle}
                >
                    <GripVertical aria-hidden="true" />
                </GridLayout.DragHandle>
                <span className={styles.title}>{content.title}</span>
                <Clickable.Button
                    size="sm"
                    variant="icon"
                    aria-label={`Refresh ${content.title}`}
                    onClick={() => setRefreshed((count) => count + 1)}
                >
                    <RefreshCw aria-hidden="true" />
                </Clickable.Button>
            </span>
            <span className={styles.value}>{content.value}</span>
            <input
                aria-label={`Note on ${content.title}`}
                placeholder="Add a note"
                className={styles.field}
            />
            <span className={styles.note}>Refreshed {refreshed} times</span>
        </GridLayout.Item>
    );
}
