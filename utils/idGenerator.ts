/**
 * ID 生成工具
 * 提供跨环境的唯一 ID 生成（支持浏览器和 Node.js）
 */

// 生成唯一 ID 的后备方案
function generateRandomId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * 生成唯一 ID
 * 优先使用 crypto.randomUUID()（需要安全上下文 HTTPS）
 * 后备使用 Math.random + 时间戳
 */
export function generateId(prefix: string = ''): string {
  let randomPart: string;
  
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    randomPart = crypto.randomUUID();
  } else {
    randomPart = generateRandomId();
  }
  
  return prefix ? `${prefix}_${randomPart}` : randomPart;
}

/**
 * 简化的唯一 ID 生成（不带前缀）
 */
export function generateUniqueId(): string {
  return generateId();
}
