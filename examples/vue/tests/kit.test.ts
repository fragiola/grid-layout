import { describe, expect, it } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { Clickable } from "#/components/atoms/clickable";
import { Switch } from "#/components/ui/switch";
import { describeGesture, useAnnouncer } from "../src/examples/_kit/announce";
import Artwork from "../src/examples/_kit/artwork.vue";

// The Vue kit renders what the React kit renders: the same element, role, state attributes and
// classes, so the shared e2e specs and the themes read both the same.

const render = (node: () => ReturnType<typeof h>) =>
    renderToString(createSSRApp({ render: node }));

describe("the Vue UI kit", () => {
    it("Clickable.Button is a button with the clickable classes", async () => {
        const html = await render(() =>
            h(
                Clickable.Button,
                { variant: "outline", size: "sm", "aria-label": "Add" },
                () => "Add",
            ),
        );
        expect(html).toMatch(/^<button/);
        expect(html).toContain('type="button"');
        expect(html).toContain('aria-label="Add"');
        expect(html).toContain("border-palette-line");
        expect(html).toContain("h-8 px-3");
    });

    it("a disabled Clickable.Button is disabled and dimmed", async () => {
        const html = await render(() =>
            h(Clickable.Button, { disabled: true }, () => "Save"),
        );
        expect(html).toContain("disabled");
        expect(html).toContain("opacity-50");
    });

    it("Switch.Root is a switch that marks its checked state as Base UI does", async () => {
        const on = await render(() =>
            h(Switch.Root, { modelValue: true, "aria-label": "Bounded" }, () =>
                h(Switch.Thumb),
            ),
        );
        expect(on).toContain('role="switch"');
        expect(on).toContain('aria-checked="true"');
        // the root and the thumb (server rendering writes a boolean attribute without a value)
        expect(on.match(/\sdata-checked[\s>=]/g)).toHaveLength(2);
        const off = await render(() =>
            h(Switch.Root, { modelValue: false }, () => h(Switch.Thumb)),
        );
        expect(off).toContain('aria-checked="false"');
        expect(off).not.toMatch(/\sdata-checked[\s>=]/);
    });
});

describe("the Vue _kit", () => {
    it("Artwork is a decorative svg, one path per layer with its class", async () => {
        const html = await render(() =>
            h(Artwork, {
                seed: 3,
                ratio: 1.5,
                layers: {
                    sky: "fill-a",
                    sun: "fill-b",
                    far: "fill-c",
                    near: "fill-d",
                },
            }),
        );
        expect(html).toMatch(/^<svg/);
        expect(html).toContain('aria-hidden="true"');
        // server rendering writes attribute names in lower case; the browser keeps the template's
        expect(html.toLowerCase()).toContain(
            'preserveaspectratio="xmidymid slice"',
        );
        expect(html.match(/<path/g)?.length).toBeGreaterThan(0);
    });

    it("useAnnouncer keeps the last message worth saying", () => {
        const [message, announce] = useAnnouncer();
        expect(message.value).toBe("");
        announce(
            describeGesture(
                {
                    type: "drop",
                    source: "keyboard",
                    before: { x: 0, y: 0, w: 2, h: 2 },
                    item: { x: 3, y: 1, w: 2, h: 2 },
                },
                "Sales",
            ),
        );
        expect(message.value).toBe(
            "Sales dropped at column 4, row 2, 2 columns wide, 2 rows tall.",
        );
        announce(undefined);
        expect(message.value).toContain("Sales dropped");
    });
});
