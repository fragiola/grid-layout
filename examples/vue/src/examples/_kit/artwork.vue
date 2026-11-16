<!--
A generated picture as inline SVG. It fills its box and crops what does not fit, like an
`object-fit: cover` image. The classes come from the example, one per layer: the kit holds no
styles. A generated picture is decorative: the caption beside it says what it is.
-->
<script setup lang="ts">
import { computed } from "vue";
import { type Layer, type Motif, picture } from "./images";

const props = defineProps<{
    seed: number;
    /** width over height */
    ratio: number;
    motif?: Motif;
    /** each layer's class: its colour */
    layers: Readonly<Record<Layer, string>>;
}>();

const art = computed(() => picture(props.seed, props.ratio, props.motif));
</script>

<template>
    <svg
        :viewBox="`0 0 ${art.width} ${art.height}`"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
    >
        <path
            v-for="shape in art.shapes"
            :key="shape.layer"
            :d="shape.d"
            :class="props.layers[shape.layer]"
        />
    </svg>
</template>
