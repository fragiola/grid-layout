// The grid most tests render: a root with each item labelled by its id, a resize handle in each
// item and a placeholder; its attributes are the root's props (`setProps` changes them), and a
// probe in each item counts the renders.

import {
    defineComponent,
    type FunctionalComponent,
    h,
    type PropType,
} from "vue";
import { GridLayout } from "../src";
import { GEOMETRY } from "./helpers";

export const Grid = defineComponent({
    inheritAttrs: false,
    props: {
        onRender: {
            type: Function as PropType<() => void>,
            default: undefined,
        },
    },
    setup(props, { attrs }) {
        // each item's element, counting its renders (React's test wraps each item in a Profiler)
        const Counted: FunctionalComponent = (_, { attrs, slots }) => {
            props.onRender?.();
            return h("div", attrs, slots.default?.());
        };
        return () =>
            h(
                GridLayout.Root,
                { ...GEOMETRY, "aria-label": "dashboard", ...attrs },
                {
                    default: () => [
                        h(GridLayout.Items, null, {
                            default: ({ item }: { item: { id: string } }) => [
                                h(
                                    GridLayout.Item,
                                    {
                                        itemId: item.id,
                                        "aria-label": item.id,
                                        as: Counted,
                                    },
                                    {
                                        default: () => [
                                            item.id,
                                            h(GridLayout.ResizeHandle, {
                                                side: "bottom-end",
                                                "aria-label": `resize ${item.id}`,
                                            }),
                                        ],
                                    },
                                ),
                            ],
                        }),
                        h(GridLayout.Placeholder, {
                            "aria-label": "placeholder",
                        }),
                    ],
                },
            );
    },
});
