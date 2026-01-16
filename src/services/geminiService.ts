
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

export const smartRefine = async (text: string, type: 'requirement' | 'content'): Promise<string> => {
    try {
        const response = await client.post<{ success: boolean, data: string }>('/ai/smart-refine', {
            text,
            type
        });
        return response.data.data || text;
    } catch (error) {
        console.error("Smart Refine Error:", error);
        throw error;
    }
};

export const refinePrompt = async (rawText: string): Promise<string> => {
    try {
        const response = await client.post<{ success: boolean, data: string }>('/ai/smart-refine', { 
             text: rawText,
             type: 'requirement', // Reuse requirement type for prompt refinement
        });
        return response.data.data || rawText;
    } catch (error) {
        console.error("Refine Prompt Error:", error);
        return rawText;
    }
};

export const extractTextFromFile = async (file: File): Promise<{ text: string, isFallback: boolean, provider?: string }> => {
    try {
        // 1. Upload first
        const resourcePath = await uploadFile(file);
        
        // 2. Call AI Extract
        const response = await client.post<{ success: boolean, data: string, meta?: { isFallback: boolean, provider: string } }>('/ai/extract-text', {
            resourcePath,
            fileType: file.type
        });
        
        return {
            text: response.data.data,
            isFallback: response.data.meta?.isFallback || false,
            provider: response.data.meta?.provider
        };
    } catch (error) {
        console.error("Extract Text Error:", error);
        throw error;
    }
};

export const generateOutline = async (topic: string, configStyle?: StyleConfig): Promise<OutlineItem[]> => {
    try {
        const response = await client.post<{ success: boolean, data: OutlineItem[] }>('/ai/generate-outline', {
            topic,
            configStyle
        });
        return response.data.data;
    } catch (error) {
        console.error("Generate Outline Error:", error);
        throw error;
    }
};

export const generateSingleOutlineItem = async (topic: string, index: number, total: number): Promise<{title: string, brief: string}> => {
     try {
        const response = await client.post<{ success: boolean, data: {title: string, brief: string} }>('/ai/generate-single-outline-item', {
            topic,
            index,
            total
        });
        return response.data.data;
    } catch (error) {
        console.error("Generate Single Item Error:", error);
        throw error;
    }
};

export const generateSlideDetail = async (title: string, brief: string, topicContext: string): Promise<string> => {
     try {
        const response = await client.post<{ success: boolean, data: string }>('/ai/generate-slide-detail', {
            title,
            brief,
            topicContext
        });
        return response.data.data;
    } catch (error) {
        console.error("Generate Slide Detail Error:", error);
        throw error;
    }
};

export const generateSlideVariant = async (
  contentSource: StoredResource, 
  styleFile: StoredResource | null,
  configStyle: StyleConfig,
  variantLabel: string,
  title?: string,
  contentType: 'text' | 'image' = 'text' 
): Promise<string> => {
    try {
        const contentUrl = await ensureUploaded(contentSource);
        let styleUrl = null;
        if (styleFile) styleUrl = await ensureUploaded(styleFile);

        const response = await client.post<{ success: boolean, data: string }>('/ai/generate-slide-variant', {
            contentSource: contentUrl,
            styleFile: styleUrl,
            configStyle,
            variantLabel,
            title,
            contentType
        });
        return response.data.data;
    } catch (error) {
         console.error("Generate Variant Error:", error);
         throw error;
    }
};
