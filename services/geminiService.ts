
import { GoogleGenAI, Type } from "@google/genai";
import { fileToBase64 } from "../utils";
import { StyleConfig, OutlineItem, AppSettings, ModelConnection } from "../types";

// Default Fallback
const DEFAULT_GEMINI_KEY = process.env.API_KEY || '';

const SUPPORTED_RATIOS = ["1:1", "3:4", "4:3", "9:16", "16:9"];

// --- Helpers ---

const getClosestSupportedRatio = (inputRatio: string): string => {
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

// Helper to sanitize Base URL for Google Native SDK
// The SDK automatically appends /v1beta/models/..., so we must remove OpenAI-specific suffixes like /v1
const cleanBaseUrlForGoogle = (url: string): string => {
    let cleaned = url.trim();
    if (cleaned.endsWith('/')) cleaned = cleaned.slice(0, -1);
    
    // Common proxy suffixes to remove to ensure we hit the root for Native SDK
    if (cleaned.endsWith('/v1')) return cleaned.slice(0, -3); 
    if (cleaned.endsWith('/openai')) return cleaned.slice(0, -7); 
    
    return cleaned;
};

// Helper to create the Google GenAI Client with correct headers for Proxies
const createGoogleClient = (config: ModelConnection) => {
    const cleanUrl = cleanBaseUrlForGoogle(config.baseUrl);
    const isCustomProxy = !cleanUrl.includes('googleapis.com') && !cleanUrl.includes('generativelanguage');

    const options: any = {
        apiKey: config.apiKey,
        baseUrl: cleanUrl
    };

    // Critical Fix: Many proxies (OneAPI, etc.) require Authorization: Bearer header
    // even when handling Google Native Protocol requests. The SDK only sends x-goog-api-key by default.
    if (isCustomProxy) {
        options.customHeaders = {
            'Authorization': `Bearer ${config.apiKey}`,
            'X-Goog-Api-Key': config.apiKey // Redundant but safe for some proxies
        };
    }

    return new GoogleGenAI(options);
};

// Helper to get specific task configuration (Text, Image, Vision)
const getTaskConfig = (settings: AppSettings | undefined, task: 'text' | 'image' | 'vision'): ModelConnection => {
    // If no settings provided, use defaults hardcoded
    if (!settings) {
        return {
            apiKey: DEFAULT_GEMINI_KEY,
            baseUrl: 'https://generativelanguage.googleapis.com',
            model: 'gemini-3-pro-preview'
        };
    }

    let connection: ModelConnection;

    // Handle Custom Combo
    if (settings.ai.provider === 'CustomCombo' && settings.ai.customCombo) {
        connection = { ...settings.ai.customCombo[task] };
    } else {
        // Handle Standard Providers
        let apiKey = settings.ai.apiKey;
        const baseUrl = settings.ai.baseUrl;
        const model = settings.ai.models[task];

        // CRITICAL: If Provider is Gemini and apiKey is empty, fallback to the environment Key (Developer Key)
        if (settings.ai.provider === 'Gemini' && !apiKey) {
            apiKey = DEFAULT_GEMINI_KEY;
        }

        connection = { apiKey, baseUrl, model };
    }

    // Runtime Fix: Correct known bad model names (e.g. from old defaults) to prevent 404s
    if (connection.model === 'gemini-3-pro-image-2k-16x9') {
        connection.model = 'gemini-3-pro-image-preview';
    }

    return connection;
};

// Logic to determine if we should use the Native Gemini SDK or OpenAI Compatible Layer
const shouldUseGeminiNative = (config: ModelConnection, settings?: AppSettings): boolean => {
    // 1. If explicit provider is Gemini, ALWAYS use Native SDK (supports proxy via baseUrl)
    if (settings?.ai.provider === 'Gemini') return true;

    // 2. Check for URL patterns (Standard Google URLs)
    const url = config.baseUrl.toLowerCase();
    if (url.includes('googleapis.com') || url.includes('generativelanguage')) return true;

    // 3. Check for Model Name patterns (Heuristic for Custom/Combo using Gemini models via Proxy)
    // This ensures that if a user sets 'gemini-3-pro' in Custom Combo with a local proxy, 
    // we still use the Native SDK features (like Reference Images).
    const model = config.model.toLowerCase();
    return model.includes('gemini') || model.includes('veo') || model.includes('imagen');
};

// --- Generic OpenAI Compatible Caller ---
async function callOpenAICompatible(
    config: ModelConnection, 
    messages: any[], 
    temperature: number = 0.7,
    jsonMode: boolean = false
): Promise<string> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    
    // Only add Authorization if Key is present (supports local LLMs without auth)
    if (config.apiKey) {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    const body: any = {
        model: config.model,
        messages: messages,
        temperature: temperature,
        max_tokens: 4096
    };

    if (jsonMode) {
        body.response_format = { type: "json_object" };
    }

    // Remove trailing slash if exists
    const baseUrl = config.baseUrl.endsWith('/') ? config.baseUrl.slice(0, -1) : config.baseUrl;
    const url = `${baseUrl}/chat/completions`;

    // Retry configuration
    const MAX_RETRIES = 5;
    let attempt = 0;
    let delay = 2000; // Start with 2 seconds

    while (true) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const err = await response.text();
                
                // Check for Rate Limit (429) or Specific Provider Concurrency Error (1302 for Zhipu)
                const isRateLimit = response.status === 429 || err.includes('1302') || err.includes('并发');

                if (isRateLimit && attempt < MAX_RETRIES) {
                    console.warn(`Rate limit hit for ${url}. Retrying in ${delay}ms... (Attempt ${attempt + 1})`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= 2; // Exponential backoff
                    attempt++;
                    continue;
                }

                console.error(`API Call failed to ${url}`, err);
                throw new Error(`API Request Failed: ${response.status} - ${err}`);
            }

            const data = await response.json();
            return data.choices[0]?.message?.content || "";
        } catch (error: any) {
             // If we exhausted retries or caught a non-retriable error (handled above), rethrow.
             throw error;
        }
    }
}

