import type { UndoStep } from "../_kit/undo";
import { widget } from "../_kit/widgets";

/** An item's title: a note dropped from the sidebar, or a widget. */
export const titleOf = (id: string) =>
    id.startsWith("note-") ? `Note ${id.slice(5)}` : widget(id).title;

const VERBS: Record<string, string> = {
    "item.move": "Move",
    "item.place": "Move",
    "item.resize": "Resize",
    "item.add": "Add",
    "item.remove": "Remove",
    "layouts.generate": "Generate a layout",
};

/** A step of the history in words. */
export const describe = (step: UndoStep) =>
    `${VERBS[step.command] ?? step.command}${step.itemId ? ` ${titleOf(step.itemId)}` : ""}`;
