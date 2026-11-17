import { Component } from "@angular/core";
import { GRID_LAYOUT, type Layout } from "@fragiola/grid-layout-angular";
import {
    LucideCalculator,
    LucideCalendar,
    LucideCamera,
    LucideClock,
    LucideCloud,
    LucideCompass,
    LucideDynamicIcon,
    LucideImage,
    LucideMail,
    LucideMap,
    LucideMessageCircle,
    LucideMusic,
    LucideNotebook,
    LucidePhone,
    LucideSettings,
    LucideShoppingBag,
    LucideWallet,
} from "@lucide/angular";
import * as styles from "./styles";

const APPS = [
    { id: "phone", name: "Phone", Icon: LucidePhone },
    { id: "messages", name: "Messages", Icon: LucideMessageCircle },
    { id: "mail", name: "Mail", Icon: LucideMail },
    { id: "camera", name: "Camera", Icon: LucideCamera },
    { id: "photos", name: "Photos", Icon: LucideImage },
    { id: "maps", name: "Maps", Icon: LucideMap },
    { id: "music", name: "Music", Icon: LucideMusic },
    { id: "calendar", name: "Calendar", Icon: LucideCalendar },
    { id: "clock", name: "Clock", Icon: LucideClock },
    { id: "weather", name: "Weather", Icon: LucideCloud },
    { id: "compass", name: "Compass", Icon: LucideCompass },
    { id: "notes", name: "Notes", Icon: LucideNotebook },
    { id: "store", name: "Store", Icon: LucideShoppingBag },
    { id: "wallet", name: "Wallet", Icon: LucideWallet },
    { id: "calculator", name: "Calculator", Icon: LucideCalculator },
    { id: "settings", name: "Settings", Icon: LucideSettings },
] as const;

const LAYOUT: Layout = APPS.map((app, index) => ({
    id: app.id,
    x: index % 4,
    y: Math.floor(index / 4),
    w: 1,
    h: 1,
}));

const appOf = (id: string) => APPS.find((each) => each.id === id);

// Every icon is one cell that never resizes. A held icon lifts and the others tilt while it
// moves: the root's `data-dragging` and the item's `data-pressing` and `data-dragging`, read in
// CSS (styles.ts). Nothing here animates in JavaScript.
@Component({
    selector: "example-home-screen",
    imports: [GRID_LAYOUT, LucideDynamicIcon],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <div [class]="styles.phone">
                <div
                    gridLayoutRoot
                    [cols]="4"
                    [rowHeight]="84"
                    [gap]="[8, 12]"
                    [padding]="[12, 16]"
                    [resizable]="false"
                    [defaultLayout]="layout"
                    aria-label="Home screen"
                    [class]="styles.root"
                >
                    <ng-template gridLayoutItems let-item>
                        @let app = appOf(item.id);
                        @if (app) {
                            <div
                                [gridLayoutItem]="item.id"
                                #part="gridLayoutItem"
                                [attr.aria-label]="app.name"
                                [class]="styles.item(part.state())"
                            >
                                <span [class]="styles.icon">
                                    <svg [lucideIcon]="app.Icon" [class]="styles.glyph"></svg>
                                </span>
                                <span [class]="styles.name">{{ app.name }}</span>
                            </div>
                        }
                    </ng-template>
                    <div *gridLayoutPlaceholder [class]="styles.placeholder"></div>
                </div>
            </div>
        </div>
    `,
})
export default class HomeScreen {
    protected readonly styles = styles;
    protected readonly layout = LAYOUT;
    protected readonly appOf = appOf;
}
