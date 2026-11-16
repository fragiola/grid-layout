<script setup lang="ts">
import { GridLayout, type Layout } from "@fragiola/grid-layout-vue";
import { wrapCompactor } from "@fragiola/grid-layout-vue/compactors";
import { ref } from "vue";
import { Clickable } from "#/components/atoms/clickable";
import * as styles from "./styles";

const SENTENCE =
    "Tiles flow in reading order like words of a paragraph wrapping at the last column drag one and everything after it shifts";

/**
 * One tile per word, the long ones two cells wide, each on its own row: the compactor flows them
 * into lines when the grid starts, in this order.
 */
const START: Layout = SENTENCE.split(" ").map((word, index) => ({
    id: word,
    x: 0,
    y: index,
    w: word.length >= 7 ? 2 : 1,
    h: 1,
}));

// The wrap compactor (an opt-in, from `/compactors`) lays items out like words in a paragraph:
// in reading order, each in the first free cells after the one before, wrapping at the last
// column. Dropping a tile between two others reorders the flow: everything after it moves along.
// Fewer or more columns reflow the same order.
const cols = ref(6);
</script>

<template>
    <div :class="styles.frame">
        <div :class="styles.toolbar">
            <span :class="styles.option">
                <Clickable.Button
                    size="sm"
                    variant="outline"
                    aria-label="Fewer columns"
                    :disabled="cols <= 3"
                    @click="cols -= 1"
                >
                    −
                </Clickable.Button>
                <output aria-label="Columns" :class="styles.count">{{ cols }}</output>
                <Clickable.Button
                    size="sm"
                    variant="outline"
                    aria-label="More columns"
                    :disabled="cols >= 10"
                    @click="cols += 1"
                >
                    +
                </Clickable.Button>
                <span>columns</span>
            </span>
        </div>
        <GridLayout.Root
            :default-layout="START"
            :cols="cols"
            :compactor="wrapCompactor"
            :row-height="44"
            :gap="[8, 8]"
            aria-label="Sentence"
            :class="styles.root"
        >
            <GridLayout.Items v-slot="{ item }">
                <GridLayout.Item
                    :item-id="item.id"
                    :aria-label="item.id"
                    :class="styles.item"
                >
                    {{ item.id }}
                </GridLayout.Item>
            </GridLayout.Items>
            <GridLayout.Placeholder :class="styles.placeholder" />
        </GridLayout.Root>
    </div>
</template>
