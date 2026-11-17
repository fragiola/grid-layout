import { Component, DestroyRef, inject, input, signal } from "@angular/core";
import * as styles from "./styles";
import type { CompactionTimer } from "./timer";

/** The time of the last compaction: it alone renders again when one runs. */
@Component({
    selector: "example-fast-compactors-last-compaction",
    host: { class: "contents" },
    template: `
        <span [class]="styles.timing">
            Last compaction
            <output aria-label="Last compaction" [class]="styles.ms">{{
                ms() === undefined ? "–" : ms()?.toFixed(1) + " ms"
            }}</output>
        </span>
    `,
})
export class LastCompaction {
    readonly timer = input.required<CompactionTimer>();
    protected readonly styles = styles;
    protected readonly ms = signal<number | undefined>(undefined);
    private readonly destroyRef = inject(DestroyRef);

    ngOnInit() {
        const timer = this.timer();
        this.ms.set(timer.last());
        const stop = timer.subscribe(() => this.ms.set(timer.last()));
        this.destroyRef.onDestroy(stop);
    }
}
