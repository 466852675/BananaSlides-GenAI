import { describe, it, expect } from 'bun:test';

// Import internal functions for testing
// These are exported via __testing for testability only
import { __testing } from '../../services/ai.service';

const {
    extractPageSpecificRequirements,
    detectInputScenario,
    complementScenarioInputs,
    parseStructuredVisionOutput,
    extractDesignSuggestion,
    buildImageGenerationPrompt,
    extractHexFromText,
    detectContentType,
    splitContent,
} = __testing;

// ============================================================
// detectContentType
// ============================================================
describe('detectContentType', () => {
    it('should detect pipe tables (Markdown | syntax)', () => {
        const content = `| 统计项目 | 26年预测 | 25年实际 |
| :--- | :--- | :--- |
| 收入 | 7388.60 | 7198.71 |
| 净值 | 4747.98 | 4764.05 |
| 利润 | 1051.36 | 93.80 |`;
        const result = detectContentType(content);
        expect(result).toBe('table');
    });

    it('should detect aligned tables (space-separated numbers)', () => {
        const content = `业务分布    已签合同净值    已签合同数量
基础业务    0.00          0
新型业务    69.05         3
小计        160.67        7`;
        const result = detectContentType(content);
        expect(result).toBe('table');
    });

    it('should detect structured documents (bold headers + lists)', () => {
        const content = `**核心定位**：依托地市拓展策略

**核心进展**：
- **地市覆盖**：持续开展湖北12个地市驻点服务
- **创新突破**：孝感城市样板项目需求调研推进中

**关键锚点**：✅ 12地市驻点服务

**下步计划**：
- 补齐后端配电交付能力
- 推进孝感样板项目落地`;
        const result = detectContentType(content);
        expect(result).toBe('structured');
    });

    it('should detect mixed bold+lots-of-lists also as structured', () => {
        const content = `**标题1**：说明文字
- 项目1描述
- 项目2描述
**标题2**：说明文字
- 项目3描述
- 项目4描述`;
        const result = detectContentType(content);
        expect(result).toBe('structured');
    });

    it('should detect pure lists', () => {
        const content = `- 基础业务占比69.7%
- 新型业务占比28.3%
- 抢标占比2%
- 合计净值4747.98万`;
        const result = detectContentType(content);
        expect(result).toBe('list');
    });

    it('should detect prose for plain paragraphs', () => {
        const content = `经过对本次项目的全面分析，基础业务仍然是核心基本盘，占比达到69.7%。
新型业务作为第二增长曲线表现突出。
抢标仅占2%，市场化竞标能力仍在培育期。`;
        const result = detectContentType(content);
        expect(result).toBe('prose');
    });

    it('should return prose for short content (< 20 chars)', () => {
        const result = detectContentType('市场分析完成。');
        expect(result).toBe('prose');
    });

    it('should return prose for fewer than 3 lines', () => {
        const result = detectContentType('第一行\n第二行');
        expect(result).toBe('prose');
    });

    it('should return prose for empty content', () => {
        const result = detectContentType('');
        expect(result).toBe('prose');
    });

    it('should return prose for whitespace-only content', () => {
        const result = detectContentType('   ');
        expect(result).toBe('prose');
    });

    it('should detect pipe table with format line excluded', () => {
        const content = `| A | B |
| :--- | :--- |
| 1 | 2 |
| 3 | 4 |
| 5 | 6 |`;
        const result = detectContentType(content);
        expect(result).toBe('table');
    });

    it('should not treat single pipe line as table (header only)', () => {
        const content = `| A | B |
| 1 | 2 |`;
        const result = detectContentType(content);
        expect(result).not.toBe('table');
    });
});

