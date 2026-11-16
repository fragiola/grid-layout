# @fragiola/grid-layout-vue

Composable, unstyled Vue primitives for [Grid Layout](https://fragiola.com/grid-layout): draggable, resizable grid layouts styled entirely by you.

```sh
pnpm add @fragiola/grid-layout-vue
```

```vue
<script setup lang="ts">
import { GridLayout, type Layout } from "@fragiola/grid-layout-vue";
import { ref } from "vue";

const layout = ref<Layout>([
    { id: "a", x: 0, y: 0, w: 4, h: 2 },
    { id: "b", x: 4, y: 0, w: 4, h: 2 },
]);
</script>

<template>
    <GridLayout.Root v-model:layout="layout" :cols="12" :row-height="64" aria-label="Dashboard">
        <GridLayout.Items v-slot="{ item }">
            <GridLayout.Item :item-id="item.id" :aria-label="item.id">{{ item.id }}</GridLayout.Item>
        </GridLayout.Items>
        <GridLayout.Placeholder />
    </GridLayout.Root>
</template>
```

The same parts, `data-*` attributes and behaviour as `@fragiola/grid-layout-react`, and the whole core re-exported. Needs `vue` ^3.5.

Docs and examples: <https://fragiola.com/grid-layout> ([Vue components](https://fragiola.com/grid-layout/docs/api/vue)). MIT, see [LICENSE](LICENSE).
