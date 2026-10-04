"use client";

import { GridLayout } from "@fragiola/grid-layout-react";
import { dashboard } from "../_kit/layouts";
import * as styles from "./styles";

const layout = dashboard();

const TITLES: Record<string, string> = {
    revenue: "الإيرادات",
    orders: "الطلبات",
    visitors: "الزوار",
    conversion: "معدل التحويل",
    latency: "زمن الاستجابة",
    uptime: "مدة التشغيل",
};

// Right-to-left: the first column is on the right, `start` is the right edge, the resize handle
// at `bottom-end` sits in the bottom-left corner, and ArrowLeft moves an item toward the end.
// The layout is the same data as in left-to-right: only the direction changes.
export default function RtlLayout() {
    return (
        <div dir="rtl" lang="ar" className={styles.frame}>
            <GridLayout.Root
                dir="rtl"
                defaultLayout={layout}
                rowHeight={56}
                gap={[12, 12]}
                aria-label="لوحة المعلومات"
                className={styles.root}
            >
                <GridLayout.Items>
                    {(item) => (
                        <GridLayout.Item
                            itemId={item.id}
                            aria-label={TITLES[item.id] ?? item.id}
                            className={styles.item}
                        >
                            <span className={styles.title}>
                                {TITLES[item.id] ?? item.id}
                            </span>
                            <span className={styles.value}>
                                {item.x + 1}، {item.y + 1}
                            </span>
                            <GridLayout.ResizeHandle
                                side="bottom-end"
                                aria-label={`تغيير حجم ${TITLES[item.id] ?? item.id}`}
                                className={styles.resizeHandle}
                            />
                        </GridLayout.Item>
                    )}
                </GridLayout.Items>
                <GridLayout.Placeholder className={styles.placeholder} />
            </GridLayout.Root>
        </div>
    );
}
