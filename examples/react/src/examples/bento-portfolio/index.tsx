"use client";

import {
    aspectRatio,
    GridLayout,
    type Layout,
    useGridLayout,
    useGridLayoutView,
} from "@fragiola/grid-layout-react";
import { useEffect } from "react";
import { Artwork } from "../_kit/artwork";
import { PROJECTS, type Project } from "./portfolio";
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

// read when the grid is created: a new registry needs a new grid (a `key`)
const registry = { aspectRatio };

// A portfolio's bento: a pinned hero, project pictures of mixed sizes that keep their aspect
// ratio as they are resized (each item's own `aspectRatio` constraint, saved with the layout),
// and text tiles that size freely. The pictures are generated SVG in the theme's palettes.
export default function BentoPortfolio() {
    return (
        <div className={styles.frame}>
            <GridLayout.Root
                defaultLayout={layout}
                constraintRegistry={registry}
                rowHeight={20}
                gap={[10, 10]}
                aria-label="Portfolio"
                className={styles.root}
            >
                <KeepRatios />
                <GridLayout.Items>
                    {(item) => {
                        const project = byId.get(item.id);
                        if (project)
                            return (
                                <ProjectTile key={item.id} project={project} />
                            );
                        if (item.id === "hero") return <Hero key="hero" />;
                        return <TextTile key={item.id} id={item.id} />;
                    }}
                </GridLayout.Items>
                <GridLayout.Placeholder className={styles.placeholder} />
            </GridLayout.Root>
        </div>
    );
}

function Hero() {
    return (
        <GridLayout.Item
            itemId="hero"
            aria-label="Introduction"
            className={styles.hero}
        >
            <span className={styles.eyebrow}>Portfolio · 2026</span>
            <span className={styles.intro}>
                <span className={styles.name}>Noor Haddad</span>
                <span className={styles.role}>
                    Product designer and illustrator. I design calm tools for
                    busy people, and draw the pictures in them.
                </span>
                <span className={styles.available}>
                    Open to new work in spring
                </span>
            </span>
        </GridLayout.Item>
    );
}

function ProjectTile({ project }: { project: Project }) {
    return (
        <GridLayout.Item
            itemId={project.id}
            aria-label={project.title}
            className={styles.tile(project.tone)}
        >
            <Artwork
                seed={project.seed}
                ratio={project.ratio}
                motif={project.motif}
                className={styles.artwork}
                layers={styles.layers}
            />
            <span className={styles.caption}>
                <span className={styles.captionTitle}>{project.title}</span>
                <span className={styles.captionText}>{project.kind}</span>
            </span>
            <GridLayout.ResizeHandle
                side="bottom-end"
                aria-label={`Resize ${project.title}`}
                className={styles.resizeHandle}
            />
        </GridLayout.Item>
    );
}

function TextTile({ id }: { id: string }) {
    const about = id === "about";
    const title = about ? "About" : "Contact";
    return (
        <GridLayout.Item itemId={id} aria-label={title} className={styles.text}>
            <span className={styles.label}>{title}</span>
            {about ? (
                <span className={styles.body}>
                    Ten years of product work, from banking apps to a tide-table
                    for sailors. Based in Lisbon, working with teams anywhere.
                </span>
            ) : (
                // a link never starts a drag: it stays a link
                <a href="mailto:hello@example.com" className={styles.link}>
                    hello@example.com
                </a>
            )}
            <GridLayout.ResizeHandle
                side="bottom-end"
                aria-label={`Resize ${title}`}
                className={styles.resizeHandle}
            />
        </GridLayout.Item>
    );
}

/**
 * Workaround (docs/examples-gaps.md, E8): a pixel constraint applies when an item is moved or
 * resized, not when the layout loads or the grid's width changes, and the rows a ratio needs
 * depend on the width. Once the width is known, and whenever it changes, each constrained item
 * is resized to its own size with the engine's pixels, which settles its height.
 */
function KeepRatios() {
    const { model, engine } = useGridLayout();
    const { width } = useGridLayoutView();
    useEffect(() => {
        const geometry = engine.get("geometry");
        if (width === 0 || !geometry) return;
        for (const item of model.get("layout")) {
            if (!item.constraints?.length) continue;
            model.run(
                "item.resize",
                { itemId: item.id, w: item.w, h: item.h },
                { env: { geometry } },
            );
        }
    }, [model, engine, width]);
    return null;
}