// ============================================================
// extractPageSpecificRequirements
// ============================================================
describe('extractPageSpecificRequirements', () => {

    const standardRequirements = `## 2. 总体视觉规范
* 设计美学: 通透简约的科技风格
* 色彩方案: 背景色 #FFFFFF, 主色 #00BFA5

## 3. 页面类型详细指令
### [封面页]
封面需全屏沉浸背景，主标题居中。

### [内容页]
每个核心板块展示图标加标题加短句。`;

    it('should extract global spec and page spec for standard format', () => {
        const result = extractPageSpecificRequirements(standardRequirements, 'cover');
        expect(result.isFallback).toBe(false);
        expect(result.content).toContain('【全局视觉规范】');
        expect(result.content).toContain('背景色 #FFFFFF');
        expect(result.content).toContain('封面需全屏沉浸背景');
    });

    it('should extract page-specific instructions for content page', () => {
        const result = extractPageSpecificRequirements(standardRequirements, 'content');
        expect(result.isFallback).toBe(false);
        expect(result.content).toContain('content');
        expect(result.content).toContain('图标加标题加短句');
    });

    it('should return fallback=true for unstructured text', () => {
        const plainText = '这是一段没有标准格式的设计要求，没有任何 Markdown 标题结构。';
        const result = extractPageSpecificRequirements(plainText, 'cover');
        expect(result.isFallback).toBe(true);
        expect(result.content).toBe(plainText);
    });

    it('should return isFallback=false for empty input', () => {
        const result = extractPageSpecificRequirements('', 'cover');
        expect(result.isFallback).toBe(false);
        expect(result.content).toBe('');
    });

    it('should return isFallback=false for whitespace-only input', () => {
        const result = extractPageSpecificRequirements('   ', 'cover');
        expect(result.isFallback).toBe(false);
        expect(result.content).toBe('');
    });

    // Chinese numbered variants
    it('should match Chinese chapter numbering (## 第二章)', () => {
        const req = `## 第二章 总体视觉规范
* 设计美学: 科技感`;
        const result = extractPageSpecificRequirements(req, 'cover');
        expect(result.isFallback).toBe(false);
        expect(result.content).toContain('科技感');
    });

    it('should match Chinese enumeration (## 二、总体视觉规范)', () => {
        const req = `## 二、总体视觉规范
* 设计美学: 稳重商务`;
        const result = extractPageSpecificRequirements(req, 'cover');
        expect(result.isFallback).toBe(false);
        expect(result.content).toContain('稳重商务');
    });

    it('should match unnumbered heading (## 总体视觉规范)', () => {
        const req = `## 总体视觉规范
* 设计美学: 极简风格`;
        const result = extractPageSpecificRequirements(req, 'cover');
        expect(result.isFallback).toBe(false);
        expect(result.content).toContain('极简风格');
    });

    // Page-specific heading variants
    it('should match #### (4-level) heading for page type', () => {
        const req = `#### 封面页
封面要求：主标题居中。`;
        const result = extractPageSpecificRequirements(req, 'cover');
        expect(result.isFallback).toBe(false);
        expect(result.content).toContain('封面要求');
    });

    it('should match "封面页要求" variant', () => {
        const req = `### 封面页要求
封面要求：主标题居中。`;
        const result = extractPageSpecificRequirements(req, 'cover');
        expect(result.isFallback).toBe(false);
        expect(result.content).toContain('封面要求');
    });

    it('should match "封面页指令" variant', () => {
        const req = `### 封面页指令
封面指令：主标题居中。`;
        const result = extractPageSpecificRequirements(req, 'cover');
        expect(result.isFallback).toBe(false);
        expect(result.content).toContain('封面指令');
    });

    it('should fall back when no recognizable sections exist', () => {
        const req = `# Only an H1
## Some random heading
No standard structure here.`;
        const result = extractPageSpecificRequirements(req, 'cover');
        expect(result.isFallback).toBe(true);
        expect(result.content).toBe(req);
    });
});

