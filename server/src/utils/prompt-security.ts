export interface SanitizationResult {
  originalText: string;
  cleanedText: string;
  wasSanitized: boolean;
  detectedPatterns: string[];
}

export interface SecurePrompt {
  system: string;
  user: string;
  safetyGuidelines: string[];
  metadata?: {
    sanitized: boolean;
    inputLength: number;
    timestamp: number;
  };
}

export class InjectionDetector {
  private injectionPatterns: RegExp[] = [
    /ignore\s+(previous|all|the)\s+instructions?/i,
    /disregard\s+(previous|all|the)\s+instructions?/i,
    /forget\s+(previous|all|the)\s+instructions?/i,
    /忽略\s*(之前的?|所有|全部)\s*指令/i,
    /忘记\s*(之前的?|所有|全部)\s*指令/i,
    /(you are|you're)\s+(now\s+)?(a\s+)?DAN/i,
    /(you are|you're)\s+(now\s+)?(a\s+)?jailbreak/i,
    /(you are|you're)\s+(now\s+)?(a\s+)?developer\s+mode/i,
    /扮演\s*(DAN|越狱|开发者模式)/i,
    /进入\s*(DAN|越狱|开发者模式)/i,
    /new\s+system\s+prompt:/i,
    /system\s+instruction\s*:/i,
    /新的?系统提示/i,
    /系统指令覆盖/i,
    /\[SYSTEM\s*(OVERRIDE|PROMPT|INSTRUCTION)\]/i,
    /<system>/i,
    /###\s*SYSTEM/i,
    /\[用户输入结束\]\s*(之后|后面|以下).*系统提示/i,
    /```\s*system/i,
    /---\s*system/i,
    /<<<\s*system/i,
  ];

  isInjectionAttempt(text: string): boolean {
    return this.injectionPatterns.some(pattern => pattern.test(text));
  }

  detectPatterns(text: string): string[] {
    const detected: string[] = [];
    for (const pattern of this.injectionPatterns) {
      if (pattern.test(text)) {
        detected.push(pattern.source);
      }
    }
    return detected;
  }
}

export class PromptSanitizer {
  private detector = new InjectionDetector();
  private maxLength = 5000;

  sanitize(text: string): SanitizationResult {
    const originalText = text;
    let cleanedText = text;
    const detectedPatterns: string[] = [];

    if (cleanedText.length > this.maxLength) {
      cleanedText = cleanedText.substring(0, this.maxLength);
      detectedPatterns.push('LENGTH_LIMIT_EXCEEDED');
    }

    const originalLength = cleanedText.length;
    cleanedText = cleanedText.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
    if (cleanedText.length !== originalLength) {
      detectedPatterns.push('CONTROL_CHARACTERS_REMOVED');
    }

    if (this.detector.isInjectionAttempt(cleanedText)) {
      detectedPatterns.push(...this.detector.detectPatterns(cleanedText));
      cleanedText = this.removeInjectionPatterns(cleanedText);
    }

    cleanedText = this.escapeSpecialMarkers(cleanedText);

    return {
      originalText,
      cleanedText,
      wasSanitized: detectedPatterns.length > 0,
      detectedPatterns,
    };
  }

  private removeInjectionPatterns(text: string): string {
    let cleaned = text;
    const replacements: [RegExp, string][] = [
      [/ignore\s+(previous|all)\s+instructions?/gi, '[REDACTED]'],
      [/disregard\s+(previous|all)\s+instructions?/gi, '[REDACTED]'],
      [/forget\s+(previous|all)\s+instructions?/gi, '[REDACTED]'],
      [/new\s+system\s+prompt:/gi, '[REDACTED]'],
      [/\[SYSTEM\s*\w+\]/gi, '[REDACTED]'],
      [/<system>/gi, '[REDACTED]'],
    ];
    
    for (const [pattern, replacement] of replacements) {
      cleaned = cleaned.replace(pattern, replacement);
    }
    
    return cleaned;
  }

  private escapeSpecialMarkers(text: string): string {
    return text
      .replace(/\[SYSTEM/gi, '【SYSTEM】')
      .replace(/\[USER_INPUT_/gi, '【USER_INPUT_】')
      .replace(/```/g, '` ` `');
  }
}

export class SecurePromptBuilder {
  private systemPrompt = '';
  private userInput = '';
  private safetyGuidelines: string[] = [];
  private metadata: SecurePrompt['metadata'];
  private sanitizer = new PromptSanitizer();

  setSystemPrompt(prompt: string): this {
    this.systemPrompt = prompt;
    return this;
  }

  setUserInput(input: string, options: { sanitize?: boolean } = {}): this {
    if (options.sanitize !== false) {
      const result = this.sanitizer.sanitize(input);
      this.userInput = result.cleanedText;
      this.metadata = {
        sanitized: result.wasSanitized,
        inputLength: input.length,
        timestamp: Date.now(),
      };
    } else {
      this.userInput = input;
      this.metadata = {
        sanitized: false,
        inputLength: input.length,
        timestamp: Date.now(),
      };
    }
    return this;
  }

  addSafetyGuideline(guideline: string): this {
    this.safetyGuidelines.push(guideline);
    return this;
  }

  build(): SecurePrompt {
    const boundedUserInput = `[USER_INPUT_START]\n${this.userInput}\n[USER_INPUT_END]`;

    return {
      system: this.systemPrompt,
      user: boundedUserInput,
      safetyGuidelines: this.safetyGuidelines,
      metadata: this.metadata,
    };
  }

  buildForModel(): string {
    const prompt = this.build();
    
    let fullPrompt = '';
    
    if (prompt.system) {
      fullPrompt += `[SYSTEM]\n${prompt.system}\n\n`;
    }
    
    if (prompt.safetyGuidelines.length > 0) {
      fullPrompt += `[SAFETY GUIDELINES]\n${prompt.safetyGuidelines.join('\n')}\n\n`;
    }
    
    fullPrompt += `[USER]\n${prompt.user}`;
    
    return fullPrompt;
  }
}

export function sanitizeUserInput(input: string): SanitizationResult {
  const sanitizer = new PromptSanitizer();
  return sanitizer.sanitize(input);
}

export function isInjectionAttempt(text: string): boolean {
  const detector = new InjectionDetector();
  return detector.isInjectionAttempt(text);
}

export const promptSanitizer = new PromptSanitizer();
export const injectionDetector = new InjectionDetector();
export const securePromptBuilder = new SecurePromptBuilder();
