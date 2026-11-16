import { widget } from "../_kit/widgets";

/** An item's title: the banner is the only item that is not a widget. */
export const titleOf = (id: string) =>
    id === "banner" ? "Banner (static)" : widget(id).title;
