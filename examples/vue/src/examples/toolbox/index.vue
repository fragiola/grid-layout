<script setup lang="ts">
import {
    type DropDetails,
    GridLayout,
    type GestureEvent,
    useGridLayoutEvents,
    useGridLayoutRef,
} from "@fragiola/grid-layout-vue";
import { Archive } from "@lucide/vue";
import { ref, useTemplateRef } from "vue";
import { Clickable } from "#/components/atoms/clickable";
import { pointerOver } from "../_kit/hit";
import { dashboard } from "../_kit/layouts";
import { type Stowed, stow, unstow } from "../_kit/toolbox";
import { widget } from "../_kit/widgets";
import * as styles from "./styles";

const layout = dashboard();

// Taking a widget off the grid is the app's (D14): the grid reports a release outside it
// (`@drag-stop` with `outside` and the element under the pointer), and the app removes the item
// and keeps it, with its size, in the toolbox. Each widget there is a drag source with the
// widget's own id: dropped back, the same widget comes back. From the keyboard: the button on a
// widget puts it away; Tab to it in the toolbox and press Enter to bring it back.
const gridLayoutRef = useGridLayoutRef();
const toolbox = useTemplateRef<HTMLElement>("toolbox");
const stowed = ref<readonly Stowed[]>([{ id: "refunds", w: 4, h: 2 }]);
const putAway = (id: string) => {
    const model = gridLayoutRef.current?.model;
    const item = model?.get("item-by", { itemId: id });
    if (!model || !item) return;
    model.run("item.remove", { itemId: id });
    stowed.value = stow(stowed.value, item);
};
// released off the grid, over the toolbox: put away
const onDragStop = (event: GestureEvent) => {
    const target = event.target;
    if (event.outside && target && toolbox.value?.contains(target))
        putAway(event.itemId);
};
// back from the toolbox: it leaves it
const onDrop = ({ item }: DropDetails) => {
    stowed.value = unstow(stowed.value, item.id);
};

// a widget held over the toolbox: it shows it would take it. The pointer is the grid's while it
// holds a widget, so the drag's own events say where it is.
const open = ref(false);
useGridLayoutEvents((event) => {
    open.value =
        event.type === "drag" &&
        event.outside &&
        pointerOver(toolbox.value, event.nativeEvent);
}, gridLayoutRef);
</script>

<template>
    <div :class="styles.frame">
        <!-- the toolbox: where widgets go when they leave the grid, each one a drag source back in -->
        <section
            ref="toolbox"
            aria-label="Toolbox"
            :data-open="open ? '' : undefined"
            :class="styles.toolbox"
        >
            <p :class="styles.heading">Toolbox</p>
            <p v-if="stowed.length === 0" :class="styles.empty">
                Drag a widget here to put it away.
            </p>
            <template v-else>
                <GridLayout.DragSource
                    v-for="entry in stowed"
                    :key="entry.id"
                    :grid-layout-ref="gridLayoutRef"
                    :item-id="entry.id"
                    :item="{ w: entry.w, h: entry.h }"
                    :aria-label="`${widget(entry.id).title}, in the toolbox`"
                    :class="styles.source"
                >
                    {{ widget(entry.id).title }}
                </GridLayout.DragSource>
            </template>
        </section>
        <GridLayout.Root
            :grid-layout-ref="gridLayoutRef"
            :default-layout="layout"
            :row-height="48"
            :gap="[12, 12]"
            aria-label="Dashboard"
            :class="styles.root"
            @drag-stop="onDragStop"
            @drop="onDrop"
        >
            <GridLayout.Items v-slot="{ item }">
                <GridLayout.Item
                    :item-id="item.id"
                    :aria-label="widget(item.id).title"
                    :class="styles.item"
                >
                    <span :class="styles.header">
                        <span :class="styles.title">{{ widget(item.id).title }}</span>
                        <Clickable.Button
                            size="sm"
                            variant="icon"
                            :aria-label="`Put ${widget(item.id).title} in the toolbox`"
                            @click="putAway(item.id)"
                        >
                            <Archive aria-hidden="true" />
                        </Clickable.Button>
                    </span>
                    <span :class="styles.value">{{ widget(item.id).value }}</span>
                </GridLayout.Item>
            </GridLayout.Items>
            <GridLayout.Placeholder :class="styles.placeholder" />
        </GridLayout.Root>
    </div>
</template>
