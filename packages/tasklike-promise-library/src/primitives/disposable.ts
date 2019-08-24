/**
 * Represents a callback for event listener detaching or other forms of generic resource clean-up.
 */
export interface IDisposable {
    dispose(): void;
}

/**
 * Combines {@link IDisposable} instances.
 * @param disposables 0, 1, or more instances to be combined.
 * @returns an {@link IDisposable} that disposes the given instances when {@link IDisposable.dispose} is called.
 */
export function combineDisposable(...disposables: IDisposable[]): IDisposable {
    return {
        dispose() {
            disposables.forEach(d => d.dispose());
        }
    };
}
