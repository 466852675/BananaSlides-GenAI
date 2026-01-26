
import { AppSettings, StyleConfig, OutlineItem, DocParserConfig, StoredResource } from "../types";
import { uploadFile, client } from "../api/client";

// --- Helpers ---

const ensureUploaded = async (resource: StoredResource): Promise<string> => {
    if (typeof resource === 'string') return resource;
    if (resource instanceof File) {
        return await uploadFile(resource);
    }
    throw new Error("Invalid resource type");
};

// --- Exports ---

export const smartRefine = async (text: string, type: 'requirement' | 'content' | 'requirement_polish', triggerTime?: string, projectId?: string): Promise<string> => {
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
            type: 'requirement_polish',
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
        return (response as any).data;
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
