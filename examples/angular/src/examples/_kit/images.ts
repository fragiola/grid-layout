// Pictures for the demos, generated instead of downloaded: a landscape (sky, sun, two ridges) or
// an abstract composition, drawn as SVG shapes from a seed. Only the geometry lives here; each
// example colours the layers with its palette, so a picture follows the theme like everything
// else. No images are hot-linked. App data, no grid and no styles.

import { seeded } from "./layouts";

/** A layer of a picture, back to front: its colour is the example's. */
export type Layer = "sky" | "sun" | "far" | "near";

/** A generated picture: its box and its shapes, each on a layer. */
export interface Picture {
    readonly width: number;
    readonly height: number;
    readonly shapes: readonly { readonly layer: Layer; readonly d: string }[];
}

/** What a picture shows. */
export type Motif = "landscape" | "shapes";

/** A ridge across the picture at `base` (a fraction of the height), filled down to the bottom. */
function ridge(
    random: () => number,
    width: number,
    height: number,
    base: number,
    swing: number,
): string {
    const steps = 6;
    const points = Array.from({ length: steps + 1 }, (_, index) => {
        const x = (index / steps) * width;
        const y = height * (base + (random() - 0.5) * swing);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return `M0,${height} L${points.join(" L")} L${width},${height} Z`;
}

/** A circle as a path, so every shape is one `d`. */
function circle(cx: number, cy: number, r: number): string {
    return `M${cx - r},${cy} a${r},${r} 0 1,0 ${2 * r},0 a${r},${r} 0 1,0 ${-2 * r},0`;
}

/** The picture for `seed` at a `ratio` (width over height): the same seed, the same picture. */
export function picture(
    seed: number,
    ratio: number,
    motif: Motif = "landscape",
): Picture {
    const random = seeded(seed);
    const height = 100;
    const width = Math.round(height * ratio);
    const sky = `M0,0 H${width} V${height} H0 Z`;
    if (motif === "shapes") {
        const r = height * (0.18 + random() * 0.12);
        return {
            width,
            height,
            shapes: [
                { layer: "sky", d: sky },
                {
                    layer: "far",
                    d: `M${width * 0.08},${height * 0.62} H${width * (0.5 + random() * 0.3)} V${height * 0.92} H${width * 0.08} Z`,
                },
                {
                    layer: "sun",
                    d: circle(
                        width * (0.55 + random() * 0.25),
                        height * 0.38,
                        r,
                    ),
                },
                {
                    layer: "near",
                    d: `M${width * 0.2},${height * 0.15} L${width * (0.35 + random() * 0.15)},${height * 0.5} L${width * 0.05},${height * 0.5} Z`,
                },
            ],
        };
    }
    return {
        width,
        height,
        shapes: [
            { layer: "sky", d: sky },
            {
                layer: "sun",
                d: circle(
                    width * (0.15 + random() * 0.7),
                    height * (0.2 + random() * 0.2),
                    height * (0.08 + random() * 0.06),
                ),
            },
            { layer: "far", d: ridge(random, width, height, 0.58, 0.22) },
            { layer: "near", d: ridge(random, width, height, 0.78, 0.18) },
        ],
    };
}
