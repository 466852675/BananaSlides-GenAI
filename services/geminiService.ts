
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

// Helper to get specific task configuration (Text, Image, Vision)
const getTaskConfig = (settings: AppSettings | undefined, task: 'text' | 'image' | 'vision'): ModelConnection => {
    // If no settings provided, use defaults hardcoded
    if (!settings) {
        return {
            apiKey: DEFAULT_GEMINI_KEY,
            baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
            model: 'gemini-3-pro-preview'
        };
    }

    // Handle Custom Combo
    if (settings.ai.provider === 'CustomCombo' && settings.ai.customCombo) {
        return settings.ai.customCombo[task];
    }

    // Handle Standard Providers
    let apiKey = settings.ai.apiKey;
    const baseUrl = settings.ai.baseUrl;
    const model = settings.ai.models[task];

    // CRITICAL: If Provider is Gemini and apiKey is empty, fallback to the environment Key (Developer Key)
    if (settings.ai.provider === 'Gemini' && !apiKey) {
        apiKey = DEFAULT_GEMINI_KEY;
    }

    return {
        apiKey,
        baseUrl,
        model
    };
};

const isGeminiProvider = (baseUrl: string): boolean => {
    return baseUrl.includes('googleapis.com') || baseUrl.includes('generativelanguage');
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

    const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const err = await response.text();
        console.error(`API Call failed to ${url}`, err);
        throw new Error(`API Request Failed: ${response.status} - ${err}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "";
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

    const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const err = await response.text();
        console.error(`Image API Call failed to ${url}`, err);
        throw new Error(`Image API Failed: ${response.status} - ${err}`);
    }

    const data = await response.json();
    const b64 = data.data[0]?.b64_json;
    if (b64) return `data:image/png;base64,${b64}`;
    const urlResult = data.data[0]?.url;
    // Note: If it returns a URL, we might need to proxy it or display it directly. 
    // For local dev, URL is fine. For b64, it's safer for canvas/editing.
    return urlResult || "";
}

// --- Exports ---

export const extractTextFromFile = async (file: File, settings?: AppSettings): Promise<string> => {
    const config = getTaskConfig(settings, 'vision');

    try {
        if (file.type === 'text/plain' || file.name.endsWith('.md') || file.name.endsWith('.json') || file.name.endsWith('.txt')) {
             return await file.text();
        }

        // Gemini Native Flow
        if (isGeminiProvider(config.baseUrl)) {
            const ai = new GoogleGenAI({ apiKey: config.apiKey });
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
        if (isGeminiProvider(config.baseUrl)) {
            const ai = new GoogleGenAI({ apiKey: config.apiKey });
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

        if (isGeminiProvider(config.baseUrl)) {
             const ai = new GoogleGenAI({ apiKey: config.apiKey });
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
        if (isGeminiProvider(config.baseUrl)) {
             const ai = new GoogleGenAI({ apiKey: config.apiKey });
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
    if (isGeminiProvider(config.baseUrl)) {
        const ai = new GoogleGenAI({ apiKey: config.apiKey });
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
            model: config.model || 'gemini-2.5-flash-image',
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
