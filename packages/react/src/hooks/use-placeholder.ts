import { type PlaceholderState, placeholderPart } from "@fragiola/grid-layout";
import type * as React from "react";
import { useViewContext } from "../context";

/** Where the held item would land; `undefined` when no gesture is in progress. */
export function usePlaceholder():
    | {
          readonly state: PlaceholderState;
          readonly props: {
              readonly style: React.CSSProperties;
              readonly [attribute: `data-${string}`]: string;
          };
      }
    | undefined {
    const view = useViewContext("usePlaceholder");
    const part = placeholderPart(view);
    if (!part) return undefined;
    return {
        state: part.state,
        props: { ...part.attributes, style: part.style as React.CSSProperties },
    };
}
