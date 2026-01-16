
import { GoogleGenAI, Type } from "@google/genai";
import { AppSettings, ModelConnection, StoredResource, DocParserConfig, StyleConfig, OutlineItem, ImageResolution } from "../types";
import { resourceToBase64, readResourceBuffer } from "../utils/file";
import mammoth from 'mammoth';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { AssetService } from './asset.service';

// --- Default Configuration ---
const DEFAULT_GEMINI_KEY = process.env.GEMINI_API_KEY || "";

// --- Helper Functions ---

const cleanBaseUrlForGoogle = (url: string): string => {
    let cleaned = url.trim();
    if (!cleaned) return 'https://generativelanguage.googleapis.com';
    if (cleaned.endsWith('/')) cleaned = cleaned.slice(0, -1);
    if (!cleaned.includes('googleapis.com')) {
        if (cleaned.endsWith('/v1')) return cleaned.slice(0, -3); 
        if (cleaned.endsWith('/openai')) return cleaned.slice(0, -7); 
    }
    return cleaned;
};

const createGoogleClient = (config: ModelConnection) => {
    const cleanUrl = cleanBaseUrlForGoogle(config.baseUrl);
    const isCustomProxy = !cleanUrl.includes('googleapis.com') && !cleanUrl.includes('generativelanguage');

    const options: any = {
        apiKey: config.apiKey,
        baseUrl: cleanUrl
    };

    if (isCustomProxy) {
        options.customHeaders = {
            'Authorization': `Bearer ${config.apiKey}`,
            'X-Goog-Api-Key': config.apiKey 
        };
    }

    return new GoogleGenAI(options);
};

const getTaskConfig = (settings: AppSettings | undefined, task: 'text' | 'image' | 'vision'): ModelConnection => {
    // console.log(`[getTaskConfig] Task: ${task}, Provider: ${settings?.ai?.provider || 'default'}`);
    
    if (!settings) {
        // console.log(`[getTaskConfig] No settings provided, using defaults`);
        return {
            apiKey: DEFAULT_GEMINI_KEY,
            baseUrl: 'https://generativelanguage.googleapis.com',
            model: 'gemini-3-pro-preview'
        };
    }

    let connection: ModelConnection;

    // Priority 1: Use customCombo if it has configuration for this task AND provider is CustomCombo
    if (settings.ai.provider === 'CustomCombo' && settings.ai.customCombo && settings.ai.customCombo[task] && settings.ai.customCombo[task].model) {
        // console.log(`[getTaskConfig] Using CustomCombo for ${task}:`, JSON.stringify(settings.ai.customCombo[task], null, 2));
        connection = { ...settings.ai.customCombo[task] };
        if (!connection.apiKey) connection.apiKey = settings.ai.apiKey;
        if (!connection.baseUrl) connection.baseUrl = settings.ai.baseUrl;
        if (!connection.apiKey) connection.apiKey = DEFAULT_GEMINI_KEY;
    } else {
        // Priority 2: Use general settings
        let apiKey = settings.ai.apiKey;
        const baseUrl = settings.ai.baseUrl;
        const model = settings.ai.models[task];
        if (settings.ai.provider === 'Gemini' && !apiKey) {
            apiKey = DEFAULT_GEMINI_KEY;
        }
        connection = { apiKey, baseUrl, model };
    }

    // Runtime Fix for Model Names
    if (connection.model.includes('gemini-3-pro-image-2k-16x9') || connection.model.includes('gemini-3-pro-image-preview')) {
        connection.model = 'gemini-3-pro-image';
    }

    // console.log(`[getTaskConfig] Final config: baseUrl=${connection.baseUrl}, model=${connection.model}, hasApiKey=${!!connection.apiKey}`);
    return connection;
};

const shouldUseGeminiNative = (config: ModelConnection, settings?: AppSettings): boolean => {
    const url = config.baseUrl.toLowerCase().trim();
    
    // Priority 1: Local proxies always use OpenAI compatible format
    if (url.includes('127.0.0.1') || url.includes('localhost')) {
        console.log(`[shouldUseGeminiNative] Local proxy detected, using OpenAI compatible API`);
        return false;
    }

    // Priority 2: Official Google APIs use Gemini Native
    if (url.includes('googleapis.com') || url.includes('generativelanguage')) {
        console.log(`[shouldUseGeminiNative] Google API detected, using Gemini Native API`);
        return true;
    }
    
    // Priority 3: Check provider setting for other cases
    if (settings?.ai.provider === 'Gemini') {
        console.log(`[shouldUseGeminiNative] Provider is Gemini, using Gemini Native API`);
        return true;
    }
    
    // All other URLs use OpenAI compatible API
    console.log(`[shouldUseGeminiNative] Using OpenAI compatible API for ${url}`);
    return false;
};

