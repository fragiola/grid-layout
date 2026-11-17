import { Component, signal } from "@angular/core";
import {
    createGridLayoutRef,
    GRID_LAYOUT,
    type Layout,
    layoutProblems,
} from "@fragiola/grid-layout-angular";
import { LucideSave, LucideX } from "@lucide/angular";
import { ClickableButton } from "#/components/atoms/clickable";
import { dashboard } from "../_kit/layouts";
import { load, save } from "../_kit/storage";
import { widget } from "../_kit/widgets";
import * as styles from "./styles";

const KEY = "grid-layout:named-layouts";

type Saved = Readonly<Record<string, Layout>>;

/** The saved layouts the grid can use: storage holds whatever was written. */
function saved(): Saved {
    const all = load<Saved>(KEY) ?? {};
    return Object.fromEntries(
        Object.entries(all).filter(
            ([, layout]) =>
                Array.isArray(layout) && layoutProblems(layout).length === 0,
        ),
    );
}

let next = 0;

// Several layouts under names, kept in the browser (app policy, D14). Save copies the model's
// layout (`model.get("layout")`); a name puts it back with one `layout.set`, from outside the
// root through a `gridLayoutRef`, so it is one committed change like any drag. A move after that
// leaves the named layout as it was saved.
@Component({
    selector: "example-named-layouts",
    imports: [GRID_LAYOUT, ClickableButton, LucideSave, LucideX],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <aside [attr.aria-labelledby]="id + '-title'" [class]="styles.panel">
                <h2 [id]="id + '-title'" [class]="styles.panelTitle">Layouts</h2>
                <form [class]="styles.form" (submit)="$event.preventDefault(); saveAs()">
                    <label [for]="id + '-name'" [class]="styles.label">Name</label>
                    <div [class]="styles.row">
                        <input
                            [id]="id + '-name'"
                            [value]="name()"
                            maxlength="24"
                            placeholder="Morning"
                            (input)="name.set(valueOf($event))"
                            [class]="styles.input"
                        />
                        <button kitClickable type="submit" size="sm" [disabled]="!name().trim()">
                            <svg lucideSave></svg>
                            Save
                        </button>
                    </div>
                </form>
                <ul aria-label="Saved layouts" [class]="styles.list">
                    @for (named of names(); track named) {
                        <li [class]="styles.entry">
                            <button
                                kitClickable
                                size="sm"
                                variant="ghost"
                                [attr.aria-pressed]="active() === named"
                                (click)="apply(named)"
                                [class]="styles.name"
                            >
                                {{ named }}
                            </button>
                            <button
                                kitClickable
                                size="sm"
                                variant="icon"
                                shape="square"
                                [attr.aria-label]="'Delete ' + named"
                                (click)="remove(named)"
                            >
                                <svg lucideX></svg>
                            </button>
                        </li>
                    } @empty {
                        <li [class]="styles.empty">Nothing saved yet.</li>
                    }
                </ul>
                <p role="status" [class]="styles.status">{{ status() }}</p>
            </aside>
            <div
                gridLayoutRoot
                [gridLayoutRef]="gridLayoutRef"
                [defaultLayout]="start"
                (layoutChange)="active.set(undefined)"
                [rowHeight]="48"
                [gap]="[10, 10]"
                aria-label="Dashboard"
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
        </div>
    `,
})
export default class NamedLayouts {
    protected readonly styles = styles;
    protected readonly widget = widget;
    protected readonly id = `named-layouts-${++next}`;
    protected readonly gridLayoutRef = createGridLayoutRef();
    protected readonly start = dashboard();
    protected readonly layouts = signal<Saved>(saved());
    protected readonly name = signal("");
    protected readonly active = signal<string | undefined>(undefined);
    protected readonly status = signal("Name the layout to save it.");

    protected names() {
        return Object.keys(this.layouts());
    }

    protected valueOf(event: Event) {
        return (event.target as HTMLInputElement).value;
    }

    private store(next: Saved) {
        this.layouts.set(next);
        return save(KEY, next);
    }

    protected saveAs() {
        const model = this.gridLayoutRef.current?.model;
        const named = this.name().trim();
        if (!model || !named) return;
        const stored = this.store({
            ...this.layouts(),
            [named]: model.get("layout"),
        });
        this.active.set(named);
        this.name.set("");
        this.status.set(
            stored
                ? `Saved “${named}”.`
                : `Saved “${named}” for this visit (storage is blocked).`,
        );
    }

    protected apply(named: string) {
        const layout = this.layouts()[named];
        const result = layout
            ? this.gridLayoutRef.current?.model.run("layout.set", { layout })
            : undefined;
        if (!result?.ok) return;
        // after the run: the change it made is told first, and clears `active`
        this.active.set(named);
        this.status.set(`Switched to “${named}”.`);
    }

    protected remove(named: string) {
        const { [named]: _gone, ...rest } = this.layouts();
        this.store(rest);
        if (this.active() === named) this.active.set(undefined);
        this.status.set(`Deleted “${named}”.`);
    }
}
