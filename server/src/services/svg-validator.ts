/**
 * SVG Validator — 校验 AI 生成的 SVG 内容是否符合 DrawingML 转换要求
 *
 * 参考 ppt-master 的 svg_quality_checker.py 设计
 * 检查项：XML 合法性、禁止元素、viewBox、文件大小等
 */

/** SVG 校验结果 */
export interface SvgValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  sanitized?: string;
}

/** 禁止的 SVG 元素（DrawingML 无法表达） */
const FORBIDDEN_ELEMENTS = [
  'script',
  'foreignobject',
  'use', // 外部引用的 use 会被禁止，内联 use 允许
  'textpath',
  'animate',
  'animateMotion',
  'animateTransform',
  'set',
  'iframe',
  'symbol',
];

/** 禁止的属性（JS 事件处理器） */
const FORBIDDEN_EVENT_ATTRS = [
  'onclick',
  'ondblclick',
  'onmousedown',
  'onmouseup',
  'onmouseover',
  'onmousemove',
  'onmouseout',
  'onkeydown',
  'onkeyup',
  'onkeypress',
  'onload',
  'onerror',
];

/** 允许的 SVG 元素白名单 */
const ALLOWED_ELEMENTS = new Set([
  'svg',
  'g',
  'rect',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'path',
  'text',
  'tspan',
  'defs',
  'linearGradient',
  'radialGradient',
  'stop',
  'clipPath',
  'image', // 内嵌 base64 图像允许
  // 允许的辅助元素
  'title',
  'desc',
  'style', // 仅用于文本样式，但需检查内容
]);

/** 最大文件大小 500KB */
const MAX_SVG_SIZE = 500 * 1024;

/**
 * 校验 SVG 字符串是否符合 DrawingML 转换要求
 */
