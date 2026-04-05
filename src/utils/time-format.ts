/**
 * 时间格式化工具
 *
 * 统一时间显示格式，支持多种输入类型
 * 被以下组件使用：
 * - Dashboard.tsx
 * - AgentSidebar.tsx
 * - TrashPage.tsx
 * - PointsHistory.tsx
 */

export type TimeInput = number | string | Date;

/**
 * 将输入转换为时间戳（毫秒）
 */
const toTimestamp = (input: TimeInput): number => {
  if (typeof input === 'number') {
    return input;
  }
  if (input instanceof Date) {
    return input.getTime();
  }
  return new Date(input).getTime();
};

/**
 * 格式化相对时间（xx分钟前、xx小时前等）
 *
 * @param input - 时间戳（毫秒）、ISO 字符串或 Date 对象
 * @returns 格式化后的相对时间字符串
 */
export function formatTimeAgo(input: TimeInput): string {
  const timestamp = toTimestamp(input);

  // 无效时间
  if (isNaN(timestamp)) {
    return '';
  }

  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  // 未来时间或刚刚
  if (seconds < 60) {
    return '刚刚';
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}分钟前`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}小时前`;
  }

  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `${days}天前`;
  }

  // 超过30天显示具体日期
  return new Date(timestamp).toLocaleDateString('zh-CN', {
    month: 'numeric',
    day: 'numeric'
  });
}

/**
 * 格式化完整日期时间
 */
export function formatDateTime(input: TimeInput): string {
  const timestamp = toTimestamp(input);
  if (isNaN(timestamp)) return '';

  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * 格式化日期（不含时间）
 */
export function formatDate(input: TimeInput): string {
  const timestamp = toTimestamp(input);
  if (isNaN(timestamp)) return '';

  return new Date(timestamp).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}