"use client";

import {
    GridLayout,
    type Layout,
    useGridLayout,
} from "@fragiola/grid-layout-react";
import { useEffect, useId, useState } from "react";
import { Switch } from "#/components/ui/switch";
import { allowedSize, type SizeRules } from "./rules";
import * as styles from "./styles";

const layout: Layout = [
    { id: "a", x: 0, y: 0, w: 3, h: 2 },
    { id: "b", x: 3, y: 0, w: 4, h: 3 },
    { id: "c", x: 7, y: 0, w: 2, h: 1 },
    { id: "d", x: 9, y: 0, w: 3, h: 2 },
    { id: "e", x: 0, y: 3, w: 8, h: 1 },
    { id: "f", x: 8, y: 2, w: 4, h: 2 },
];

// Limits that move with the size: an item taller than 2 rows must be at least 4 columns wide, and
// one wider than 6 columns stays 1 row tall. Static limits (minW, maxH) cannot say that, and a
// constraint knows nothing of the app's switches: middleware on the resize commands rewrites the
// size the model is asked for, so the preview, the drop and the keyboard all obey.
export default function DynamicMinMax() {
    const [rules, setRules] = useState<SizeRules>({
        tallNeedsWidth: true,
        wideStaysShort: true,
    });
    const tall = useId();
    const wide = useId();
    return (
        <div className={styles.frame}>
            <div className={styles.toolbar}>
                <span className={styles.option}>
                    <Switch.Root
                        aria-labelledby={tall}
                        checked={rules.tallNeedsWidth}
                        onCheckedChange={(on) =>
                            setRules({ ...rules, tallNeedsWidth: on })
                        }
                    >
                        <Switch.Thumb />
                    </Switch.Root>
                    <span id={tall}>
                        Taller than 2 rows from 4 columns wide
                    </span>
                </span>
                <span className={styles.option}>
                    <Switch.Root
                        aria-labelledby={wide}
                        checked={rules.wideStaysShort}
                        onCheckedChange={(on) =>
                            setRules({ ...rules, wideStaysShort: on })
                        }
                    >
                        <Switch.Thumb />
                    </Switch.Root>
                    <span id={wide}>Wider than 6 columns at 1 row tall</span>
                </span>
            </div>
            <GridLayout.Root
                defaultLayout={layout}
                rowHeight={48}
                gap={[10, 10]}
                aria-label="Items with size rules"
                className={styles.root}
            >
                <Rules rules={rules} />
                <GridLayout.Items>
                    {(item) => {
                        const name = item.id.toUpperCase();
                        return (
                            <GridLayout.Item
                                itemId={item.id}
                                aria-label={`Item ${name}`}
                                className={styles.item}
                            >
                                <span className={styles.title}>{name}</span>
                                <span className={styles.value}>
                                    {item.w} × {item.h}
                                </span>
                                <GridLayout.ResizeHandle
                                    side="bottom-end"
                                    aria-label={`Resize item ${name}`}
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

/**
 * The rules, as middleware: a resize (pointer or Shift and the arrows) is `item.resize`, a
 * keyboard gesture that moved and resized is `item.place`. Each runs for the preview's dry run and
 * for the drop.
 */
function Rules({ rules }: { rules: SizeRules }) {
    const { model } = useGridLayout();
    useEffect(() => {
        // the size asked for, against the item's size before the gesture
        const allowed = (asked: { itemId: string; w: number; h: number }) => {
            const before = model.get("item-by", { itemId: asked.itemId });
            return before ? allowedSize(before, asked, rules) : asked;
        };
        return model.use((ctx, next) => {
            if (ctx.command === "item.resize") {
                ctx.payload = { ...ctx.payload, ...allowed(ctx.payload) };
            } else if (ctx.command === "item.place") {
                ctx.payload = { ...ctx.payload, ...allowed(ctx.payload) };
            }
            return next();
        });
    }, [model, rules]);
    return null;
}
