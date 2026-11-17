import {
    Component,
    computed,
    type ElementRef,
    signal,
    viewChild,
} from "@angular/core";
import {
    createGridLayoutRef,
    type DragSourceState,
    type GestureEvent,
    GRID_LAYOUT,
    type GridLayoutDragSource,
    injectGridLayoutEvents,
    injectGridLayoutView,
    type Layout,
    layoutProblems,
} from "@fragiola/grid-layout-angular";
import { LucideTrash2, LucideX } from "@lucide/angular";
import { ClickableButton } from "#/components/atoms/clickable";
import { describeGesture } from "../_kit/announce";
import {
    CATALOGUE,
    entryOf,
    freeId,
    isKind,
    kindOfId,
} from "../_kit/catalogue";
import { pointerOver } from "../_kit/hit";
import { forget, load, save } from "../_kit/storage";
import * as styles from "./styles";
import { WidgetBody } from "./widget-body";

const KEY = "grid-layout:dashboard-builder";

const STARTER: Layout = [
    { id: "kpi-1", x: 0, y: 0, w: 3, h: 2 },
    { id: "chart-1", x: 3, y: 0, w: 6, h: 3 },
    { id: "notes-1", x: 9, y: 0, w: 3, h: 3 },
];

/** A source's state before its inputs are set: nothing brought, nothing held. */
const IDLE_SOURCE: DragSourceState = {
    dragging: false,
    grabbed: false,
    disabled: false,
};

/** An item's name: its kind and its number, from its id (`chart-3` is "Chart 3"). */
function nameOf(id: string): string {
    const kind = kindOfId(id);
    return kind ? `${entryOf(kind).title} ${id.slice(kind.length + 1)}` : id;
}

/** The saved dashboard, if the grid can use it: storage holds whatever was written. */
function saved(): Layout | undefined {
    const layout = load<Layout>(KEY);
    return layout && layoutProblems(layout).length === 0 ? layout : undefined;
}

