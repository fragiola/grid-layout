<script setup lang="ts">
import {
    type CommandFailure,
    type CommandResult,
    type GridLayoutRef,
    useGridLayout,
    useGridLayoutView,
} from "@fragiola/grid-layout-vue";
import { Move, Scaling, Trash2 } from "@lucide/vue";
import { computed, reactive, ref, useId } from "vue";
import { Clickable } from "#/components/atoms/clickable";
import * as styles from "./styles";
import { titleOf } from "./titles";

const props = defineProps<{ gridLayoutRef: GridLayoutRef }>();

/** A number field's value: `NaN` when it is empty, so the model refuses it. */
const numberOf = (text: string) =>
    text.trim() === "" ? Number.NaN : Number(text);

const KEYS = ["x", "y", "w", "h"] as const;

// The form: an item, its place and size, and the three commands.
const grid = useGridLayout(props.gridLayoutRef);
const view = useGridLayoutView(props.gridLayoutRef);
// follows the layout, so every check below is asked again after any change
const layout = computed(() => view.value?.layout ?? []);
const itemId = ref("revenue");
const fields = reactive({ x: "0", y: "1", w: "4", h: "2" });
const id = useId();

/** Fills the fields with an item's place and size. */
const fill = (next: string) => {
    const item = grid.value?.model.get("item-by", { itemId: next });
    itemId.value = next;
    if (item) {
        fields.x = String(item.x);
        fields.y = String(item.y);
        fields.w = String(item.w);
        fields.h = String(item.h);
    }
};

const numbers = computed(() => ({
    x: numberOf(fields.x),
    y: numberOf(fields.y),
    w: numberOf(fields.w),
    h: numberOf(fields.h),
}));
// a dry run through the middleware: what the button would do, without doing it
const checks = computed(() => {
    const model = grid.value?.model;
    if (!model || !layout.value) return undefined;
    const { x, y, w, h } = numbers.value;
    const target = itemId.value;
    return {
        move: model.check("item.move", { itemId: target, x, y }),
        resize: model.check("item.resize", { itemId: target, w, h }),
        remove: model.check("item.remove", { itemId: target }),
    };
});
const refusal = computed(() => {
    const all = checks.value;
    return all
        ? [all.move, all.resize, all.remove].find(
              (check): check is CommandFailure => !check.ok,
          )
        : undefined;
});
const selected = computed(() =>
    layout.value.some((item) => item.id === itemId.value) ? itemId.value : "",
);

/** Runs a command, then shows the item as it landed (the model may settle it elsewhere). */
const after = (result: CommandResult<unknown>) => {
    if (result.ok) fill(itemId.value);
};

const move = () => {
    const model = grid.value?.model;
    const { x, y } = numbers.value;
    if (model) after(model.run("item.move", { itemId: itemId.value, x, y }));
};
const resize = () => {
    const model = grid.value?.model;
    const { w, h } = numbers.value;
    if (model) after(model.run("item.resize", { itemId: itemId.value, w, h }));
};
const remove = () => {
    const model = grid.value?.model;
    const result = model?.run("item.remove", { itemId: itemId.value });
    const next = model?.get("layout")[0];
    if (result?.ok && next) fill(next.id);
};
</script>

<template>
    <form aria-label="Remote control" :class="styles.form" @submit.prevent>
        <label :for="`${id}-item`" :class="styles.field">
            Item
            <select
                :id="`${id}-item`"
                :value="selected"
                :class="styles.select"
                @change="fill(($event.target as HTMLSelectElement).value)"
            >
                <option v-if="layout.length === 0" value="">No items</option>
                <option v-for="item in layout" :key="item.id" :value="item.id">
                    {{ titleOf(item.id) }}
                </option>
            </select>
        </label>
        <div :class="styles.numbers">
            <label
                v-for="key in KEYS"
                :key="key"
                :for="`${id}-${key}`"
                :class="styles.field"
            >
                {{ key }}
                <input
                    :id="`${id}-${key}`"
                    type="number"
                    :min="key === 'w' || key === 'h' ? 1 : 0"
                    :step="1"
                    :value="fields[key]"
                    :class="styles.number"
                    @input="fields[key] = ($event.target as HTMLInputElement).value"
                />
            </label>
        </div>
        <div :class="styles.buttons">
            <Clickable.Button size="sm" :disabled="!checks?.move.ok" @click="move">
                <Move aria-hidden="true" />
                Move
            </Clickable.Button>
            <Clickable.Button
                size="sm"
                variant="outline"
                :disabled="!checks?.resize.ok"
                @click="resize"
            >
                <Scaling aria-hidden="true" />
                Resize
            </Clickable.Button>
            <Clickable.Button
                size="sm"
                variant="outline"
                :class="styles.danger"
                :disabled="!checks?.remove.ok"
                @click="remove"
            >
                <Trash2 aria-hidden="true" />
                Remove
            </Clickable.Button>
        </div>
        <p role="status" :class="styles.status">
            {{ refusal ? refusal.error.message : "Every command applies." }}
        </p>
    </form>
</template>
