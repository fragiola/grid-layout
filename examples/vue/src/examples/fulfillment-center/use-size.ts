import {
    onBeforeUnmount,
    onMounted,
    type Ref,
    shallowRef,
    useTemplateRef,
} from "vue";
import type { ChartSize } from "../_kit/charts";

/**
 * An element's size in whole pixels, kept current by a `ResizeObserver`: a chart reads it to
 * draw itself at its tile's size, during a resize too. `key` is the measured element's template ref.
 */
export function useSize(key: string): Ref<ChartSize> {
    const box = useTemplateRef<HTMLElement>(key);
    const size = shallowRef<ChartSize>({ width: 0, height: 0 });
    let observer: ResizeObserver | undefined;
    onMounted(() => {
        const element = box.value;
        const view = element?.ownerDocument.defaultView;
        if (!element || !view) return;
        const measure = () => {
            const width = Math.round(element.clientWidth);
            const height = Math.round(element.clientHeight);
            if (size.value.width !== width || size.value.height !== height) {
                size.value = { width, height };
            }
        };
        measure();
        observer = new view.ResizeObserver(measure);
        observer.observe(element);
    });
    onBeforeUnmount(() => observer?.disconnect());
    return size;
}
