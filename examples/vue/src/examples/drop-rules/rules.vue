<script setup lang="ts">
// The rules, as middleware on `item.add`: they run for the preview's dry run and the drop.
// Renders nothing: it only needs the root.

import { useGridLayout, veto } from "@fragiola/grid-layout-vue";
import { onBeforeUnmount } from "vue";

/** The columns nothing may be dropped into: the last three. */
const LOCKED_FROM = 9;

const props = defineProps<{ reason: { current: string } }>();
const { model } = useGridLayout();

const stop = model.use((ctx, next) => {
    if (ctx.command !== "item.add") return next();
    const { reason } = props;
    const { item } = ctx.payload;
    const x = item.x ?? 0;
    const layout = ctx.state.layouts[ctx.state.breakpoint] ?? [];
    if (
        item.id.startsWith("clock") &&
        layout.some((entry) => entry.id.startsWith("clock"))
    ) {
        reason.current = "One clock at most.";
        return veto(reason.current);
    }
    // a banner shrinks to end where the locked columns start, never below its minimum
    if (item.id.startsWith("banner") && x + item.w > LOCKED_FROM) {
        const fit = LOCKED_FROM - x;
        if (fit >= (item.minW ?? 1)) ctx.payload = { item: { ...item, w: fit } };
    }
    if (x + ctx.payload.item.w > LOCKED_FROM) {
        reason.current = "The last three columns are locked.";
        return veto(reason.current);
    }
    return next();
});
onBeforeUnmount(stop);
</script>