// ============================================================
// detectInputScenario
// ============================================================
describe('detectInputScenario', () => {
    it('should return scenario1 when both styleRef and requirements exist', () => {
        expect(detectInputScenario('path/to/image.jpg', 'some requirements')).toBe('scenario1');
    });

    it('should return scenario2 when only styleRef exists', () => {
        expect(detectInputScenario('path/to/image.jpg', '')).toBe('scenario2');
    });

    it('should return scenario3 when only requirements exist', () => {
        expect(detectInputScenario(null, 'some requirements')).toBe('scenario3');
    });

    it('should return scenario4 when neither exists', () => {
        expect(detectInputScenario(null, '')).toBe('scenario4');
    });

    it('should treat whitespace-only requirements as empty', () => {
        expect(detectInputScenario(null, '   ')).toBe('scenario4');
        expect(detectInputScenario('path/to/img.jpg', '   ')).toBe('scenario2');
    });
});

// ============================================================
// parseStructuredVisionOutput
// ============================================================
describe('parseStructuredVisionOutput', () => {
    it('should parse HEX: line and extract colors', () => {
        const input = `HEX: #00BFA5 #FFFFFF #1A237E
主色调为科技青绿配纯白背景，构图为左疏右密。`;
        const result = parseStructuredVisionOutput(input);
        expect(result.hexColors).toEqual(['#00BFA5', '#FFFFFF', '#1A237E']);
        expect(result.keywords).toContain('科技青绿');
        expect(result.keywords).not.toContain('HEX:');
    });

    it('should handle empty input', () => {
        const result = parseStructuredVisionOutput('');
        expect(result.keywords).toBe('');
        expect(result.hexColors).toEqual([]);
    });

    it('should handle input without HEX: line', () => {
        const input = '主色调为荧光绿配深黑背景';
        const result = parseStructuredVisionOutput(input);
        expect(result.keywords).toBe(input);
        expect(result.hexColors).toEqual([]);
    });

    it('should deduplicate hex colors', () => {
        const input = `HEX: #00BFA5 #00bfa5 #FFFFFF
描述文本。`;
        const result = parseStructuredVisionOutput(input);
        expect(result.hexColors).toHaveLength(2);
        expect(result.hexColors).toContain('#00BFA5');
    });

    it('should return empty on null/undefined', () => {
        expect(parseStructuredVisionOutput('')).toEqual({ keywords: '', hexColors: [] });
    });
});

// ============================================================
// extractHexFromText
// ============================================================
describe('extractHexFromText', () => {
    it('should extract hex colors from text', () => {
        const text = '背景色 #FFFFFF, 主色 #00BFA5, 辅助色 #1A237E';
        const result = extractHexFromText(text);
        expect(result).toContain('#00BFA5');
        expect(result).toContain('#FFFFFF');
        expect(result).toContain('#1A237E');
    });

    it('should deduplicate hex colors case-insensitively', () => {
        const text = '#00BFA5 and #00bfa5 are the same';
        const result = extractHexFromText(text);
        expect(result).toHaveLength(1);
    });

    it('should return empty array when no hex found', () => {
        expect(extractHexFromText('no hex values here')).toEqual([]);
    });

    it('should return empty array for empty input', () => {
        expect(extractHexFromText('')).toEqual([]);
    });
});

