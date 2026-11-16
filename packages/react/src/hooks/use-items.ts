import type { Layout } from "@fragiola/grid-layout";
import { useViewContext } from "../context";

/** The committed layout's items, in order. */
export function useItems(): Layout {
    return useViewContext("useItems").layout;
}
