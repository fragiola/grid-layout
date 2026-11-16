<script setup lang="ts">
import { GridLayout } from "@fragiola/grid-layout-vue";
import { dashboard } from "../_kit/layouts";
import Card from "./card.vue";
import * as styles from "./styles";

const layout = dashboard().slice(0, 4);

// Each card drags only from its grip: a DragHandle makes itself the only place the item moves
// from, and the item's tab stop. The card's body is the app's: a field to type in and a button
// to press, neither of which ever starts a drag.
</script>

<template>
    <div :class="styles.frame">
        <GridLayout.Root
            :default-layout="layout"
            :row-height="76"
            :gap="[12, 12]"
            aria-label="Cards with handles"
            :class="styles.root"
        >
            <GridLayout.Items v-slot="{ item }">
                <Card :id="item.id" :key="item.id" />
            </GridLayout.Items>
            <GridLayout.Placeholder :class="styles.placeholder" />
        </GridLayout.Root>
    </div>
</template>
