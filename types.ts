
export interface PageStructure {
  cover: number;      // Fixed 1 usually
  directory: number;  // Fixed 1 usually
  transition: number; // User adjustable
  content: number;    // User adjustable
  end: number;        // Fixed 1 usually
}

export interface StyleConfig {
  styleName: string;
  colorPalette: string;
  requirements: string;
  aspectRatio: string;
  // New: Page Planning
  targetPageCount: number;
  pageStructure: PageStructure;
}

export type PageType = 'cover' | 'directory' | 'transition' | 'content' | 'end' | 'custom';

export type GlobalStyleMap = Record<PageType, File | null>;

export interface GeneratedSlide {
  id: string;
  contentType: 'image' | 'text';
  pageType: PageType; // New: Identifies the role of the slide
  originalFile: File | null;
  title?: string;
  textContent?: string;
  previewUrl: string;
  variants: string[];
  variantCount: number;
  status: 'idle' | 'generating' | 'success' | 'error';
  errorMessage?: string;
  createdAt: number;
}

export interface GenerationRequest {
  contentImage: File;
  styleImage: File | null;
  config: StyleConfig;
}

export interface StylePreset {
  id: string;
  name: string;
  config: StyleConfig;
  styleMap?: GlobalStyleMap; // Updated to store map
  /** @deprecated use styleMap */
  styleFile?: File | null; 
  sampleImages?: string[]; 
  createdAt: number;
}

export interface ProjectSession {
  id: string;
  title: string;
  pageCount: number;
  lastModified: number;
  status: 'completed' | 'generating' | 'not-started';
  items: GeneratedSlide[];
  globalConfig: StyleConfig;
  globalStyleMap?: GlobalStyleMap; // Updated
  /** @deprecated use globalStyleMap */
  globalStyleFiles?: File[];
  thumbnailUrl?: string;
}

export interface OutlineItem {
    id: string;
    index: number;
    title: string;
    brief: string;
    fullContent?: string;
    pageType: PageType; // New: Sync with generated slide type
    status: 'idle' | 'generating' | 'success' | 'error';
}

// --- New Settings Types ---

export type AIProvider = 'OpenAI' | 'Gemini' | 'Zhipu' | 'SiliconFlow' | 'ModelScope' | 'Custom' | 'CustomCombo';
export type ImageResolution = '1024x1024' | '2048x2048' | '4096x4096';
export type OutputLanguage = 'zh' | 'ja' | 'en' | 'auto';

export interface AppSettings {
    ai: {
        provider: AIProvider;
        baseUrl: string;
        apiKey: string;
        models: {
            text: string;
            image: string;
            vision: string;
        }
    };
    imageGeneration: {
        resolution: ImageResolution;
    };
    performance: {
        textConcurrency: number;
        imageConcurrency: number;
    };
    language: OutputLanguage;
}
