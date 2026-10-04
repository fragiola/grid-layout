// Type fixtures: checked by `tsc` (the package's typecheck), never run. `@ts-expect-error` marks
// what must not compile.

import type { CommandResult, LayoutItem } from "../../src";
import { createGridLayoutModel } from "../../src/model/model";

const model = createGridLayoutModel();

// a command's payload and result are typed by its name
const moved: CommandResult<{ readonly item: LayoutItem }> = model.run(
    "item.move",
    {
        itemId: "a",
        x: 1,
        y: 2,
    },
);
void moved;

// @ts-expect-error: x is a number
model.run("item.move", { itemId: "a", x: "1", y: 2 });

// @ts-expect-error: the payload is required
model.run("item.remove");

// @ts-expect-error: no such command
model.run("item.teleport", {});

// @ts-expect-error: no such side
model.run("item.resize", { itemId: "a", w: 1, h: 1, side: "left" });

// queries and questions are typed by their key
const layout: readonly LayoutItem[] = model.get("layout");
void layout;
const found: LayoutItem | undefined = model.get("item-by", { itemId: "a" });
void found;

// @ts-expect-error: item-by needs its payload
model.get("item-by");

// @ts-expect-error: no such query
model.get("items-by-color");

// @ts-expect-error: the question's payload names an item
model.is("item-static-by", { id: "a" });

// a middleware narrows the payload by the command
model.use((ctx, next) => {
    if (ctx.command === "item.resize") {
        const side: string | undefined = ctx.payload.side;
        void side;
        // @ts-expect-error: item.resize has no x
        void ctx.payload.x;
    }
    return next();
});
