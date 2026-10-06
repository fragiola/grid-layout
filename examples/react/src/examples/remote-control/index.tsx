"use client";

import {
    type CommandFailure,
    type CommandResult,
    GridLayout,
    type GridLayoutRef,
    type Layout,
    useGridLayout,
    useGridLayoutRef,
    useGridLayoutView,
} from "@fragiola/grid-layout-react";
import { Move, Scaling, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { Clickable } from "#/components/atoms/clickable";
import { widget } from "../_kit/widgets";
import * as styles from "./styles";

const LAYOUT: Layout = [
    { id: "banner", x: 0, y: 0, w: 12, h: 1, static: true },
    { id: "revenue", x: 0, y: 1, w: 4, h: 2 },
    { id: "orders", x: 4, y: 1, w: 4, h: 2 },
    { id: "visitors", x: 8, y: 1, w: 4, h: 2 },
    { id: "latency", x: 0, y: 3, w: 6, h: 2 },
    { id: "uptime", x: 6, y: 3, w: 6, h: 2 },
];

const titleOf = (id: string) =>
    id === "banner" ? "Banner (static)" : widget(id).title;

// A form beside the grid drives it from outside its root, through a `gridLayoutRef`: each button
// runs one command (`model.run`), and is enabled only when `model.check` says the command would
// apply. A static item cannot move or resize; a cell outside the columns is not a place; the
// reason the model gives is shown under the form.
export default function RemoteControl() {
    const gridLayoutRef = useGridLayoutRef();
    return (
        <div className={styles.frame}>
            <Controls gridLayoutRef={gridLayoutRef} />
            <GridLayout.Root
                gridLayoutRef={gridLayoutRef}
                defaultLayout={LAYOUT}
                rowHeight={48}
                gap={[10, 10]}
                aria-label="Dashboard"
                className={styles.root}
            >
                <GridLayout.Items>
                    {(item) => {
                        const title = titleOf(item.id);
                        return (
                            <GridLayout.Item
                                itemId={item.id}
                                aria-label={title}
                                className={styles.item}
                            >
                                <span className={styles.title}>{title}</span>
                                <span className={styles.place}>
                                    x {item.x} · y {item.y} · {item.w} ×{" "}
                                    {item.h}
                                </span>
                            </GridLayout.Item>
                        );
                    }}
                </GridLayout.Items>
                <GridLayout.Placeholder className={styles.placeholder} />
            </GridLayout.Root>
        </div>
    );
}

/** A number field's value: `NaN` when it is empty, so the model refuses it. */
const numberOf = (text: string) =>
    text.trim() === "" ? Number.NaN : Number(text);

/** The form: an item, its place and size, and the three commands. */
function Controls({ gridLayoutRef }: { gridLayoutRef: GridLayoutRef }) {
    const grid = useGridLayout(gridLayoutRef);
    // follows the layout, so every check below is asked again after any change
    const layout = useGridLayoutView(gridLayoutRef)?.layout ?? [];
    const [itemId, setItemId] = useState("revenue");
    const [fields, setFields] = useState({ x: "0", y: "1", w: "4", h: "2" });
    const id = useId();

    /** Fills the fields with an item's place and size. */
    const fill = (next: string) => {
        const item = grid?.model.get("item-by", { itemId: next });
        setItemId(next);
        if (item)
            setFields({
                x: String(item.x),
                y: String(item.y),
                w: String(item.w),
                h: String(item.h),
            });
    };

    const x = numberOf(fields.x);
    const y = numberOf(fields.y);
    const w = numberOf(fields.w);
    const h = numberOf(fields.h);
    const model = grid?.model;
    // a dry run through the middleware: what the button would do, without doing it
    const checks = model
        ? {
              move: model.check("item.move", { itemId, x, y }),
              resize: model.check("item.resize", { itemId, w, h }),
              remove: model.check("item.remove", { itemId }),
          }
        : undefined;
    const refusal = checks
        ? [checks.move, checks.resize, checks.remove].find(
              (check): check is CommandFailure => !check.ok,
          )
        : undefined;

    /** Runs a command, then shows the item as it landed (the model may settle it elsewhere). */
    const after = (result: CommandResult<unknown>) => {
        if (result.ok) fill(itemId);
    };

    return (
        <form
            aria-label="Remote control"
            className={styles.form}
            onSubmit={(event) => event.preventDefault()}
        >
            <label htmlFor={`${id}-item`} className={styles.field}>
                Item
                <select
                    id={`${id}-item`}
                    value={
                        layout.some((item) => item.id === itemId) ? itemId : ""
                    }
                    onChange={(event) => fill(event.target.value)}
                    className={styles.select}
                >
                    {layout.length === 0 && <option value="">No items</option>}
                    {layout.map((item) => (
                        <option key={item.id} value={item.id}>
                            {titleOf(item.id)}
                        </option>
                    ))}
                </select>
            </label>
            <div className={styles.numbers}>
                {(["x", "y", "w", "h"] as const).map((key) => (
                    <label
                        key={key}
                        htmlFor={`${id}-${key}`}
                        className={styles.field}
                    >
                        {key}
                        <input
                            id={`${id}-${key}`}
                            type="number"
                            min={key === "w" || key === "h" ? 1 : 0}
                            step={1}
                            value={fields[key]}
                            onChange={(event) =>
                                setFields({
                                    ...fields,
                                    [key]: event.target.value,
                                })
                            }
                            className={styles.number}
                        />
                    </label>
                ))}
            </div>
            <div className={styles.buttons}>
                <Clickable.Button
                    size="sm"
                    disabled={!checks?.move.ok}
                    onClick={() =>
                        model && after(model.run("item.move", { itemId, x, y }))
                    }
                >
                    <Move aria-hidden="true" />
                    Move
                </Clickable.Button>
                <Clickable.Button
                    size="sm"
                    variant="outline"
                    disabled={!checks?.resize.ok}
                    onClick={() =>
                        model &&
                        after(model.run("item.resize", { itemId, w, h }))
                    }
                >
                    <Scaling aria-hidden="true" />
                    Resize
                </Clickable.Button>
                <Clickable.Button
                    size="sm"
                    variant="outline"
                    className={styles.danger}
                    disabled={!checks?.remove.ok}
                    onClick={() => {
                        const result = model?.run("item.remove", { itemId });
                        const next = model?.get("layout")[0];
                        if (result?.ok && next) fill(next.id);
                    }}
                >
                    <Trash2 aria-hidden="true" />
                    Remove
                </Clickable.Button>
            </div>
            <p role="status" className={styles.status}>
                {refusal ? refusal.error.message : "Every command applies."}
            </p>
        </form>
    );
}