// --- Image Generation Caller (OpenAI Compatible) ---
async function callOpenAIImageGeneration(
    config: ModelConnection,
    prompt: string,
    resolution: string = "1024x1024"
): Promise<string> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    // Only add Authorization if Key is present
    if (config.apiKey) {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    const baseUrl = config.baseUrl.endsWith('/') ? config.baseUrl.slice(0, -1) : config.baseUrl;
    const url = `${baseUrl}/images/generations`;

    // Map strict resolution enums if needed, or pass through
    const body = {
        model: config.model,
        prompt: prompt,
        n: 1,
        size: resolution,
        response_format: "b64_json" 
    };

    // Retry configuration
    const MAX_RETRIES = 3;
    let attempt = 0;
    let delay = 3000;

    while (true) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const err = await response.text();
                
                const isRateLimit = response.status === 429 || err.includes('1302') || err.includes('并发');

                if (isRateLimit && attempt < MAX_RETRIES) {
                    console.warn(`Rate limit hit for ${url}. Retrying in ${delay}ms... (Attempt ${attempt + 1})`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= 2;
                    attempt++;
                    continue;
                }

                console.error(`Image API Call failed to ${url}`, err);
                throw new Error(`Image API Failed: ${response.status} - ${err}`);
            }

            const data = await response.json();
            const b64 = data.data[0]?.b64_json;
            if (b64) return `data:image/png;base64,${b64}`;
            const urlResult = data.data[0]?.url;
            return urlResult || "";
        } catch (error) {
            throw error;
        }
    }
}

// --- Exports ---

export const smartRefine = async (text: string, type: 'requirement' | 'content', settings?: AppSettings): Promise<string> => {
    const config = getTaskConfig(settings, 'text');
    let contextPrompt = "";
    
    if (type === 'requirement') {
        contextPrompt = "Refine the following design requirements for a presentation. Make them clear, professional, specific, and actionable for a design AI. Maintain the original intent but improve clarity and terminology.";
    } else {
        contextPrompt = "Refine the following presentation slide content. Make it concise, professional, impactful, and suitable for a slide (use bullet points or punchy text if applicable). Maintain the original meaning.";
    }

    const prompt = `Task: ${contextPrompt}
    
    Input Text: "${text}"
    
    Requirement: Return ONLY the refined text in Simplified Chinese (简体中文). Do not add explanations or conversational filler.`;

    try {
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
    } catch (error) {
        console.error("Smart Refine Error:", error);
        throw error;
    }
};

