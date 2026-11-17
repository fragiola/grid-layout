import { Component, computed, inject, signal } from "@angular/core";
import {
    type CommandFailure,
    type CommandResult,
    injectGridLayout,
    injectGridLayoutView,
} from "@fragiola/grid-layout-angular";
import { LucideMove, LucideScaling, LucideTrash2 } from "@lucide/angular";
import { ClickableButton } from "#/components/atoms/clickable";
import { GRID } from "./grid";
import * as styles from "./styles";
import { titleOf } from "./titles";

/** A number field's value: `NaN` when it is empty, so the model refuses it. */
const numberOf = (text: string) =>
    text.trim() === "" ? Number.NaN : Number(text);

type Field = "x" | "y" | "w" | "h";

const FIELDS: readonly Field[] = ["x", "y", "w", "h"];

let next = 0;

/** The form: an item, its place and size, and the three commands. */
@Component({
    selector: "example-remote-control-controls",
    imports: [ClickableButton, LucideMove, LucideScaling, LucideTrash2],
    host: { class: "contents" },
    template: `
        <form aria-label="Remote control" [class]="styles.form" (submit)="$event.preventDefault()">
            <label [for]="id + '-item'" [class]="styles.field">
                Item
                <select [id]="id + '-item'" (change)="fill(valueOf($event))" [class]="styles.select">
                    @for (item of layout(); track item.id) {
                        <option [value]="item.id" [selected]="item.id === selected()">
                            {{ titleOf(item.id) }}
                        </option>
                    } @empty {
                        <option value="">No items</option>
                    }
                </select>
            </label>
            <div [class]="styles.numbers">
                @for (key of fieldList; track key) {
                    <label [for]="id + '-' + key" [class]="styles.field">
                        {{ key }}
                        <input
                            [id]="id + '-' + key"
                            type="number"
                            [min]="key === 'w' || key === 'h' ? 1 : 0"
                            step="1"
                            [value]="fields()[key]"
                            (input)="setField(key, valueOf($event))"
                            [class]="styles.number"
                        />
                    </label>
                }
            </div>
            <div [class]="styles.buttons">
                <button kitClickable size="sm" [disabled]="!checks()?.move.ok" (click)="move()">
                    <svg lucideMove></svg>
                    Move
                </button>
                <button
                    kitClickable
                    size="sm"
                    variant="outline"
                    [disabled]="!checks()?.resize.ok"
                    (click)="resize()"
                >
                    <svg lucideScaling></svg>
                    Resize
                </button>
                <button
                    kitClickable
                    size="sm"
                    variant="outline"
                    [class]="styles.danger"
                    [disabled]="!checks()?.remove.ok"
                    (click)="remove()"
                >
                    <svg lucideTrash2></svg>
                    Remove
                </button>
            </div>
            <p role="status" [class]="styles.status">
                {{ refusal()?.error.message ?? "Every command applies." }}
            </p>
        </form>
    `,
})
export class Controls {
    protected readonly styles = styles;
    protected readonly titleOf = titleOf;
    protected readonly fieldList = FIELDS;
    protected readonly id = `remote-control-${++next}`;
    private readonly gridLayoutRef = inject(GRID);
    private readonly grid = injectGridLayout(this.gridLayoutRef);
    // follows the layout, so every check below is asked again after any change
    private readonly view = injectGridLayoutView(this.gridLayoutRef);
    protected readonly layout = computed(() => this.view()?.layout ?? []);
    protected readonly itemId = signal("revenue");
    protected readonly fields = signal<Record<Field, string>>({
        x: "0",
        y: "1",
        w: "4",
        h: "2",
    });

    /** The chosen item, when the layout still holds it. */
    protected readonly selected = computed(() =>
        this.layout().some((item) => item.id === this.itemId())
            ? this.itemId()
            : "",
    );

    private readonly numbers = computed(() => {
        const { x, y, w, h } = this.fields();
        return {
            x: numberOf(x),
            y: numberOf(y),
            w: numberOf(w),
            h: numberOf(h),
        };
    });

    // a dry run through the middleware: what the button would do, without doing it
    protected readonly checks = computed(() => {
        this.view();
        const model = this.grid()?.model;
        if (!model) return undefined;
        const itemId = this.itemId();
        const { x, y, w, h } = this.numbers();
        return {
            move: model.check("item.move", { itemId, x, y }),
            resize: model.check("item.resize", { itemId, w, h }),
            remove: model.check("item.remove", { itemId }),
        };
    });

    protected readonly refusal = computed(() => {
        const checks = this.checks();
        return checks
            ? [checks.move, checks.resize, checks.remove].find(
                  (check): check is CommandFailure => !check.ok,
              )
            : undefined;
    });

    protected valueOf(event: Event) {
        return (event.target as HTMLInputElement | HTMLSelectElement).value;
    }

    protected setField(key: Field, value: string) {
        this.fields.set({ ...this.fields(), [key]: value });
    }

    /** Fills the fields with an item's place and size. */
    protected fill(next: string) {
        const item = this.grid()?.model.get("item-by", { itemId: next });
        this.itemId.set(next);
        if (item)
            this.fields.set({
                x: String(item.x),
                y: String(item.y),
                w: String(item.w),
                h: String(item.h),
            });
    }

    /** Runs a command, then shows the item as it landed (the model may settle it elsewhere). */
    private after(result: CommandResult<unknown>) {
        if (result.ok) this.fill(this.itemId());
    }

    protected move() {
        const model = this.grid()?.model;
        const { x, y } = this.numbers();
        if (model)
            this.after(model.run("item.move", { itemId: this.itemId(), x, y }));
    }

    protected resize() {
        const model = this.grid()?.model;
        const { w, h } = this.numbers();
        if (model)
            this.after(
                model.run("item.resize", { itemId: this.itemId(), w, h }),
            );
    }

    protected remove() {
        const model = this.grid()?.model;
        const result = model?.run("item.remove", { itemId: this.itemId() });
        const next = model?.get("layout")[0];
        if (result?.ok && next) this.fill(next.id);
    }
}
