/**
 * Represents a callback for event listener detaching or other forms of generic resource clean-up.
 */
export interface IDisposable {
    /**
     * Performs the detaching, unsubscription, or ther forms of generic resource clean-up.
     * @remarks The function allows to be called multiple times. However, if the first call to
     * this function does not throw any error, so should the later calls. In most cases,
     * Only the first call is truly effective.
     */
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
