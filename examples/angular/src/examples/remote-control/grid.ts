import { InjectionToken } from "@angular/core";
import type { GridLayoutRef } from "@fragiola/grid-layout-angular";

/**
 * The example's `gridLayoutRef`, provided by the example and read by the form beside the root:
 * an injection function takes its ref when the component is made, before any input is set.
 */
export const GRID = new InjectionToken<GridLayoutRef>("remote-control grid");
