import { Component, computed, signal } from "@angular/core";
import {
    createGridLayoutRef,
    type DropDetails,
    type ExternalDragAnswer,
    GRID_LAYOUT,
    type Layout,
} from "@fragiola/grid-layout-angular";
import {
    LucideDynamicIcon,
    LucideFile,
    LucideFileImage,
    LucideFileText,
    LucideUpload,
    LucideX,
} from "@lucide/angular";
import { ClickableButton } from "#/components/atoms/clickable";
import {
    carriesFiles,
    type FileMeta,
    fileKind,
    filesOf,
    formatBytes,
} from "../_kit/files";
import * as styles from "./styles";

const ICONS = {
    Image: LucideFileImage,
    PDF: LucideFileText,
    Text: LucideFileText,
    File: LucideFile,
};

const START: Layout = [];

// A native drag from the operating system goes through `[externalDrag]`: files are accepted at a
// size, anything else refused (`data-drop-refused`). Asked again on the drop, when the files can
// be read, it gives their names as the drop's `data`. The first file lands where it was dropped;
// the others take the first free cells. What each card shows is the app's (X4): the layout holds
// only ids and boxes. Without a pointer, "Choose files" adds them the same way.
@Component({
    selector: "example-drop-files",
    imports: [
        GRID_LAYOUT,
        ClickableButton,
        LucideDynamicIcon,
        LucideUpload,
        LucideX,
    ],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <div [class]="styles.toolbar">
                <p [class]="styles.note">Drop files on the grid, or choose them.</p>
                <button kitClickable size="sm" variant="outline" (click)="picker.click()">
                    <svg lucideUpload></svg>
                    Choose files
                </button>
                <!-- the button opens it: the input itself is not seen -->
                <input
                    #picker
                    type="file"
                    multiple
                    hidden
                    aria-label="Files to add"
                    (change)="onChoose(picker)"
                />
            </div>
            <div
                gridLayoutRoot
                #root="gridLayoutRoot"
                [gridLayoutRef]="gridLayoutRef"
                [defaultLayout]="start"
                [rowHeight]="48"
                [gap]="[12, 12]"
                [createId]="newId"
                [externalDrag]="answer"
                (dropped)="onDrop($event)"
                aria-label="Files"
                [class]="styles.root(root.state())"
            >
                @if (empty()) {
                    <p aria-hidden="true" [class]="styles.empty">Drop files here</p>
                }
                <ng-template gridLayoutItems let-item>
                    @let file = files()[item.id];
                    @let kind = file ? fileKind(file) : 'File';
                    @let name = file?.name ?? item.id;
                    <div
                        [gridLayoutItem]="item.id"
                        #part="gridLayoutItem"
                        [attr.aria-label]="name"
                        [class]="styles.item(part.state())"
                    >
                        <span [class]="styles.header">
                            <svg [lucideIcon]="iconOf(kind)" [class]="styles.icon"></svg>
                            <span [class]="styles.kind">{{ kind }}</span>
                            <button
                                kitClickable
                                size="sm"
                                variant="icon"
                                [attr.aria-label]="'Remove ' + name"
                                (click)="remove(item.id)"
                            >
                                <svg lucideX></svg>
                            </button>
                        </span>
                        <span [class]="styles.name">{{ file?.name }}</span>
                        <span [class]="styles.size">{{ file ? formatBytes(file.size) : '' }}</span>
                    </div>
                </ng-template>
                <div *gridLayoutPlaceholder [class]="styles.placeholder"></div>
            </div>
        </div>
    `,
})
export default class DropFiles {
    protected readonly styles = styles;
    protected readonly start = START;
    protected readonly fileKind = fileKind;
    protected readonly formatBytes = formatBytes;
    protected readonly gridLayoutRef = createGridLayoutRef();
    protected readonly files = signal<Readonly<Record<string, FileMeta>>>({});
    protected readonly empty = computed(
        () => Object.keys(this.files()).length === 0,
    );
    private made = 0;

    protected readonly newId = () => {
        this.made += 1;
        return `file-${this.made}`;
    };

    protected readonly answer = (event: DragEvent): ExternalDragAnswer =>
        carriesFiles(event.dataTransfer)
            ? { w: 3, h: 2, data: filesOf(event.dataTransfer?.files) }
            : false;

    protected iconOf(kind: string) {
        return ICONS[kind as keyof typeof ICONS] ?? LucideFile;
    }

    protected onDrop({ item, data }: DropDetails) {
        const [first, ...rest] = data as FileMeta[];
        if (first) this.files.update((all) => ({ ...all, [item.id]: first }));
        this.addAll(rest);
    }

    protected onChoose(picker: HTMLInputElement) {
        this.addAll(filesOf(picker.files));
        picker.value = "";
    }

    /** The rest of a drop, or chosen files: each at the first free cell. */
    private addAll(metas: readonly FileMeta[]) {
        const model = this.gridLayoutRef.current?.model;
        if (!model) return;
        const added: Record<string, FileMeta> = {};
        for (const meta of metas) {
            const id = this.newId();
            if (model.run("item.add", { item: { id, w: 3, h: 2 } }).ok)
                added[id] = meta;
        }
        this.files.update((all) => ({ ...all, ...added }));
    }

    protected remove(id: string) {
        this.gridLayoutRef.current?.model.run("item.remove", { itemId: id });
        this.files.update(({ [id]: _gone, ...rest }) => rest);
    }
}
