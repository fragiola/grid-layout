<script setup lang="ts">
import { GridLayout, type Layout } from "@fragiola/grid-layout-vue";
import {
    Calculator,
    Calendar,
    Camera,
    Clock,
    Cloud,
    Compass,
    Image,
    Mail,
    Map as MapIcon,
    MessageCircle,
    Music,
    Notebook,
    Phone,
    Settings,
    ShoppingBag,
    Wallet,
} from "@lucide/vue";
import * as styles from "./styles";

const APPS = [
    { id: "phone", name: "Phone", Icon: Phone },
    { id: "messages", name: "Messages", Icon: MessageCircle },
    { id: "mail", name: "Mail", Icon: Mail },
    { id: "camera", name: "Camera", Icon: Camera },
    { id: "photos", name: "Photos", Icon: Image },
    { id: "maps", name: "Maps", Icon: MapIcon },
    { id: "music", name: "Music", Icon: Music },
    { id: "calendar", name: "Calendar", Icon: Calendar },
    { id: "clock", name: "Clock", Icon: Clock },
    { id: "weather", name: "Weather", Icon: Cloud },
    { id: "compass", name: "Compass", Icon: Compass },
    { id: "notes", name: "Notes", Icon: Notebook },
    { id: "store", name: "Store", Icon: ShoppingBag },
    { id: "wallet", name: "Wallet", Icon: Wallet },
    { id: "calculator", name: "Calculator", Icon: Calculator },
    { id: "settings", name: "Settings", Icon: Settings },
] as const;

const LAYOUT: Layout = APPS.map((app, index) => ({
    id: app.id,
    x: index % 4,
    y: Math.floor(index / 4),
    w: 1,
    h: 1,
}));

const app = (id: string) => APPS.find((each) => each.id === id);

// Every icon is one cell that never resizes. A held icon lifts and the others tilt while it
// moves: the root's `data-dragging` and the item's `data-pressing` and `data-dragging`, read in
// CSS (styles.ts). Nothing here animates in JavaScript.
</script>

<template>
    <div :class="styles.frame">
        <div :class="styles.phone">
            <GridLayout.Root
                :cols="4"
                :row-height="84"
                :gap="[8, 12]"
                :padding="[12, 16]"
                :resizable="false"
                :default-layout="LAYOUT"
                aria-label="Home screen"
                :class="styles.root"
            >
                <GridLayout.Items v-slot="{ item }">
                    <GridLayout.Item
                        v-if="app(item.id)"
                        :item-id="item.id"
                        :aria-label="app(item.id)?.name"
                        :class="styles.item"
                    >
                        <span :class="styles.icon">
                            <component
                                :is="app(item.id)?.Icon"
                                aria-hidden="true"
                                :class="styles.glyph"
                            />
                        </span>
                        <span :class="styles.name">{{ app(item.id)?.name }}</span>
                    </GridLayout.Item>
                </GridLayout.Items>
                <GridLayout.Placeholder :class="styles.placeholder" />
            </GridLayout.Root>
        </div>
    </div>
</template>
