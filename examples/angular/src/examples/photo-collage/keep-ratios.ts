import { Component, effect, untracked } from "@angular/core";
import {
    injectGridLayout,
    injectGridLayoutView,
} from "@fragiola/grid-layout-angular";

/**
 * Workaround (docs/examples-gaps.md): a pixel constraint applies when an item is moved or
 * resized, not when the layout loads or the grid's width changes, and the rows a ratio needs
 * depend on the width. Once the width is known, and whenever it changes, each constrained item
 * is resized to its own size with the engine's pixels, which settles its height. It renders
 * nothing: it sits inside the root to reach its grid.
 */
@Component({
    selector: "collage-keep-ratios",
    host: { class: "contents" },
    template: "",
})
export class KeepRatios {
    private readonly grid = injectGridLayout();
    private readonly view = injectGridLayoutView();

    constructor() {
        effect(() => {
            const width = this.view().width;
            const { model, engine } = this.grid();
            untracked(() => {
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
            });
        });
    }
}
