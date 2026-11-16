<script setup lang="ts">
// A grid's breakpoint, read from outside its root.

import { type GridLayoutRef, useBreakpoint } from "@fragiola/grid-layout-vue";
import * as styles from "./styles";

const props = defineProps<{ label: string; gridLayoutRef: GridLayoutRef }>();
const current = useBreakpoint(props.gridLayoutRef);
</script>

<template>
    <p
        :class="styles.badge"
        :data-testid="`breakpoint-${label.toLowerCase()}`"
    >
        {{ label }}:
        {{ current ? `${current.breakpoint}, ${current.cols} columns` : "…" }}
    </p>
</template>
