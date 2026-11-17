import { Component, effect, signal } from "@angular/core";
import {
    createGridLayoutRef,
    GRID_LAYOUT,
    injectGridLayout,
    type Layout,
} from "@fragiola/grid-layout-angular";
import { SWITCH } from "#/components/ui/switch";
import { allowedSize, type SizeRules } from "./rules";
import * as styles from "./styles";

const layout: Layout = [
    { id: "a", x: 0, y: 0, w: 3, h: 2 },
    { id: "b", x: 3, y: 0, w: 4, h: 3 },
    { id: "c", x: 7, y: 0, w: 2, h: 1 },
    { id: "d", x: 9, y: 0, w: 3, h: 2 },
    { id: "e", x: 0, y: 3, w: 8, h: 1 },
    { id: "f", x: 8, y: 2, w: 4, h: 2 },
];

let next = 0;

// Limits that move with the size: an item taller than 2 rows must be at least 4 columns wide, and
// one wider than 6 columns stays 1 row tall. Static limits (minW, maxH) cannot say that, and a
// constraint knows nothing of the app's switches: middleware on the resize commands rewrites the
// size the model is asked for, so the preview, the drop and the keyboard all obey.
@Component({
    selector: "example-dynamic-min-max",
    imports: [GRID_LAYOUT, SWITCH],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <div [class]="styles.toolbar">
                <span [class]="styles.option">
                    <button
                        kitSwitch
                        [attr.aria-labelledby]="tall"
                        [checked]="rules().tallNeedsWidth"
                        (checkedChange)="rules.set({ ...rules(), tallNeedsWidth: $event })"
                    >
                        <span kitSwitchThumb></span>
                    </button>
                    <span [id]="tall">Taller than 2 rows from 4 columns wide</span>
                </span>
                <span [class]="styles.option">
                    <button
                        kitSwitch
                        [attr.aria-labelledby]="wide"
                        [checked]="rules().wideStaysShort"
                        (checkedChange)="rules.set({ ...rules(), wideStaysShort: $event })"
                    >
                        <span kitSwitchThumb></span>
                    </button>
                    <span [id]="wide">Wider than 6 columns at 1 row tall</span>
                </span>
            </div>
            <div
                gridLayoutRoot
                [defaultLayout]="layout"
                [gridLayoutRef]="gridLayoutRef"
                [rowHeight]="48"
                [gap]="[10, 10]"
                aria-label="Items with size rules"
                [class]="styles.root"
            >
                <ng-template gridLayoutItems let-item>
                    @let name = item.id.toUpperCase();
                    <div
                        [gridLayoutItem]="item.id"
                        #part="gridLayoutItem"
                        [attr.aria-label]="'Item ' + name"
                        [class]="styles.item(part.state())"
                    >
                        <span [class]="styles.title">{{ name }}</span>
                        <span [class]="styles.value">{{ item.w }} × {{ item.h }}</span>
                        <div
                            *gridLayoutResizeHandle="'bottom-end'"
                            [attr.aria-label]="'Resize item ' + name"
                            [class]="styles.resizeHandle"
                        ></div>
                    </div>
                </ng-template>
                <div *gridLayoutPlaceholder [class]="styles.placeholder"></div>
            </div>
        </div>
    `,
})
export default class DynamicMinMax {
    protected readonly styles = styles;
    protected readonly layout = layout;
    protected readonly tall = `dynamic-min-max-tall-${++next}`;
    protected readonly wide = `dynamic-min-max-wide-${next}`;
    protected readonly rules = signal<SizeRules>({
        tallNeedsWidth: true,
        wideStaysShort: true,
    });
    protected readonly gridLayoutRef = createGridLayoutRef();
    private readonly grid = injectGridLayout(this.gridLayoutRef);

    /**
     * The rules, as middleware: a resize (pointer or Shift and the arrows) is `item.resize`, a
     * keyboard gesture that moved and resized is `item.place`. Each runs for the preview's dry
     * run and for the drop. Installed once per model, it reads the switches when it runs: a
     * switch then counts from the very next key, with no effect to wait for.
     */
    constructor() {
        effect((onCleanup) => {
            const model = this.grid()?.model;
            if (!model) return;
            // the size asked for, against the item's size before the gesture
            const allowed = (asked: {
                itemId: string;
                w: number;
                h: number;
            }) => {
                const before = model.get("item-by", { itemId: asked.itemId });
                return before
                    ? allowedSize(before, asked, this.rules())
                    : asked;
            };
            onCleanup(
                model.use((ctx, next) => {
                    if (ctx.command === "item.resize") {
                        ctx.payload = {
                            ...ctx.payload,
                            ...allowed(ctx.payload),
                        };
                    } else if (ctx.command === "item.place") {
                        ctx.payload = {
                            ...ctx.payload,
                            ...allowed(ctx.payload),
                        };
                    }
                    return next();
                }),
            );
        });
    }
}