const getClosestSupportedRatio = (inputRatio: string): string => {
  const SUPPORTED_RATIOS = ["1:1", "3:4", "4:3", "9:16", "16:9"];
  if (SUPPORTED_RATIOS.includes(inputRatio)) return inputRatio;
  const [w, h] = inputRatio.split(':').map(Number);
  if (!w || !h) return "16:9";
  const ratio = w / h;
  if (ratio >= 1.7) return "16:9"; 
  if (ratio >= 1.3) return "4:3";
  if (ratio >= 0.9) return "1:1";
  if (ratio >= 0.7) return "3:4";
  return "9:16";
};

// --- API Callers ---

async function callOpenAICompatible(
    config: ModelConnection, 
    messages: any[], 
    temperature: number = 0.7,
    jsonMode: boolean = false
): Promise<string> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`;

    const body: any = {
        model: config.model,
        messages: messages,
        temperature: temperature,
        max_tokens: 4096
    };
    if (jsonMode) body.response_format = { type: "json_object" };

    let baseUrl = config.baseUrl.trim();
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
    let url = baseUrl;
    if (!url.toLowerCase().endsWith('/chat/completions')) {
        url = `${baseUrl}/chat/completions`;
    }

    console.log(`[OpenAI Compatible] Calling: ${url}, Model: ${config.model}`);

    try {
        const response = await axios.post(url, body, { headers, timeout: 120000 });
        return response.data.choices[0]?.message?.content || "";
    } catch (error: any) {
        const errMsg = error.response?.data?.error?.message || error.response?.data?.message || error.message;
        const statusCode = error.response?.status || 'unknown';
        console.error(`[OpenAI Compatible] API Call failed to ${url} [Status: ${statusCode}]`);
        console.error(`[OpenAI Compatible] Error Message: ${errMsg}`);
        if (error.response?.data) {
            console.error(`[OpenAI Compatible] Full error response:`, JSON.stringify(error.response.data, null, 2));
        }
        throw new Error(`API Request Failed: ${errMsg} (Status: ${statusCode})`);
    }
}

async function callOpenAIImageGeneration(
    config: ModelConnection,
    prompt: string,
    aspectRatio: string = "16:9"
): Promise<string> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`;

    // Map aspect ratio to size (DALL-E style)
    const sizeMap: Record<string, string> = {
        "16:9": "1792x1024",
        "4:3": "1024x768", 
        "1:1": "1024x1024",
        "3:4": "768x1024",
        "9:16": "1024x1792"
    };
    const size = sizeMap[aspectRatio] || "1792x1024";

    const body: any = {
        model: config.model,
        prompt: prompt,
        n: 1,
        size: size,
        response_format: "b64_json" // Request base64 directly
    };

    let baseUrl = config.baseUrl.trim();
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
    let url = `${baseUrl}/images/generations`;

    console.log(`[OpenAI Image] Calling: ${url}, Model: ${config.model}, Size: ${size}`);

    try {
        const response = await axios.post(url, body, { headers, timeout: 600000 });
        const data = response.data?.data?.[0];
        
        if (data?.b64_json) {
            return `data:image/png;base64,${data.b64_json}`;
        } else if (data?.url) {
            // If URL is returned, fetch and convert to base64
            const imageResponse = await axios.get(data.url, { responseType: 'arraybuffer' });
            const base64 = Buffer.from(imageResponse.data, 'binary').toString('base64');
            return `data:image/png;base64,${base64}`;
        }
        
        throw new Error("No image data in response");
    } catch (error: any) {
        const errMsg = error.response?.data?.error?.message || error.response?.data?.message || error.message;
        const statusCode = error.response?.status || 'unknown';
        console.error(`[OpenAI Image] API Call failed to ${url} [Status: ${statusCode}]`);
        console.error(`[OpenAI Image] Error Message: ${errMsg}`);
        if (error.response?.data) {
            console.error(`[OpenAI Image] Full error response:`, JSON.stringify(error.response.data, null, 2));
        }
        throw new Error(`Image Generation Failed: ${errMsg} (Status: ${statusCode})`);
    }
}

