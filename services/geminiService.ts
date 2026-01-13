
import { GoogleGenAI, Type } from "@google/genai";
import { fileToBase64 } from "../utils";
import { StyleConfig, OutlineItem, AppSettings, ModelConnection, ImageResolution, DocParserConfig } from "../types";
import JSZip from 'jszip';
import mammoth from 'mammoth';

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
    if (!cleaned) return 'https://generativelanguage.googleapis.com';
    if (cleaned.endsWith('/')) cleaned = cleaned.slice(0, -1);
    
    // Common proxy suffixes to remove to ensure we hit the root for Native SDK
    // But ONLY if it's clearly a proxy URL. If it's a direct Google URL, we leave it alone.
    if (!cleaned.includes('googleapis.com')) {
        if (cleaned.endsWith('/v1')) return cleaned.slice(0, -3); 
        if (cleaned.endsWith('/openai')) return cleaned.slice(0, -7); 
    }
    
    return cleaned;
};

// Helper to calculate OpenAI compatible size based on resolution preference and aspect ratio
const mapResolutionToSize = (resolution: ImageResolution, ratio: string, model: string): string => {
    // --- STRATEGY: Prioritize Proxy Compatibility (Standard DALL-E 3 Sizes) ---
    // Most OpenAI proxies (OneAPI/NewAPI) only support these specific strings.
    // If we send non-standard 2K strings, they often fallback to 1024x1024 (1:1).
    if (ratio === '16:9') return "1792x1024";
    if (ratio === '9:16') return "1024x1792";
    if (ratio === '1:1') return "1024x1024";
    
    // Fallback logic
    const [rw, rh] = ratio.split(':').map(Number);
    if (rw && rh && rw > rh) return "1792x1024";
    if (rw && rh && rh > rw) return "1024x1792";
    
    return "1024x1024";
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
        
        // --- SMART FALLBACKS ---
        // 1. If Combo specific Key is missing, use the main Global API Key
        if (!connection.apiKey) connection.apiKey = settings.ai.apiKey;
        
        // 2. If Combo specific Base URL is missing, use the main Global Base URL
        if (!connection.baseUrl) connection.baseUrl = settings.ai.baseUrl;
        
        // 3. Last resort fallback for API Key
        if (!connection.apiKey) connection.apiKey = DEFAULT_GEMINI_KEY;
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

    // Runtime Fix: Normalize model names to prevent 404s
    if (connection.model.includes('gemini-3-pro-image-2k-16x9') || connection.model.includes('gemini-3-pro-image-preview')) {
        connection.model = 'gemini-3-pro-image';
    }

    return connection;
};

// Logic to determine if we should use the Native Gemini SDK or OpenAI Compatible Layer
const shouldUseGeminiNative = (config: ModelConnection, settings?: AppSettings): boolean => {
    // 1. Explicitly chosen Gemini provider
    if (settings?.ai.provider === 'Gemini') return true;

    const url = config.baseUrl.toLowerCase().trim();
    const model = config.model.toLowerCase();
    const isGoogleModel = model.includes('gemini') || model.includes('imagen') || model.includes('veo');

    // 2. Explicitly pointing to a Google endpoint with a Google model
    if ((url.includes('googleapis.com') || url.includes('generativelanguage')) && isGoogleModel) return true;

    // 3. For Custom/Combo providers: 
    // If it's NOT a Google model, ALWAYS use OpenAI protocol (e.g. GLM, Qwen, GPT)
    if (!isGoogleModel) return false;

    // 4. If it IS a Google model but the URL looks like an OpenAI proxy:
    const normalizedUrl = url.replace(/\/$/, "");
    if (normalizedUrl.endsWith('/chat/completions') || normalizedUrl.endsWith('/v1')) return false;

    // If it's a Gemini model and URL is just a custom domain (often a direct proxy),
    // we take a best-guess. Native is generally better for Imagen 3.
    return true;
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

    // Normalize URL
    let baseUrl = config.baseUrl.trim();
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
    
    // Append /chat/completions if not already present
    let url = baseUrl;
    if (!url.toLowerCase().endsWith('/chat/completions')) {
        url = `${baseUrl}/chat/completions`;
    }

    // Retry configuration
    const MAX_RETRIES = 5;
    let attempt = 0;
    let delay = 2000; // Start with 2 seconds

    while (true) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            console.warn(`Request to ${url} timed out after 120 seconds. Attempt ${attempt + 1}.`);
            controller.abort();
        }, 120000); // 2 minute timeout

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(body),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

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
    const body: any = {
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

    // Timeout control
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 150000); // 2.5 minute timeout for images

    while (true) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(body),
                signal: controller.signal
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
                clearTimeout(timeoutId);
                throw new Error(`Image API Failed: ${response.status} - ${err}`);
            }

            const data = await response.json();
            clearTimeout(timeoutId);
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

