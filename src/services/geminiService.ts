
import { AppSettings, StyleConfig, OutlineItem, DocParserConfig, StoredResource } from "../types";
import { uploadFile, client, TOKEN_KEY } from "../api/client";

// --- Module-level State ---

/** 防重复：Smart Filter 降级提示仅展示一次/会话 */
let smartFilterWarningShown = false;

// --- Helpers ---

const ensureUploaded = async (resource: StoredResource): Promise<string> => {
    if (typeof resource === 'string') return resource;
    if (resource instanceof File) {
        return await uploadFile(resource);
    }
    throw new Error("Invalid resource type");
};

/**
 * 获取认证请求头（用于 fetch API 的流式调用）
 */
const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem(TOKEN_KEY);
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
};

// --- Exports ---

export const smartRefine = async (text: string, type: 'requirement' | 'content' | 'slide_refine' | 'requirement_polish' | 'template_description', triggerTime?: string, projectId?: string): Promise<string> => {
    try {
        const response = await client.post<{ success: boolean, data: string }>('/ai/smart-refine', {
            text,
            type,
            triggerTime,
            projectId
        });
        return (response as any).data || text;
    } catch (error) {
        console.error("Smart Refine Error:", error);
        throw error;
    }
};

export const refinePrompt = async (rawText: string, triggerTime?: string, projectId?: string): Promise<string> => {
    try {
        const response = await client.post<{ success: boolean, data: string }>('/ai/smart-refine', {
            text: rawText,
            type: 'template_description',  // 用于模板间的需求描述润色
            triggerTime,
            projectId
        });
        return (response as any).data || rawText;
    } catch (error) {
        console.error("Refine Prompt Error:", error);
        return rawText;
    }
};

export const extractTextFromFile = async (file: File, triggerTime?: string): Promise<{ text: string, isFallback: boolean, provider?: string }> => {
    try {
        // 1. Upload first
        const resourcePath = await uploadFile(file);

        // 2. Call AI Extract
        const response = await client.post<{ success: boolean, data: string, meta?: { isFallback: boolean, provider: string } }>('/ai/extract-text', {
            resourcePath,
            fileType: file.type,
            triggerTime
        });

        return {
            text: (response as any).data,
            isFallback: (response as any).meta?.isFallback || false,
            provider: (response as any).meta?.provider
        };
    } catch (error) {
        console.error("Extract Text Error:", error);
        throw error;
    }
};

export const generateOutline = async (topic: string, configStyle?: StyleConfig, triggerTime?: string, projectId?: string): Promise<OutlineItem[]> => {
    try {
        // axios interceptor already unwraps response.data, so we get { success, data } directly
        const response = await client.post<{ success: boolean, data: OutlineItem[] }>('/ai/generate-outline', {
            topic,
            configStyle,
            triggerTime,
            projectId
        });
        // response is already { success, data }, not { data: { success, data } }
        return (response as any).data;
    } catch (error) {
        console.error("Generate Outline Error:", error);
        throw error;
    }
};

export const generateSingleOutlineItem = async (topic: string, index: number, total: number, triggerTime?: string, projectId?: string): Promise<{ title: string, brief: string }> => {
    try {
        const response = await client.post<{ success: boolean, data: { title: string, brief: string } }>('/ai/generate-single-outline-item', {
            topic,
            index,
            total,
            triggerTime,
            projectId
        });
        return (response as any).data;
    } catch (error) {
        console.error("Generate Single Item Error:", error);
        throw error;
    }
};

export const generateSlideDetail = async (
    title: string,
    brief: string,
    topicContext: string,
    index: number,
    total: number,
    pageType: string,
    triggerTime?: string,
    projectId?: string
): Promise<string> => {
    try {
        const response = await client.post<{ success: boolean, data: string }>('/ai/generate-slide-detail', {
            title,
            brief,
            topicContext,
            index,
            total,
            pageType,
            triggerTime,
            projectId
        });
        return (response as any).data;
    } catch (error) {
        console.error("Generate Slide Detail Error:", error);
        throw error;
    }
};

const ensureMapUploaded = async (map?: any): Promise<any> => {
    if (!map) return map;
    const result: any = {};
    for (const [key, value] of Object.entries(map)) {
        if (value instanceof File || (typeof value === 'string' && value.startsWith('blob:'))) {
            result[key] = await ensureUploaded(value as any);
        } else {
            result[key] = value;
        }
    }
    return result;
};

