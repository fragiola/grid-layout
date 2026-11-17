// A generated picture as inline SVG. It fills its box and crops what does not fit, like an
// `object-fit: cover` image. The classes come from the example, one per layer: the kit holds no
// styles. The component is the app's own `<svg>` (its classes stay the app's):
//
//     <svg kitArtwork [seed]="photo.seed" [ratio]="photo.ratio" [layers]="styles.layers" [class]="styles.artwork"></svg>

import { Component, computed, input } from "@angular/core";
import { type Layer, type Motif, picture } from "./images";

/** A generated picture, decorative: the caption beside it says what it is. */
@Component({
    selector: "svg[kitArtwork]",
    host: {
        "[attr.viewBox]": "viewBox()",
        preserveAspectRatio: "xMidYMid slice",
        "aria-hidden": "true",
    },
    // the host is an `<svg>`: its children are written in the SVG namespace
    template: `
        @for (shape of art().shapes; track shape.layer) {
            <svg:path [attr.d]="shape.d" [attr.class]="layers()[shape.layer]" />
        }
    `,
})
export class Artwork {
    readonly seed = input.required<number>();
    /** width over height */
    readonly ratio = input.required<number>();
    readonly motif = input<Motif>();
    /** each layer's class: its colour */
    readonly layers = input.required<Readonly<Record<Layer, string>>>();
    protected readonly art = computed(() =>
        picture(this.seed(), this.ratio(), this.motif()),
    );
    protected readonly viewBox = computed(
        () => `0 0 ${this.art().width} ${this.art().height}`,
    );
}
