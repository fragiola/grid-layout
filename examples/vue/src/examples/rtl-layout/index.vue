<script setup lang="ts">
import { GridLayout } from "@fragiola/grid-layout-vue";
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

const title = (id: string) => TITLES[id] ?? id;

// Right-to-left: the first column is on the right, `start` is the right edge, the resize handle
// at `bottom-end` sits in the bottom-left corner, and ArrowLeft moves an item toward the end.
// The layout is the same data as in left-to-right: only the direction changes.
</script>

<template>
    <div dir="rtl" lang="ar" :class="styles.frame">
        <GridLayout.Root
            dir="rtl"
            :default-layout="layout"
            :row-height="56"
            :gap="[12, 12]"
            aria-label="لوحة المعلومات"
            :class="styles.root"
        >
            <GridLayout.Items v-slot="{ item }">
                <GridLayout.Item
                    :item-id="item.id"
                    :aria-label="title(item.id)"
                    :class="styles.item"
                >
                    <span :class="styles.title">{{ title(item.id) }}</span>
                    <span :class="styles.value">{{ item.x + 1 }}، {{ item.y + 1 }}</span>
                    <GridLayout.ResizeHandle
                        side="bottom-end"
                        :aria-label="`تغيير حجم ${title(item.id)}`"
                        :class="styles.resizeHandle"
                    />
                </GridLayout.Item>
            </GridLayout.Items>
            <GridLayout.Placeholder :class="styles.placeholder" />
        </GridLayout.Root>
    </div>
</template>
