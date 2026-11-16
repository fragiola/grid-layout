<script setup lang="ts">
// The breakpoint the grid is at, from outside its root.

import { type GridLayoutRef, useBreakpoint } from "@fragiola/grid-layout-vue";
import * as styles from "./styles";

const props = defineProps<{ gridLayoutRef: GridLayoutRef }>();
const current = useBreakpoint(props.gridLayoutRef);
</script>

<template>
    <!-- the breakpoint is said when it changes; the width, changing every pixel, is only shown -->
    <p :class="styles.note">
        <span aria-live="polite" data-testid="breakpoint">{{
            current ? `${current.breakpoint} · ${current.cols} columns` : "Measuring…"
        }}</span>{{ current ? ` · ${Math.round(current.width)}px` : "" }}
    </p>
</template>
