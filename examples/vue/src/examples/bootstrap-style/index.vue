<script setup lang="ts">
import { GridLayout, type Layout } from "@fragiola/grid-layout-vue";
import { ref } from "vue";
import { WIDGETS } from "../_kit/widgets";
import * as styles from "./styles";

const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 0 };

/** Each card's width at each breakpoint, of twelve columns. */
const WIDTHS: Record<string, number> = { lg: 3, md: 4, sm: 6, xs: 12 };

const CARDS = WIDGETS.slice(0, 8);

/** The cards in reading order, `w` columns each: a full row, then the next. */
function rows(w: number): Layout {
    return CARDS.map((card, index) => ({
        id: card.id,
        x: (index * w) % 12,
        y: Math.floor((index * w) / 12) * 2,
        w,
        h: 2,
    }));
}

const LAYOUTS = Object.fromEntries(
    Object.entries(WIDTHS).map(([name, w]) => [name, rows(w)]),
);

const card = (id: string) => CARDS.find((each) => each.id === id);

// The same twelve columns at every breakpoint; what changes is each card's width, given per
// breakpoint as its own layout. Every layout is given, so none is generated.
const at = ref("lg");
</script>

<template>
    <div :class="styles.frame">
        <p :class="styles.note" data-testid="breakpoint">
            {{ at }}: each card is {{ WIDTHS[at] }} of 12 columns
        </p>
        <GridLayout.Root
            :breakpoints="BREAKPOINTS"
            :cols="12"
            :default-layouts="LAYOUTS"
            :row-height="44"
            :gap="[12, 12]"
            aria-label="Cards"
            :class="styles.root"
            @breakpoint-change="(name: string) => (at = name)"
        >
            <GridLayout.Items v-slot="{ item }">
                <GridLayout.Item
                    :item-id="item.id"
                    :aria-label="card(item.id)?.title ?? item.id"
                    :class="styles.item"
                >
                    <span :class="styles.title">{{ card(item.id)?.title }}</span>
                    <span :class="styles.value">{{ card(item.id)?.value }}</span>
                </GridLayout.Item>
            </GridLayout.Items>
            <GridLayout.Placeholder :class="styles.placeholder" />
        </GridLayout.Root>
    </div>
</template>
