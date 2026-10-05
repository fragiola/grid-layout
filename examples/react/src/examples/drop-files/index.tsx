"use client";

import {
    GridLayout,
    type Layout,
    useGridLayoutRef,
} from "@fragiola/grid-layout-react";
import { File, FileImage, FileText, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { Clickable } from "#/components/atoms/clickable";
import {
    carriesFiles,
    type FileMeta,
    fileKind,
    filesOf,
    formatBytes,
} from "../_kit/files";
import * as styles from "./styles";

const ICONS = { Image: FileImage, PDF: FileText, Text: FileText, File };

const START: Layout = [];

// A native drag from the operating system goes through `onExternalDrag`: files are accepted at a
// size, anything else refused (`data-drop-refused`). Asked again on the drop, when the files can
// be read, it gives their names as the drop's `data`. The first file lands where it was dropped;
// the others take the first free cells. What each card shows is the app's (X4): the layout holds
// only ids and boxes. Without a pointer, "Choose files" adds them the same way.
export default function DropFiles() {
    const gridLayoutRef = useGridLayoutRef();
    const made = useRef(0);
    const picker = useRef<HTMLInputElement>(null);
    const [files, setFiles] = useState<Record<string, FileMeta>>({});
    const newId = () => {
        made.current += 1;
        return `file-${made.current}`;
    };
    /** The rest of a drop, or chosen files: each at the first free cell. */
    const addAll = (metas: readonly FileMeta[]) => {
        const model = gridLayoutRef.current?.model;
        if (!model) return;
        const added: Record<string, FileMeta> = {};
        for (const meta of metas) {
            const id = newId();
            if (model.run("item.add", { item: { id, w: 3, h: 2 } }).ok)
                added[id] = meta;
        }
        setFiles((all) => ({ ...all, ...added }));
    };
    const remove = (id: string) => {
        gridLayoutRef.current?.model.run("item.remove", { itemId: id });
        setFiles(({ [id]: _gone, ...rest }) => rest);
    };
    const empty = Object.keys(files).length === 0;
    return (
        <div className={styles.frame}>
            <div className={styles.toolbar}>
                <p className={styles.note}>
                    Drop files on the grid, or choose them.
                </p>
                <Clickable.Button
                    size="sm"
                    variant="outline"
                    onClick={() => picker.current?.click()}
                >
                    <Upload aria-hidden="true" />
                    Choose files
                </Clickable.Button>
                {/* the button opens it: the input itself is not seen */}
                <input
                    ref={picker}
                    type="file"
                    multiple
                    hidden
                    aria-label="Files to add"
                    onChange={(event) => {
                        addAll(filesOf(event.target.files));
                        event.target.value = "";
                    }}
                />
            </div>
            <GridLayout.Root
                gridLayoutRef={gridLayoutRef}
                defaultLayout={START}
                rowHeight={48}
                gap={[12, 12]}
                createId={newId}
                onExternalDrag={(event) =>
                    carriesFiles(event.dataTransfer)
                        ? {
                              w: 3,
                              h: 2,
                              data: filesOf(event.dataTransfer?.files),
                          }
                        : false
                }
                onDrop={({ item, data }) => {
                    const [first, ...rest] = data as FileMeta[];
                    if (first)
                        setFiles((all) => ({ ...all, [item.id]: first }));
                    addAll(rest);
                }}
                aria-label="Files"
                className={styles.root}
            >
                {empty && (
                    <p aria-hidden="true" className={styles.empty}>
                        Drop files here
                    </p>
                )}
                <GridLayout.Items>
                    {(item) => {
                        const file = files[item.id];
                        const kind = file ? fileKind(file) : "File";
                        const Icon = ICONS[kind as keyof typeof ICONS] ?? File;
                        return (
                            <GridLayout.Item
                                itemId={item.id}
                                aria-label={file?.name ?? item.id}
                                className={styles.item}
                            >
                                <span className={styles.header}>
                                    <Icon
                                        aria-hidden="true"
                                        className={styles.icon}
                                    />
                                    <span className={styles.kind}>{kind}</span>
                                    <Clickable.Button
                                        size="sm"
                                        variant="icon"
                                        aria-label={`Remove ${file?.name ?? item.id}`}
                                        onClick={() => remove(item.id)}
                                    >
                                        <X aria-hidden="true" />
                                    </Clickable.Button>
                                </span>
                                <span className={styles.name}>
                                    {file?.name}
                                </span>
                                <span className={styles.size}>
                                    {file ? formatBytes(file.size) : ""}
                                </span>
                            </GridLayout.Item>
                        );
                    }}
                </GridLayout.Items>
                <GridLayout.Placeholder className={styles.placeholder} />
            </GridLayout.Root>
        </div>
    );
}
