<script setup lang="ts">
// Inside the root, where the grid's gestures can be heard; renders nothing.
import { useGridLayoutEvents } from "@fragiola/grid-layout-vue";
import { describeGesture } from "../_kit/announce";
import { widget } from "../_kit/widgets";

const emit = defineEmits<{ message: [message: string] }>();

useGridLayoutEvents((event) => {
    const said = describeGesture(event, widget(event.itemId).title);
    if (said) emit("message", said);
});
</script>

<template></template>
