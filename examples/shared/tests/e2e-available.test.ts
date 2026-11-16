// From Dockable (fragiola/dockable, examples/shared/tests/e2e-available.test.ts), same author and licence.
import { describe, expect, it } from "vitest";
import {
    COMPLETE_FRAMEWORKS,
    embedBase,
    frameworkOf,
    skipOrFail,
    skipReason,
} from "../e2e/available.ts";

// The shared e2e suite runs against every framework's embed; a spec that opens an example the
// framework does not have is skipped with this reason, unless the framework ships every example
// (e2e/helpers.ts).
describe("the e2e suite's framework", () => {
    it("comes from EXAMPLES_FRAMEWORK, and a missing or unknown one throws", () => {
        expect(frameworkOf("vue")).toBe("vue");
        expect(() => frameworkOf(undefined)).toThrow(/EXAMPLES_FRAMEWORK/);
        expect(() => frameworkOf("svelte")).toThrow(/react, vue, angular/);
    });

    it("mounts each framework's embed under its own base", () => {
        expect(embedBase("react")).toBe("/grid-layout/embed/react/");
        expect(embedBase("angular")).toBe("/grid-layout/embed/angular/");
    });
});

describe("a spec's examples", () => {
    const available = ["hello-grid", "drop-files"];

    it("run when the framework has every one", () => {
        expect(skipReason("vue", available, ["hello-grid"])).toBeUndefined();
        expect(skipReason("vue", available, [])).toBeUndefined();
    });

    it("skip, naming the missing ones, when it lacks some", () => {
        expect(
            skipReason("vue", available, ["drop-files", "toolbox", "keyboard"]),
        ).toBe("vue has no toolbox, keyboard example");
    });
});

describe("a complete framework", () => {
    const available = ["hello-grid"];

    it("is React today: Vue and Angular ship a subset while they are written", () => {
        expect(COMPLETE_FRAMEWORKS).toEqual(["react"]);
    });

    it("fails a spec whose example it lacks, instead of skipping it", () => {
        expect(() => skipOrFail("react", available, ["drop-files"])).toThrow(
            /react has no drop-files example, but every react example is required/,
        );
        expect(skipOrFail("react", available, ["hello-grid"])).toBeUndefined();
    });

    it("skips for a framework that is not complete yet", () => {
        expect(skipOrFail("vue", available, ["drop-files"])).toBe(
            "vue has no drop-files example",
        );
    });
});
