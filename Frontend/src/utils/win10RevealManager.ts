/**
 * Win10RevealManager:
 * Windows 10 Fluent Design Reveal Highlight & Live Tile Ripple 引擎
 *
 * 核心特性：
 * 1. 临近边缘感应光效 (Proximity Border Reveal)：光标移近卡片/按钮（<= 140px）时，朝向光标的边框自然发亮
 * 2. 悬停探照光斑 (Spotlight Hover Reveal)：卡片内部跟随光标呈现柔和的圆形探照光斑
 * 3. 磁贴按压光圈 (Press Ring Tension)：按下（pointerdown）瞬间在接触点凝聚高光光圈并保持蓄力状态
 * 4. 松手波纹急速扩散 (Release Wave Diffusion)：松手（pointerup）瞬间波纹从接触点急速横扫并平滑淡出
 */

const TARGET_SELECTOR = ".note-card-surface, .fui-Card.hover-lift, .fui-Button, [data-win10-tile]";
const PROXIMITY_THRESHOLD = 140; // 感应半径 140px

class Win10RevealManager {
  private static instance: Win10RevealManager | null = null;
  private isInitialized = false;
  private activeElements = new Set<HTMLElement>();
  private activeRipples = new Map<HTMLElement, HTMLElement>();
  private rafId: number | null = null;
  private lastPointerX = -9999;
  private lastPointerY = -9999;
  private isPointerInside = false;

  public static getInstance(): Win10RevealManager {
    if (!Win10RevealManager.instance) {
      Win10RevealManager.instance = new Win10RevealManager();
    }
    return Win10RevealManager.instance;
  }

  public init(): void {
    if (this.isInitialized || typeof window === "undefined") return;
    this.isInitialized = true;

    window.addEventListener("pointermove", this.handlePointerMove, { passive: true });
    window.addEventListener("pointerdown", this.handlePointerDown, { passive: true });
    window.addEventListener("pointerup", this.handlePointerUp, { passive: true });
    window.addEventListener("pointercancel", this.handlePointerCancel, { passive: true });
    document.addEventListener("mouseleave", this.handleMouseLeave, { passive: true });
    window.addEventListener("scroll", this.handleScroll, { passive: true });
  }

  public destroy(): void {
    if (!this.isInitialized || typeof window === "undefined") return;
    this.isInitialized = false;

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    window.removeEventListener("pointermove", this.handlePointerMove);
    window.removeEventListener("pointerdown", this.handlePointerDown);
    window.removeEventListener("pointerup", this.handlePointerUp);
    window.removeEventListener("pointercancel", this.handlePointerCancel);
    document.removeEventListener("mouseleave", this.handleMouseLeave);
    window.removeEventListener("scroll", this.handleScroll);

    this.clearAllActiveElements();
    this.clearAllRipples();
  }

