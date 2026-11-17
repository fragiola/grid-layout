import { Component, signal } from "@angular/core";
import {
    GRID_LAYOUT,
    type Layout,
    layoutProblems,
} from "@fragiola/grid-layout-angular";
import { ClickableButton } from "#/components/atoms/clickable";
import { dashboard } from "../_kit/layouts";
import { forget, load, save } from "../_kit/storage";
import { widget } from "../_kit/widgets";
import * as styles from "./styles";

const KEY = "grid-layout:save-restore";

/** The saved layout, if there is one the grid can use: storage holds whatever was written. */
function saved(): Layout | undefined {
    const layout = load<Layout>(KEY);
    return layout && layoutProblems(layout).length === 0 ? layout : undefined;
}

// Persistence is the app's (D14): every committed change is saved, the saved layout is where the
// grid starts, and Reset forgets it and starts the grid again from the default.
@Component({
    selector: "example-save-restore",
    imports: [GRID_LAYOUT, ClickableButton],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <div [class]="styles.toolbar">
                <p [class]="styles.note" aria-live="polite">{{ status() }}</p>
                <button kitClickable size="sm" variant="outline" (click)="reset()">Reset</button>
            </div>
            <!-- a new grid on reset: \`defaultLayout\` is read once, when a grid starts -->
            @for (run of [run()]; track "run-" + run) {
                <div
                    gridLayoutRoot
                    [defaultLayout]="initial()"
                    (layoutChange)="changed($event)"
                    [rowHeight]="56"
                    [gap]="[12, 12]"
                    aria-label="Saved dashboard"
                    [class]="styles.root"
                >
                    <ng-template gridLayoutItems let-item>
                        @let content = widget(item.id);
                        <div
                            [gridLayoutItem]="item.id"
                            #part="gridLayoutItem"
                            [attr.aria-label]="content.title"
                            [class]="styles.item(part.state())"
                        >
                            <span [class]="styles.title">{{ content.title }}</span>
                            <span [class]="styles.value">{{ content.value }}</span>
                            <div
                                *gridLayoutResizeHandle="'bottom-end'"
                                [attr.aria-label]="'Resize ' + content.title"
                                [class]="styles.resizeHandle"
                            ></div>
                        </div>
                    </ng-template>
                    <div *gridLayoutPlaceholder [class]="styles.placeholder"></div>
                </div>
            }
        </div>
    `,
})
export default class SaveRestore {
    protected readonly styles = styles;
    protected readonly widget = widget;
    protected readonly run = signal(0);
    /** where the next grid starts */
    protected readonly initial = signal<Layout>(saved() ?? dashboard());
    protected readonly status = signal(
        saved() ? "Restored the saved layout" : "The default layout",
    );

    protected changed(layout: Layout): void {
        this.status.set(
            save(KEY, layout) ? "Saved" : "Could not save (storage is blocked)",
        );
    }

    protected reset(): void {
        forget(KEY);
        this.status.set("Back to the default layout");
        this.initial.set(dashboard());
        this.run.set(this.run() + 1);
    }
}
