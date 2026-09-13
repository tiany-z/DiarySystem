import React, { useEffect, useLayoutEffect, useRef } from "react";

export interface Win10AnimatedGridProps<T> {
  items: T[];
  getKey: (item: T) => string;
  renderItem: (item: T, index: number) => React.ReactNode;
  gridStyle?: React.CSSProperties;
  className?: string;
}

/**
 * Win10AnimatedGrid:
 * 实现了基于 FLIP 算法的 Windows 10 Fluent 磁贴流转动效系统：
 * 1. 切换界面/分类时，切换前后均存在的卡片若位置发生改变，自动沿 Win10 曲线平滑平移至新坐标
 * 2. 平移期间新卡片保持隐藏等待
 * 3. 待所有保留卡片平移就绪后，新出现的卡片立刻执行经典的错峰依次弹出动效 (win10TileRise)
 */
export function Win10AnimatedGrid<T>({
  items,
  getKey,
  renderItem,
  gridStyle,
  className = "",
}: Win10AnimatedGridProps<T>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const prevPositionsRef = useRef<Map<string, { left: number; top: number; height: number }>>(new Map());
  const timeoutsRef = useRef<number[]>([]);
  const isInitialMount = useRef<boolean>(true);
  const prevKeysRef = useRef<string>("");

  // 监听窗口尺寸变化，静默同步最新坐标与尺寸，避免窗口缩放引发错误的位移动画
  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      const itemElements = Array.from(
        container.querySelectorAll<HTMLElement>(":scope > [data-flip-id]")
      );
      itemElements.forEach((el) => {
        const id = el.getAttribute("data-flip-id");
        if (!id) return;
        const rect = el.getBoundingClientRect();
        prevPositionsRef.current.set(id, {
          left: rect.left - containerRect.left,
          top: rect.top - containerRect.top,
          height: rect.height,
        });
      });
    };

    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const MOVE_DURATION_MS = 350;
  const POP_START_DELAY_MS = Math.round(MOVE_DURATION_MS * 0.4); // 移动动画完成 40% (140ms) 时触发新卡片弹出

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 清理此前仍在挂起的任何延时器
    timeoutsRef.current.forEach((id) => window.clearTimeout(id));
    timeoutsRef.current = [];

    const itemElements = Array.from(
      container.querySelectorAll<HTMLElement>(":scope > [data-flip-id]")
    );

    if (itemElements.length === 0) {
      prevPositionsRef.current.clear();
      return;
    }

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const currentKeys = items.map(getKey).join(",");
    const keysChanged = prevKeysRef.current !== currentKeys;
    prevKeysRef.current = currentKeys;

    const containerRect = container.getBoundingClientRect();

    // 1. 初次挂载或无旧坐标记录：所有卡片依序错峰弹出
    if (isInitialMount.current || prevPositionsRef.current.size === 0) {
      isInitialMount.current = false;
      const nextPositions = new Map<string, { left: number; top: number; height: number }>();

      itemElements.forEach((el, index) => {
        const id = el.getAttribute("data-flip-id");
        if (!id) return;
        const rect = el.getBoundingClientRect();
        nextPositions.set(id, {
          left: rect.left - containerRect.left,
          top: rect.top - containerRect.top,
          height: rect.height,
        });

        if (!prefersReducedMotion) {
          el.style.animation = `win10TileRise 0.45s cubic-bezier(0.1, 0.9, 0.2, 1) both ${index * 35}ms`;
        }
      });

      prevPositionsRef.current = nextPositions;
      return;
    }

    // 若 items 的 key 序列完全未发生变化，仅静默同步最新坐标
    if (!keysChanged || prefersReducedMotion) {
      const nextPositions = new Map<string, { left: number; top: number; height: number }>();
      itemElements.forEach((el) => {
        const id = el.getAttribute("data-flip-id");
        if (!id) return;
        const rect = el.getBoundingClientRect();
        nextPositions.set(id, {
          left: rect.left - containerRect.left,
          top: rect.top - containerRect.top,
          height: rect.height,
        });
      });
      prevPositionsRef.current = nextPositions;
      return;
    }

    // 2. 界面/Tab 过滤切换：执行包含坐标与高度平滑过渡的 FLIP 动效
    const nextPositions = new Map<string, { left: number; top: number; height: number }>();
    const movingItems: {
      el: HTMLElement;
      deltaX: number;
      deltaY: number;
      prevHeight: number;
      currentHeight: number;
    }[] = [];
    const newItems: HTMLElement[] = [];

    // 阶段 A: 获取每个节点在当前最新 DOM 布局下的真实无变换位置与高度 (Last)
    itemElements.forEach((el) => {
      const id = el.getAttribute("data-flip-id");
      if (!id) return;

      el.style.transition = "none";
      el.style.transform = "none";
      el.style.animation = "none";
      el.style.height = "";

      const rect = el.getBoundingClientRect();
      const currentLeft = rect.left - containerRect.left;
      const currentTop = rect.top - containerRect.top;
      const currentHeight = rect.height;

      nextPositions.set(id, { left: currentLeft, top: currentTop, height: currentHeight });

      const prev = prevPositionsRef.current.get(id);
      if (prev) {
        const deltaX = prev.left - currentLeft;
        const deltaY = prev.top - currentTop;
        const deltaH = prev.height - currentHeight;

        // 允许 1px 以内的浮点误差，若位移或高度变化显著则判定为动画卡片
        if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1 || Math.abs(deltaH) > 2) {
          movingItems.push({ el, deltaX, deltaY, prevHeight: prev.height, currentHeight });
        } else {
          el.style.opacity = "1";
          el.style.transform = "";
          el.style.animation = "";
        }
      } else {
        // 切换后新出现的卡片
        newItems.push(el);
      }
    });

    // 更新坐标快照，供下一次切换对比
    prevPositionsRef.current = nextPositions;

    if (movingItems.length > 0) {
      // 阶段 B: Invert (将移动卡片瞬间定位至旧坐标并还原旧高度，同时隐藏新卡片)
      movingItems.forEach(({ el, deltaX, deltaY, prevHeight }) => {
        el.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        el.style.height = `${prevHeight}px`;
        el.style.opacity = "1";
        el.style.zIndex = "3";
      });

      newItems.forEach((el) => {
        el.style.opacity = "0";
        el.style.transform = "translateY(28px) scale(0.96)";
        el.style.pointerEvents = "none";
      });

      // 强制触发重排 (Reflow)
      void container.offsetHeight;

      // 阶段 C: Play (使用 Win10 曲线将卡片平移并平滑伸缩至新高度)
      requestAnimationFrame(() => {
        movingItems.forEach(({ el, currentHeight }) => {
          el.style.transition = `transform ${MOVE_DURATION_MS}ms cubic-bezier(0.1, 0.9, 0.2, 1), height ${MOVE_DURATION_MS}ms cubic-bezier(0.1, 0.9, 0.2, 1)`;
          el.style.transform = "translate(0px, 0px)";
          el.style.height = `${currentHeight}px`;
        });

        // 阶段 D: 移动动画完成 40% (140ms) 的时候，立刻开始执行新卡片的出现依次弹出动效
        const newItemsPopTimer = window.setTimeout(() => {
          newItems.forEach((el, idx) => {
            el.style.pointerEvents = "";
            el.style.animation = `win10TileRise 0.42s cubic-bezier(0.1, 0.9, 0.2, 1) both ${idx * 45}ms`;

            const onAnimEnd = (e: AnimationEvent) => {
              if (e.animationName === "win10TileRise") {
                el.style.animation = "";
                el.style.opacity = "";
                el.style.transform = "";
                el.removeEventListener("animationend", onAnimEnd);
              }
            };
            el.addEventListener("animationend", onAnimEnd);
          });
        }, POP_START_DELAY_MS);

        timeoutsRef.current.push(newItemsPopTimer);

        // 阶段 E: 动画完全执行完成 (350ms) 后，清理 movingItems 的 transition, height 与 zIndex
        const cleanupMoveTimer = window.setTimeout(() => {
          movingItems.forEach(({ el }) => {
            el.style.transition = "";
            el.style.transform = "";
            el.style.height = "";
            el.style.zIndex = "";
          });
        }, MOVE_DURATION_MS);

        timeoutsRef.current.push(cleanupMoveTimer);
      });
    } else {
      // 若没有卡片需要平移，新卡片立刻依次弹出
      newItems.forEach((el, idx) => {
        el.style.pointerEvents = "";
        el.style.animation = `win10TileRise 0.42s cubic-bezier(0.1, 0.9, 0.2, 1) both ${idx * 45}ms`;

        const onAnimEnd = (e: AnimationEvent) => {
          if (e.animationName === "win10TileRise") {
            el.style.animation = "";
            el.style.opacity = "";
            el.style.transform = "";
            el.removeEventListener("animationend", onAnimEnd);
          }
        };
        el.addEventListener("animationend", onAnimEnd);
      });
    }

    return () => {
      timeoutsRef.current.forEach((id) => window.clearTimeout(id));
    };
  }, [items]);

  return (
    <div ref={containerRef} className={className} style={gridStyle}>
      {items.map((item, index) => {
        const key = getKey(item);
        return (
          <div
            key={key}
            data-flip-id={key}
            className="win10-flip-item"
            style={{
              display: "flex",
              flexDirection: "column",
              height: "100%",
              width: "100%",
              maxWidth: "100%",
              minWidth: 0,
              boxSizing: "border-box",
              willChange: "transform, opacity",
            }}
          >
            {renderItem(item, index)}
          </div>
        );
      })}
    </div>
  );
}
