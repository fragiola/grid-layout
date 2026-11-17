import { Component, input } from "@angular/core";
import { GRID_LAYOUT } from "@fragiola/grid-layout-angular";
import { Artwork } from "../_kit/artwork";
import type { Photo } from "./photos";
import * as styles from "./styles";

/** A photo, which keeps its ratio, and its caption. */
@Component({
    selector: "collage-photo",
    imports: [GRID_LAYOUT, Artwork],
    host: { class: "contents" },
    template: `
        <div
            [gridLayoutItem]="photo().id"
            #part="gridLayoutItem"
            [attr.aria-label]="photo().caption"
            [class]="styles.photo(photo().tone)(part.state())"
        >
            <svg
                kitArtwork
                [seed]="photo().seed"
                [ratio]="photo().ratio"
                [layers]="styles.layers"
                [class]="styles.artwork"
            ></svg>
            <span [class]="styles.caption">{{ photo().caption }}</span>
            <div
                *gridLayoutResizeHandle="'bottom-end'"
                [attr.aria-label]="'Resize ' + photo().caption"
                [class]="styles.resizeHandle"
            ></div>
        </div>
    `,
})
export class PhotoItem {
    readonly photo = input.required<Photo>();
    protected readonly styles = styles;
}
