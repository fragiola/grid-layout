// The album's photos: a caption, a ratio and how many columns each starts across. App data.

/** A photo's palette (styles.ts maps each to a full class). */
export type Tone = "blue" | "orange" | "green" | "purple" | "danger";

/** A photo of the album: a generated picture at a fixed ratio. */
export interface Photo {
    readonly id: string;
    readonly caption: string;
    /** width over height, kept as the photo is resized */
    readonly ratio: number;
    /** its starting width, in columns of 12 */
    readonly w: number;
    readonly tone: Tone;
    /** what the generated picture shows: the same seed, the same picture */
    readonly seed: number;
}

export const PHOTOS: readonly Photo[] = [
    {
        id: "harbour",
        caption: "Harbour at dawn",
        ratio: 3 / 2,
        w: 4,
        tone: "blue",
        seed: 4,
    },
    {
        id: "lighthouse",
        caption: "Lighthouse",
        ratio: 2 / 3,
        w: 2,
        tone: "orange",
        seed: 9,
    },
    {
        id: "dunes",
        caption: "Dunes",
        ratio: 16 / 9,
        w: 4,
        tone: "orange",
        seed: 15,
    },
    {
        id: "market",
        caption: "Fish market",
        ratio: 1,
        w: 2,
        tone: "green",
        seed: 22,
    },
    {
        id: "old-town",
        caption: "Old town",
        ratio: 4 / 3,
        w: 3,
        tone: "purple",
        seed: 27,
    },
    {
        id: "cliffs",
        caption: "Cliffs",
        ratio: 3 / 2,
        w: 3,
        tone: "green",
        seed: 31,
    },
    { id: "pier", caption: "The pier", ratio: 1, w: 3, tone: "blue", seed: 38 },
    {
        id: "fog",
        caption: "Morning fog",
        ratio: 2 / 3,
        w: 2,
        tone: "purple",
        seed: 44,
    },
    {
        id: "ferry",
        caption: "Night ferry",
        ratio: 16 / 9,
        w: 4,
        tone: "danger",
        seed: 52,
    },
    {
        id: "orchard",
        caption: "Orchard",
        ratio: 4 / 3,
        w: 3,
        tone: "green",
        seed: 57,
    },
];
