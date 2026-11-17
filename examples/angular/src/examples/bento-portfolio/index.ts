import { Component } from "@angular/core";
import {
    aspectRatio,
    GRID_LAYOUT,
    type Layout,
} from "@fragiola/grid-layout-angular";
import { KeepRatios } from "./keep-ratios";
import { PROJECTS } from "./portfolio";
import { ProjectTile } from "./project-tile";
import * as styles from "./styles";

/** An item's own aspect ratio, stored in the layout as data: a name and its arguments. */
const ratio = (value: number) => [{ name: "aspectRatio", args: [value] }];

// The hero is pinned (`static: true`); every picture keeps its ratio; the text tiles size freely.
const layout: Layout = [
    { id: "hero", x: 0, y: 0, w: 6, h: 9, static: true },
    ...PROJECTS.map((project) => ({
        ...project.box,
        id: project.id,
        constraints: ratio(project.ratio),
    })),
    { id: "about", x: 6, y: 9, w: 3, h: 7, minW: 2, minH: 4 },
    { id: "contact", x: 9, y: 9, w: 3, h: 4, minW: 2, minH: 3 },
];

const byId = new Map(PROJECTS.map((project) => [project.id, project]));

// read when the grid is created: a new registry needs a new grid (a remount)
const registry = { aspectRatio };

// A portfolio's bento: a pinned hero, project pictures of mixed sizes that keep their aspect
// ratio as they are resized (each item's own `aspectRatio` constraint, saved with the layout),
// and text tiles that size freely. The pictures are generated SVG in the theme's palettes.
@Component({
    selector: "example-bento-portfolio",
    imports: [GRID_LAYOUT, KeepRatios, ProjectTile],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <div
                gridLayoutRoot
                [defaultLayout]="layout"
                [constraintRegistry]="registry"
                [rowHeight]="20"
                [gap]="[10, 10]"
                aria-label="Portfolio"
                [class]="styles.root"
            >
                <bento-keep-ratios />
                <ng-template gridLayoutItems let-item>
                    @let project = byId.get(item.id);
                    @if (project) {
                        <bento-project-tile [project]="project" />
                    } @else if (item.id === "hero") {
                        <div
                            gridLayoutItem="hero"
                            aria-label="Introduction"
                            [class]="styles.hero"
                        >
                            <span [class]="styles.eyebrow">Portfolio · 2026</span>
                            <span [class]="styles.intro">
                                <span [class]="styles.name">Noor Haddad</span>
                                <span [class]="styles.role">
                                    Product designer and illustrator. I design calm tools for
                                    busy people, and draw the pictures in them.
                                </span>
                                <span [class]="styles.available">
                                    Open to new work in spring
                                </span>
                            </span>
                        </div>
                    } @else {
                        @let title = item.id === "about" ? "About" : "Contact";
                        <div
                            [gridLayoutItem]="item.id"
                            #part="gridLayoutItem"
                            [attr.aria-label]="title"
                            [class]="styles.text(part.state())"
                        >
                            <span [class]="styles.label">{{ title }}</span>
                            @if (item.id === "about") {
                                <span [class]="styles.body">
                                    Ten years of product work, from banking apps to a tide-table
                                    for sailors. Based in Lisbon, working with teams anywhere.
                                </span>
                            } @else {
                                <!-- a link never starts a drag: it stays a link -->
                                <a href="mailto:hello@example.com" [class]="styles.link">
                                    hello@example.com
                                </a>
                            }
                            <div
                                *gridLayoutResizeHandle="'bottom-end'"
                                [attr.aria-label]="'Resize ' + title"
                                [class]="styles.resizeHandle"
                            ></div>
                        </div>
                    }
                </ng-template>
                <div *gridLayoutPlaceholder [class]="styles.placeholder"></div>
            </div>
        </div>
    `,
})
export default class BentoPortfolio {
    protected readonly styles = styles;
    protected readonly layout = layout;
    protected readonly registry = registry;
    protected readonly byId = byId;
}
