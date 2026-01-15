
export interface AppSettings {
    ai: {
        provider: 'OpenAI' | 'Gemini' | 'Zhipu' | 'SiliconFlow' | 'ModelScope' | 'Custom' | 'CustomCombo';
        baseUrl: string;
        apiKey: string;
        models: {
            text: string;
            image: string;
            vision: string;
        };
        customCombo?: CustomComboConfig;
    };
    docParser: DocParserConfig;
    imageGeneration: {
        resolution: '1024x1024' | '2048x2048' | '4096x4096';
    };
    language: 'zh' | 'ja' | 'en' | 'auto';
}

export interface ModelConnection {
    baseUrl: string;
    apiKey: string;
    model: string;
}

export interface CustomComboConfig {
    text: ModelConnection;
    image: ModelConnection;
    vision: ModelConnection;
}

export interface DocParserConfig {
    provider: 'MinerU' | 'None';
    baseUrl: string;
    apiKey: string;
}

export interface StyleConfig {
  styleName: string;
  colorPalette: string;
  requirements: string;
  aspectRatio: string;
  targetPageCount: number;
  pageStructure: PageStructure;
}

export interface PageStructure {
  cover: number;
  directory: number;
  transition: number;
  content: number;
  end: number;
}

export interface OutlineItem {
    id: string;
    index: number;
    title: string;
    brief: string;
    pageType: 'cover' | 'directory' | 'transition' | 'content' | 'end';
    status: 'idle' | 'generating' | 'success' | 'error';
}

export type StoredResource = string; // In backend, we only deal with Paths or URLs

export type ImageResolution = '1024x1024' | '2048x2048' | '4096x4096';

// --- Frontend-Compatible Types for Snapshot ---
export type PageType = 'cover' | 'directory' | 'transition' | 'content' | 'end' | 'custom';
export type GlobalStyleMap = Record<PageType, StoredResource | null>;

export interface GeneratedSlide {
  id: string;
  contentType: 'image' | 'text';
  pageType: PageType;
  originalFile: StoredResource | null;
  title?: string;
  textContent?: string;
  previewUrl: string;
  variants: string[];
  variantCount: number;
  status: 'idle' | 'generating' | 'success' | 'error';
  errorMessage?: string;
  createdAt: number;
}

export interface ProjectSession {
  id: string;
  title: string;
  displayId?: string;
  lastModified: number;
  createdAt: number;
  status: 'idle' | 'generating' | 'paused' | 'completed' | 'error';
  isPinned?: boolean;
  styleTemplateId?: string;
  methods: string[];
  progress: number;
  items: GeneratedSlide[];
  globalConfig: StyleConfig;
  globalStyleMap?: GlobalStyleMap;
  thumbnailUrl?: string;
}

