// Where the pointer is during a drag: app logic, no grid and no styles.

/** Whether a pointer event happened over `target`'s box (a trash, a toolbox). */
export function pointerOver(
    target: Element | null | undefined,
    at: Event | undefined,
): boolean {
    const box = target?.getBoundingClientRect();
    return (
        box !== undefined &&
        at instanceof MouseEvent &&
        at.clientX >= box.left &&
        at.clientX <= box.right &&
        at.clientY >= box.top &&
        at.clientY <= box.bottom
    );
}
