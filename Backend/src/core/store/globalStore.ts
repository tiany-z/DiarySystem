class GlobalStoreImpl {
  private storeMap: Map<string, any> = new Map();

  public set<T = any>(key: string, value: T): void {
    this.storeMap.set(key, value);
  }

  public get<T = any>(key: string): T | undefined {
    return this.storeMap.get(key) as T | undefined;
  }

  public has(key: string): boolean {
    return this.storeMap.has(key);
  }

  public delete(key: string): boolean {
    return this.storeMap.delete(key);
  }

  public clear(): void {
    this.storeMap.clear();
  }
}

export const GlobalStore = new GlobalStoreImpl();
