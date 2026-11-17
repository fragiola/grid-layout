import { Component, input } from "@angular/core";
import { GRID_LAYOUT } from "@fragiola/grid-layout-angular";
import { Artwork } from "../_kit/artwork";
import type { Project } from "./portfolio";
import * as styles from "./styles";

/** A project's picture, which keeps its ratio, and its caption. */
@Component({
    selector: "bento-project-tile",
    imports: [GRID_LAYOUT, Artwork],
    host: { class: "contents" },
    template: `
        <div
            [gridLayoutItem]="project().id"
            #part="gridLayoutItem"
            [attr.aria-label]="project().title"
            [class]="styles.tile(project().tone)(part.state())"
        >
            <svg
                kitArtwork
                [seed]="project().seed"
                [ratio]="project().ratio"
                [motif]="project().motif"
                [layers]="styles.layers"
                [class]="styles.artwork"
            ></svg>
            <span [class]="styles.caption">
                <span [class]="styles.captionTitle">{{ project().title }}</span>
                <span [class]="styles.captionText">{{ project().kind }}</span>
            </span>
            <div
                *gridLayoutResizeHandle="'bottom-end'"
                [attr.aria-label]="'Resize ' + project().title"
                [class]="styles.resizeHandle"
            ></div>
        </div>
    `,
})
export class ProjectTile {
    readonly project = input.required<Project>();
    protected readonly styles = styles;
}
