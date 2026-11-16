<script setup lang="ts">
import { GridLayout } from "@fragiola/grid-layout-vue";
import { dashboard } from "../_kit/layouts";
import { formatChange, widget } from "../_kit/widgets";
import * as styles from "./styles";

const BREAKPOINTS = { tablet: 600, phone: 0 };
const COLS = { tablet: 4, phone: 1 };
const LAYOUTS = { tablet: dashboard().map((item) => ({ ...item, w: 2 })) };

// On a phone a card's body is held before it moves (R5): a swipe scrolls the page as always, a
// hold of a quarter second lifts the card, which says so through `data-pressing` while the hold
// lasts (the look is the app's: here a ring and a slight shrink). Near the frame's edges a held
// card scrolls it (R6). The phone breakpoint is the grid's own width's: this frame is narrow.
</script>

<template>
    <div :class="styles.frame">
        <div :class="styles.phone" data-testid="phone">
            <p :class="styles.hint">Swipe to scroll. Hold a card, then move it.</p>
            <GridLayout.Root
                :breakpoints="BREAKPOINTS"
                :cols="COLS"
                :default-layouts="LAYOUTS"
                :row-height="88"
                :gap="[12, 12]"
                aria-label="Dashboard"
                :class="styles.root"
            >
                <GridLayout.Items v-slot="{ item }">
                    <GridLayout.Item
                        :item-id="item.id"
                        :aria-label="widget(item.id).title"
                        :class="styles.item"
                    >
                        <span :class="styles.title">{{ widget(item.id).title }}</span>
                        <span :class="styles.value">{{ widget(item.id).value }}</span>
                        <span :class="styles.change">{{ formatChange(widget(item.id).change) }}</span>
                    </GridLayout.Item>
                </GridLayout.Items>
                <GridLayout.Placeholder :class="styles.placeholder" />
            </GridLayout.Root>
        </div>
    </div>
</template>
