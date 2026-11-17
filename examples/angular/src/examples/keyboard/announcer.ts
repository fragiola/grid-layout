import { Directive, output } from "@angular/core";
import { injectGridLayoutEvents } from "@fragiola/grid-layout-angular";
import { describeGesture } from "../_kit/announce";
import { widget } from "../_kit/widgets";

/**
 * Inside the root, where the grid's gestures can be heard; renders nothing
 * (`<ng-container keyboardAnnouncer (message)="…">`).
 */
@Directive({ selector: "[keyboardAnnouncer]" })
export class Announcer {
    /** what to say about the gesture just told */
    readonly message = output<string>();

    constructor() {
        injectGridLayoutEvents((event) => {
            const said = describeGesture(event, widget(event.itemId).title);
            if (said) this.message.emit(said);
        });
    }
}
