
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

export const smartRefine = async (text: string, type: 'requirement' | 'content', settings?: AppSettings): Promise<string> => {
    try {
        const response = await client.post<{ success: boolean, data: string }>('/ai/smart-refine', {
            text,
            type,
            settings
        });
        return response.data || text;
    } catch (error) {
        console.error("Smart Refine Error:", error);
        throw error;
    }
};

export const refinePrompt = async (rawText: string, settings?: AppSettings): Promise<string> => {
    try {
        const response = await client.post<{ success: boolean, data: string }>('/ai/smart-refine', { 
             text: rawText,
             type: 'requirement', // Reuse requirement type for prompt refinement
             settings
        });
        return response.data || rawText;
    } catch (error) {
        console.error("Refine Prompt Error:", error);
        return rawText;
    }
};

export const extractTextFromFile = async (file: File, settings?: AppSettings): Promise<string> => {
    try {
        // 1. Upload first
        const resourcePath = await uploadFile(file);
        
        // 2. Call AI Extract
        const response = await client.post<{ success: boolean, data: string }>('/ai/extract-text', {
            resourcePath,
            fileType: file.type,
            settings
        });
        return response.data;
    } catch (error) {
        console.error("Extract Text Error:", error);
        throw error;
    }
};

export const generateOutline = async (topic: string, configStyle?: StyleConfig, settings?: AppSettings): Promise<OutlineItem[]> => {
    try {
        const response = await client.post<{ success: boolean, data: OutlineItem[] }>('/ai/generate-outline', {
            topic,
            configStyle,
            settings
        });
        return response.data;
    } catch (error) {
        console.error("Generate Outline Error:", error);
        throw error;
    }
};

export const generateSingleOutlineItem = async (topic: string, index: number, total: number, settings?: AppSettings): Promise<{title: string, brief: string}> => {
     try {
        const response = await client.post<{ success: boolean, data: {title: string, brief: string} }>('/ai/generate-single-outline-item', {
            topic,
            index,
            total,
            settings
        });
        return response.data;
    } catch (error) {
        console.error("Generate Single Item Error:", error);
        throw error;
    }
};

export const generateSlideDetail = async (title: string, brief: string, topicContext: string, settings?: AppSettings): Promise<string> => {
     try {
        const response = await client.post<{ success: boolean, data: string }>('/ai/generate-slide-detail', {
            title,
            brief,
            topicContext,
            settings
        });
        return response.data;
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
  settings?: AppSettings,
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
            settings,
            contentType
        });
        return response.data;
    } catch (error) {
         console.error("Generate Variant Error:", error);
         throw error;
    }
};
