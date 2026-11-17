import { Component, signal } from "@angular/core";
import { GRID_LAYOUT, type Layout } from "@fragiola/grid-layout-angular";
import { wrapCompactor } from "@fragiola/grid-layout-angular/compactors";
import { ClickableButton } from "#/components/atoms/clickable";
import * as styles from "./styles";

const SENTENCE =
    "Tiles flow in reading order like words of a paragraph wrapping at the last column drag one and everything after it shifts";

/**
 * One tile per word, the long ones two cells wide, each on its own row: the compactor flows them
 * into lines when the grid starts, in this order.
 */
const START: Layout = SENTENCE.split(" ").map((word, index) => ({
    id: word,
    x: 0,
    y: index,
    w: word.length >= 7 ? 2 : 1,
    h: 1,
}));

// The wrap compactor (an opt-in, from `/compactors`) lays items out like words in a paragraph:
// in reading order, each in the first free cells after the one before, wrapping at the last
// column. Dropping a tile between two others reorders the flow: everything after it moves along.
// Fewer or more columns reflow the same order.
@Component({
    selector: "example-wrap-flow",
    imports: [GRID_LAYOUT, ClickableButton],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <div [class]="styles.toolbar">
                <span [class]="styles.option">
                    <button
                        kitClickable
                        size="sm"
                        variant="outline"
                        aria-label="Fewer columns"
                        [disabled]="cols() <= 3"
                        (click)="cols.set(cols() - 1)"
                    >
                        −
                    </button>
                    <output aria-label="Columns" [class]="styles.count">{{ cols() }}</output>
                    <button
                        kitClickable
                        size="sm"
                        variant="outline"
                        aria-label="More columns"
                        [disabled]="cols() >= 10"
                        (click)="cols.set(cols() + 1)"
                    >
                        +
                    </button>
                    <span>columns</span>
                </span>
            </div>
            <div
                gridLayoutRoot
                [defaultLayout]="start"
                [cols]="cols()"
                [compactor]="wrapCompactor"
                [rowHeight]="44"
                [gap]="[8, 8]"
                aria-label="Sentence"
                [class]="styles.root"
            >
                <div
                    *gridLayoutItems="let item"
                    [gridLayoutItem]="item.id"
                    #part="gridLayoutItem"
                    [attr.aria-label]="item.id"
                    [class]="styles.item(part.state())"
                >
                    {{ item.id }}
                </div>
                <div *gridLayoutPlaceholder [class]="styles.placeholder"></div>
            </div>
        </div>
    `,
})
export default class WrapFlow {
    protected readonly styles = styles;
    protected readonly start = START;
    protected readonly wrapCompactor = wrapCompactor;
    protected readonly cols = signal(6);
}