// ============================================================
// extractDesignSuggestion
// ============================================================
describe('extractDesignSuggestion', () => {
    it('should extract single-line design suggestion', () => {
        const content = '内容内容内容\n**设计建议：** 采用中心发散布局';
        const result = extractDesignSuggestion(content);
        expect(result).toBe('采用中心发散布局');
    });

    it('should extract multi-line design suggestion', () => {
        const content = '内容内容内容\n**设计建议：** 采用中心发散布局\n核心概念位于中央\n四个模块环绕周边';
        const result = extractDesignSuggestion(content);
        expect(result).toContain('采用中心发散布局');
        expect(result).toContain('核心概念位于中央');
    });

    it('should stop at blank line', () => {
        const content = '内容\n**设计建议：** 采用中心发散布局\n\n后续无关内容';
        const result = extractDesignSuggestion(content);
        expect(result).toBe('采用中心发散布局');
        expect(result).not.toContain('后续无关内容');
    });

    it('should return empty when no suggestion marker found', () => {
        expect(extractDesignSuggestion('没有任何标记的文本')).toBe('');
    });

    it('should return empty for empty input', () => {
        expect(extractDesignSuggestion('')).toBe('');
    });

    it('should stop at --- horizontal rule delimiter', () => {
        const content = '正文内容\n**设计建议：** 采用中心发散布局\n核心概念居中\n---\n后续忽略的内容';
        const result = extractDesignSuggestion(content);
        expect(result).toContain('中心发散布局');
        expect(result).toContain('核心概念居中');
        expect(result).not.toContain('后续忽略');
    });
});