const wrapWithMinerUProxy = (url: string): string => {
    if (url.startsWith('https://mineru.net')) {
        return url.replace('https://mineru.net', '/mineru-proxy');
    }
    if (url.startsWith('https://mineru.oss-cn-shanghai.aliyuncs.com')) {
        return url.replace('https://mineru.oss-cn-shanghai.aliyuncs.com', '/mineru-oss-proxy');
    }
    return url;
};

const extractTextWithMinerU = async (file: File, config: DocParserConfig): Promise<string> => {
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('config', JSON.stringify({
            apiKey: config.apiKey,
            baseUrl: config.baseUrl
        }));

        const response = await fetch('http://localhost:1111/api/doc-parser/parse', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '后端解析失败');
        }

        const data = await response.json();
        return data.markdown;
    } catch (error: any) {
        console.error("MinerU Backend Proxy Error:", error);
        throw error;
    }
};

export const extractTextFromFile = async (file: File, settings?: AppSettings): Promise<string> => {
    // 0. Priority: Check if MinerU is configured for PDF
    if (file.type === 'application/pdf' && settings?.docParser?.apiKey) {
        try {
            return await extractTextWithMinerU(file, settings.docParser);
        } catch (e: any) {
            console.error("MinerU profound failure:", e);
            // Log full error for debugging
            if (e instanceof Error) {
                console.error("Error name:", e.name);
                console.error("Error message:", e.message);
                console.error("Error stack:", e.stack);
            }
            throw new Error(`MinerU 解析失败: ${e.message || e}`);
        }
    }

    const config = getTaskConfig(settings, 'vision');

    try {
        // Debug: Log file info
        console.log('[File Extract] File info:', { name: file.name, type: file.type, size: file.size });
        
        if (file.type === 'text/plain' || file.name.endsWith('.md') || file.name.endsWith('.json') || file.name.endsWith('.txt')) {
             const textContent = await file.text();
             console.log('[File Extract] Text file content length:', textContent.length);
             return textContent;
        }

        // Word Document (.doc, .docx) - Use mammoth to extract text
        if (file.name.endsWith('.docx') || file.name.endsWith('.doc') || 
            file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            file.type === 'application/msword') {
            try {
                const arrayBuffer = await file.arrayBuffer();
                const result = await mammoth.extractRawText({ arrayBuffer });
                if (result.value && result.value.trim()) {
                    console.log('[Word Extraction] Successfully extracted text from Word document');
                    return result.value;
                }
                // If mammoth fails to extract meaningful text, fall through to AI
                console.warn('[Word Extraction] Mammoth returned empty, falling back to AI...');
            } catch (mammothError) {
                console.warn('[Word Extraction] Mammoth failed:', mammothError);
                // Fall through to AI-based extraction
            }
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
             // CRITICAL: OpenAI Chat Completions API does NOT support PDF files in image_url.
             // It only supports: png, jpeg, gif, webp.
             if (file.type === 'application/pdf') {
                 throw new Error("OpenAI 兼容模式不支持直接读取 PDF。请在全局设置中配置 MinerU 文档解析服务，或切换至 Gemini Native 模式。");
             }

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
    } catch (error: any) {
        console.error("Extract Text Error Detail:", error);
        // Pass the specific error message up
        if (error.message && error.message.includes("OpenAI")) {
            throw error;
        }
        throw new Error("Failed to extract content from file. 请检查控制台日志 (F12) 获取详细错误。");
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
        throw error; // Throw so UI can handle failure
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
                ### GLOBAL VISUAL STYLE (Framework Only)
                - Style Description: ${configStyle.styleName}
                - Color Palette: ${configStyle.colorPalette}
                - Global Design Requirements: ${configStyle.requirements || "Professional and clean"}
                
                ### SLIDE-SPECIFIC CONTENT (Primary Information Source)
                - SLIDE TITLE: "${title || 'Untitled'}"
                - SLIDE BODY CONTENT: "${contentSource}"
                
                ### MANDATORY DESIGN INSTRUCTIONS
                - Ratio: ${targetRatio} (MANDATORY). Use horizontal landscape for 16:9.
                - Resolution: High Definition detail.
                - Content Strategy: DO NOT try to render long paragraphs. ONLY render the TITLE and key BULLET POINTS from the content as legible text. Use clean icons and abstract graphics to represent details.
                - Chinese Typography: Render only core text (Title/Keywords) with professional, crisp fonts. Ensure NO garbled characters.
                - Language: Simplified Chinese (简体中文).
                - Variant Label: ${variantLabel}
            `
        });

        const response = await ai.models.generateContent({
            model: config.model || 'gemini-3-pro-image',
            contents: { parts: parts },
            generationConfig: { 
                aspectRatio: apiRatio as any, // Multi-level redundancy for proxies
                imageConfig: { aspectRatio: apiRatio as any }
            }
        } as any); // Cast because of varying SDK property names in different versions

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
        // Construct a highly structured prompt to separate Style vs Content
        let ratioDesc = "";
        if (targetRatio === '16:9') ratioDesc = "WIDE SCREEN 16:9 aspect ratio. HD Landscape.";
        else if (targetRatio === '9:16') ratioDesc = "VERTICAL 9:16 aspect ratio. Portrait.";
        else ratioDesc = `Aspect ratio: ${targetRatio}.`;

        let fullPrompt = `Task: Create a professional PowerPoint slide visual.
            
            [SECTION 1: GLOBAL VISUAL STYLE]
            - Style Theme: ${configStyle.styleName}
            - Color Palette: ${configStyle.colorPalette}
            - Visual Requirements: ${configStyle.requirements || "Clean, high-end, professional design."}
            - Aspect Ratio: ${ratioDesc}
            
            [SECTION 2: SLIDE-SPECIFIC INFORMATION (MANDATORY CONTENT)]
            - TITLE TO DISPLAY: "${title || 'Main Topic'}"
            - CORE CONTENT/DATA: "${contentSource}"
            
            [SECTION 3: EXECUTION RULES]
            - Visual Style: Clean Corporate Presentation.
            - Legibility Priority: Render Slide TITLE and KEY HEADINGS only. Do not attempt to fit dense body text into the image; represent details with professional infographics.
            - Aspect Ratio: MANDATORY ${targetRatio} ASPECT RATIO.
            - Chinese Rendering: Professional typography for keywords. No distortion.
            - Language: Simplified Chinese (简体中文).
        `;
        
        if (styleFile) {
            fullPrompt += `\n[NOTE: Reference the style and layout from the user's provided sample image while prioritizing the specific text content.]`;
        }

        const rawRes = settings?.imageGeneration.resolution || "1024x1024";
        const calculatedSize = mapResolutionToSize(rawRes, targetRatio, config.model);
        
        console.log(`[ImageGen] Requesting size: ${calculatedSize}, Ratio: ${targetRatio}, Model: ${config.model} via OpenAI Protocol`);
        
        return await callOpenAIImageGeneration(config, fullPrompt, calculatedSize);
    }

  } catch (error) {
    console.error("API Generation Error:", error);
    throw error;
  }
};
