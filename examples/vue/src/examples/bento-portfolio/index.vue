<script setup lang="ts">
import { aspectRatio, GridLayout, type Layout } from "@fragiola/grid-layout-vue";
import KeepRatios from "./keep-ratios.vue";
import { PROJECTS } from "./portfolio";
import ProjectTile from "./project-tile.vue";
import * as styles from "./styles";

/** An item's own aspect ratio, stored in the layout as data: a name and its arguments. */
const ratio = (value: number) => [{ name: "aspectRatio", args: [value] }];

// The hero is pinned (`static: true`); every picture keeps its ratio; the text tiles size freely.
const layout: Layout = [
    { id: "hero", x: 0, y: 0, w: 6, h: 9, static: true },
    ...PROJECTS.map((project) => ({
        ...project.box,
        id: project.id,
        constraints: ratio(project.ratio),
    })),
    { id: "about", x: 6, y: 9, w: 3, h: 7, minW: 2, minH: 4 },
    { id: "contact", x: 9, y: 9, w: 3, h: 4, minW: 2, minH: 3 },
];

const byId = new Map(PROJECTS.map((project) => [project.id, project]));

// read when the grid is created: a new registry needs a new grid (a `key`)
const registry = { aspectRatio };

// A portfolio's bento: a pinned hero, project pictures of mixed sizes that keep their aspect
// ratio as they are resized (each item's own `aspectRatio` constraint, saved with the layout),
// and text tiles that size freely. The pictures are generated SVG in the theme's palettes.
const textTitle = (id: string) => (id === "about" ? "About" : "Contact");
</script>

<template>
    <div :class="styles.frame">
        <GridLayout.Root
            :default-layout="layout"
            :constraint-registry="registry"
            :row-height="20"
            :gap="[10, 10]"
            aria-label="Portfolio"
            :class="styles.root"
        >
            <KeepRatios />
            <GridLayout.Items v-slot="{ item }">
                <ProjectTile
                    v-if="byId.has(item.id)"
                    :project="byId.get(item.id)!"
                />
                <GridLayout.Item
                    v-else-if="item.id === 'hero'"
                    item-id="hero"
                    aria-label="Introduction"
                    :class="styles.hero"
                >
                    <span :class="styles.eyebrow">Portfolio · 2026</span>
                    <span :class="styles.intro">
                        <span :class="styles.name">Noor Haddad</span>
                        <span :class="styles.role">
                            Product designer and illustrator. I design calm
                            tools for busy people, and draw the pictures in
                            them.
                        </span>
                        <span :class="styles.available">
                            Open to new work in spring
                        </span>
                    </span>
                </GridLayout.Item>
                <GridLayout.Item
                    v-else
                    :item-id="item.id"
                    :aria-label="textTitle(item.id)"
                    :class="styles.text"
                >
                    <span :class="styles.label">{{ textTitle(item.id) }}</span>
                    <span v-if="item.id === 'about'" :class="styles.body">
                        Ten years of product work, from banking apps to a
                        tide-table for sailors. Based in Lisbon, working with
                        teams anywhere.
                    </span>
                    <!-- a link never starts a drag: it stays a link -->
                    <a v-else href="mailto:hello@example.com" :class="styles.link">
                        hello@example.com
                    </a>
                    <GridLayout.ResizeHandle
                        side="bottom-end"
                        :aria-label="`Resize ${textTitle(item.id)}`"
                        :class="styles.resizeHandle"
                    />
                </GridLayout.Item>
            </GridLayout.Items>
            <GridLayout.Placeholder :class="styles.placeholder" />
        </GridLayout.Root>
    </div>
</template>
