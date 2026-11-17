// Files dropped from the operating system: what the app keeps of each (X4: the layout holds only
// ids and boxes). No grid and no styles.

/** What a file card shows. */
export interface FileMeta {
    readonly name: string;
    readonly size: number;
    readonly type: string;
}

/** The files a drop or a file input carries, as metadata the app keeps. */
export function filesOf(list: FileList | null | undefined): FileMeta[] {
    return Array.from(list ?? [], (file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
    }));
}

/** Whether a native drag carries files (the names are readable only on the drop). */
export function carriesFiles(transfer: DataTransfer | null): boolean {
    return transfer?.types.includes("Files") ?? false;
}

/** A size in bytes, for people: "812 B", "14.2 KB", "3.1 MB". */
export function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** A file's kind, from its type or its extension: what its card is labelled. */
export function fileKind(file: FileMeta): string {
    if (file.type.startsWith("image/")) return "Image";
    if (file.type === "application/pdf" || file.name.endsWith(".pdf"))
        return "PDF";
    if (file.type.startsWith("text/")) return "Text";
    return "File";
}
