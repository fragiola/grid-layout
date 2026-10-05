// What a screen reader hears about a gesture: the words are the app's (D10), built here from the
// grid's gesture events, and spoken through a live region the example renders.

import { useCallback, useState } from "react";

/** The parts of a gesture event an announcement reads. */
export interface GestureLike {
    readonly type: string;
    readonly source: "pointer" | "keyboard";
    readonly before: {
        readonly x: number;
        readonly y: number;
        readonly w: number;
        readonly h: number;
    };
    readonly item: {
        readonly x: number;
        readonly y: number;
        readonly w: number;
        readonly h: number;
    };
}

const place = (box: GestureLike["item"]) =>
    `column ${box.x + 1}, row ${box.y + 1}`;
const size = (box: GestureLike["item"]) =>
    `${box.w} ${box.w === 1 ? "column" : "columns"} wide, ${box.h} ${box.h === 1 ? "row" : "rows"} tall`;

/** The sentence for a gesture event, or `undefined` for one not worth saying. */
export function describeGesture(
    event: GestureLike,
    name: string,
): string | undefined {
    switch (event.type) {
        case "grab":
            return `${name} grabbed at ${place(event.item)}, ${size(event.item)}. Arrows move it, Shift and the arrows resize it, Space or Enter drops it, Escape puts it back.`;
        case "move":
            return `${name} moved to ${place(event.item)}.`;
        case "resize":
            return event.source === "keyboard"
                ? `${name} is now ${size(event.item)}.`
                : undefined;
        case "drop":
            return `${name} dropped at ${place(event.item)}, ${size(event.item)}.`;
        case "drag-stop":
            return `${name} moved to ${place(event.item)}.`;
        case "resize-stop":
            return `${name} resized to ${size(event.item)}.`;
        case "cancel":
            return `${name} put back at ${place(event.before)}.`;
        default:
            return undefined;
    }
}

/** A message for a live region, and the function that sets it. */
export function useAnnouncer(): [
    string,
    (message: string | undefined) => void,
] {
    const [message, setMessage] = useState("");
    const announce = useCallback((next: string | undefined) => {
        if (next !== undefined) setMessage(next);
    }, []);
    return [message, announce];
}
