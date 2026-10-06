// The portfolio's projects: what each picture shows, its ratio and where it starts. App data.

import type { Motif } from "../_kit/images";

/** A project tile's palette (styles.ts maps each to a full class). */
export type Tone = "blue" | "orange" | "green" | "purple";

/** A project on the portfolio: a generated picture at a fixed ratio, and a caption. */
export interface Project {
    readonly id: string;
    readonly title: string;
    readonly kind: string;
    /** width over height, kept as the tile is resized */
    readonly ratio: number;
    readonly seed: number;
    readonly motif: Motif;
    readonly tone: Tone;
    /** where it starts on 12 columns (its height settles to its ratio) */
    readonly box: { x: number; y: number; w: number; h: number };
}

export const PROJECTS: readonly Project[] = [
    {
        id: "harbor",
        title: "Harbor",
        kind: "Mobile app · 16:9",
        ratio: 16 / 9,
        seed: 3,
        motif: "landscape",
        tone: "blue",
        box: { x: 6, y: 0, w: 6, h: 9 },
    },
    {
        id: "fieldnotes",
        title: "Fieldnotes",
        kind: "Illustration · 3:4",
        ratio: 3 / 4,
        seed: 8,
        motif: "landscape",
        tone: "green",
        box: { x: 0, y: 9, w: 3, h: 11 },
    },
    {
        id: "tide",
        title: "Tide",
        kind: "Brand identity · 1:1",
        ratio: 1,
        seed: 5,
        motif: "shapes",
        tone: "orange",
        box: { x: 3, y: 9, w: 3, h: 8 },
    },
    {
        id: "lumen",
        title: "Lumen",
        kind: "Website · 2:1",
        ratio: 2,
        seed: 13,
        motif: "landscape",
        tone: "purple",
        box: { x: 6, y: 16, w: 6, h: 8 },
    },
    {
        id: "atlas",
        title: "Atlas",
        kind: "Poster series · 4:3",
        ratio: 4 / 3,
        seed: 21,
        motif: "shapes",
        tone: "blue",
        box: { x: 3, y: 17, w: 3, h: 6 },
    },
];
