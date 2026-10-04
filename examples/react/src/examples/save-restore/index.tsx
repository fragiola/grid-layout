"use client";

import {
    GridLayout,
    type Layout,
    layoutProblems,
} from "@fragiola/grid-layout-react";
import { useState } from "react";
import { Clickable } from "#/components/atoms/clickable";
import { dashboard } from "../_kit/layouts";
import { forget, load, save } from "../_kit/storage";
import { widget } from "../_kit/widgets";
import * as styles from "./styles";

const KEY = "grid-layout:save-restore";

/** The saved layout, if there is one the grid can use: storage holds whatever was written. */
function saved(): Layout | undefined {
    const layout = load<Layout>(KEY);
    return layout && layoutProblems(layout).length === 0 ? layout : undefined;
}

// Persistence is the app's (D14): every committed change is saved, the saved layout is where the
// grid starts, and Reset forgets it and starts the grid again from the default.
export default function SaveRestore() {
    const [run, setRun] = useState(0);
    const [status, setStatus] = useState(() =>
        saved() ? "Restored the saved layout" : "The default layout",
    );
    const reset = () => {
        forget(KEY);
        setStatus("Back to the default layout");
        setRun((count) => count + 1);
    };
    return (
        <div className={styles.frame}>
            <div className={styles.toolbar}>
                <p className={styles.note} aria-live="polite">
                    {status}
                </p>
                <Clickable.Button size="sm" variant="outline" onClick={reset}>
                    Reset
                </Clickable.Button>
            </div>
            <GridLayout.Root
                // a new grid on reset: `defaultLayout` is read once, when a grid starts
                key={run}
                defaultLayout={saved() ?? dashboard()}
                onLayoutChange={(layout) =>
                    setStatus(
                        save(KEY, layout)
                            ? "Saved"
                            : "Could not save (storage is blocked)",
                    )
                }
                rowHeight={56}
                gap={[12, 12]}
                aria-label="Saved dashboard"
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
