"use client";

import { GridLayout, type Layout } from "@fragiola/grid-layout-react";
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
} from "lucide-react";
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

// Every icon is one cell that never resizes. A held icon lifts and the others tilt while it
// moves: the root's `data-dragging` and the item's `data-pressing` and `data-dragging`, read in
// CSS (styles.ts). Nothing here animates in JavaScript.
export default function HomeScreen() {
    return (
        <div className={styles.frame}>
            <div className={styles.phone}>
                <GridLayout.Root
                    cols={4}
                    rowHeight={84}
                    gap={[8, 12]}
                    padding={[12, 16]}
                    resizable={false}
                    defaultLayout={LAYOUT}
                    aria-label="Home screen"
                    className={styles.root}
                >
                    <GridLayout.Items>
                        {(item) => {
                            const app = APPS.find(
                                (each) => each.id === item.id,
                            );
                            if (!app) return null;
                            const { Icon } = app;
                            return (
                                <GridLayout.Item
                                    itemId={item.id}
                                    aria-label={app.name}
                                    className={styles.item}
                                >
                                    <span className={styles.icon}>
                                        <Icon
                                            aria-hidden="true"
                                            className={styles.glyph}
                                        />
                                    </span>
                                    <span className={styles.name}>
                                        {app.name}
                                    </span>
                                </GridLayout.Item>
                            );
                        }}
                    </GridLayout.Items>
                    <GridLayout.Placeholder className={styles.placeholder} />
                </GridLayout.Root>
            </div>
        </div>
    );
}
