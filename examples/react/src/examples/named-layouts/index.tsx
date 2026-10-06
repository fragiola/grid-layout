"use client";

import {
    GridLayout,
    type Layout,
    layoutProblems,
    useGridLayoutRef,
} from "@fragiola/grid-layout-react";
import { Save, X } from "lucide-react";
import { useId, useState } from "react";
import { Clickable } from "#/components/atoms/clickable";
import { dashboard } from "../_kit/layouts";
import { load, save } from "../_kit/storage";
import { widget } from "../_kit/widgets";
import * as styles from "./styles";

const KEY = "grid-layout:named-layouts";

type Saved = Readonly<Record<string, Layout>>;

/** The saved layouts the grid can use: storage holds whatever was written. */
function saved(): Saved {
    const all = load<Saved>(KEY) ?? {};
    return Object.fromEntries(
        Object.entries(all).filter(
            ([, layout]) =>
                Array.isArray(layout) && layoutProblems(layout).length === 0,
        ),
    );
}

// Several layouts under names, kept in the browser (app policy, D14). Save copies the model's
// layout (`model.get("layout")`); a name puts it back with one `layout.set`, from outside the
// root through a `gridLayoutRef`, so it is one committed change like any drag. A move after that
// leaves the named layout as it was saved.
export default function NamedLayouts() {
    const gridLayoutRef = useGridLayoutRef();
    const [layouts, setLayouts] = useState<Saved>(saved);
    const [name, setName] = useState("");
    const [active, setActive] = useState<string>();
    const [status, setStatus] = useState("Name the layout to save it.");
    const id = useId();

    const store = (next: Saved) => {
        setLayouts(next);
        return save(KEY, next);
    };

    const saveAs = () => {
        const model = gridLayoutRef.current?.model;
        const named = name.trim();
        if (!model || !named) return;
        const stored = store({ ...layouts, [named]: model.get("layout") });
        setActive(named);
        setName("");
        setStatus(
            stored
                ? `Saved “${named}”.`
                : `Saved “${named}” for this visit (storage is blocked).`,
        );
    };

    const apply = (named: string) => {
        const layout = layouts[named];
        const result = layout
            ? gridLayoutRef.current?.model.run("layout.set", { layout })
            : undefined;
        if (!result?.ok) return;
        // after the run: the change it made is told first, and clears `active`
        setActive(named);
        setStatus(`Switched to “${named}”.`);
    };

    const remove = (named: string) => {
        const { [named]: _gone, ...rest } = layouts;
        store(rest);
        if (active === named) setActive(undefined);
        setStatus(`Deleted “${named}”.`);
    };

    return (
        <div className={styles.frame}>
            <aside aria-labelledby={`${id}-title`} className={styles.panel}>
                <h2 id={`${id}-title`} className={styles.panelTitle}>
                    Layouts
                </h2>
                <form
                    className={styles.form}
                    onSubmit={(event) => {
                        event.preventDefault();
                        saveAs();
                    }}
                >
                    <label htmlFor={`${id}-name`} className={styles.label}>
                        Name
                    </label>
                    <div className={styles.row}>
                        <input
                            id={`${id}-name`}
                            value={name}
                            maxLength={24}
                            placeholder="Morning"
                            onChange={(event) => setName(event.target.value)}
                            className={styles.input}
                        />
                        <Clickable.Button
                            type="submit"
                            size="sm"
                            disabled={!name.trim()}
                        >
                            <Save aria-hidden="true" />
                            Save
                        </Clickable.Button>
                    </div>
                </form>
                <ul aria-label="Saved layouts" className={styles.list}>
                    {Object.keys(layouts).length === 0 && (
                        <li className={styles.empty}>Nothing saved yet.</li>
                    )}
                    {Object.keys(layouts).map((named) => (
                        <li key={named} className={styles.entry}>
                            <Clickable.Button
                                size="sm"
                                variant="ghost"
                                aria-pressed={active === named}
                                onClick={() => apply(named)}
                                className={styles.name}
                            >
                                {named}
                            </Clickable.Button>
                            <Clickable.Button
                                size="sm"
                                variant="icon"
                                shape="square"
                                aria-label={`Delete ${named}`}
                                onClick={() => remove(named)}
                            >
                                <X aria-hidden="true" />
                            </Clickable.Button>
                        </li>
                    ))}
                </ul>
                <p role="status" className={styles.status}>
                    {status}
                </p>
            </aside>
            <GridLayout.Root
                gridLayoutRef={gridLayoutRef}
                defaultLayout={dashboard()}
                // a change of the user's: the layout no longer is the named one
                onLayoutChange={() => setActive(undefined)}
                rowHeight={48}
                gap={[10, 10]}
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
