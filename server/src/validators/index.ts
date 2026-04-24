import { z } from 'zod';

// ==================== AI Controller Schemas ====================

export const SmartRefineSchema = z.object({
    text: z.string().min(1, "文本不能为空").max(50000, "文本过长"),
    type: z.enum(['requirement', 'content'])
});

export const ExtractTextSchema = z.object({
    resourcePath: z.string().min(1, "资源路径不能为空"),
    fileType: z.string().optional()
});

export const GenerateOutlineSchema = z.object({
    topic: z.string().min(1, "主题不能为空").max(10000),
    configStyle: z.object({
        styleName: z.string().optional(),
        colorPalette: z.string().optional(),
        requirements: z.string().optional(),
        aspectRatio: z.string().optional(),
        defaultVariantCount: z.number().optional(),
        targetPageCount: z.number().optional(),
        pageStructure: z.object({
            cover: z.number(),
            directory: z.number(),
            transition: z.number(),
            content: z.number(),
            end: z.number()
        }).optional()
    }).optional()
});

export const GenerateSingleOutlineItemSchema = z.object({
    topic: z.string().min(1),
    index: z.number().int().min(0),
    total: z.number().int().min(1)
});

export const GenerateSlideDetailSchema = z.object({
    title: z.string().min(1),
    brief: z.string(),
    topicContext: z.string().optional()
});

export const GenerateSlideVariantSchema = z.object({
    contentSource: z.string().min(1, "内容来源不能为空"),
    styleFile: z.string().nullable().optional(),
    configStyle: z.object({
        styleName: z.string().optional(),
        colorPalette: z.string().optional(),
        requirements: z.string().optional(),
        aspectRatio: z.string().optional()
    }).passthrough().optional(),
    variantLabel: z.string(),
    title: z.string().optional(),
    contentType: z.enum(['text', 'image']).default('text'),
    contentMimeType: z.string().optional(),
    pageType: z.string().optional()
});

// ==================== Project Controller Schemas ====================

export const CreateProjectSchema = z.object({
    title: z.string().min(1, "项目标题不能为空").max(200),
    status: z.string().optional(),
    isPinned: z.boolean().optional(),
    // 前端会将 globalConfig 和 styleMap 序列化为 JSON 字符串
    globalConfig: z.union([z.string(), z.object({}).passthrough()]).optional(),
    styleMap: z.union([z.string(), z.object({}).passthrough()]).optional(),
    items: z.array(z.object({}).passthrough()).optional(),
    thumbnailUrl: z.string().optional()
});

export const UpdateProjectSchema = z.object({
    title: z.string().max(200).optional(),
    status: z.string().optional(),
    isPinned: z.boolean().optional(),
    // 前端会将 globalConfig 和 styleMap 序列化为 JSON 字符串
    globalConfig: z.union([z.string(), z.object({}).passthrough()]).optional(),
    styleMap: z.union([z.string(), z.object({}).passthrough()]).optional(),
    items: z.array(z.object({}).passthrough()).optional(),
    thumbnailUrl: z.string().optional()
});

// SyncSlidesSchema 使用宽松验证以兼容前端序列化后的数据格式
export const SyncSlidesSchema = z.object({
    slides: z.array(z.object({
        id: z.string(),
        pageType: z.string().optional(),
        contentType: z.enum(['text', 'image']).optional(),
        title: z.string().optional().nullable(),
        textContent: z.string().optional().nullable(),
        originalFile: z.any().optional().nullable(),
        previewUrl: z.string().optional().nullable(),
        variants: z.any().optional(), // 可能是 string[] 或 JSON 字符串
        variantCount: z.number().optional(),
        status: z.string().optional(),
        errorMessage: z.string().optional().nullable(),
        createdAt: z.number().optional()
    }).passthrough()) // 允许额外字段
});

// ==================== Template Controller Schemas ====================

export const SaveTemplateSchema = z.object({
    name: z.string().min(1, "模板名称不能为空").max(100),
    config: z.object({}).passthrough(),
    styleMap: z.object({}).passthrough().optional(),
    isCustom: z.boolean().optional()
});

// ==================== Favorite Controller Schemas ====================

export const AddFavoriteSchema = z.object({
    name: z.string().min(1, "名称不能为空").max(100),
    config: z.object({}).passthrough(),
    styleMap: z.object({}).passthrough().optional(),
    sampleImages: z.array(z.string()).optional()
});

// ==================== Settings Controller Schemas ====================

export const UpdateSettingsSchema = z.object({
    config: z.object({}).passthrough()
});

// ==================== Snapshot Controller Schemas ====================

export const CreateSnapshotSchema = z.object({
    projectData: z.object({}).passthrough(),
    settings: z.object({}).passthrough().optional()
});

// ==================== Agent Controller Schemas ====================

export const agentSchemas = {
  createSession: z.object({
    projectId: z.string().min(1, '项目ID不能为空'),
    mode: z.enum(['GUIDED', 'AUTO']).optional().default('GUIDED')
  }),

  sendMessage: z.object({
    content: z.string().min(1, '消息内容不能为空').max(10000, '消息内容过长'),
    autoExecute: z.boolean().optional().default(false)
  }),

  createTask: z.object({
    type: z.enum([
      'CONFIG_CONFIRM', 'OUTLINE', 'CONTENT', 'IMAGE', 'IMAGE_BY_PAGE',
      'MODIFY', 'STYLE', 'EXPORT', 'IMPORT', 'SNAPSHOT',
      'FINAL_OVERVIEW'
    ] as const, { message: '无效的任务类型' }),
    params: z.record(z.string(), z.unknown()).optional()
  }),

  modifyTask: z.object({
    params: z.record(z.string(), z.unknown())
  }),

  updateMode: z.object({
    mode: z.enum(['GUIDED', 'AUTO'], { message: '模式必须是 GUIDED 或 AUTO' })
  })
};
