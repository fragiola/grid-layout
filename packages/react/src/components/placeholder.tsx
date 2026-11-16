import type { PlaceholderState } from "@fragiola/grid-layout";
import type { ReactNode } from "react";
import { usePlaceholder } from "../hooks/use-placeholder";
import { type DivPrimitiveProps, useRenderElement } from "../utils/use-render";

export type PlaceholderProps = DivPrimitiveProps<PlaceholderState> & {
    children?: ReactNode;
};

/** Where the held item would land: rendered only during a gesture. */
export function Placeholder(props: PlaceholderProps) {
    const { children, ...rest } = props;
    const placeholder = usePlaceholder();
    const element = useRenderElement("div", rest, {
        state: placeholder?.state ?? { itemId: "", kind: "move" },
        props: placeholder?.props ?? {},
        children,
    });
    return placeholder ? element : null;
}
