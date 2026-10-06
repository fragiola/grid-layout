// A generated picture as inline SVG. It fills its box and crops what does not fit, like an
// `object-fit: cover` image. The classes come from the example, one per layer: the kit holds no
// styles.

import { type Layer, type Motif, picture } from "./images";

/** A generated picture, decorative: the caption beside it says what it is. */
export function Artwork({
    seed,
    ratio,
    motif,
    className,
    layers,
}: {
    seed: number;
    /** width over height */
    ratio: number;
    motif?: Motif;
    className?: string;
    /** each layer's class: its colour */
    layers: Readonly<Record<Layer, string>>;
}) {
    const { width, height, shapes } = picture(seed, ratio, motif);
    return (
        <svg
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
            className={className}
        >
            {shapes.map((shape) => (
                <path
                    key={shape.layer}
                    d={shape.d}
                    className={layers[shape.layer]}
                />
            ))}
        </svg>
    );
}