// Everything together, as an app would: the sidebar's widgets are drag sources outside the grid
// (through a `gridLayoutRef`), each new id says its kind (`chart-3`, the app's ids); a widget
// released over the trash is removed (`(dragStop)` reports `outside` and the element under the
// pointer); every committed change is saved; Reset starts again from the starter dashboard.
@Component({
    selector: "example-dashboard-builder",
    imports: [GRID_LAYOUT, ClickableButton, LucideTrash2, LucideX, WidgetBody],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <aside [class]="styles.sidebar" aria-label="Widgets">
                <p [class]="styles.heading">Widgets</p>
                <!-- drag sources outside the grid, each naming its new item's id -->
                @for (entry of catalogue; track entry.kind) {
                    <div
                        [gridLayoutDragSource]="entry.size"
                        #source="gridLayoutDragSource"
                        [gridLayoutRef]="gridLayoutRef"
                        [itemId]="freeId(layout(), entry.kind)"
                        [data]="entry.kind"
                        [attr.aria-label]="entry.title + ' widget'"
                        [class]="styles.source(sourceState(source))"
                    >
                        <span [class]="styles.sourceTitle">{{ entry.title }}</span>
                        <span [class]="styles.sourceText">{{ entry.description }}</span>
                    </div>
                }
                <!-- where a widget goes to be removed: open while one is held off the grid -->
                <div #trash [attr.data-open]="open() ? '' : null" [class]="styles.trash">
                    <svg lucideTrash2 [class]="styles.icon"></svg>
                    Drop here to remove
                </div>
                <button kitClickable size="sm" variant="outline" (click)="reset()">
                    Reset
                </button>
                <p role="status" [class]="styles.status">{{ message() }}</p>
            </aside>
            <!-- a new grid on reset: defaultLayout is read once, when a grid starts -->
            @for (run of [run()]; track "run-" + run) {
                <div
                    gridLayoutRoot
                    #root="gridLayoutRoot"
                    [gridLayoutRef]="gridLayoutRef"
                    [defaultLayout]="start()"
                    [rowHeight]="44"
                    [gap]="[12, 12]"
                    (layoutChange)="persist($event)"
                    (dragStop)="dropOnTrash($event)"
                    aria-label="Your dashboard"
                    [class]="styles.root(root.state())"
                >
                    <ng-template gridLayoutItems let-item>
                        @let title = nameOf(item.id);
                        <div
                            [gridLayoutItem]="item.id"
                            #part="gridLayoutItem"
                            [attr.aria-label]="title"
                            [class]="styles.item(part.state())"
                        >
                            <span [class]="styles.header">
                                <span [class]="styles.title">{{ title }}</span>
                                <button
                                    kitClickable
                                    size="sm"
                                    variant="icon"
                                    [attr.aria-label]="'Remove ' + title"
                                    (click)="remove(item.id)"
                                >
                                    <svg lucideX></svg>
                                </button>
                            </span>
                            <builder-widget-body [kind]="kindOfId(item.id) ?? 'notes'" />
                            <div
                                *gridLayoutResizeHandle="'bottom-end'"
                                [attr.aria-label]="'Resize ' + title"
                                [class]="styles.resizeHandle"
                            ></div>
                        </div>
                    </ng-template>
                    <div *gridLayoutPlaceholder [class]="styles.placeholder"></div>
                </div>
            }
            <div
                *gridLayoutDragPreview="gridLayoutRef; let state"
                [class]="styles.preview(state)"
            >
                {{ isKind(state.data) ? entryOf(state.data).title : "" }}
            </div>
        </div>
    `,
})
export default class DashboardBuilder {
    protected readonly styles = styles;
    protected readonly catalogue = CATALOGUE;
    protected readonly freeId = freeId;
    protected readonly isKind = isKind;
    protected readonly entryOf = entryOf;
    protected readonly kindOfId = kindOfId;
    protected readonly nameOf = nameOf;

    protected readonly gridLayoutRef = createGridLayoutRef();
    private readonly trash =
        viewChild.required<ElementRef<HTMLElement>>("trash");
    protected readonly run = signal(0);
    // read once per grid: `defaultLayout` is read when a grid starts
    protected readonly start = signal(saved() ?? STARTER);
    protected readonly message = signal("");

    private readonly view = injectGridLayoutView(this.gridLayoutRef);
    protected readonly layout = computed(() => this.view()?.layout ?? []);

    /** whether a widget held off the grid is over the trash now */
    protected readonly open = signal(false);

    constructor() {
        // the pointer is the grid's while it holds a widget, so the drag's own events say where it is
        injectGridLayoutEvents((event) => {
            this.open.set(
                event.type === "drag" &&
                    event.outside &&
                    pointerOver(this.trash().nativeElement, event.nativeEvent),
            );
        }, this.gridLayoutRef);
        // says each step, a widget coming in from the sidebar included
        injectGridLayoutEvents((event) => {
            // a widget coming in has no number yet: its kind says what it is
            const name =
                event.external && isKind(event.data)
                    ? entryOf(event.data).title
                    : nameOf(event.itemId);
            const said = describeGesture(event, name);
            if (said) this.message.set(said);
        }, this.gridLayoutRef);
    }

    /**
     * Workaround: Angular binds an element's `[class]` before its inputs, and a source outside
     * the root reads its state through its `gridLayoutRef`, which is not set on the first pass.
     */
    protected sourceState(source: GridLayoutDragSource): DragSourceState {
        return source.gridLayoutRef() ? source.state() : IDLE_SOURCE;
    }

    protected remove(id: string) {
        this.gridLayoutRef.current?.model.run("item.remove", { itemId: id });
    }

    protected reset() {
        forget(KEY);
        this.start.set(STARTER);
        this.run.update((count) => count + 1);
        this.message.set("Back to the starter dashboard.");
    }

    protected persist(layout: Layout) {
        save(KEY, layout);
    }

    protected dropOnTrash(event: GestureEvent) {
        const target = event.target;
        if (
            event.outside &&
            target &&
            this.trash().nativeElement.contains(target)
        )
            this.remove(event.itemId);
    }
}