export const extractTextFromFile = async (file: File, settings?: AppSettings): Promise<string> => {
    const config = getTaskConfig(settings, 'vision');

    try {
        if (file.type === 'text/plain' || file.name.endsWith('.md') || file.name.endsWith('.json') || file.name.endsWith('.txt')) {
             return await file.text();
        }

        // Gemini Native Flow
        if (shouldUseGeminiNative(config, settings)) {
            const ai = createGoogleClient(config);
            const base64 = await fileToBase64(file);
            const contents = [
                { inlineData: { mimeType: file.type, data: base64 } },
                { text: "Please analyze this file and extract the main content, key topics, and detailed information. Summarize it into a comprehensive text format that can be used to generate a presentation outline. Language: Simplified Chinese (简体中文)." }
            ];
            const response = await ai.models.generateContent({
                model: config.model || 'gemini-3-pro-preview', 
                contents: { parts: contents }
            });
            return response.text?.trim() || "";
        } 
        // OpenAI Compatible Flow (Vision)
        else {
             const base64 = await fileToBase64(file);
             const messages = [
                 {
                     role: "user",
                     content: [
                         { type: "text", text: "Please analyze this image/file and extract the main content, key topics, and detailed information. Summarize it into a comprehensive text format. Language: Simplified Chinese." },
                         { type: "image_url", image_url: { url: `data:${file.type};base64,${base64}` } }
                     ]
                 }
             ];
             return await callOpenAICompatible(config, messages);
        }
    } catch (error) {
        console.error("Extract Text Error:", error);
        throw new Error("Failed to extract content from file.");
    }
};

export const refinePrompt = async (rawText: string, settings?: AppSettings): Promise<string> => {
    const config = getTaskConfig(settings, 'text');
    const prompt = `You are an expert presentation consultant. Refine the following user input into a professional, clear, and compelling topic description for a PowerPoint presentation. IMPORTANT: Return the result strictly in Simplified Chinese (简体中文). Keep it concise but descriptive. Input: "${rawText}"`;

    try {
        if (shouldUseGeminiNative(config, settings)) {
            const ai = createGoogleClient(config);
            const response = await ai.models.generateContent({
                model: config.model, 
                contents: prompt,
            });
            return response.text?.trim() || rawText;
        } else {
            const messages = [{ role: "user", content: prompt }];
            return await callOpenAICompatible(config, messages);
        }
    } catch (error) {
        console.error("Refine Prompt Error:", error);
        return rawText;
    }
};

export const generateOutline = async (topic: string, configStyle?: StyleConfig, settings?: AppSettings): Promise<OutlineItem[]> => {
    const config = getTaskConfig(settings, 'text');
    
    try {
        let structureInstructions = "";
        let totalPages = 10; 

        if (configStyle) {
            totalPages = configStyle.targetPageCount;
            const { cover, directory, transition, content, end } = configStyle.pageStructure;
            
            const transitionInstruction = transition > 0 
                ? `- Next ${transition} slides: Section Transition Pages (scattered appropriately)`
                : `- STRICTLY NO 'transition' pages.`;

            structureInstructions = `
            The outline MUST strictly follow this structure and page count (Total: ${totalPages}):
            - 1st Slide: Cover Page (${cover} page)
            - 2nd Slide: Directory/Agenda Page (${directory} page)
            ${transitionInstruction}
            - Next ${content} slides: Core Content Pages (The meat of the presentation)
            - Last Slide: Ending/Thank You Page (${end} page)
            
            IMPORTANT: Return exactly ${totalPages} items in the array.
            Assign the correct 'pageType' to each item: 'cover', 'directory', 'transition', 'content', or 'end'.
            `;
        }

        const prompt = `Generate a structured PowerPoint outline for the following topic/content: "${topic}". 
            
            ${structureInstructions}
            
            Requirements:
            1. Language: Simplified Chinese (简体中文).
            2. Return the result as a valid JSON array of objects.
            3. Each object keys: "title", "brief", "pageType".
            4. Do NOT wrap in markdown code blocks like \`\`\`json. Return raw JSON.
            `;

        let jsonStr = "";

        if (shouldUseGeminiNative(config, settings)) {
             const ai = createGoogleClient(config);
             const response = await ai.models.generateContent({
                model: config.model,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                brief: { type: Type.STRING },
                                pageType: { type: Type.STRING, enum: ['cover', 'directory', 'transition', 'content', 'end'] }
                            },
                            required: ["title", "brief", "pageType"]
                        }
                    }
                }
            });
            jsonStr = response.text || "[]";
        } else {
            // OpenAI Compatible
            const messages = [
                { role: "system", content: "You are a JSON generator. Return only valid JSON arrays." },
                { role: "user", content: prompt }
            ];
            const raw = await callOpenAICompatible(config, messages, 0.7, true); // Use JSON mode if possible
            // Cleanup markdown if present
            jsonStr = raw.replace(/```json/g, '').replace(/```/g, '').trim();
        }

        const parsed = JSON.parse(jsonStr);
        
        return parsed.map((item: any, index: number) => ({
            id: Math.random().toString(36).substr(2, 9),
            index: index + 1,
            title: item.title,
            brief: item.brief,
            pageType: item.pageType || 'content', 
            status: 'idle'
        }));

    } catch (error) {
        console.error("Generate Outline Error:", error);
        throw new Error("Failed to generate outline.");
    }
};