// --- Exported Services ---

export const AIService = {
    
    async smartRefine(text: string, type: 'requirement' | 'content', settings?: AppSettings): Promise<string> {
        const config = getTaskConfig(settings, 'text');
        let contextPrompt = type === 'requirement' 
            ? "Refine the following design requirements for a presentation. Make them clear, professional, specific, and actionable for a design AI. Maintain the original intent but improve clarity and terminology."
            : "Refine the following presentation slide content. Make it concise, professional, impactful, and suitable for a slide (use bullet points or punchy text if applicable). Maintain the original meaning.";

        const prompt = `Task: ${contextPrompt}\n\nInput Text: "${text}"\n\nRequirement: Return ONLY the refined text in Simplified Chinese (简体中文). Do not add explanations or conversational filler.`;

        if (shouldUseGeminiNative(config, settings)) {
            const ai = createGoogleClient(config);
            const response = await ai.models.generateContent({
                model: config.model, 
                contents: prompt,
            });
            return response.text?.trim() || text;
        } else {
            const messages = [{ role: "user", content: prompt }];
            return await callOpenAICompatible(config, messages);
        }
    },

    async generateSnapshotSummary(diffContext: string, settings?: AppSettings): Promise<string> {
        const config = getTaskConfig(settings, 'text');
        const prompt = `
            Task: Summarize the changes in a presentation project based on the provided diff context.
            Context: "${diffContext}"
            Requirement: 
            1. Language: Simplified Chinese (简体中文).
            2. Concise (under 20 words).
            3. Focus on what changed (e.g. "Updated title to 'AI Future' and added 2 slides", "Changed theme to Cyberpunk").
            4. If no meaningful change indicated in context, return "常规保存".
            5. Return ONLY the summary text, no conversational filler.
        `;
        
        console.log(`[AIService] Generating snapshot summary with model: ${config.model}`);

        if (shouldUseGeminiNative(config, settings)) {
            const ai = createGoogleClient(config);
            const response = await ai.models.generateContent({
                model: config.model, 
                contents: prompt,
            });
            return response.text?.trim() || "常规保存";
        } else {
            const messages = [{ role: "user", content: prompt }];
            return await callOpenAICompatible(config, messages);
        }
    },

    async extractTextFromFile(resourcePath: string, fileType: string, settings?: AppSettings): Promise<{ content: string, fallback?: boolean, provider?: string }> {
        // Handle PDF via MinerU with Fallback
        if (fileType === 'application/pdf') {
             const mineruKey = settings?.docParser?.apiKey;
             
             if (mineruKey) {
                 try {
                     const { MinerUService } = await import('./mineru.service');
                     
                     console.log('[AIService] Attempting MinerU PDF Parsing...');
                     const markdown = await MinerUService.parseFile(resourcePath, {
                         apiKey: mineruKey,
                         baseUrl: settings?.docParser?.baseUrl || 'https://mineru.openxlab.org.cn',
                         provider: 'MinerU'
                     });
                     
                     console.log('[AIService] MinerU Success.');
                     return { content: markdown, provider: 'MinerU' };
                     
                 } catch (mineruError: any) {
                     console.warn(`[AIService] MinerU Failed (Falling back to Vision): ${mineruError.message}`);
                     // Proceed to Vision Model logic below, but mark as fallback
                     // We continue execution...
                 }
             } else {
                 console.log('[AIService] MinerU API Key missing. Skipping to Vision Model.');
             }
        }

        const config = getTaskConfig(settings, 'vision');

        // Simple Text
        if (fileType === 'text/plain' || resourcePath.endsWith('.md') || resourcePath.endsWith('.txt')) {
             const buffer = await readResourceBuffer(resourcePath);
             return { content: buffer.toString('utf-8'), provider: 'Local' };
        }

        // Word
        if (resourcePath.endsWith('.docx') || fileType.includes('word')) {
            const buffer = await readResourceBuffer(resourcePath);
            const result = await mammoth.extractRawText({ buffer });
            if (result.value.trim()) return { content: result.value, provider: 'Local' };
        }

        // AI Vision
        const base64 = await resourceToBase64(resourcePath);
        
        // Determine whether this was a fallback from PDF
        const isFallback = (fileType === 'application/pdf');

        if (shouldUseGeminiNative(config, settings)) {
            const ai = createGoogleClient(config);
            const contents = [
                 { inlineData: { mimeType: fileType, data: base64 } },
                 { text: "Please analyze this file and extract the main content, key topics, and detailed information. Summarize it into a comprehensive text format that can be used to generate a presentation outline. Language: Simplified Chinese (简体中文)." }
            ];
            const response = await ai.models.generateContent({
                model: config.model,
                contents: { parts: contents } as any
            });
            return { 
                content: response.text?.trim() || "", 
                fallback: isFallback,
                provider: 'Gemini Vision'
            };
        } else {
            // OpenAI Vision
             const messages = [
                 {
                     role: "user",
                     content: [
                         { type: "text", text: "Please analyze this image/file and extract the main content, key topics, and detailed information. Summarize it into a comprehensive text format. Language: Simplified Chinese." },
                         { type: "image_url", image_url: { url: `data:${fileType};base64,${base64}` } }
                     ]
                 }
             ];
             const text = await callOpenAICompatible(config, messages);
             return { 
                 content: text, 
                 fallback: isFallback, 
                 provider: 'OpenAI Vision' 
            };
        }
    },

    async generateOutline(topic: string, configStyle: StyleConfig, settings: AppSettings): Promise<OutlineItem[]> {
        const config = getTaskConfig(settings, 'text');
        
        // ... (Outline logic similar to frontend)
        // For brevity, using simplified prompt construction
        const totalPages = configStyle.targetPageCount || 10;
         const prompt = `Generate a structured PowerPoint outline for: "${topic}". 
            Structure (Total ${totalPages} pages):
            1. Cover
            2. Directory
            ...Content...
            Last. End/Thank You
            
            Return JSON array of objects: { "title": string, "brief": string, "pageType": "cover"|"directory"|"transition"|"content"|"end" }
            Language: Simplified Chinese.
            No markdown. Raw JSON.
        `;

        let jsonStr = "";
        try {
            if (shouldUseGeminiNative(config, settings)) {
                 // Native JSON mode
                 const ai = createGoogleClient(config);
                 const response = await ai.models.generateContent({
                    model: config.model,
                    contents: prompt,
                    // Note: Skipping complex schema config for brevity in this migration step, relying on prompt
                 });
                 jsonStr = response.text?.trim() || "[]";
            } else {
                 const messages = [{ role: "user", content: prompt }];
                 jsonStr = await callOpenAICompatible(config, messages, 0.7, true);
            }
            jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(jsonStr);
             return parsed.map((item: any, index: number) => ({
                id: Math.random().toString(36).substr(2, 9),
                index: index + 1,
                title: item.title,
                brief: item.brief,
                pageType: item.pageType || 'content', 
                status: 'idle'
            }));
        } catch (e) {
            console.error("Outline Gen Error", e);
            throw new Error("Failed to generate outline");
        }
    },

    async generateSingleOutlineItem(topic: string, index: number, total: number, settings?: AppSettings): Promise<{title: string, brief: string}> {
        const config = getTaskConfig(settings, 'text');
        const prompt = `
            Context: Generating a PowerPoint outline for topic "${topic}".
            Task: Create a single slide entry for Slide #${index} out of ${total}.
            Requirements:
            1. Language: Simplified Chinese (简体中文).
            2. Return a JSON object with keys: "title", "brief".
            3. Do NOT wrap in markdown code blocks.
        `;

        try {
            let jsonStr = "";
            if (shouldUseGeminiNative(config, settings)) {
                 const ai = createGoogleClient(config);
                 const response = await ai.models.generateContent({
                    model: config.model,
                    contents: prompt,
                    config: {
                         responseMimeType: "application/json",
                         responseSchema: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                brief: { type: Type.STRING }
                            },
                            required: ["title", "brief"]
                         }
                    }
                });
                jsonStr = response.text?.trim() || "{}";
            } else {
                const messages = [
                    { role: "system", content: "You are a JSON generator. Return only valid JSON object." },
                    { role: "user", content: prompt }
                ];
                jsonStr = await callOpenAICompatible(config, messages, 0.7, true);
                jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
            }
            return JSON.parse(jsonStr);
        } catch (error) {
            console.error("Generate Single Item Error", error);
            throw error;
        }
    },

    async generateSlideDetail(title: string, brief: string, topicContext: string, settings?: AppSettings): Promise<string> {
        const config = getTaskConfig(settings, 'text');
        const prompt = `Topic Context: ${topicContext}
            Slide Title: ${title}
            Slide Intent: ${brief}
            
            Task: Write the full, detailed content for this slide.
            
            Requirements:
            1. Language: Strictly Simplified Chinese (简体中文).
            2. Include bullet points, key arguments, or data placeholders.
            3. Use a professional tone.
            4. Content length: 150-250 words.`;

        try {
            if (shouldUseGeminiNative(config, settings)) {
                 const ai = createGoogleClient(config);
                 const response = await ai.models.generateContent({
                    model: config.model,
                    contents: prompt,
                });
                return response.text?.trim() || "";
            } else {
                 const messages = [{ role: "user", content: prompt }];
                 return await callOpenAICompatible(config, messages);
            }
        } catch (error) {
            console.error("Generate Detail Error", error);
            throw error;
        }
    },

    async generateSlideVariant(
      contentSource: string, // URL or Path
      styleFile: string | null,
      configStyle: StyleConfig,
      variantLabel: string,
      title: string,
      settings: AppSettings,
      contentType: 'text' | 'image',
      contentMimeType?: string
    ): Promise<string> {
        const config = getTaskConfig(settings, 'image');
        const targetRatio = configStyle.aspectRatio || "16:9";

        // Logic for image generation...
        
        if (shouldUseGeminiNative(config, settings)) {
             const ai = createGoogleClient(config);
             const apiRatio = getClosestSupportedRatio(targetRatio);
             const parts: any[] = [];

             if (contentType === 'image') {
                 const base64 = await resourceToBase64(contentSource);
                 // Fallback mime type if not provided, or detect?
                 // resourceToBase64 reads buffer, we can guess. 
                 // For now hardcode or use contentMimeType from Controller if sent.
                 const mime = contentMimeType || 'image/png';
                 parts.push({ inlineData: { mimeType: mime, data: base64 } });
                 parts.push({ text: "Create a presentation slide based on this visual." });
             } else {
                 parts.push({ text: `Create a presentation slide. Title: "${title}". Content: "${contentSource}"` });
             }
             
             if (styleFile) {
                 const styleBase64 = await resourceToBase64(styleFile);
                 parts.push({ inlineData: { mimeType: 'image/png', data: styleBase64 } });
                 parts.push({ text: "Reference this style." });
             }

             // Add global constraints
             parts.push({ text: `Style: ${configStyle.styleName}. Ratio: ${targetRatio}. Language: Simplified Chinese.` });

             const response = await ai.models.generateContent({
                model: config.model,
                contents: { parts },
                generationConfig: {
                    candidateCount: 1, // Gemini 3 supports 1
                    imageConfig: { aspectRatio: apiRatio as any }
                 } 
             } as any);

             const candidate = response.candidates?.[0];
             let imageBase64: string | undefined;
             if (candidate?.content?.parts) {
                 for (const p of candidate.content.parts) {
                     if (p.inlineData && p.inlineData.data) {
                         imageBase64 = p.inlineData.data;
                         break;
                     }
                 }
             }

              if (!imageBase64) return ""; 
              
              // Save to local file system instead of returning Base64
              const base64WithPrefix = `data:image/png;base64,${imageBase64}`;
              const savedUrl = await AssetService.save(base64WithPrefix, 'png');
              console.log(`[generateSlideVariant] Saved Gemini image to: ${savedUrl}`);
              
              return savedUrl;
        } else {
            // OpenAI Image Gen (for local proxies and OpenAI-compatible APIs)
            // Construct text prompt for image generation
            let imagePrompt = `Create a professional presentation slide background. `;
            if (title) imagePrompt += `Title: "${title}". `;
            if (contentType === 'text' && contentSource) {
                // Use first 500 chars of content as context
                const contentPreview = contentSource.substring(0, 500);
                imagePrompt += `Content theme: "${contentPreview}". `;
            }
            if (configStyle.styleName) imagePrompt += `Style: ${configStyle.styleName}. `;
            imagePrompt += `Aspect ratio: ${targetRatio}. High quality, modern design, suitable for presentation.`;
            
            console.log(`[generateSlideVariant] Using OpenAI Image API with prompt length: ${imagePrompt.length}`);
            const base64Result = await callOpenAIImageGeneration(config, imagePrompt, targetRatio);
            
            // Save to local file system
            const savedUrl = await AssetService.save(base64Result, 'png');
            console.log(`[generateSlideVariant] Saved OpenAI image to: ${savedUrl}`);
            
            return savedUrl;
        }
    }
};
