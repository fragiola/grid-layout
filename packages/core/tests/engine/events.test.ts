// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { veto } from "../../src/model/model";
import { cellPoint as at, pointer, setup } from "./harness";

// What a gesture's end tells: whether the model refused the landing it showed.

describe("a gesture's end", () => {
    it("tells `refused` when a middleware refused the landing, and runs no command", () => {
        const grid = setup({
            layout: [
                { id: "a", x: 0, y: 0, w: 1, h: 1 },
                { id: "b", x: 4, y: 0, w: 1, h: 1 },
            ],
        });
        grid.model.use((ctx, next) =>
            ctx.command === "item.move" && ctx.payload.x > 2
                ? veto("not past column 2")
                : next(),
        );
        const commands: string[] = [];
        grid.model.subscribe((event) => commands.push(event.command));
        let press = pointer(grid.item("a"), ...at(0, 0));
        press.move(...at(6, 0));
        press.release(...at(6, 0));
        expect(grid.events.at(-1)).toMatchObject({
            type: "drag-stop",
            refused: true,
        });
        expect(commands).toEqual([]);
        press = pointer(grid.item("a"), ...at(0, 0));
        press.move(...at(2, 0));
        press.release(...at(2, 0));
        expect(grid.events.at(-1)).toMatchObject({
            type: "drag-stop",
            refused: false,
        });
        expect(commands).toEqual(["item.move"]);
    });
});