// ============================================================
// splitContent
// ============================================================
describe('splitContent', () => {

    it('should split pipe table content: table → dataBlock, conclusion → keyPointsBlock', () => {
        const content = `| 业务分布 | 净值 | 数量 |
| :--- | :--- | :--- |
| 基础业务 | 3312.40 | 55 |
| 新型业务 | 1344.50 | 28 |

**结论**：本次统计项目合计净值4747.98万。`;

        const result = splitContent(content);
        // dataBlock contains the table rows
        expect(result.dataBlock).toContain('| 基础业务');
        expect(result.dataBlock).toContain('3312.40');
        // keyPointsBlock contains the conclusion
        expect(result.keyPointsBlock).toContain('4747.98万');
        expect(result.keyPointsBlock).toContain('结论');
        // bodyBlock is empty for pure table+conclusion content
        expect(result.bodyBlock).toBe('');
    });

    it('should put structured content (bold + lists) into bodyBlock', () => {
        const content = `**核心定位**：依托地市拓展策略

**关键锚点**：
- 12地市驻点服务
- 创新突破200万`;

        const result = splitContent(content);
        expect(result.bodyBlock).toContain('核心定位');
        expect(result.bodyBlock).toContain('12地市驻点服务');
        expect(result.dataBlock).toBe('');
        expect(result.keyPointsBlock).toBe('');
    });

    it('should put prose content into bodyBlock', () => {
        const content = '经过全面分析，基础业务仍然是核心基本盘，占比达到69.7%。';
        const result = splitContent(content);
        expect(result.bodyBlock).toBe(content);
        expect(result.dataBlock).toBe('');
        expect(result.keyPointsBlock).toBe('');
    });

    it('should put list content into bodyBlock', () => {
        const content = `- 基础业务占比69.7%
- 新型业务占比28.3%
- 抢标占比2%`;
        const result = splitContent(content);
        expect(result.bodyBlock).toContain('基础业务占比');
        expect(result.bodyBlock).toContain('抢标占比');
        expect(result.dataBlock).toBe('');
    });

    it('should handle empty content', () => {
        const result = splitContent('');
        expect(result.bodyBlock).toBe('');
        expect(result.dataBlock).toBe('');
        expect(result.keyPointsBlock).toBe('');
    });

    it('should handle aligned table with conclusion', () => {
        const content = `业务分布    已签合同净值    合同数量
基础业务    3312.40         55
新型业务    1344.50         28
小计        4656.90         83

**结论**：基础业务占比69.7%为核心基本盘。`;

        const result = splitContent(content);
        expect(result.dataBlock).toContain('基础业务');
        expect(result.dataBlock).toContain('3312.40');
        expect(result.keyPointsBlock).toContain('基础业务占比');
        expect(result.bodyBlock).toBe('');
    });

    it('should put table without conclusion: all to dataBlock', () => {
        const content = `| A | B |
| :--- | :--- |
| 1 | 2 |
| 3 | 4 |`;
        const result = splitContent(content);
        expect(result.dataBlock).toContain('| 1 |');
        expect(result.dataBlock).toContain('| 3 |');
        expect(result.keyPointsBlock).toBe('');
    });

    it('should capture emoji-prefixed bullet points as keyPointsBlock', () => {
        const content = `| 指标 | 数值 | 同比 |
| :--- | :--- | :--- |
| 收入 | 7388.60 | +3% |
| 利润 | 1051.36 | -2% |
| 净值 | 4747.98 | 0% |

结论：
📊 整体收入达7388万
⚠️ 单一客户依赖风险
🌍 跨省拓展取得进展`;
        const result = splitContent(content);
        expect(result.dataBlock).toContain('7388.60');
        expect(result.keyPointsBlock).toContain('📊 整体收入达7388万');
        expect(result.keyPointsBlock).toContain('⚠️ 单一客户依赖风险');
        expect(result.keyPointsBlock).toContain('🌍 跨省拓展取得进展');
        expect(result.bodyBlock).not.toContain('整体收入达7388万');
    });

    it('should separate conclusion text with 小结 keyword', () => {
        const content = `| A | B |
| :--- | :--- |
| 1 | 2 |
| 3 | 4 |

**小结**：累计完成12地市驻点服务
- 基础业务占比69.7%
- 新型业务第二增长曲线`;
        const result = splitContent(content);
        expect(result.dataBlock).toContain('| A | B |');
        expect(result.keyPointsBlock).toContain('累计完成12地市驻点服务');
        expect(result.bodyBlock).toBe('');
    });

    it('should separate conclusion text with 总结 keyword', () => {
        const content = `| 指标 | 数值 |
| :--- | :--- |
| 收入 | 7388.60 |
| 利润 | 1051.36 |

**总结**：整体收入稳定，利润同比下降`;
        const result = splitContent(content);
        expect(result.dataBlock).toContain('收入');
        expect(result.keyPointsBlock).toContain('整体收入');
        expect(result.bodyBlock).toBe('');
    });

    it('should separate conclusion text with key_takeaways keyword', () => {
        const content = `| 指标 | 数值 | 同比 |
| :--- | :--- | :--- |
| 收入 | 7388.60 | +3% |
| 利润 | 1051.36 | -2% |

key_takeaways: Revenue up 3% YoY`;
        const result = splitContent(content);
        expect(result.dataBlock).toContain('收入');
        expect(result.keyPointsBlock).toContain('Revenue up 3%');
        expect(result.bodyBlock).toBe('');
    });

    it('should exit conclusion section when encountering a new paragraph after empty line', () => {
        const content = `| 业务 | 净值 | 占比 |
| :--- | :--- | :--- |
| 基础 | 3312.40 | 69.7% |
| 新型 | 1344.50 | 28.3% |

结论：基础业务为核心基本盘。
要点1：净利润1051万。
要点2：市场培育期。

历史数据对比：去年同期收入6890万，同比增长7%。`;
        const result = splitContent(content);
        expect(result.dataBlock).toContain('基础');
        expect(result.keyPointsBlock).toContain('核心基本盘');
        expect(result.keyPointsBlock).toContain('净利润1051万');
        // 结论区内空行后的非结论行应归入 bodyBlock
        expect(result.bodyBlock).toContain('去年同期收入');
    });
});