export const generateSingleOutlineItem = async (topic: string, index: number, total: number, settings?: AppSettings): Promise<{title: string, brief: string}> => {
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
            jsonStr = response.text || "{}";
        } else {
            const messages = [
                { role: "system", content: "You are a JSON generator. Return only valid JSON object." },
                { role: "user", content: prompt }
            ];
            const raw = await callOpenAICompatible(config, messages, 0.7, true);
            jsonStr = raw.replace(/```json/g, '').replace(/```/g, '').trim();
        }
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("Generate Single Outline Item Error:", error);
        throw error;
    }
};

export const generateSlideDetail = async (title: string, brief: string, topicContext: string, settings?: AppSettings): Promise<string> => {
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
        console.error("Generate Detail Error:", error);
        throw error;
    }
};

export const generateSlideVariant = async (
  contentSource: File | string, 
  styleFile: File | null,
  configStyle: StyleConfig,
  variantLabel: string,
  title?: string,
  settings?: AppSettings
): Promise<string> => {
  const config = getTaskConfig(settings, 'image');
  const targetRatio = configStyle.aspectRatio || "16:9";
  
  try {
    // 1. Gemini Native Image Gen (Nano Banana Style with Style Ref)
    if (shouldUseGeminiNative(config, settings)) {
        const ai = createGoogleClient(config);
        const apiRatio = getClosestSupportedRatio(targetRatio);
        const parts: any[] = [];

        if (contentSource instanceof File) {
            const contentBase64 = await fileToBase64(contentSource);
            parts.push({
                inlineData: { mimeType: contentSource.type, data: contentBase64 },
            });
            parts.push({ text: `Task: Create a high-quality presentation slide based on this visual content.` });
        } else {
            let promptText = `Task: Create a high-quality presentation slide based on text.`;
            if (title) promptText += `\n\nTITLE: "${title}"`;
            promptText += `\n\nCONTENT:\n"${contentSource}"`;
            parts.push({ text: promptText });
        }

        if (styleFile) {
            const styleBase64 = await fileToBase64(styleFile);
            parts.push({ inlineData: { mimeType: styleFile.type, data: styleBase64 } });
            parts.push({ text: "Reference this image style." });
        }

        parts.push({
            text: `
                Design Instructions:
                - Style: ${configStyle.styleName}
                - Palette: ${configStyle.colorPalette}
                - Ratio: ${targetRatio}
                - Language: Simplified Chinese.
                - Variant: ${variantLabel}
            `
        });

        const response = await ai.models.generateContent({
            model: config.model || 'gemini-3-pro-image',
            contents: { parts: parts },
            config: { imageConfig: { aspectRatio: apiRatio as any } }
        });

        const candidates = response.candidates;
        if (!candidates || candidates.length === 0) throw new Error("No response");

        const contentParts = candidates[0].content.parts;
        let imageBase64: string | undefined;

        for (const part of contentParts) {
            if (part.inlineData && part.inlineData.data) {
                imageBase64 = part.inlineData.data;
                break;
            }
        }

        if (!imageBase64) throw new Error("No image returned from Gemini");
        return `data:image/png;base64,${imageBase64}`;
    } 
    
    // 2. OpenAI / Compatible Image Gen (DALL-E 3 Style)
    else {
        // Construct a rich text prompt because standard DALL-E 3 doesn't support input images for style ref easily via standard API yet
        let fullPrompt = `Create a professional presentation slide. Ratio: ${targetRatio}. Style: ${configStyle.styleName}. Color Palette: ${configStyle.colorPalette}. `;
        
        if (title) fullPrompt += `Slide Title: "${title}". `;
        
        if (typeof contentSource === 'string') {
            fullPrompt += `Content to visualize: "${contentSource}". `;
        } else {
             fullPrompt += `Content is visually implied (Abstract representation). `;
        }

        if (styleFile) {
            fullPrompt += `(Note: User provided a style reference image, but current API only supports text description. Aim for the defined style).`;
        }

        const resolution = settings?.imageGeneration.resolution || "1024x1024";
        return await callOpenAIImageGeneration(config, fullPrompt, resolution);
    }

  } catch (error) {
    console.error("API Generation Error:", error);
    throw error;
  }
};
