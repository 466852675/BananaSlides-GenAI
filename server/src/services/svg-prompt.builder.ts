/**
 * SVG Prompt Builder — 构建让 AI 文本/代码模型生成演示文稿 SVG 的 prompt
 *
 * 核心差异：这里使用 text/code 模型（如 Claude、GPT-4），不是 image 扩散模型。
 * 模型接收的是"请写 SVG 代码"的指令，返回结构化 XML。
 */

/** SVG 生成 prompt 参数 */
export interface SvgPromptParams {
  /** 页面类型 */
  pageType: 'cover' | 'directory' | 'transition' | 'content' | 'end' | 'custom';
  /** 幻灯片标题 */
  title: string;
  /** 幻灯片文本内容（Markdown） */
  content: string;
  /** 颜色调色板（逗号分隔 HEX 值），如 "#0052D4,#4FC3F7,#FFFFFF,#1A1A2E" */
  colorPalette: string;
  /** 风格名称，如 "极简科技", "商务严谨" */
  styleName: string;
  /** 视觉要求描述 */
  requirements: string;
  /** 宽高比，如 "16:9", "4:3" */
  aspectRatio: string;
  /** 来自视觉分析的风格关键词 */
  styleKeywords?: string;
  /** 所有幻灯片标题（目录页用） */
  allSlideTitles?: string[];
  /** 幻灯片序号（从 1 开始） */
  slideIndex?: number;
  /** 总页数 */
  totalSlides?: number;
}

/** 宽高比到 viewBox 尺寸的映射 */
const ASPECT_RATIO_VIEWPORT: Record<string, { w: number; h: number }> = {
  '16:9': { w: 960, h: 540 },
  '4:3': { w: 960, h: 720 },
  '1:1': { w: 540, h: 540 },
  '3:4': { w: 405, h: 540 },
  '9:16': { w: 540, h: 960 },
};

/**
 * 根据宽高比获取 viewBox 尺寸
 */
function getViewBox(aspectRatio: string): { w: number; h: number } {
  return ASPECT_RATIO_VIEWPORT[aspectRatio] || ASPECT_RATIO_VIEWPORT['16:9'];
}

/**
 * 解析颜色调色板为可用颜色数组
 */
function parseColors(colorPalette: string): {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  textLight: string;
} {
  const colors = colorPalette
    .split(/[,，\s]+/)
    .map((c) => c.trim())
    .filter(Boolean);

  return {
    primary: colors[0] || '#0052D4',
    secondary: colors[1] || '#4FC3F7',
    accent: colors[2] || '#FF6B6B',
    background: colors[3] || '#FFFFFF',
    text: colors[4] || '#1A1A2E',
    textLight: colors[5] || '#666666',
  };
}

/**
 * 按页面类型生成布局结构指令
 */
function getPageLayoutInstruction(
  pageType: string,
  params: SvgPromptParams,
  viewport: { w: number; h: number },
  colors: ReturnType<typeof parseColors>
): string {
  const { title, content, allSlideTitles } = params;

  switch (pageType) {
    case 'cover':
      return `
LAYOUT — Cover Page (封面):
- Full-bleed background using primary color ${colors.primary} with gradient overlay
- Large centered title "${title}" in bold white text, font-size 42-48px
- Decorative geometric shapes (circles, lines, rectangles) in accent colors
- Optional subtitle area below the title in lighter weight
- Bottom section for author/date information
- Visual weight centered, clean and impactful`;

    case 'directory':
      return `
LAYOUT — Directory/Table of Contents (目录):
- Left column (30% width): decorative sidebar with section numbers
- Right column (70% width): numbered list of sections
- Each section: large number + title + thin connecting line
- Section titles: ${allSlideTitles?.join(', ') || 'extract from content'}
- Alternating subtle background shading for each row
- Current section highlighted with accent color ${colors.accent}`;

    case 'transition':
      return `
LAYOUT — Section Transition (过渡页):
- Bold, dramatic section title "${title}" centered on the page
- Large decorative number or icon element
- Minimalist background with subtle gradient
- Accent line or shape element for visual interest
- Generous whitespace, high visual impact`;

    case 'content':
      return `
LAYOUT — Content Page (内容页):
- Top header bar (8% height): slide title "${title}" left-aligned with accent underline
- Body area (85% height): structured content layout
- Content source:
${content}
- Use one of these layouts based on content structure:
  * If content has 3-4 key points: use card grid layout (2x2 or 1x3)
  * If content has steps/process: use horizontal flow diagram
  * If content has comparison: use side-by-side columns
  * If content is descriptive: use left-text + right-visual layout
- Each content block should have: mini-header, body text, optional icon/marker
- Bottom bar (7% height): page number and subtle branding element
- Visual hierarchy: title > section headers > body text > captions`;

    case 'end':
      return `
LAYOUT — End/Thank You Page (结尾页):
- Large centered "谢谢" or "Thank You" text
- Subtitle or contact information below
- Decorative elements matching cover page style for bookend effect
- Clean, memorable closing`;

    default:
      return `
LAYOUT — Custom Page:
- Title "${title}" at top
- Content: ${content}
- Professional layout with clear visual hierarchy`;
  }
}

