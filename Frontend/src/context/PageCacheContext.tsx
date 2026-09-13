import React, { createContext, useCallback, useContext, useEffect, useRef } from "react";

interface PageCacheContextType {
  hasPageLoaded: (key: string) => boolean;
  markPageLoaded: (key: string) => void;
  getCachedData: <T>(key: string) => T | null;
  setCachedData: <T>(key: string, data: T) => void;
  clearAllPageCache: () => void;
}

const PageCacheContext = createContext<PageCacheContextType>({
  hasPageLoaded: () => false,
  markPageLoaded: () => {},
  getCachedData: () => null,
  setCachedData: () => {},
  clearAllPageCache: () => {},
});

export const PageCacheProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 记录在此次会话中已经成功加载过的页面路由与视图标识
  const loadedPagesRef = useRef<Set<string>>(new Set());
  // 统一 SWR 数据缓存池，支持页面即刻秒开展现已有数据
  const cacheMapRef = useRef<Map<string, any>>(new Map());

  const hasPageLoaded = useCallback((key: string): boolean => {
    return loadedPagesRef.current.has(key);
  }, []);

  const markPageLoaded = useCallback((key: string): void => {
    loadedPagesRef.current.add(key);
  }, []);

  const getCachedData = useCallback(<T,>(key: string): T | null => {
    if (cacheMapRef.current.has(key)) {
      return cacheMapRef.current.get(key) as T;
    }
    return null;
  }, []);

  const setCachedData = useCallback(<T,>(key: string, data: T): void => {
    cacheMapRef.current.set(key, data);
  }, []);

  const clearAllPageCache = useCallback((): void => {
    loadedPagesRef.current.clear();
    cacheMapRef.current.clear();
  }, []);

  // 监听全站清理事件（如账户注销登出、切换账号）
  useEffect(() => {
    const handleClear = () => {
      clearAllPageCache();
    };
    window.addEventListener("diary:clear_cache", handleClear);
    return () => window.removeEventListener("diary:clear_cache", handleClear);
  }, [clearAllPageCache]);

  return (
    <PageCacheContext.Provider
      value={{
        hasPageLoaded,
        markPageLoaded,
        getCachedData,
        setCachedData,
        clearAllPageCache,
      }}
    >
      {children}
    </PageCacheContext.Provider>
  );
};

export const usePageCache = () => useContext(PageCacheContext);
