<script setup lang="ts">
import {
    GridLayout,
    type Layout,
    layoutProblems,
    useGridLayoutRef,
} from "@fragiola/grid-layout-vue";
import { Save, X } from "@lucide/vue";
import { ref, useId } from "vue";
import { Clickable } from "#/components/atoms/clickable";
import { dashboard } from "../_kit/layouts";
import { load, save } from "../_kit/storage";
import { widget } from "../_kit/widgets";
import * as styles from "./styles";

const KEY = "grid-layout:named-layouts";

type Saved = Readonly<Record<string, Layout>>;

/** The saved layouts the grid can use: storage holds whatever was written. */
function saved(): Saved {
    const all = load<Saved>(KEY) ?? {};
    return Object.fromEntries(
        Object.entries(all).filter(
            ([, layout]) =>
                Array.isArray(layout) && layoutProblems(layout).length === 0,
        ),
    );
}

// Several layouts under names, kept in the browser (app policy, D14). Save copies the model's
// layout (`model.get("layout")`); a name puts it back with one `layout.set`, from outside the
// root through a `gridLayoutRef`, so it is one committed change like any drag. A move after that
// leaves the named layout as it was saved.
const gridLayoutRef = useGridLayoutRef();
const start = dashboard();
const layouts = ref<Saved>(saved());
const name = ref("");
const active = ref<string>();
const status = ref("Name the layout to save it.");
const id = useId();

const store = (next: Saved) => {
    layouts.value = next;
    return save(KEY, next);
};

const saveAs = () => {
    const model = gridLayoutRef.current?.model;
    const named = name.value.trim();
    if (!model || !named) return;
    const stored = store({ ...layouts.value, [named]: model.get("layout") });
    active.value = named;
    name.value = "";
    status.value = stored
        ? `Saved “${named}”.`
        : `Saved “${named}” for this visit (storage is blocked).`;
};

const apply = (named: string) => {
    const layout = layouts.value[named];
    const result = layout
        ? gridLayoutRef.current?.model.run("layout.set", { layout })
        : undefined;
    if (!result?.ok) return;
    // after the run: the change it made is told first, and clears `active`
    active.value = named;
    status.value = `Switched to “${named}”.`;
};

const remove = (named: string) => {
    const { [named]: _gone, ...rest } = layouts.value;
    store(rest);
    if (active.value === named) active.value = undefined;
    status.value = `Deleted “${named}”.`;
};
</script>

<template>
    <div :class="styles.frame">
        <aside :aria-labelledby="`${id}-title`" :class="styles.panel">
            <h2 :id="`${id}-title`" :class="styles.panelTitle">Layouts</h2>
            <form :class="styles.form" @submit.prevent="saveAs">
                <label :for="`${id}-name`" :class="styles.label">Name</label>
                <div :class="styles.row">
                    <input
                        :id="`${id}-name`"
                        v-model="name"
                        :maxlength="24"
                        placeholder="Morning"
                        :class="styles.input"
                    />
                    <Clickable.Button
                        type="submit"
                        size="sm"
                        :disabled="!name.trim()"
                    >
                        <Save aria-hidden="true" />
                        Save
                    </Clickable.Button>
                </div>
            </form>
            <ul aria-label="Saved layouts" :class="styles.list">
                <li v-if="Object.keys(layouts).length === 0" :class="styles.empty">
                    Nothing saved yet.
                </li>
                <li v-for="named in Object.keys(layouts)" :key="named" :class="styles.entry">
                    <Clickable.Button
                        size="sm"
                        variant="ghost"
                        :aria-pressed="active === named"
                        :class="styles.name"
                        @click="apply(named)"
                    >
                        {{ named }}
                    </Clickable.Button>
                    <Clickable.Button
                        size="sm"
                        variant="icon"
                        shape="square"
                        :aria-label="`Delete ${named}`"
                        @click="remove(named)"
                    >
                        <X aria-hidden="true" />
                    </Clickable.Button>
                </li>
            </ul>
            <p role="status" :class="styles.status">{{ status }}</p>
        </aside>
        <!-- a change of the user's: the layout no longer is the named one -->
        <GridLayout.Root
            :grid-layout-ref="gridLayoutRef"
            :default-layout="start"
            :row-height="48"
            :gap="[10, 10]"
            aria-label="Dashboard"
            :class="styles.root"
            @layout-change="active = undefined"
        >
            <GridLayout.Items v-slot="{ item }">
                <GridLayout.Item
                    :item-id="item.id"
                    :aria-label="widget(item.id).title"
                    :class="styles.item"
                >
                    <span :class="styles.title">{{ widget(item.id).title }}</span>
                    <span :class="styles.value">{{ widget(item.id).value }}</span>
                    <GridLayout.ResizeHandle
                        side="bottom-end"
                        :aria-label="`Resize ${widget(item.id).title}`"
                        :class="styles.resizeHandle"
                    />
                </GridLayout.Item>
            </GridLayout.Items>
            <GridLayout.Placeholder :class="styles.placeholder" />
        </GridLayout.Root>
    </div>
</template>
