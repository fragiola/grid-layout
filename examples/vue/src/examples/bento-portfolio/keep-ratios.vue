<!--
Workaround (docs/examples-gaps.md): a pixel constraint applies when an item is moved or
resized, not when the layout loads or the grid's width changes, and the rows a ratio needs
depend on the width. Once the width is known, and whenever it changes, each constrained item
is resized to its own size with the engine's pixels, which settles its height.
-->
<script setup lang="ts">
import { useGridLayout, useGridLayoutView } from "@fragiola/grid-layout-vue";
import { watch } from "vue";

const { model, engine } = useGridLayout();
const view = useGridLayoutView();

watch(
    () => view.value.width,
    (width) => {
        const geometry = engine.get("geometry");
        if (width === 0 || !geometry) return;
        for (const item of model.get("layout")) {
            if (!item.constraints?.length) continue;
            model.run(
                "item.resize",
                { itemId: item.id, w: item.w, h: item.h },
                { env: { geometry } },
            );
        }
    },
    { immediate: true, flush: "post" },
);
</script>

<template></template>
