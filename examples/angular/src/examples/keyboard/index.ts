import { Component, signal } from "@angular/core";
import { GRID_LAYOUT } from "@fragiola/grid-layout-angular";
import { dashboard } from "../_kit/layouts";
import { widget } from "../_kit/widgets";
import { Announcer } from "./announcer";
import * as styles from "./styles";

const layout = dashboard();

const KEYS = [
    ["Space", "grab or drop"],
    ["Arrows", "move"],
    ["Shift + arrows", "resize"],
    ["Escape", "put back"],
] as const;

// Every item is a tab stop. Space or Enter grabs it, the arrows move it a cell at a time and
// Shift with the arrows resizes it, Space or Enter drops it, Escape puts it back. The words a
// screen reader hears are the app's: the grid tells each step, and this example says it in a
// live region.
@Component({
    selector: "example-keyboard",
    imports: [GRID_LAYOUT, Announcer],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <div [class]="styles.panel">
                <ul [class]="styles.keys" aria-label="Keys">
                    @for (entry of keys; track entry[0]) {
                        <li [class]="styles.keyRow">
                            <kbd [class]="styles.key">{{ entry[0] }}</kbd>
                            {{ entry[1] }}
                        </li>
                    }
                </ul>
                <p role="status" [class]="styles.status">{{ message() }}</p>
            </div>
            <div
                gridLayoutRoot
                [defaultLayout]="layout"
                [rowHeight]="56"
                [gap]="[12, 12]"
                aria-label="Dashboard"
                aria-describedby="keyboard-help"
                [class]="styles.root"
            >
                <ng-container keyboardAnnouncer (message)="message.set($event)" />
                <ng-template gridLayoutItems let-item>
                    @let content = widget(item.id);
                    <div
                        [gridLayoutItem]="item.id"
                        #part="gridLayoutItem"
                        [attr.aria-label]="content.title"
                        aria-roledescription="movable widget"
                        [class]="styles.item(part.state())"
                    >
                        <span [class]="styles.title">{{ content.title }}</span>
                        <span [class]="styles.value">{{ content.value }}</span>
                    </div>
                </ng-template>
                <div *gridLayoutPlaceholder [class]="styles.placeholder"></div>
            </div>
            <p id="keyboard-help" [class]="styles.hint">
                Space grabs a widget; the arrows move it, Shift and the arrows resize it.
            </p>
        </div>
    `,
})
export default class Keyboard {
    protected readonly styles = styles;
    protected readonly layout = layout;
    protected readonly widget = widget;
    protected readonly keys = KEYS;
    protected readonly message = signal(
        "Tab to a widget, then press Space to grab it.",
    );
}
