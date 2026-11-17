import { Component } from "@angular/core";
import { GRID_LAYOUT } from "@fragiola/grid-layout-angular";
import { dashboard } from "../_kit/layouts";
import * as styles from "./styles";

const layout = dashboard();

const TITLES: Record<string, string> = {
    revenue: "الإيرادات",
    orders: "الطلبات",
    visitors: "الزوار",
    conversion: "معدل التحويل",
    latency: "زمن الاستجابة",
    uptime: "مدة التشغيل",
};

/** An item's Arabic title (its id when there is none). */
const titleOf = (id: string) => TITLES[id] ?? id;

// Right-to-left: the first column is on the right, `start` is the right edge, the resize handle
// at `bottom-end` sits in the bottom-left corner, and ArrowLeft moves an item toward the end.
// The layout is the same data as in left-to-right: only the direction changes.
@Component({
    selector: "example-rtl-layout",
    imports: [GRID_LAYOUT],
    host: { class: "contents" },
    template: `
        <div dir="rtl" lang="ar" [class]="styles.frame">
            <div
                gridLayoutRoot
                dir="rtl"
                [defaultLayout]="layout"
                [rowHeight]="56"
                [gap]="[12, 12]"
                aria-label="لوحة المعلومات"
                [class]="styles.root"
            >
                <ng-template gridLayoutItems let-item>
                    @let title = titleOf(item.id);
                    <div
                        [gridLayoutItem]="item.id"
                        #part="gridLayoutItem"
                        [attr.aria-label]="title"
                        [class]="styles.item(part.state())"
                    >
                        <span [class]="styles.title">{{ title }}</span>
                        <span [class]="styles.value">{{ item.x + 1 }}، {{ item.y + 1 }}</span>
                        <div
                            *gridLayoutResizeHandle="'bottom-end'"
                            [attr.aria-label]="'تغيير حجم ' + title"
                            [class]="styles.resizeHandle"
                        ></div>
                    </div>
                </ng-template>
                <div *gridLayoutPlaceholder [class]="styles.placeholder"></div>
            </div>
        </div>
    `,
})
export default class RtlLayout {
    protected readonly styles = styles;
    protected readonly layout = layout;
    protected readonly titleOf = titleOf;
}
