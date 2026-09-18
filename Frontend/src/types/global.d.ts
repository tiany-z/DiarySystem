export {};

declare global {
  interface Window {
    __checkUnsavedBeforeNavigate?: ((targetPath: string) => boolean) | null;
  }
}

declare module "@fluentui/react-icons";