  private handlePointerMove = (e: PointerEvent): void => {
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
    this.isPointerInside = true;

    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(this.updateProximity);
    }
  };

  private handleScroll = (): void => {
    if (this.isPointerInside && this.rafId === null) {
      this.rafId = requestAnimationFrame(this.updateProximity);
    }
  };

  private handleMouseLeave = (): void => {
    this.isPointerInside = false;
    this.clearAllActiveElements();
  };

  private clearAllActiveElements = (): void => {
    this.activeElements.forEach((el) => {
      el.style.setProperty("--win10-inner-opacity", "0");
      el.removeAttribute("data-win10-active");
      el.removeAttribute("data-win10-hovered");
    });
    this.activeElements.clear();
  };

  private clearAllRipples = (): void => {
    this.activeRipples.forEach((ripple) => {
      ripple.remove();
    });
    this.activeRipples.clear();
  };

  private updateProximity = (): void => {
    this.rafId = null;
    if (!this.isPointerInside) return;

    const px = this.lastPointerX;
    const py = this.lastPointerY;

    const targets = Array.from(document.querySelectorAll<HTMLElement>(TARGET_SELECTOR));
    const currentActive = new Set<HTMLElement>();

    for (let i = 0; i < targets.length; i++) {
      const el = targets[i];
      if (el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true") {
        continue;
      }

      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;

      // 仅处理视口内及附近的元素
      if (
        rect.bottom < -PROXIMITY_THRESHOLD ||
        rect.top > window.innerHeight + PROXIMITY_THRESHOLD ||
        rect.right < -PROXIMITY_THRESHOLD ||
        rect.left > window.innerWidth + PROXIMITY_THRESHOLD
      ) {
        continue;
      }

      // 计算光标到元素边缘的最短欧式距离
      const dx = Math.max(rect.left - px, 0, px - rect.right);
      const dy = Math.max(rect.top - py, 0, py - rect.bottom);
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= PROXIMITY_THRESHOLD) {
        const rx = px - rect.left;
        const ry = py - rect.top;

        // 内部探照光斑强度：靠近即开始透出柔光，完全在内部时为 1
        const isInside = px >= rect.left && px <= rect.right && py >= rect.top && py <= rect.bottom;
        const innerOpacity = isInside ? 1 : Math.max(0, 1 - dist / PROXIMITY_THRESHOLD);

        el.style.setProperty("--win10-rx", `${rx}px`);
        el.style.setProperty("--win10-ry", `${ry}px`);
        el.style.setProperty("--win10-inner-opacity", innerOpacity.toFixed(3));

        if (isInside) {
          el.setAttribute("data-win10-hovered", "true");
        } else {
          el.removeAttribute("data-win10-hovered");
        }

        if (!el.hasAttribute("data-win10-active")) {
          el.setAttribute("data-win10-active", "true");
        }

        currentActive.add(el);
      }
    }

    // 清除已远离光标的元素
    this.activeElements.forEach((el) => {
      if (!currentActive.has(el)) {
        el.style.setProperty("--win10-inner-opacity", "0");
        el.removeAttribute("data-win10-active");
        el.removeAttribute("data-win10-hovered");
      }
    });

    this.activeElements = currentActive;
  };

  private handlePointerDown = (e: PointerEvent): void => {
    // 仅响应鼠标左键或触控点击
    if (e.button !== 0 && e.pointerType === "mouse") return;

    const target = (e.target as HTMLElement | null)?.closest(TARGET_SELECTOR) as HTMLElement | null;
    if (!target) return;
    if (target.hasAttribute("disabled") || target.getAttribute("aria-disabled") === "true") return;

    const rect = target.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    // 清理此前如果仍残留的波纹
    const prevRipple = this.activeRipples.get(target);
    if (prevRipple) {
      prevRipple.remove();
      this.activeRipples.delete(target);
    }

    // 创建 Windows 10 按压聚光圈
    const ripple = document.createElement("span");
    ripple.className = "win10-tile-ripple is-holding";
    ripple.style.left = `${px}px`;
    ripple.style.top = `${py}px`;

    target.appendChild(ripple);
    this.activeRipples.set(target, ripple);
  };

  private handlePointerUp = (): void => {
    if (this.activeRipples.size === 0) return;

    // 松手瞬间：将处于蓄力状态的光圈切换为波纹扩散动画
    this.activeRipples.forEach((ripple, target) => {
      ripple.classList.remove("is-holding");
      ripple.classList.add("is-diffusing");

      const handleEnd = () => {
        ripple.removeEventListener("animationend", handleEnd);
        if (ripple.parentElement) {
          ripple.remove();
        }
      };

      ripple.addEventListener("animationend", handleEnd);

      // 安全冗余清理定时器
      setTimeout(() => {
        if (ripple.parentElement) {
          ripple.remove();
        }
      }, 650);
    });

    this.activeRipples.clear();
  };

  private handlePointerCancel = (): void => {
    if (this.activeRipples.size === 0) return;

    this.activeRipples.forEach((ripple) => {
      ripple.classList.remove("is-holding");
      ripple.classList.add("is-cancelled");
      setTimeout(() => {
        if (ripple.parentElement) {
          ripple.remove();
        }
      }, 250);
    });

    this.activeRipples.clear();
  };
}

export const initWin10RevealManager = (): (() => void) => {
  const manager = Win10RevealManager.getInstance();
  manager.init();
  return () => manager.destroy();
};
