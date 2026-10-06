// Type fixtures for constraints (K1–K3): checked by `tsc`, never run.

import {
    aspectRatio,
    boundedX,
    type ConstraintRegistry,
    createGridLayoutModel,
    gridBounds,
    type ItemConstraint,
    type LayoutConstraint,
    type LayoutItem,
    minMaxSize,
    snapToGrid,
} from "../../src";

// a registry holds constraints and factories, by name
const registry: ConstraintRegistry = { aspectRatio, snapToGrid, boundedX };

const model = createGridLayoutModel({
    constraints: [gridBounds, minMaxSize, snapToGrid(2)],
    constraintRegistry: registry,
});

// an item stores its constraints as data: a name, or a name with a factory's arguments
const stored: readonly ItemConstraint[] = [
    "boundedX",
    { name: "aspectRatio", args: [16 / 9] },
];
const item: LayoutItem = {
    id: "video",
    x: 0,
    y: 0,
    w: 4,
    h: 2,
    constraints: stored,
};
void item;

const live: LayoutItem = {
    id: "a",
    x: 0,
    y: 0,
    w: 1,
    h: 1,
    // @ts-expect-error: an item stores data, never a constraint object
    constraints: [boundedX],
};
void live;

// @ts-expect-error: a factory's arguments are plain data
const bad: ItemConstraint = { name: "aspectRatio", args: [{ ratio: 1 }] };
void bad;

// a custom constraint: a name, and a position and/or a size rule
const evenColumns: LayoutConstraint = {
    name: "evenColumns",
    position: (proposed) => ({
        x: Math.round(proposed.x / 2) * 2,
        y: proposed.y,
    }),
};
model.run("grid.configure", { settings: { constraints: [evenColumns] } });

// a run takes the engine's pixels as its options (K2)
const result = model.check(
    "item.resize",
    { itemId: "video", w: 6, h: 2 },
    { env: { geometry: undefined, height: 0 } },
);
if (result.ok) {
    const skipped: readonly string[] | undefined = result.value.skipped;
    void skipped;
}

// @ts-expect-error: the options come after the payload
model.run("item.move", { env: {} });

// a middleware reads the run's pixels
model.use((ctx, next) => {
    const width: number | undefined = ctx.env.geometry?.width;
    void width;
    return next();
});