export const generateSlideVariant = async (
    contentSource: StoredResource,
    styleFile: StoredResource | null,
    configStyle: StyleConfig,
    variantLabel: string,
    title?: string,
    contentType: 'text' | 'image' = 'text',
    // 新增参数 ↓
    pageType?: string,
    fullContent?: string,
    globalStyleMap?: any,
    allSlideTitles?: string[],
    triggerTime?: string, // 触发时间
    projectId?: string
): Promise<string> => {
    try {
        const contentUrl = await ensureUploaded(contentSource);
        let styleUrl = null;
        if (styleFile) styleUrl = await ensureUploaded(styleFile);

        const uploadedStyleMap = await ensureMapUploaded(globalStyleMap);

        const response = await client.post<{ success: boolean, data: string }>('/ai/generate-slide-variant', {
            contentSource: contentUrl,
            styleFile: styleUrl,
            configStyle,
            variantLabel,
            title,
            contentType,
            // 传递新参数 ↓
            pageType,
            fullContent,
            globalStyleMap: uploadedStyleMap,
            allSlideTitles,
            triggerTime,
            projectId
        });
        // 检查 Smart Filter 降级警告（非阻塞，仅提示一次/会话）
        const respData = response as any;
        if (respData.warning === 'SMART_FILTER_FALLBACK' && !smartFilterWarningShown) {
            smartFilterWarningShown = true;
            // 通过自定义事件触发 toast，避免循环依赖
            window.dispatchEvent(new CustomEvent('show-toast', {
                detail: {
                    message: respData.warningMessage || '设计需求格式未识别，已使用完整文本。建议使用 ## 2. 总体视觉规范和 ### [页面类型] 格式分段。',
                    type: 'info'
                }
            }));
        }
        return respData.data;
    } catch (error) {
        console.error("Generate Variant Error:", error);
        throw error;
    }
};

export const analyzeTemplateConcept = async (input: string | File, triggerTime?: string): Promise<StyleConfig> => {
    const payload: any = { triggerTime };
    if (typeof input === 'string') {
        payload.input = input;
    } else {
        const resourcePath = await uploadFile(input);
        payload.input = { path: resourcePath, mimeType: input.type };
    }

    try {
        const response = await client.post<{ success: boolean, data: StyleConfig }>('/ai/analyze-template-concept', payload);
        return (response as any).data;
    } catch (error) {
        console.error("Analyze Template Concept Error:", error);
        throw error;
    }
};

export const generateStyleReference = async (configStyle: StyleConfig, pageType: string, settings?: AppSettings, triggerTime?: string): Promise<string> => {
    try {
        const response = await client.post<{ success: boolean, data: string }>('/ai/generate-style-reference', {
            configStyle,
            pageType,
            settings, // Pass client-side settings to backend
            triggerTime
        });
        return (response as any).data;
    } catch (error) {
        console.error("Generate Style Reference Error:", error);
        throw error;
    }
};

// ============================================================
// 流式输出方法 (Streaming Methods)
// ============================================================

// outputMode 缓存，避免每次调用都请求后端
let cachedOutputMode: 'stream' | 'complete' | null = null;

/**
 * 获取全局输出模式配置（带缓存）
 * @param forceRefresh 是否强制刷新缓存
 */
export const getOutputMode = async (forceRefresh = false): Promise<'stream' | 'complete'> => {
    // 如果有缓存且不强制刷新，直接返回缓存值
    if (cachedOutputMode && !forceRefresh) {
        return cachedOutputMode;
    }

    try {
        const response = await client.get<any>('/settings');
        const settings = (response as any).data;
        cachedOutputMode = settings?.outputMode || 'stream';
        return cachedOutputMode;
    } catch {
        console.warn('[getOutputMode] Failed to fetch output mode from server, defaulting to stream');
        return 'stream';
    }
};

/**
 * 刷新 outputMode 缓存（在后台设置变更后调用）
 */
export const refreshOutputModeCache = async (): Promise<'stream' | 'complete'> => {
    cachedOutputMode = null;
    return getOutputMode(true);
};

/**
 * 流式文本润色
 */
