/**
 * 配色方案映射表
 *
 * 将配色名称映射到实际的十六进制颜色数组
 * 顺序：[主色, 辅色, 背景色, 文字色]
 */

export const COLOR_PALETTE_MAP: Record<string, string[]> = {
  // 预设配色方案
  '经典蓝白': ['#2563eb', '#60a5fa', '#ffffff', '#1f2937'],
  '黑金奢华': ['#1a1a1a', '#d4af37', '#f5f5f5', '#000000'],
  '活力橙灰': ['#f97316', '#9ca3af', '#ffffff', '#374151'],
  '莫兰迪色系': ['#a8a29e', '#d6d3d1', '#fafaf9', '#57534e'],
  '极简黑白': ['#000000', '#ffffff', '#f3f4f6', '#1f2937'],

  // 扩展配色方案
  '赛博朋克': ['#ff00ff', '#00ffff', '#0a0a0a', '#ffffff'],
  '自然绿意': ['#22c55e', '#86efac', '#f0fdf4', '#14532d'],
  '复古棕调': ['#92400e', '#d97706', '#fef3c7', '#451a03'],
  '浪漫粉紫': ['#ec4899', '#a855f7', '#fdf2f8', '#831843'],
  '商务蓝灰': ['#475569', '#94a3b8', '#f8fafc', '#1e293b'],
  '科技深蓝': ['#1e3a8a', '#3b82f6', '#0f172a', '#e2e8f0'],
  '清新薄荷': ['#10b981', '#6ee7b7', '#ecfdf5', '#064e3b'],
  '暖阳橙黄': ['#f59e0b', '#fcd34d', '#fffbeb', '#78350f'],
  '冷静灰蓝': ['#64748b', '#cbd5e1', '#f1f5f9', '#1e293b'],
  '优雅紫调': ['#7c3aed', '#a78bfa', '#f5f3ff', '#4c1d95']
};

/**
 * 获取配色数组
 * @param palette 配色名称或颜色数组
 * @returns 十六进制颜色数组 [主色, 辅色, 背景色, 文字色]
 */
export function resolveColorPalette(palette: string | string[] | null | undefined): string[] {
  // 如果已经是数组，直接返回
  if (Array.isArray(palette)) {
    return palette.length >= 4 ? palette : ['#000000', '#FFFFFF', '#2563EB', '#F59E0B'];
  }

  // 如果是字符串，尝试从映射表获取
  if (typeof palette === 'string' && palette.trim()) {
    const trimmed = palette.trim();

    // 1. 先查映射表
    if (COLOR_PALETTE_MAP[trimmed]) {
      return COLOR_PALETTE_MAP[trimmed];
    }

    // 2. 尝试 JSON 解析（可能是 JSON 字符串数组）
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length >= 4) {
        return parsed;
      }
    } catch {
      // 解析失败，继续使用默认值
    }

    // 3. 可能是逗号分隔的颜色值
    if (trimmed.includes(',') || trimmed.includes('#')) {
      const colors = trimmed.split(',').map(c => c.trim()).filter(c => c);
      if (colors.length >= 4) {
        return colors;
      }
    }
  }

  // 返回默认配色
  return ['#000000', '#FFFFFF', '#2563EB', '#F59E0B'];
}

/**
 * 获取所有预设配色名称列表
 */
export const PRESET_PALETTE_NAMES = Object.keys(COLOR_PALETTE_MAP);

/**
 * 根据配色数组反向查找配色名称
 * @param colors 颜色数组
 * @returns 配色名称，如果未找到返回 null
 */
export function findPaletteName(colors: string[]): string | null {
  const colorStr = colors.join(',').toLowerCase();

  for (const [name, palette] of Object.entries(COLOR_PALETTE_MAP)) {
    if (palette.join(',').toLowerCase() === colorStr) {
      return name;
    }
  }

  return null;
}