<script setup lang="ts">
import {
    type DropDetails,
    type ExternalDragAnswer,
    GridLayout,
    type Layout,
    useGridLayoutRef,
    useGridLayoutView,
} from "@fragiola/grid-layout-vue";
import { File, FileImage, FileText, Upload, X } from "@lucide/vue";
import { computed, ref, useTemplateRef } from "vue";
import { Clickable } from "#/components/atoms/clickable";
import {
    carriesFiles,
    type FileMeta,
    fileKind,
    filesOf,
    formatBytes,
} from "../_kit/files";
import * as styles from "./styles";

const ICONS = { Image: FileImage, PDF: FileText, Text: FileText, File };

const START: Layout = [];

// A native drag from the operating system goes through `onExternalDrag`: files are accepted at a
// size, anything else refused (`data-drop-refused`). Asked again on the drop, when the files can
// be read, it gives their names as the drop's `data`. The first file lands where it was dropped;
// the others take the first free cells. What each card shows is the app's (X4): the layout holds
// only ids and boxes. Without a pointer, "Choose files" adds them the same way.
const gridLayoutRef = useGridLayoutRef();
const picker = useTemplateRef<HTMLInputElement>("picker");
const files = ref<Record<string, FileMeta>>({});
let made = 0;
const newId = () => {
    made += 1;
    return `file-${made}`;
};
/** The rest of a drop, or chosen files: each at the first free cell. */
const addAll = (metas: readonly FileMeta[]) => {
    const model = gridLayoutRef.current?.model;
    if (!model) return;
    const added: Record<string, FileMeta> = {};
    for (const meta of metas) {
        const id = newId();
        if (model.run("item.add", { item: { id, w: 3, h: 2 } }).ok)
            added[id] = meta;
    }
    files.value = { ...files.value, ...added };
};
const remove = (id: string) => {
    gridLayoutRef.current?.model.run("item.remove", { itemId: id });
    const { [id]: _gone, ...rest } = files.value;
    files.value = rest;
};
// refused, the grid turns (styles.ts): a computed tells only when it flips, not every preview
const view = useGridLayoutView(gridLayoutRef);
const refused = computed(() => view.value?.dropRefused ?? false);
const empty = computed(() => Object.keys(files.value).length === 0);

const choose = (event: Event) => {
    const input = event.target as HTMLInputElement;
    addAll(filesOf(input.files));
    input.value = "";
};
const onExternalDrag = (event: DragEvent): ExternalDragAnswer =>
    carriesFiles(event.dataTransfer)
        ? { w: 3, h: 2, data: filesOf(event.dataTransfer?.files) }
        : false;
const onDrop = ({ item, data }: DropDetails) => {
    const [first, ...rest] = data as FileMeta[];
    if (first) files.value = { ...files.value, [item.id]: first };
    addAll(rest);
};

const kindOf = (id: string) => {
    const file = files.value[id];
    return file ? fileKind(file) : "File";
};
const iconOf = (id: string) =>
    ICONS[kindOf(id) as keyof typeof ICONS] ?? File;
</script>

<template>
    <div :class="styles.frame">
        <div :class="styles.toolbar">
            <p :class="styles.note">Drop files on the grid, or choose them.</p>
            <Clickable.Button
                size="sm"
                variant="outline"
                @click="picker?.click()"
            >
                <Upload aria-hidden="true" />
                Choose files
            </Clickable.Button>
            <!-- the button opens it: the input itself is not seen -->
            <input
                ref="picker"
                type="file"
                multiple
                hidden
                aria-label="Files to add"
                @change="choose"
            />
        </div>
        <GridLayout.Root
            :grid-layout-ref="gridLayoutRef"
            :default-layout="START"
            :row-height="48"
            :gap="[12, 12]"
            :create-id="newId"
            :on-external-drag="onExternalDrag"
            aria-label="Files"
            :class="styles.root(refused)"
            @drop="onDrop"
        >
            <p v-if="empty" aria-hidden="true" :class="styles.empty">
                Drop files here
            </p>
            <GridLayout.Items v-slot="{ item }">
                <GridLayout.Item
                    :item-id="item.id"
                    :aria-label="files[item.id]?.name ?? item.id"
                    :class="styles.item"
                >
                    <span :class="styles.header">
                        <component
                            :is="iconOf(item.id)"
                            aria-hidden="true"
                            :class="styles.icon"
                        />
                        <span :class="styles.kind">{{ kindOf(item.id) }}</span>
                        <Clickable.Button
                            size="sm"
                            variant="icon"
                            :aria-label="`Remove ${files[item.id]?.name ?? item.id}`"
                            @click="remove(item.id)"
                        >
                            <X aria-hidden="true" />
                        </Clickable.Button>
                    </span>
                    <span :class="styles.name">{{ files[item.id]?.name }}</span>
                    <span :class="styles.size">{{
                        files[item.id] ? formatBytes(files[item.id]?.size ?? 0) : ""
                    }}</span>
                </GridLayout.Item>
            </GridLayout.Items>
            <GridLayout.Placeholder :class="styles.placeholder" />
        </GridLayout.Root>
    </div>
</template>
