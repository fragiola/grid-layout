import { Component, computed } from "@angular/core";
import {
    injectGridLayoutView,
    itemPixels,
} from "@fragiola/grid-layout-angular";
import { RESERVED } from "./rules";
import * as styles from "./styles";

/** The reserved area, drawn under the items where the grid places a box of its size. */
@Component({
    selector: "example-middleware-reserved",
    host: { class: "contents" },
    template: `
        @if (box(); as box) {
            <!-- the box is the grid's geometry: logical, from the inline-start edge -->
            <div
                aria-hidden="true"
                [class]="styles.reserved"
                [style.inset-inline-start.px]="box.left"
                [style.top.px]="box.top"
                [style.width.px]="box.width"
                [style.height.px]="box.height"
            >
                Reserved
            </div>
        }
    `,
})
export class Reserved {
    protected readonly styles = styles;
    private readonly view = injectGridLayoutView();
    protected readonly box = computed(() => {
        const { geometry } = this.view();
        return geometry ? itemPixels(geometry, RESERVED) : undefined;
    });
}
