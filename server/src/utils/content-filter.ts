// server/src/utils/content-filter.ts
// 内容审核过滤器 - 检测敏感词、违规内容

export interface FilterResult {
  hasSensitive: boolean;
  sensitiveWords: string[];
  category?: string;
  riskLevel: 'none' | 'low' | 'medium' | 'high';
  reason?: string;
}

export interface AIContentCheckResult {
  passed: boolean;
  violations: string[];
  confidence: number;
}

export class ContentFilter {
  // 敏感词库（生产环境应从数据库或配置加载）
  private sensitiveWords: Map<string, string[]> = new Map([
    ['political', ['敏感政治词1', '敏感政治词2']],
    ['violence', ['暴力', 'terror', 'kill', 'violence']],
    ['pornography', ['色情', 'porn', 'sex']],
    ['gambling', ['赌博', '博彩', '赌 bo']],
    ['drugs', ['毒品', 'drug', 'cocaine']],
    ['fraud', ['诈骗', '欺诈', 'scam']],
    ['discrimination', ['歧视', '种族主义', 'racism']],
  ]);

  // 变体词检测模式
  private variantPatterns: RegExp[] = [
    /赌\s*bo/i,      // 赌 bo
    /赌\s*博/i,      // 赌 博
    /色\s*情/i,      // 色 情
    /[\w\s]*<script>/i,   // HTML 标签
    /javascript:/i,       // JS 协议
    /ignore\s*previous\s*instructions?/i,
    /disregard\s*previous\s*instructions?/i,
  ];

  // 检查 AI 输出的危险内容模式
  private dangerousPatterns: RegExp[] = [
    /如何制作.*(武器|毒品)/i,
    /如何.*(自杀|自残)/i,
    /如何.*(黑客|入侵)/i,
  ];

  check(text: string): FilterResult {
    let foundWords: string[] = [];
    let riskLevel: FilterResult['riskLevel'] = 'none';
    let detectedPatterns: string[] = [];

    // 1. 检查敏感词
    for (const [category, words] of this.sensitiveWords) {
      for (const word of words) {
        const regex = new RegExp(word, 'gi');
        if (regex.test(text)) {
          foundWords.push(word);
          if (['political', 'violence', 'pornography'].includes(category)) {
            riskLevel = 'high';
          }
          if (riskLevel !== 'high') {
            riskLevel = 'medium';
          }
        }
      }
    }

    // 2. 检查变体词
    for (const pattern of this.variantPatterns) {
      if (pattern.test(text)) {
        detectedPatterns.push('变体词');
        if (riskLevel !== 'high') {
          riskLevel = 'medium';
        }
      }
    }

    return {
      hasSensitive: foundWords.length > 0,
      sensitiveWords: [...new Set(foundWords)],
      category: riskLevel === 'high' ? 'political' : riskLevel === 'medium' ? 'violence' : 'general',
      riskLevel,
      reason: foundWords.length > 0 ? `检测到敏感内容: ${foundWords.join(', ')}` : undefined,
    };
  }

  classify(text: string): FilterResult {
    const check = this.check(text);
    check.category = check.riskLevel === 'none' ? 'general' : check.category;
    return check;
  }

  // 检查 AI 生成的内容
  checkAIGenerated(content: string): AIContentCheckResult {
    const check = this.check(content);

    // 检查危险模式
    for (const pattern of this.dangerousPatterns) {
      if (pattern.test(content)) {
        return {
          passed: false,
          violations: ['DANGEROUS_INSTRUCTIONS'],
          confidence: 0.9,
        };
      }
    }

    return {
      passed: check.riskLevel !== 'high',
      violations: check.riskLevel === 'high' ? [check.reason || 'HIGH_RISK'] : [],
      confidence: check.hasSensitive ? 0.9 : 0.1,
    };
  }

  // 净化用户输入
  sanitize(input: string): string {
    let sanitized = input;

    // 移除危险字符
    sanitized = sanitized.replace(/[<>]/g, '');
    sanitized = sanitized.replace(/javascript:/gi, '');

    // 替换敏感关键词
    for (const [category, words] of this.sensitiveWords) {
      for (const word of words) {
        const regex = new RegExp(word, 'gi');
        sanitized = sanitized.replace(regex, '*'.repeat(word.length));
      }
    }

    return sanitized;
  }
}

// 导出单例实例
export const contentFilter = new ContentFilter();
