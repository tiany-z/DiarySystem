class GlobalStoreImpl {
    storeMap = new Map();
    set(key, value) {
        this.storeMap.set(key, value);
    }
    get(key) {
        return this.storeMap.get(key);
    }
    has(key) {
        return this.storeMap.has(key);
    }
    delete(key) {
        return this.storeMap.delete(key);
    }
    clear() {
        this.storeMap.clear();
    }
}
export const GlobalStore = new GlobalStoreImpl();
//# sourceMappingURL=globalStore.js.map