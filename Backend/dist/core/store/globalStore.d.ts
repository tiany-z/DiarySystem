declare class GlobalStoreImpl {
    private storeMap;
    set<T = any>(key: string, value: T): void;
    get<T = any>(key: string): T | undefined;
    has(key: string): boolean;
    delete(key: string): boolean;
    clear(): void;
}
export declare const GlobalStore: GlobalStoreImpl;
export {};
//# sourceMappingURL=globalStore.d.ts.map