// Workaround: a pixel constraint applies when an item is moved or resized, not when the layout
// loads or the grid's width changes, and the rows a ratio needs depend on the width. Once the
// width is known, and whenever it changes, each constrained item is resized to its own size with
// the engine's pixels, which settles its height. Renders nothing: it only needs the root.

import { Component, effect, untracked } from "@angular/core";
import {
    injectGridLayout,
    injectGridLayoutView,
} from "@fragiola/grid-layout-angular";

@Component({
    selector: "example-keep-ratios",
    template: "",
})
export class KeepRatios {
    private readonly grid = injectGridLayout();
    private readonly view = injectGridLayoutView();

    constructor() {
        effect(() => {
            const width = this.view().width;
            untracked(() => {
                const { model, engine } = this.grid();
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
