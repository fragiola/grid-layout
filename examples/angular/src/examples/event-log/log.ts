import { Component, effect, inject, signal, untracked } from "@angular/core";
import {
    type CommandEvent,
    type GestureEvent,
    injectGridLayout,
    injectGridLayoutEvents,
    type LayoutItem,
} from "@fragiola/grid-layout-angular";
import { LucideEraser } from "@lucide/angular";
import { ClickableButton } from "#/components/atoms/clickable";
import { SWITCH } from "#/components/ui/switch";
import { type LogLine, prepend } from "../_kit/log";
import { widget } from "../_kit/widgets";
import { GRID } from "./grid";
import * as styles from "./styles";

/** A line of the log: a command the model committed, or a gesture's step. */
interface Entry {
    readonly kind: "command" | "gesture";
    readonly name: string;
    readonly detail: string;
}

/** What to log. */
interface Filters {
    readonly commands: boolean;
    readonly gestures: boolean;
    /** the steps in between (`drag`, `resize`, `move`, `drop-over`): many per gesture */
    readonly steps: boolean;
}

const FILTERS: { key: keyof Filters; label: string }[] = [
    { key: "commands", label: "Commands" },
    { key: "gestures", label: "Gestures" },
    { key: "steps", label: "Every step" },
];

/** The lines kept: the oldest go first. */
const LIMIT = 60;

const STEPS = new Set(["drag", "resize", "move", "drop-over"]);

const box = (item: Pick<LayoutItem, "x" | "y" | "w" | "h">) =>
    `x ${item.x}, y ${item.y}, ${item.w} × ${item.h}`;

/** A command in words: the item it named and where it settled, when it names one. */
function describeCommand(event: CommandEvent): Entry {
    const result = event.result as { item?: LayoutItem; itemId?: string };
    const detail = result.item
        ? `${widget(result.item.id).title} at ${box(result.item)}`
        : result.itemId
          ? widget(result.itemId).title
          : `breakpoint ${event.after.breakpoint}, ${event.after.layouts[event.after.breakpoint]?.length ?? 0} items`;
    return { kind: "command", name: event.command, detail };
}

/** A gesture's step in words: who, by what, and where it is now. */
function describeEvent(event: GestureEvent): Entry {
    const where = event.outside ? "off the grid" : `at ${box(event.item)}`;
    return {
        kind: "gesture",
        name: event.type,
        detail: `${widget(event.itemId).title} (${event.source}) ${where}`,
    };
}

let next = 0;

/** The log panel: its filters, and the newest lines first. */
@Component({
    selector: "example-event-log-panel",
    imports: [ClickableButton, SWITCH, LucideEraser],
    host: { class: "contents" },
    template: `
        <section [attr.aria-labelledby]="id + '-title'" [class]="styles.panel">
            <div [class]="styles.panelHead">
                <h2 [id]="id + '-title'" [class]="styles.panelTitle">Events</h2>
                <button
                    kitClickable
                    size="sm"
                    variant="icon"
                    shape="square"
                    aria-label="Clear the log"
                    (click)="lines.set([])"
                >
                    <svg lucideEraser></svg>
                </button>
            </div>
            <div [class]="styles.filters">
                @for (filter of filterList; track filter.key) {
                    <span [class]="styles.filter">
                        <button
                            kitSwitch
                            [attr.aria-labelledby]="id + '-' + filter.key"
                            [checked]="filters()[filter.key]"
                            (checkedChange)="setFilter(filter.key, $event)"
                        >
                            <span kitSwitchThumb></span>
                        </button>
                        <span [id]="id + '-' + filter.key">{{ filter.label }}</span>
                    </span>
                }
            </div>
            <ol role="log" aria-label="Events" [class]="styles.log">
                @for (line of lines(); track line.key) {
                    <li [class]="styles.line">
                        <span [class]="styles.kind(line.entry.kind)">{{ line.entry.kind }}</span>
                        <code [class]="styles.name">{{ line.entry.name }}</code>
                        <span [class]="styles.detail">{{ line.entry.detail }}</span>
                    </li>
                } @empty {
                    <li [class]="styles.empty">
                        Drag or resize a widget, or Tab to one and press Space.
                    </li>
                }
            </ol>
        </section>
    `,
})
export class EventLogPanel {
    protected readonly styles = styles;
    protected readonly filterList = FILTERS;
    protected readonly id = `event-log-${++next}`;
    protected readonly lines = signal<readonly LogLine<Entry>[]>([]);
    // the listeners below read the filters as they are when an event comes
    protected readonly filters = signal<Filters>({
        commands: true,
        gestures: true,
        steps: false,
    });
    private readonly gridLayoutRef = inject(GRID);
    private readonly grid = injectGridLayout(this.gridLayoutRef);

    constructor() {
        effect((onCleanup) => {
            const model = this.grid()?.model;
            if (!model) return;
            onCleanup(
                // a command may run while a signal graph is read: the log is not part of it
                model.subscribe((event) =>
                    untracked(() => {
                        if (this.filters().commands)
                            this.add(describeCommand(event));
                    }),
                ),
            );
        });
        injectGridLayoutEvents(
            (event) =>
                untracked(() => {
                    const { gestures, steps } = this.filters();
                    if (STEPS.has(event.type) ? steps : gestures)
                        this.add(describeEvent(event));
                }),
            this.gridLayoutRef,
        );
    }

    protected setFilter(key: keyof Filters, on: boolean) {
        this.filters.set({ ...this.filters(), [key]: on });
    }

    private add(entry: Entry) {
        this.lines.set(prepend(this.lines(), entry, LIMIT));
    }
}
