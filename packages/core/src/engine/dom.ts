// The attributes the parts carry and the engine reads: one place, so the adapters and the engine
// cannot drift.

/**
 * Every part's name: `root`, `item`, `drag-handle`, `resize-handle`, `placeholder`,
 * `drag-source`, `drag-preview`.
 */
export const PART_ATTRIBUTE = "data-grid-layout-part";

/** An item's id, on its element. */
export const ITEM_ATTRIBUTE = "data-item-id";

/** A subtree of an item that never starts a drag (a chart's plot area, a slider). */
export const NO_DRAG_ATTRIBUTE = "data-grid-layout-no-drag";

/**
 * What never starts a drag when pressed inside an item: native controls, links, editable text and
 * the subtrees that opt out (D7). A drag handle or a resize handle that is itself a button still
 * does: the handles are found first.
 */
export const DRAG_EXEMPT = [
    "input",
    "textarea",
    "select",
    "option",
    "button",
    "label",
    "a[href]",
    '[contenteditable]:not([contenteditable="false"])',
    `[${NO_DRAG_ATTRIBUTE}]`,
].join(", ");

/**
 * On an item a touch holds before it drags (R5): set by the engine on the item's element, not
 * through the view, so a touch that turns out a scroll renders nothing.
 */
export const PRESSING_ATTRIBUTE = "data-pressing";
