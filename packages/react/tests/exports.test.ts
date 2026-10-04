import { describe, expect, it } from "vitest";
import * as GridLayoutReact from "../src";

describe("@fragiola/grid-layout-react", () => {
    it("loads, with the core resolved from its sources", () => {
        expect(GridLayoutReact.VERSION).toBe("0.0.0");
    });
});
