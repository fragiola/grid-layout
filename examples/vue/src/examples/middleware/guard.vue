<script setup lang="ts">
import {
    type PlaceResult,
    useGridLayout,
    useGridLayoutEvents,
    veto,
} from "@fragiola/grid-layout-vue";
import { onUnmounted } from "vue";
import { attempt, broken, placing, type Refusal } from "./rules";

const emit = defineEmits<{ refused: [refusal: Refusal] }>();

// The rules, inside the root: a middleware that vetoes, and the gesture events that tell when a
// pointer released an item where the rules said no. Renders nothing.
const { model } = useGridLayout();
/** the last refusal the middleware gave: the log reads it when the gesture ends */
let last: Refusal | undefined;

const stop = model.use((ctx, next) => {
    if (!placing(ctx)) return next();
    const result = next();
    if (!result.ok) return result;
    // every placing command returns the layout it settles into
    const reason = broken((result.value as PlaceResult).layout);
    if (!reason) return result;
    last = { ...attempt(ctx), reason };
    return veto(reason);
});
onUnmounted(stop);

useGridLayoutEvents((event) => {
    // a pointer released where the rules said no: the item went back, no command ran
    if (
        (event.type === "drag-stop" || event.type === "resize-stop") &&
        event.refused &&
        !event.outside &&
        last
    ) {
        emit("refused", last);
    }
});
</script>

<template></template>
