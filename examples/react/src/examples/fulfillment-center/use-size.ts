import { type RefObject, useLayoutEffect, useRef, useState } from "react";
import type { ChartSize } from "../_kit/charts";

/**
 * An element's size in whole pixels, kept current by a `ResizeObserver`: a chart reads it to
 * draw itself at its tile's size, during a resize too.
 */
export function useSize<T extends Element>(): [RefObject<T | null>, ChartSize] {
    const ref = useRef<T>(null);
    const [size, setSize] = useState<ChartSize>({ width: 0, height: 0 });
    useLayoutEffect(() => {
        const element = ref.current;
        const view = element?.ownerDocument.defaultView;
        if (!element || !view) return;
        const measure = () => {
            const width = Math.round(element.clientWidth);
            const height = Math.round(element.clientHeight);
            setSize((size) =>
                size.width === width && size.height === height
                    ? size
                    : { width, height },
            );
        };
        measure();
        const observer = new view.ResizeObserver(measure);
        observer.observe(element);
        return () => observer.disconnect();
    }, []);
    return [ref, size];
}