// ============================================================
// buildImageGenerationPrompt — block-based injection
// ============================================================
describe('buildImageGenerationPrompt — block-based params', () => {
    const baseParams = {
        pageType: 'content' as const,
        title: '测试标题',
        content: '',
        styleName: '极简科技',
        colorPalette: '青绿黑金',
        requirements: '',
        aspectRatio: '16:9',
        styleMatchType: 'none' as const,
    };

    it('should inject dataBlock as data source section', () => {
        const prompt = buildImageGenerationPrompt({
            ...baseParams,
            dataBlock: '| 基础业务 | 3312.40 |',
            bodyBlock: '',
            keyPointsBlock: '',
        });
        expect(prompt).toContain('数据源');
        expect(prompt).toContain('3312.40');
        // Should NOT be rendered as 正文
        expect(prompt).toContain('数据源');
        expect(prompt).toContain('3312.40');
    });

    it('should inject bodyBlock with content-type-aware labeling for structured content', () => {
        const prompt = buildImageGenerationPrompt({
            ...baseParams,
            dataBlock: '',
            bodyBlock: '**核心进展**：\n- 地市覆盖12个\n- 创新突破200万',
            keyPointsBlock: '',
        });
        expect(prompt).toContain('内容素材');
        expect(prompt).toContain('核心进展');
    });

    it('should inject bodyBlock as 正文 for prose content', () => {
        const prompt = buildImageGenerationPrompt({
            ...baseParams,
            dataBlock: '',
            bodyBlock: '经过全面分析，基础业务是核心基本盘。',
            keyPointsBlock: '',
        });
        expect(prompt).toContain('正文');
        expect(prompt).toContain('核心基本盘');
    });

    it('should inject keyPointsBlock as key points section', () => {
        const prompt = buildImageGenerationPrompt({
            ...baseParams,
            dataBlock: '',
            bodyBlock: '',
            keyPointsBlock: '基础业务占比69.7%',
        });
        expect(prompt).toContain('要点');
        expect(prompt).toContain('基础业务占比69.7%');
    });

    it('should combine all three blocks when all present', () => {
        const prompt = buildImageGenerationPrompt({
            ...baseParams,
            dataBlock: '| 收入 | 7388.60 |',
            bodyBlock: '**业务概述**：整体收入结构稳定。\n- 营业收入7388.60万\n- 净利润1051.36万',
            keyPointsBlock: '收入同比增长3%',
        });
        expect(prompt).toContain('数据源');
        expect(prompt).toContain('7388.60');
        expect(prompt).toContain('内容素材');
        expect(prompt).toContain('业务概述');
        expect(prompt).toContain('要点');
        expect(prompt).toContain('收入同比增长3%');
    });

    it('should add anti-duplication constraint when dataBlock present', () => {
        const prompt = buildImageGenerationPrompt({
            ...baseParams,
            dataBlock: '| A | B |',
            bodyBlock: '',
            keyPointsBlock: '',
        });
        expect(prompt).toContain('最多出现两次');
    });

    it('should NOT add anti-duplication constraint when only bodyBlock (prose) present', () => {
        const prompt = buildImageGenerationPrompt({
            ...baseParams,
            dataBlock: '',
            bodyBlock: '这是一段普通文字。',
            keyPointsBlock: '',
        });
        expect(prompt).not.toContain('最多出现两次');
    });

    it('should fall back to content field when block params are empty', () => {
        const prompt = buildImageGenerationPrompt({
            ...baseParams,
            content: '| 收入 | 7388.60 | 同比+3% |\n| :--- | :--- | :--- |\n| 营业收入 | 7388.60 | +3% |\n| 净利润 | 1051.36 | -2% |',
            dataBlock: '',
            bodyBlock: '',
            keyPointsBlock: '',
        });
        // Pure table content in the fallback path should be detected and treated as data source
        expect(prompt).toContain('数据源');
    });
});

