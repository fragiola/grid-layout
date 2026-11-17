import { Component, computed, signal } from "@angular/core";
import {
    aspectRatio,
    GRID_LAYOUT,
    type Layout,
} from "@fragiola/grid-layout-angular";
import { wrapCompactor } from "@fragiola/grid-layout-angular/compactors";
import { LucideShuffle } from "@lucide/angular";
import { ClickableButton } from "#/components/atoms/clickable";
import { seeded } from "../_kit/layouts";
import { KeepRatios } from "./keep-ratios";
import { PhotoItem } from "./photo-item";
import { PHOTOS, type Photo } from "./photos";
import * as styles from "./styles";

/**
 * The photos in `order`, one per row: the wrap compactor flows them into lines in that order
 * when the grid starts. Each keeps its ratio through its own `aspectRatio` constraint.
 */
function album(order: readonly Photo[]): Layout {
    return order.map((photo, index) => ({
        id: photo.id,
        x: 0,
        y: index,
        w: photo.w,
        h: 8,
        minW: 2,
        constraints: [{ name: "aspectRatio", args: [photo.ratio] }],
    }));
}

/** The album in a new order, the same for the same seed. */
function shuffled(seed: number): Photo[] {
    const random = seeded(seed);
    const order = [...PHOTOS];
    for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [order[i], order[j]] = [order[j] as Photo, order[i] as Photo];
    }
    return order;
}

const byId = new Map(PHOTOS.map((photo) => [photo.id, photo]));

// read when the grid is created: a new registry needs a new grid (a remount)
const registry = { aspectRatio };

// A photo album laid out as a collage: the wrap compactor (from `/compactors`) flows the photos
// in reading order, like words, each keeping its own ratio. Drag a photo between two others and
// the ones after it move along; resize one and the flow makes room. Shuffle starts a new grid
// from another order.
@Component({
    selector: "example-photo-collage",
    imports: [
        GRID_LAYOUT,
        ClickableButton,
        LucideShuffle,
        KeepRatios,
        PhotoItem,
    ],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <div [class]="styles.toolbar">
                <span [class]="styles.heading">Summer in Porto</span>
                <span [class]="styles.count">{{ photos.length }} photos</span>
                <button
                    kitClickable
                    size="sm"
                    variant="outline"
                    (click)="seed.set(seed() + 1)"
                >
                    <svg lucideShuffle></svg>
                    Shuffle
                </button>
            </div>
            <!-- a new grid per order: defaultLayout is read when a grid starts -->
            @for (run of [seed()]; track "seed-" + run) {
                <div
                    gridLayoutRoot
                    [defaultLayout]="layout()"
                    [compactor]="wrapCompactor"
                    [constraintRegistry]="registry"
                    [rowHeight]="10"
                    [gap]="[8, 8]"
                    aria-label="Album"
                    [class]="styles.root"
                >
                    <collage-keep-ratios />
                    <ng-template gridLayoutItems let-item>
                        @let photo = byId.get(item.id);
                        @if (photo) {
                            <collage-photo [photo]="photo" />
                        }
                    </ng-template>
                    <div *gridLayoutPlaceholder [class]="styles.placeholder"></div>
                </div>
            }
        </div>
    `,
})
export default class PhotoCollage {
    protected readonly styles = styles;
    protected readonly photos = PHOTOS;
    protected readonly byId = byId;
    protected readonly registry = registry;
    protected readonly wrapCompactor = wrapCompactor;
    protected readonly seed = signal(0);
    protected readonly layout = computed(() => {
        const seed = this.seed();
        return album(seed === 0 ? PHOTOS : shuffled(seed));
    });
}
