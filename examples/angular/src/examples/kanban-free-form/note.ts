import { Component, computed, input, output } from "@angular/core";
import { GRID_LAYOUT, injectGridLayout } from "@fragiola/grid-layout-angular";
import { LucidePalette, LucideX } from "@lucide/angular";
import { ClickableButton } from "#/components/atoms/clickable";
import * as styles from "./styles";

/** The colours a note cycles through (styles.ts maps each to a palette). */
export const TONES = ["orange", "green", "blue", "purple"] as const;

/** A note's colour. */
export type Tone = (typeof TONES)[number];

/** What a note holds: the app's, beside the layout. */
export interface Note {
    readonly text: string;
    /** chosen by the person; otherwise from the note's number */
    readonly tone?: Tone;
}

/** A note's number, from its id (`note-3` is 3). */
function numberOf(id: string): number {
    return Number(id.slice("note-".length)) || 0;
}

/** A note's name, from its id: "Note 3". */
export function nameOf(id: string): string {
    return `Note ${numberOf(id)}`;
}

/**
 * A sticky note. It drags from anywhere but its controls: the textarea and the buttons are native
 * controls, which never start a drag, so typing and clicking work as usual.
 */
@Component({
    selector: "kanban-note",
    imports: [GRID_LAYOUT, ClickableButton, LucidePalette, LucideX],
    host: { class: "contents" },
    template: `
        <div
            [gridLayoutItem]="id()"
            #part="gridLayoutItem"
            [attr.aria-label]="name()"
            [class]="styles.note(tone())(part.state())"
        >
            <span [class]="styles.noteHeader">
                <span [class]="styles.noteTitle">{{ name() }}</span>
                <button
                    kitClickable
                    size="sm"
                    variant="icon"
                    [attr.aria-label]="'Change the colour of ' + name()"
                    (click)="noteChange.emit({ ...note(), tone: next() })"
                >
                    <svg lucidePalette></svg>
                </button>
                <button
                    kitClickable
                    size="sm"
                    variant="icon"
                    [attr.aria-label]="'Remove ' + name()"
                    (click)="remove()"
                >
                    <svg lucideX></svg>
                </button>
            </span>
            <textarea
                [attr.aria-label]="'Text of ' + name()"
                placeholder="Write something"
                [value]="note().text"
                (input)="write($event)"
                [class]="styles.noteText"
            ></textarea>
        </div>
    `,
})
export class NoteItem {
    readonly id = input.required<string>();
    readonly note = input.required<Note>();
    /** the note, changed: its text or its colour */
    readonly noteChange = output<Note>();
    protected readonly styles = styles;
    private readonly grid = injectGridLayout();
    protected readonly name = computed(() => nameOf(this.id()));
    protected readonly tone = computed(
        () =>
            this.note().tone ??
            TONES[numberOf(this.id()) % TONES.length] ??
            "orange",
    );
    protected readonly next = computed(
        () => TONES[(TONES.indexOf(this.tone()) + 1) % TONES.length],
    );

    protected remove() {
        this.grid().model.run("item.remove", { itemId: this.id() });
    }

    protected write(event: Event) {
        this.noteChange.emit({
            ...this.note(),
            text: (event.target as HTMLTextAreaElement).value,
        });
    }
}