/**
 * 构建完整的 SVG 生成 prompt
 */
export function buildSvgGenerationPrompt(params: SvgPromptParams): string {
  const viewport = getViewBox(params.aspectRatio);
  const colors = parseColors(params.colorPalette);
  const layoutInstruction = getPageLayoutInstruction(
    params.pageType,
    params,
    viewport,
    colors
  );

  const slideInfo =
    params.slideIndex && params.totalSlides
      ? `\nSLIDE POSITION: ${params.slideIndex} of ${params.totalSlides}`
      : '';

  return `You are an expert SVG designer for professional presentation slides. Generate a complete, valid SVG file for a single presentation slide.

== SPECIFICATIONS ==
- ViewBox: "0 0 ${viewport.w} ${viewport.h}" (W ${viewport.h}H, ${params.aspectRatio} aspect ratio)
- All elements must use ABSOLUTE positioning (x, y coordinates in the viewBox space)
- Style: "${params.styleName}"
${params.requirements ? `- Design Requirements: ${params.requirements}` : ''}
${params.styleKeywords ? `- Visual Keywords: ${params.styleKeywords}` : ''}
${slideInfo}

== COLOR PALETTE (MUST USE THESE EXACT COLORS) ==
- Primary: ${colors.primary}
- Secondary: ${colors.secondary}
- Accent: ${colors.accent}
- Background: ${colors.background}
- Dark Text: ${colors.text}
- Light Text: ${colors.textLight}

== ALLOWED SVG ELEMENTS ==
Use ONLY these elements: <svg>, <g>, <rect>, <circle>, <ellipse>, <line>, <polyline>, <polygon>, <path>, <text>, <tspan>, <defs>, <linearGradient>, <radialGradient>, <stop>, <clipPath>

== FORBIDDEN (NEVER USE) ==
- <script>, <foreignObject>, <animate>, <animateMotion>, <animateTransform>, <set>
- <use> with external references, <symbol>, <textPath>
- JavaScript event handlers (onclick, onload, etc.)
- CSS @font-face declarations
- External URL references (http://, https://)
- HTML named entities (&mdash; &rarr; etc.) — use Unicode characters directly (— →)
- XML reserved chars must be escaped: & → &amp; < → &lt; > → &gt;

== TYPOGRAPHY RULES ==
- Font family: 'Segoe UI', 'Microsoft YaHei', 'PingFang SC', 'Helvetica Neue', Arial, sans-serif
- Title font-size: 32-48px, font-weight: bold
- Section header: 22-28px, font-weight: 600
- Body text: 14-18px, font-weight: normal
- Caption/small text: 11-13px
- All text must have explicit fill color
- Use Unicode characters directly: → ← ↑ ↓ ★ ● ◆ ■ ▸ ✔ ✦

${layoutInstruction}

== OUTPUT FORMAT ==
Return ONLY the SVG code, wrapped in \`\`\`xml code fences.
The SVG must be a complete, self-contained file starting with <svg> and ending with </svg>.
Do NOT include any explanation, commentary, or markdown outside the code fence.`;
}

export default buildSvgGenerationPrompt;
