// What a note holds and how it is named: app data, beside the layout.

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
export function numberOf(id: string): number {
    return Number(id.slice("note-".length)) || 0;
}

/** A note's name, from its id: "Note 3". */
export function nameOf(id: string): string {
    return `Note ${numberOf(id)}`;
}
