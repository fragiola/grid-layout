import {
    afterNextRender,
    DestroyRef,
    type ElementRef,
    inject,
    type Signal,
    signal,
} from "@angular/core";
import type { ChartSize } from "../_kit/charts";

/**
 * An element's size in whole pixels, kept current by a `ResizeObserver`: a chart reads it to
 * draw itself at its tile's size, during a resize too. `box` is the measured element's query.
 */
export function injectSize(
    box: Signal<ElementRef<HTMLElement> | undefined>,
): Signal<ChartSize> {
    const size = signal<ChartSize>({ width: 0, height: 0 });
    let observer: ResizeObserver | undefined;
    afterNextRender(() => {
        const element = box()?.nativeElement;
        const view = element?.ownerDocument.defaultView;
        if (!element || !view) return;
        const measure = () => {
            const width = Math.round(element.clientWidth);
            const height = Math.round(element.clientHeight);
            const now = size();
            if (now.width !== width || now.height !== height) {
                size.set({ width, height });
            }
        };
        measure();
        observer = new view.ResizeObserver(measure);
        observer.observe(element);
    });
    inject(DestroyRef).onDestroy(() => observer?.disconnect());
    return size.asReadonly();
}