export function validateSvg(svgString: string): SvgValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 检查 1: 文件大小
  const sizeInBytes = Buffer.byteLength(svgString, 'utf-8');
  if (sizeInBytes > MAX_SVG_SIZE) {
    errors.push(
      `SVG file too large: ${(sizeInBytes / 1024).toFixed(1)}KB exceeds 500KB limit`
    );
  }

  // 检查 2: 基本字符串检查
  if (!svgString || typeof svgString !== 'string') {
    errors.push('SVG content is empty or not a string');
    return { valid: false, errors, warnings };
  }

  const trimmed = svgString.trim();
  if (!trimmed.startsWith('<')) {
    errors.push('SVG content does not start with XML tag');
    return { valid: false, errors, warnings };
  }

  // 检查 3: 提取 SVG 根元素中的 viewBox
  const viewBoxMatch = trimmed.match(/viewBox=["']([^"']+)["']/);
  if (!viewBoxMatch) {
    errors.push('SVG missing viewBox attribute');
  } else {
    const viewBox = viewBoxMatch[1].trim();
    const parts = viewBox.split(/[\s,]+/);
    if (parts.length !== 4) {
      errors.push(`SVG viewBox has invalid format: "${viewBox}"`);
    } else {
      const [, , w, h] = parts.map(Number);
      if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) {
        errors.push(`SVG viewBox has invalid dimensions: ${w}x${h}`);
      }
    }
  }

  // 检查 4: 禁止元素检测（字符串级别快速扫描）
  const lowerTrimmed = trimmed.toLowerCase();
  for (const elem of FORBIDDEN_ELEMENTS) {
    const regex = new RegExp(`<${elem}[\\s>]`, 'i');
    if (regex.test(trimmed)) {
      if (elem === 'use') {
        // use 元素需要特殊处理：检查是否有 data-icon 属性（允许）或外部引用（禁止）
        const useExternalRef = /<use[^>]+href=["'](?:https?:|\/\/)/i;
        const useDataIcon = /<use[^>]+data-icon=/i;
        if (useExternalRef.test(trimmed) && !useDataIcon.test(trimmed)) {
          errors.push(`Forbidden element: <use> with external href reference`);
        }
      } else if (elem === 'style') {
        // style 元素需检查是否为 @font-face
        const fontFaceMatch = /<style[^>]*>[\s\S]*?@font-face/i.test(trimmed);
        if (fontFaceMatch) {
          errors.push(`Forbidden: @font-face in <style> element`);
        } else {
          warnings.push(`Element <style> found — may cause issues in DrawingML conversion`);
        }
      } else if (elem === 'image') {
        // image 的外部 href 在 sanitize 阶段处理
      } else {
        errors.push(`Forbidden element: <${elem}>`);
      }
    }
  }

  // 检查 5: JS 事件处理器
  for (const attr of FORBIDDEN_EVENT_ATTRS) {
    if (lowerTrimmed.includes(attr + '=')) {
      errors.push(`Forbidden event handler attribute: ${attr}`);
    }
  }

  // 检查 6: 外部资源引用（http/https href，但 base64 允许）
  const externalHrefMatch = trimmed.match(
    /(?:href|xlink:href)=["'](?!data:)(?:https?:\/\/|\/\/)[^"']+["']/gi
  );
  if (externalHrefMatch) {
    // 外部 image href 在 DrawingML 中不支持
    const isImageHref = externalHrefMatch.some((m) =>
      /<image[\s\S]{0,500}/i.test(
        trimmed.substring(
          Math.max(0, trimmed.indexOf(m) - 500),
          trimmed.indexOf(m) + m.length
        )
      )
    );
    if (isImageHref) {
      warnings.push(
        `External image href found — will be embedded as base64 during sanitization`
      );
    }
  }

  // 检查 7: 存在 text 元素
  if (!/<text[\s>]/i.test(trimmed)) {
    warnings.push('No <text> elements found — slide may lack readable content');
  }

  // 检查 8: XML 注入风险 — <script 标签
  if (/<script[\s>]/i.test(trimmed)) {
    errors.push('Security: <script> element detected');
  }

  // 检查 9: class 属性使用（DrawingML 不支持 CSS class）
  if (/class=["']/i.test(trimmed)) {
    warnings.push(
      'CSS class attributes found — these will be ignored in DrawingML conversion. Use inline styles instead.'
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 清洗 SVG 内容：移除/替换不安全元素，确保转换兼容性
 */
export function sanitizeSvg(svgString: string): string {
  let sanitized = svgString;

  // 移除 script 标签及内容
  sanitized = sanitized.replace(
    /<script[\s\S]*?<\/script>/gi,
    ''
  );

  // 移除 foreignObject 标签及内容
  sanitized = sanitized.replace(
    /<foreignobject[\s\S]*?<\/foreignobject>/gi,
    ''
  );

  // 移除所有 JS 事件属性
  sanitized = sanitized.replace(
    /\s(on(?:click|dblclick|mouse\w+|key\w+|load|error|focus|blur|change|input|submit))=["'][^"']*["']/gi,
    ''
  );

  // 移除 <?xml ?> 声明（可能引起解析问题）
  sanitized = sanitized.replace(/<\?xml[^?]*\?>/gi, '');

  // 移除 XML 注释
  sanitized = sanitized.replace(/<!--[\s\S]*?-->/g, '');

  return sanitized.trim();
}

/**
 * 从 AI 响应中提取 SVG 内容
 * 支持多种格式：纯 SVG、```xml 代码块、```svg 代码块
 */
export function extractSvgFromResponse(response: string): string | null {
  // 尝试 1: ```xml 或 ```svg 代码块
  const codeBlockMatch = response.match(
    /```(?:xml|svg)\s*\n([\s\S]*?)```/i
  );
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // 尝试 2: 通用代码块
  const genericMatch = response.match(/```\s*\n([\s\S]*?)```/);
  if (genericMatch) {
    const content = genericMatch[1].trim();
    if (content.startsWith('<svg') || content.includes('viewBox')) {
      return content;
    }
  }

  // 尝试 3: 直接查找 <svg> 标签
  const svgMatch = response.match(/(<svg[\s\S]*<\/svg>)/i);
  if (svgMatch) {
    return svgMatch[1].trim();
  }

  return null;
}

export default { validateSvg, sanitizeSvg, extractSvgFromResponse };
