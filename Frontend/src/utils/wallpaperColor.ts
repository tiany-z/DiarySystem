/**
 * 预设壁纸综合色彩与特征色板
 * 当跨域 (CORS) 限制或离线状态下，保障立即可用且色调精准
 */
export const PRESET_WALLPAPER_COLORS: Record<string, [number, number, number]> = {
  // 雷尼尔雪山与静谧湖泊 (Mount Rainier) - 湖山幽蓝调
  "photo-1506744038136-46273834b3fb": [78, 108, 138],
  // 晨曦染金的雪峰群山 (Alpine Sunrise) - 晨曦金棕调
  "photo-1519681393784-d120267933ba": [168, 120, 92],
  // 薄雾深林与晨光微曦 (Mystic Forest) - 雾林幽绿调
  "photo-1448375240586-882707db888b": [68, 98, 76],
  // 微软必应今日壁纸
  "bing.biturl.top": [96, 128, 160],
};

/**
 * 提取指定图片 URL 的综合颜色 (RGB)
 * 通过离线微型 Canvas (16x16) 进行全局像素采样并计算加权平均色
 * 遇到跨域/离线限制时优雅降级至特征色
 */
export function extractImageCompositeColor(url: string): Promise<[number, number, number]> {
  return new Promise((resolve) => {
    let matchedColor: [number, number, number] = [96, 128, 168];
    for (const [key, color] of Object.entries(PRESET_WALLPAPER_COLORS)) {
      if (url.includes(key)) {
        matchedColor = color;
        break;
      }
    }

    if (typeof window === "undefined" || typeof Image === "undefined") {
      resolve(matchedColor);
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;

    const onFallback = () => {
      resolve(matchedColor);
    };

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          onFallback();
          return;
        }

        ctx.drawImage(img, 0, 0, 16, 16);
        const imgData = ctx.getImageData(0, 0, 16, 16).data;
        let rSum = 0;
        let gSum = 0;
        let bSum = 0;
        let count = 0;

        for (let i = 0; i < imgData.length; i += 4) {
          const a = imgData[i + 3];
          if (a > 32) {
            rSum += imgData[i];
            gSum += imgData[i + 1];
            bSum += imgData[i + 2];
            count++;
          }
        }

        if (count > 0) {
          const r = Math.round(rSum / count);
          const g = Math.round(gSum / count);
          const b = Math.round(bSum / count);
          resolve([r, g, b]);
        } else {
          onFallback();
        }
      } catch {
        onFallback();
      }
    };

    img.onerror = onFallback;
  });
}