export const smartRefineStream = async (
    text: string,
    type: 'requirement' | 'content' | 'slide_refine' | 'requirement_polish' | 'template_description',
    onChunk: (chunk: string) => void,
    triggerTime?: string,
    projectId?: string
): Promise<string> => {
    const response = await fetch('/api/ai/smart-refine/stream', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ text, type, triggerTime, projectId }),
        credentials: 'include'
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
        throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

        for (const line of lines) {
            try {
                const data = JSON.parse(line.slice(6));
                if (data.chunk) {
                    fullText += data.chunk;
                    onChunk(data.chunk);
                }
                if (data.error) {
                    throw new Error(data.error.message || data.error);
                }
                if (data.done) {
                    return fullText;
                }
            } catch (e: any) {
                if (e.message && !e.message.includes('JSON')) {
                    throw e;
                }
            }
        }
    }

    return fullText;
};

/**
 * 流式大纲生成 - 逐项返回
 */
export const generateOutlineStream = async (
    topic: string,
    configStyle: StyleConfig,
    onItem: (item: OutlineItem, index: number) => void,
    triggerTime?: string,
    projectId?: string
): Promise<OutlineItem[]> => {
    const response = await fetch('/api/ai/generate-outline/stream', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ topic, configStyle, triggerTime, projectId }),
        credentials: 'include'
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
        throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    const items: OutlineItem[] = [];

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

        for (const line of lines) {
            try {
                const data = JSON.parse(line.slice(6));
                if (data.item && data.index !== undefined) {
                    items.push(data.item);
                    onItem(data.item, data.index);
                }
                if (data.error) {
                    throw new Error(data.error.message || data.error);
                }
                if (data.done) {
                    return items;
                }
            } catch (e: any) {
                if (e.message && !e.message.includes('JSON')) {
                    throw e;
                }
            }
        }
    }

    return items;
};

/**
 * 流式幻灯片详情生成
 */
export const generateSlideDetailStream = async (
    title: string,
    brief: string,
    topicContext: string,
    index: number,
    total: number,
    pageType: string,
    onChunk: (chunk: string) => void,
    triggerTime?: string,
    projectId?: string
): Promise<string> => {
    const response = await fetch('/api/ai/generate-slide-detail/stream', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ title, brief, topicContext, index, total, pageType, triggerTime, projectId }),
        credentials: 'include'
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
        throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

        for (const line of lines) {
            try {
                const data = JSON.parse(line.slice(6));
                if (data.chunk) {
                    fullText += data.chunk;
                    onChunk(data.chunk);
                }
                if (data.error) {
                    throw new Error(data.error.message || data.error);
                }
                if (data.done) {
                    return fullText;
                }
            } catch (e: any) {
                if (e.message && !e.message.includes('JSON')) {
                    throw e;
                }
            }
        }
    }

    return fullText;
};

// ============================================================
// 自动选择模式的统一入口 (Auto Mode Entry Points)
// ============================================================

/**
 * 自动选择模式的文本润色
 */
export const smartRefineAuto = async (
    text: string,
    type: 'requirement' | 'content' | 'slide_refine' | 'requirement_polish' | 'template_description',
    onChunk?: (chunk: string) => void,
    triggerTime?: string,
    projectId?: string
): Promise<string> => {
    const mode = await getOutputMode();

    if (mode === 'stream' && onChunk) {
        return smartRefineStream(text, type, onChunk, triggerTime, projectId);
    } else {
        return smartRefine(text, type, triggerTime, projectId);
    }
};

/**
 * 自动选择模式的大纲生成
 */
export const generateOutlineAuto = async (
    topic: string,
    configStyle: StyleConfig,
    onItem?: (item: OutlineItem, index: number) => void,
    triggerTime?: string,
    projectId?: string
): Promise<OutlineItem[]> => {
    const mode = await getOutputMode();

    if (mode === 'stream' && onItem) {
        return generateOutlineStream(topic, configStyle, onItem, triggerTime, projectId);
    } else {
        return generateOutline(topic, configStyle, triggerTime, projectId);
    }
};

/**
 * 自动选择模式的幻灯片详情生成
 */
export const generateSlideDetailAuto = async (
    title: string,
    brief: string,
    topicContext: string,
    index: number,
    total: number,
    pageType: string,
    onChunk?: (chunk: string) => void,
    triggerTime?: string,
    projectId?: string
): Promise<string> => {
    const mode = await getOutputMode();

    if (mode === 'stream' && onChunk) {
        return generateSlideDetailStream(title, brief, topicContext, index, total, pageType, onChunk, triggerTime, projectId);
    } else {
        return generateSlideDetail(title, brief, topicContext, index, total, pageType, triggerTime, projectId);
    }
};
