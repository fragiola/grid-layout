<script setup lang="ts">
// The rules, as middleware: a resize (pointer or Shift and the arrows) is `item.resize`, a
// keyboard gesture that moved and resized is `item.place`. Each runs for the preview's dry run and
// for the drop. Renders nothing: it only needs the root.

import { useGridLayout } from "@fragiola/grid-layout-vue";
import { watchEffect } from "vue";
import { allowedSize, type SizeRules } from "./rules";

const props = defineProps<{ rules: SizeRules }>();
const { model } = useGridLayout();

watchEffect((onCleanup) => {
    const rules = props.rules;
    // the size asked for, against the item's size before the gesture
    const allowed = (asked: { itemId: string; w: number; h: number }) => {
        const before = model.get("item-by", { itemId: asked.itemId });
        return before ? allowedSize(before, asked, rules) : asked;
    };
    onCleanup(
        model.use((ctx, next) => {
            if (ctx.command === "item.resize") {
                ctx.payload = { ...ctx.payload, ...allowed(ctx.payload) };
            } else if (ctx.command === "item.place") {
                ctx.payload = { ...ctx.payload, ...allowed(ctx.payload) };
            }
            return next();
        }),
    );
});
</script>
