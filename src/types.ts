
export type StoredResource = File | string;

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
  defaultVariantCount: number;
  pageStructure: PageStructure;
}

export type PageType = 'cover' | 'directory' | 'transition' | 'content' | 'end' | 'custom';

export type GlobalStyleMap = Record<PageType, StoredResource | null>;

export interface GeneratedSlide {
  id: string;
  contentType: 'image' | 'text';
  pageType: PageType; // New: Identifies the role of the slide
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

export interface GenerationRequest {
  contentImage: StoredResource;
  styleImage: StoredResource | null;
  config: StyleConfig;
}

export interface StylePreset {
  id: string;
  templateId?: string; // 关联的模版 ID
  name: string;
  config: StyleConfig;
  styleMap?: GlobalStyleMap; // Updated to store map
  /** @deprecated use styleMap */
  styleFile?: StoredResource | null;
  sampleImages?: string[];
  createdAt: number;
  templateCreatedAt?: number; // New: Original template creation time
  templateUpdatedAt?: number; // New: Original template update time
}

export type ProjectStatus = 'idle' | 'in-progress' | 'generating' | 'paused' | 'completed' | 'error';
export type ScenarioType = 'ACADEMIC' | 'BUSINESS' | 'CREATIVE';

export interface ProjectSession {
  id: string;
  title: string;
  displayId?: string; // New
  scenarioType?: ScenarioType;
  source?: 'IDE' | 'AGENT'; // Project creation source
  lastModified: number;
  createdAt: number; // Added
  status: ProjectStatus; // Use the enum
  isPinned?: boolean; // New
  styleTemplateId?: string; // New
  methods: string[]; // New: ['text', 'image', 'file'] etc.
  progress: number; // New: 0-100
  items: GeneratedSlide[];
  globalConfig: StyleConfig; // The config used for this project
  globalStyleMap?: GlobalStyleMap;
  thumbnailUrl?: string;
  completedAt?: number; // New: Completion timestamp
}

export interface StyleTemplate {
  id: string;
  name: string;
  config: StyleConfig;
  styleMap?: GlobalStyleMap;
  isCustom: boolean; // System vs User
  createdAt: number;
  // Extended Metadata
  isOfficial?: boolean;
  isRecommended?: boolean;
  usageCount?: number;
  favoriteCount?: number;
  recommendCount?: number;
  updatedAt?: number;
  recommendedAt?: number; // New: Time when recommended
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

export type AIProvider = 'OpenAI' | 'Gemini' | 'Zhipu' | 'SiliconFlow' | 'ModelScope' | 'Volcengine' | 'Custom' | 'CustomCombo';
export type ImageResolution = '1024x1024' | '2048x2048' | '4096x4096' | '1280x720' | '1920x1080' | '3840x2160';
export type OutputLanguage = 'zh' | 'ja' | 'en' | 'auto';

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

export interface EnvPreset {
  baseUrl: string;
  models: {
    text: string;
    image: string;
    vision: string;
  };
}

export interface AppSettings {
  ai: {
    provider: AIProvider;
    baseUrl: string;
    apiKey: string;
    models: {
      text: string;
      image: string;
      vision: string;
    };
    customCombo?: CustomComboConfig;
  };
  docParser: DocParserConfig; // New Field
  imageGeneration: {
    resolution: ImageResolution;
  };
  performance: {
    textConcurrency?: number; // Optional/Unlimited
    imageConcurrency?: number; // Optional/Unlimited
  };
  language: OutputLanguage;
  envPresets?: Record<string, EnvPreset>;
}
