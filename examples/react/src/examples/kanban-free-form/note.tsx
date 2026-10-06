import { GridLayout, useGridLayout } from "@fragiola/grid-layout-react";
import { Palette, X } from "lucide-react";
import { Clickable } from "#/components/atoms/clickable";
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
export function NoteItem({
    id,
    note,
    onChange,
}: {
    id: string;
    note: Note;
    onChange: (note: Note) => void;
}) {
    const { model } = useGridLayout();
    const name = nameOf(id);
    const tone = note.tone ?? TONES[numberOf(id) % TONES.length] ?? "orange";
    const next = TONES[(TONES.indexOf(tone) + 1) % TONES.length];
    return (
        <GridLayout.Item
            itemId={id}
            aria-label={name}
            className={styles.note(tone)}
        >
            <span className={styles.noteHeader}>
                <span className={styles.noteTitle}>{name}</span>
                <Clickable.Button
                    size="sm"
                    variant="icon"
                    aria-label={`Change the colour of ${name}`}
                    onClick={() => onChange({ ...note, tone: next })}
                >
                    <Palette aria-hidden="true" />
                </Clickable.Button>
                <Clickable.Button
                    size="sm"
                    variant="icon"
                    aria-label={`Remove ${name}`}
                    onClick={() => model.run("item.remove", { itemId: id })}
                >
                    <X aria-hidden="true" />
                </Clickable.Button>
            </span>
            <textarea
                aria-label={`Text of ${name}`}
                placeholder="Write something"
                value={note.text}
                onChange={(event) =>
                    onChange({ ...note, text: event.currentTarget.value })
                }
                className={styles.noteText}
            />
        </GridLayout.Item>
    );
}
