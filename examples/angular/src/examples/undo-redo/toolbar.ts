import {
    Component,
    computed,
    DOCUMENT,
    effect,
    inject,
    model,
    signal,
    untracked,
} from "@angular/core";
import {
    injectBreakpoint,
    injectGridLayout,
} from "@fragiola/grid-layout-angular";
import { LucideRedo2, LucideUndo2 } from "@lucide/angular";
import { ClickableButton } from "#/components/atoms/clickable";
import {
    createUndoHistory,
    type UndoHistory,
    type UndoSnapshot,
    undoKey,
} from "../_kit/undo";
import { GRID } from "./grid";
import * as styles from "./styles";
import { describe } from "./titles";

const EMPTY: UndoSnapshot = {
    canUndo: false,
    canRedo: false,
    undoSteps: [],
    redoSteps: [],
};

/** Undo, redo, the history, and the grid's width. */
@Component({
    selector: "example-undo-redo-toolbar",
    imports: [ClickableButton, LucideUndo2, LucideRedo2],
    host: { class: "contents" },
    template: `
        <div [class]="styles.toolbar">
            <div [class]="styles.buttons">
                <button
                    kitClickable
                    size="sm"
                    variant="outline"
                    [disabled]="!snapshot().canUndo"
                    aria-keyshortcuts="Control+Z Meta+Z"
                    (click)="history()?.undo()"
                >
                    <svg lucideUndo2></svg>
                    Undo
                </button>
                <button
                    kitClickable
                    size="sm"
                    variant="outline"
                    [disabled]="!snapshot().canRedo"
                    aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z Control+Y"
                    (click)="history()?.redo()"
                >
                    <svg lucideRedo2></svg>
                    Redo
                </button>
                <button
                    kitClickable
                    size="sm"
                    variant="outline"
                    [attr.aria-pressed]="narrow()"
                    (click)="narrow.set(!narrow())"
                >
                    Narrow grid
                </button>
            </div>
            <p [class]="styles.note">
                <span data-testid="breakpoint">{{
                    current() ? current()?.breakpoint + ", " + current()?.cols + " columns" : "…"
                }}</span>
                · layouts held:
                <span data-testid="layouts">{{ held() }}</span>
            </p>
            <ol aria-label="History" [class]="styles.history">
                @for (entry of steps(); track $index) {
                    <li [attr.data-undone]="entry.undone ? '' : null" [class]="styles.step">
                        {{ describe(entry.step) }}
                    </li>
                } @empty {
                    <li [class]="styles.hint">
                        Drag, resize, drop a note or narrow the grid: each is a step.
                    </li>
                }
            </ol>
        </div>
    `,
})
export class Toolbar {
    readonly narrow = model.required<boolean>();
    protected readonly styles = styles;
    protected readonly describe = describe;
    private readonly gridLayoutRef = inject(GRID);
    private readonly grid = injectGridLayout(this.gridLayoutRef);
    protected readonly current = injectBreakpoint(this.gridLayoutRef);
    /** The grid's history: made once its root holds the ref, dropped with it. */
    protected readonly history = signal<UndoHistory | undefined>(undefined);
    protected readonly snapshot = signal<UndoSnapshot>(EMPTY);

    // asked again when the history changes (every layout change is a step) or the breakpoint does
    protected readonly held = computed(() => {
        this.snapshot();
        this.current();
        const model = this.grid()?.model;
        return model ? Object.keys(model.get("layouts")).join(", ") : "";
    });

    protected readonly steps = computed(() => {
        const snapshot = this.snapshot();
        return [
            ...snapshot.undoSteps.map((step) => ({ step, undone: false })),
            // undone steps after the done ones, the next to redo first
            ...[...snapshot.redoSteps]
                .reverse()
                .map((step) => ({ step, undone: true })),
        ];
    });

    constructor() {
        effect((onCleanup) => {
            const grid = this.grid();
            if (!grid) return;
            untracked(() => {
                const made = createUndoHistory(grid.model);
                this.history.set(made);
                this.snapshot.set(made.getSnapshot());
                const stop = made.subscribe(() =>
                    this.snapshot.set(made.getSnapshot()),
                );
                onCleanup(() => {
                    stop();
                    made.dispose();
                    this.history.set(undefined);
                    this.snapshot.set(EMPTY);
                });
            });
        });

        // the shortcuts, page-wide; never in the middle of a gesture (its preview is not committed)
        const document = inject(DOCUMENT);
        effect((onCleanup) => {
            const made = this.history();
            const engine = this.grid()?.engine;
            if (!made || !engine) return;
            const onKeyDown = (event: KeyboardEvent) => {
                const action = undoKey(event);
                if (!action || engine.get("gesture")) return;
                event.preventDefault();
                made[action]();
            };
            document.addEventListener("keydown", onKeyDown);
            onCleanup(() => document.removeEventListener("keydown", onKeyDown));
        });
    }
}
