import { Directive, effect, output, untracked } from "@angular/core";
import {
    injectGridLayout,
    injectGridLayoutEvents,
    type PlaceResult,
    veto,
} from "@fragiola/grid-layout-angular";
import { attempt, broken, placing, type Refusal } from "./rules";

/**
 * The rules, inside the root: a middleware that vetoes, and the gesture events that tell when a
 * pointer released an item where the rules said no. Renders nothing (a directive on an
 * `<ng-container>`).
 */
@Directive({ selector: "[exampleMiddlewareGuard]" })
export class Guard {
    readonly refused = output<Refusal>();
    private readonly grid = injectGridLayout();
    /** the last refusal the middleware gave: the log reads it when the gesture ends */
    private last: Refusal | undefined;

    constructor() {
        injectGridLayoutEvents((event) => {
            // a pointer released where the rules said no: the item went back, no command ran
            if (
                (event.type === "drag-stop" || event.type === "resize-stop") &&
                event.refused &&
                !event.outside &&
                this.last
            ) {
                this.refused.emit(this.last);
            }
        });
        effect((onCleanup) => {
            const { model } = this.grid();
            onCleanup(
                untracked(() =>
                    model.use((ctx, next) => {
                        if (!placing(ctx)) return next();
                        const result = next();
                        if (!result.ok) return result;
                        // every placing command returns the layout it settles into
                        const reason = broken(
                            (result.value as PlaceResult).layout,
                        );
                        if (!reason) return result;
                        this.last = { ...attempt(ctx), reason };
                        return veto(reason);
                    }),
                ),
            );
        });
    }
}
