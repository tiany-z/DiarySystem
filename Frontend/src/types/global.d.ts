export {};

declare global {
  interface Window {
    __checkUnsavedBeforeNavigate?: ((targetPath: string) => boolean) | null;
  }
}
