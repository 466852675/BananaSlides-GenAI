
import { GoogleGenAI, Type } from "@google/genai";
import { fileToBase64 } from "../utils";
import { StyleConfig, OutlineItem } from "../types";

// Initialize the API client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = 'gemini-2.5-flash-image';
const TEXT_MODEL_NAME = 'gemini-3-flash-preview'; 

const SUPPORTED_RATIOS = ["1:1", "3:4", "4:3", "9:16", "16:9"];

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

export const extractTextFromFile = async (file: File): Promise<string> => {
    try {
        let contents: any = [];
        if (file.type === 'text/plain' || file.name.endsWith('.md') || file.name.endsWith('.json') || file.name.endsWith('.txt')) {
             return await file.text();
        }
        const base64 = await fileToBase64(file);
        contents = [
            { inlineData: { mimeType: file.type, data: base64 } },
            { text: "Please analyze this file and extract the main content, key topics, and detailed information. Summarize it into a comprehensive text format that can be used to generate a presentation outline. Language: Simplified Chinese (简体中文)." }
        ];
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-09-2025', 
            contents: { parts: contents }
        });
        return response.text?.trim() || "";
    } catch (error) {
        console.error("Extract Text Error:", error);
        throw new Error("Failed to extract content from file.");
    }
};

export const refinePrompt = async (rawText: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: TEXT_MODEL_NAME, 
            contents: `You are an expert presentation consultant. Refine the following user input into a professional, clear, and compelling topic description for a PowerPoint presentation. IMPORTANT: Return the result strictly in Simplified Chinese (简体中文). Keep it concise but descriptive. Input: "${rawText}"`,
        });
        return response.text?.trim() || rawText;
    } catch (error) {
        console.error("Refine Prompt Error:", error);
        return rawText;
    }
};

// Updated: Now accepts config to enforce structure
export const generateOutline = async (topic: string, config?: StyleConfig): Promise<OutlineItem[]> => {
    try {
        let structureInstructions = "";
        let totalPages = 10; // Default fallback

        if (config) {
            totalPages = config.targetPageCount;
            const { cover, directory, transition, content, end } = config.pageStructure;
            
            // Explicitly handle 0 transitions to prevent hallucination
            const transitionInstruction = transition > 0 
                ? `- Next ${transition} slides: Section Transition Pages (scattered appropriately if needed, or grouped)`
                : `- STRICTLY NO 'transition' pages. Do not include any page with pageType='transition'.`;

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

        const response = await ai.models.generateContent({
            model: TEXT_MODEL_NAME,
            contents: `Generate a structured PowerPoint outline for the following topic/content: "${topic}". 
            
            ${structureInstructions}
            
            Requirements:
            1. Language: Simplified Chinese (简体中文).
            2. Return the result as a JSON array.
            `,
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

        const jsonStr = response.text || "[]";
        const parsed = JSON.parse(jsonStr);
        
        return parsed.map((item: any, index: number) => ({
            id: Math.random().toString(36).substr(2, 9),
            index: index + 1,
            title: item.title,
            brief: item.brief,
            pageType: item.pageType || 'content', // Fallback
            status: 'idle'
        }));

    } catch (error) {
        console.error("Generate Outline Error:", error);
        throw new Error("Failed to generate outline.");
    }
};

export const generateSlideDetail = async (title: string, brief: string, topicContext: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: TEXT_MODEL_NAME,
            contents: `Topic Context: ${topicContext}
            Slide Title: ${title}
            Slide Intent: ${brief}
            
            Task: Write the full, detailed content for this slide.
            
            Requirements:
            1. Language: Strictly Simplified Chinese (简体中文).
            2. Include bullet points, key arguments, or data placeholders.
            3. Use a professional tone.
            4. Content length: 150-250 words.`,
        });
        return response.text?.trim() || "";
    } catch (error) {
        console.error("Generate Detail Error:", error);
        throw error;
    }
};

export const generateSlideVariant = async (
  contentSource: File | string, 
  styleFile: File | null,
  config: StyleConfig,
  variantLabel: string,
  title?: string
): Promise<string> => {
  try {
    const parts: any[] = [];
    const targetRatio = config.aspectRatio || "16:9";
    const apiRatio = getClosestSupportedRatio(targetRatio);

    if (contentSource instanceof File) {
      const contentBase64 = await fileToBase64(contentSource);
      parts.push({
        inlineData: {
          mimeType: contentSource.type,
          data: contentBase64,
        },
      });
      parts.push({
        text: `You are an expert presentation designer. Task: Create a high-quality slide based on the visual content.`
      });
    } else {
      let promptText = `You are an expert presentation designer. Task: Create a high-quality slide based on text.`;
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
        - Style: ${config.styleName}
        - Palette: ${config.colorPalette}
        - Ratio: ${targetRatio}
        - Language: Simplified Chinese.
        - Variant: ${variantLabel}
      `
    });

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
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

    if (!imageBase64) throw new Error("No image returned");

    return `data:image/png;base64,${imageBase64}`;

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
