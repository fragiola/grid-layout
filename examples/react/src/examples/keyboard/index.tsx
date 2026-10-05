"use client";

import { GridLayout, useGridLayoutEvents } from "@fragiola/grid-layout-react";
import { useState } from "react";
import { describeGesture } from "../_kit/announce";
import { dashboard } from "../_kit/layouts";
import { widget } from "../_kit/widgets";
import * as styles from "./styles";

const layout = dashboard();

const KEYS = [
    ["Space", "grab or drop"],
    ["Arrows", "move"],
    ["Shift + arrows", "resize"],
    ["Escape", "put back"],
];

// Every item is a tab stop. Space or Enter grabs it, the arrows move it a cell at a time and
// Shift with the arrows resizes it, Space or Enter drops it, Escape puts it back. The words a
// screen reader hears are the app's: the grid tells each step, and this example says it in a
// live region.
export default function Keyboard() {
    const [message, setMessage] = useState(
        "Tab to a widget, then press Space to grab it.",
    );
    return (
        <div className={styles.frame}>
            <div className={styles.panel}>
                <ul className={styles.keys} aria-label="Keys">
                    {KEYS.map(([key, does]) => (
                        <li key={key} className={styles.keyRow}>
                            <kbd className={styles.key}>{key}</kbd>
                            {does}
                        </li>
                    ))}
                </ul>
                <p role="status" className={styles.status}>
                    {message}
                </p>
            </div>
            <GridLayout.Root
                defaultLayout={layout}
                rowHeight={56}
                gap={[12, 12]}
                aria-label="Dashboard"
                aria-describedby="keyboard-help"
                className={styles.root}
            >
                <Announcer onMessage={setMessage} />
                <GridLayout.Items>
                    {(item) => {
                        const content = widget(item.id);
                        return (
                            <GridLayout.Item
                                itemId={item.id}
                                aria-label={content.title}
                                aria-roledescription="movable widget"
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
                <GridLayout.Placeholder className={styles.placeholder} />
            </GridLayout.Root>
            <p id="keyboard-help" className={styles.hint}>
                Space grabs a widget; the arrows move it, Shift and the arrows
                resize it.
            </p>
        </div>
    );
}

/** Inside the root, where the grid's gestures can be heard; renders nothing. */
function Announcer({ onMessage }: { onMessage: (message: string) => void }) {
    useGridLayoutEvents((event) => {
        const said = describeGesture(event, widget(event.itemId).title);
        if (said) onMessage(said);
    });
    return null;
}