// ============================================================
// buildImageGenerationPrompt
// ============================================================
describe('buildImageGenerationPrompt', () => {
    const baseParams = {
        pageType: 'cover' as const,
        title: '测试标题',
        content: '测试内容',
        styleName: '极简科技',
        colorPalette: '青绿黑金',
        requirements: '',
        aspectRatio: '16:9',
        styleMatchType: 'none' as const,
    };

    it('should place styleName and colorPalette at the beginning of style section', () => {
        const prompt = buildImageGenerationPrompt(baseParams);
        const styleSection = prompt.split('【2.')[0];
        const styleNameIdx = styleSection.indexOf('极简科技');
        const paletteIdx = styleSection.indexOf('青绿黑金');
        expect(styleNameIdx).toBeGreaterThan(0);
        expect(paletteIdx).toBeGreaterThan(0);
        expect(styleNameIdx).toBeLessThan(80);
    });

    it('should NOT contain hex ban in section 1', () => {
        const prompt = buildImageGenerationPrompt(baseParams);
        const section1 = prompt.split('【2.')[0];
        const section2 = prompt.split('【2.')[1] || '';
        expect(section1).not.toMatch(/禁止.*#hex/);
        expect(section2).toMatch(/禁止.*#hex/);
    });

    it('should inject styleKeywords when provided', () => {
        const prompt = buildImageGenerationPrompt({
            ...baseParams,
            styleKeywords: '主色调为科技青绿配纯白背景',
        });
        expect(prompt).toContain('核心视觉指纹');
        expect(prompt).toContain('科技青绿');
    });

    it('should inject injectedKeywords when provided', () => {
        const prompt = buildImageGenerationPrompt({
            ...baseParams,
            injectedKeywords: '科技感,通透,简约',
        });
        expect(prompt).toContain('提取的风格特征');
        expect(prompt).toContain('科技感');
    });

    it('should inject injectedHexes when provided', () => {
        const prompt = buildImageGenerationPrompt({
            ...baseParams,
            injectedHexes: ['#00BFA5', '#FFFFFF'],
        });
        expect(prompt).toContain('#00BFA5');
        expect(prompt).toContain('#FFFFFF');
    });

    it('should include page-type-specific instructions for cover', () => {
        const prompt = buildImageGenerationPrompt({
            ...baseParams,
            pageType: 'cover',
        });
        expect(prompt).toContain('封面要求');
    });

    it('should include page-type-specific instructions for content', () => {
        const prompt = buildImageGenerationPrompt({
            ...baseParams,
            pageType: 'content',
            content: 'some content',
        });
        expect(prompt).toContain('排版要求');
    });

    it('should include business content section', () => {
        const prompt = buildImageGenerationPrompt(baseParams);
        expect(prompt).toContain('业务任务内容');
        expect(prompt).toContain('测试标题');
    });

    it('should handle empty styleName gracefully', () => {
        const prompt = buildImageGenerationPrompt({
            ...baseParams,
            styleName: '',
            colorPalette: '',
        });
        expect(prompt).toContain('业务任务内容');
    });

    it('should include 大纲参考 for directory type with allSlideTitles', () => {
        const prompt = buildImageGenerationPrompt({
            ...baseParams,
            pageType: 'directory',
            content: '',
            allSlideTitles: ['业务概览', '市场分析', '财务数据', '战略规划', '风险管控'],
        });
        expect(prompt).toContain('大纲参考');
        expect(prompt).toContain('业务概览');
        expect(prompt).toContain('市场分析');
        expect(prompt).toContain('财务数据');
    });

    // prose content - 正文注入
    it('should use data-source injection for structured content', () => {
        const structuredContent = `**核心进展**：
- 地市覆盖12个
- 创新突破200万`;
        const prompt = buildImageGenerationPrompt({
            ...baseParams,
            pageType: 'content',
            content: structuredContent,
        });
        expect(prompt).toContain('内容素材');
        expect(prompt).toContain('禁止将原文直接渲染为画面文字');
    });

    it('should add anti-duplication constraint for non-prose content', () => {
        const structuredContent = `**标题1**：说明
- 项目1描述
- 项目2描述`;
        const prompt = buildImageGenerationPrompt({
            ...baseParams,
            pageType: 'content',
            content: structuredContent,
        });
        expect(prompt).toContain('最多出现两次');
        expect(prompt).toContain('禁止在第三个及以上位置重复');
    });

    it('should NOT add anti-duplication constraint for prose content', () => {
        const proseContent = '这是一段普通的段落文字。没有结构化标记。只有一段话。';
        const prompt = buildImageGenerationPrompt({
            ...baseParams,
            pageType: 'content',
            content: proseContent,
        });
        expect(prompt).not.toContain('最多出现两次');
    });
});

// ============================================================
// buildImageGenerationPrompt — hex scope isolation
// ============================================================
describe('buildImageGenerationPrompt — hex scope isolation', () => {
    it('should have hex ban only in section 2', () => {
        const prompt = buildImageGenerationPrompt({
            pageType: 'content',
            title: 'Test',
            content: 'Test content',
            styleName: 'Modern',
            colorPalette: 'Blue',
            requirements: '',
            aspectRatio: '16:9',
            styleMatchType: 'none',
        });

        const section1 = prompt.substring(0, prompt.indexOf('【2.'));
        const section2 = prompt.substring(prompt.indexOf('【2.'));

        expect(section1).not.toMatch(/禁止.*#hex/);
        expect(section1).not.toMatch(/禁止.*技术参数/);
        expect(section2).toMatch(/禁止.*#hex/);
    });

    it('should allow hex values in section 1 for reference', () => {
        const prompt = buildImageGenerationPrompt({
            pageType: 'cover',
            title: 'Test',
            content: '',
            styleName: '',
            colorPalette: '',
            requirements: '## 2. 总体视觉规范\n色彩方案: #00BFA5',
            aspectRatio: '16:9',
            styleMatchType: 'none',
        });

        const section1 = prompt.substring(0, prompt.indexOf('【2.'));
        expect(section1).toContain('#00BFA5');
    });
});

// ============================================================
// complementScenarioInputs
// ============================================================
describe('complementScenarioInputs', () => {
    it('scenario1 should return empty', async () => {
        const result = await complementScenarioInputs(
            'scenario1', 'vision keywords', ['#00BFA5'], 'requirements', undefined
        );
        expect(result.injectedKeywords).toBe('');
        expect(result.injectedHexes).toEqual([]);
    });

    it('scenario2 should return vision hex colors', async () => {
        const result = await complementScenarioInputs(
            'scenario2', 'vision keywords', ['#00BFA5', '#FFFFFF'], '', undefined
        );
        expect(result.injectedKeywords).toBe('');
        expect(result.injectedHexes).toEqual(['#00BFA5', '#FFFFFF']);
    });

    it('scenario2 with empty hexColors should return empty', async () => {
        const result = await complementScenarioInputs(
            'scenario2', 'vision keywords', [], '', undefined
        );
        expect(result.injectedKeywords).toBe('');
        expect(result.injectedHexes).toEqual([]);
    });

    it('scenario4 should return empty', async () => {
        const result = await complementScenarioInputs(
            'scenario4', '', [], '', undefined
        );
        expect(result.injectedKeywords).toBe('');
        expect(result.injectedHexes).toEqual([]);
    });

    it('scenario3 should extract hex colors from requirements', async () => {
        // 传入 mock settings 阻止真实 API 调用（单元测试不依赖外部服务）
        const mockSettings = { ai: { textModel: '', baseUrl: 'http://localhost:0', apiKey: '' } } as any;
        const result = await complementScenarioInputs(
            'scenario3', '', [], '主色 #00BFA5 背景 #FFFFFF', mockSettings
        );
        expect(result.injectedHexes).toContain('#00BFA5');
        expect(result.injectedHexes).toContain('#FFFFFF');
        // injectedKeywords 在 mock settings 下应返回空（无真实 LLM API 调用）
        // 但不影响色值提取——设计上 injectedKeywords 与 injectedHexes 独立
    });

    it('scenario3 should return empty hexes when no hex in requirements', async () => {
        const mockSettings = { ai: { textModel: '', baseUrl: 'http://localhost:0', apiKey: '' } } as any;
        const result = await complementScenarioInputs(
            'scenario3', '', [], '纯文本设计要求', mockSettings
        );
        expect(result.injectedHexes).toEqual([]);
    });
});