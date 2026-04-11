/**
 * Agent 模块类型定义
 *
 * 包含 Agent 会话、消息、任务相关的类型定义
 */

import {
  AgentSession,
  AgentMessage,
  AgentTask
} from '@prisma/client';
import {
  AgentSessionStatus,
  AgentMode,
  AgentTaskType,
  AgentTaskStatus,
  AgentSessionStatusType,
  AgentModeType,
  AgentTaskTypeType,
  AgentTaskStatusType
} from './user.types';

// ============================================================
// 枚举重导出
// ============================================================

export {
  AgentSessionStatus,
  AgentMode,
  AgentTaskType,
  AgentTaskStatus,
  AgentSessionStatusType,
  AgentModeType,
  AgentTaskTypeType,
  AgentTaskStatusType
};

// ============================================================
// 工具定义
// ============================================================

export interface AgentTool {
  name: string;
  description: string;
  parameters?: AgentToolParameter[];
  pointsCost?: number;
}

export interface AgentToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required?: boolean;
}

// 预定义的工具列表
export const AGENT_TOOLS: AgentTool[] = [
  {
    name: 'OUTLINE',
    description: '生成PPT大纲结构',
    parameters: [
      { name: 'topic', type: 'string', description: 'PPT主题', required: true },
      { name: 'pageCount', type: 'number', description: '预期页数' }
    ],
    pointsCost: 5
  },
  {
    name: 'CONTENT',
    description: '生成幻灯片内容',
    parameters: [
      { name: 'slideIndex', type: 'number', description: '幻灯片索引' },
      { name: 'slideCount', type: 'number', description: '幻灯片总数' }
    ],
    pointsCost: 2
  },
  {
    name: 'IMAGE',
    description: '为幻灯片生成配图',
    parameters: [
      { name: 'slideIndex', type: 'number', description: '幻灯片索引' },
      { name: 'prompt', type: 'string', description: '图片描述' }
    ],
    pointsCost: 3
  },
  {
    name: 'MODIFY',
    description: '修改幻灯片内容',
    parameters: [
      { name: 'slideIndex', type: 'number', description: '幻灯片索引', required: true },
      { name: 'field', type: 'string', description: '修改字段: title, content, brief' },
      { name: 'value', type: 'string', description: '新值' }
    ],
    pointsCost: 1
  },
  {
    name: 'STYLE',
    description: '更换演示文稿风格',
    parameters: [
      { name: 'styleId', type: 'string', description: '风格模板ID' }
    ],
    pointsCost: 1
  },
  {
    name: 'EXPORT',
    description: '导出PPT文件',
    parameters: [
      { name: 'format', type: 'string', description: '导出格式: pptx, pdf' }
    ],
    pointsCost: 0
  },
  {
    name: 'IMPORT',
    description: '导入文档作为参考资料',
    parameters: [
      { name: 'fileUrl', type: 'string', description: '文件URL', required: true }
    ],
    pointsCost: 1
  },
  {
    name: 'SNAPSHOT',
    description: '保存项目快照',
    parameters: [],
    pointsCost: 0
  }
];

// 任务类型到工具的映射（确保类型安全）
export const TASK_TYPE_TOOL_MAP: Record<string, AgentTool | undefined> = {
  CONFIG_CONFIRM: undefined,
  OUTLINE: AGENT_TOOLS.find(t => t.name === 'OUTLINE'),
  CONTENT: AGENT_TOOLS.find(t => t.name === 'CONTENT'),
  IMAGE: AGENT_TOOLS.find(t => t.name === 'IMAGE'),
  IMAGE_BY_PAGE: AGENT_TOOLS.find(t => t.name === 'IMAGE'),
  FINAL_OVERVIEW: undefined,
  MODIFY: AGENT_TOOLS.find(t => t.name === 'MODIFY'),
  STYLE: AGENT_TOOLS.find(t => t.name === 'STYLE'),
  EXPORT: AGENT_TOOLS.find(t => t.name === 'EXPORT'),
  IMPORT: AGENT_TOOLS.find(t => t.name === 'IMPORT'),
  SNAPSHOT: AGENT_TOOLS.find(t => t.name === 'SNAPSHOT')
};

// ============================================================
// OpenAI Function Calling 格式的工具定义
// ============================================================

export const AGENT_TOOLS_OPENAI_FORMAT = [
  {
    type: 'function' as const,
    function: {
      name: 'generateOutline',
      description: '生成PPT大纲结构。当用户想要创建新的PPT或生成大纲时调用。',
      parameters: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            description: 'PPT的主题，如"人工智能发展趋势"'
          },
          pageCount: {
            type: 'number',
            description: '预期的页数，默认为10页'
          }
        },
        required: ['topic']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'generateSlideContent',
      description: '生成单页幻灯片的正文内容。当大纲已确认，需要生成具体内容时调用。',
      parameters: {
        type: 'object',
        properties: {
          slideIndex: {
            type: 'number',
            description: '要生成内容的幻灯片索引（从0开始）'
          },
          title: {
            type: 'string',
            description: '页面标题'
          },
          brief: {
            type: 'string',
            description: '内容概要或要点提示'
          }
        },
        required: ['slideIndex']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'generateSlideImage',
      description: '为幻灯片生成配图。当需要为某页生成图片时调用。',
      parameters: {
        type: 'object',
        properties: {
          slideIndex: {
            type: 'number',
            description: '要生成配图的幻灯片索引（从0开始）'
          },
          prompt: {
            type: 'string',
            description: '图片的描述提示词'
          }
        },
        required: ['slideIndex']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'modifySlide',
      description: '修改现有幻灯片的内容。当用户想要修改某页的标题或内容时调用。',
      parameters: {
        type: 'object',
        properties: {
          slideIndex: {
            type: 'number',
            description: '要修改的幻灯片索引（从0开始）'
          },
          field: {
            type: 'string',
            enum: ['title', 'content', 'brief'],
            description: '要修改的字段'
          },
          value: {
            type: 'string',
            description: '新的值'
          }
        },
        required: ['slideIndex', 'field', 'value']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'deleteSlide',
      description: '删除指定的幻灯片。',
      parameters: {
        type: 'object',
        properties: {
          slideIndex: {
            type: 'number',
            description: '要删除的幻灯片索引（从0开始）'
          }
        },
        required: ['slideIndex']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'changeStyle',
      description: '更换演示文稿的整体风格。',
      parameters: {
        type: 'object',
        properties: {
          styleName: {
            type: 'string',
            description: '风格名称，如"科技感"、"商务简约"、"创意活泼"'
          }
        },
        required: ['styleName']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'exportPPT',
      description: '导出PPT文件。当用户想要下载或导出时调用。',
      parameters: {
        type: 'object',
        properties: {
          format: {
            type: 'string',
            enum: ['pptx', 'pdf', 'images'],
            description: '导出格式'
          }
        },
        required: ['format']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'askClarification',
      description: '当用户的需求不明确时，主动提问引导用户。',
      parameters: {
        type: 'object',
        properties: {
          question: {
            type: 'string',
            description: '要询问用户的问题'
          },
          options: {
            type: 'array',
            items: { type: 'string' },
            description: '可选的答案选项'
          }
        },
        required: ['question']
      }
    }
  }
];

// 工具名称类型
export type AgentToolName = typeof AGENT_TOOLS[number]['name'];

// ============================================================
// 消息类型
// ============================================================

export interface AgentMessageCreateInput {
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: AgentToolCall[];
  metadata?: AgentMessageMetadata;
}

export interface AgentToolCall {
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
  status: 'pending' | 'success' | 'failed';
}

export interface AgentMessageMetadata {
  progress?: number;
  pointsCost?: number;
  taskId?: string;
  error?: string;
}

// ============================================================
// 任务类型
// ============================================================

export interface AgentTaskCreateInput {
  sessionId: string;
  type: AgentTaskTypeType;
  params?: Record<string, unknown>;
  priority?: number;
}

export interface AgentTaskProgress {
  taskId: string;
  status: AgentTaskStatusType;
  progress: number;
  message?: string;
}

// ============================================================
// 会话类型
// ============================================================

export interface AgentSessionCreateInput {
  projectId: string;
  mode?: AgentModeType;
}

export interface AgentSessionWithDetails extends AgentSession {
  messages: AgentMessage[];
  tasks: AgentTask[];
  project: {
    id: string;
    title: string;
    thumbnailUrl?: string | null;
  };
}

// ============================================================
// API 响应类型
// ============================================================

export interface AgentProgressResponse {
  sessionId: string;
  status: AgentSessionStatusType;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  currentTask?: {
    id: string;
    type: AgentTaskTypeType;
    progress: number;
  };
  totalPointsUsed: number;
}

export interface AgentChatResponse {
  userMessage?: AgentMessage;
  message: AgentMessage;
  tasks?: AgentTask[];
  progress?: AgentProgressResponse;
}

// ============================================================
// 流式输出类型
// ============================================================

export interface StreamingOutlineChunk {
  type: 'outline_chunk';
  slideIndex: number;
  title: string;
  brief?: string;
  pageType?: string;
}

export interface StreamingContentChunk {
  type: 'content_chunk';
  slideIndex: number;
  content: string;
  isComplete: boolean;
}

// ============================================================
// 配置确认参数
// ============================================================

export interface ConfigConfirmParams {
  topic: string;
  styleTemplateId?: string;
  styleName?: string;
  aspectRatio?: string;
  colorPalette?: string[];
  pageCount?: number;
  pageStructure?: {
    cover: number;
    directory: number;
    transition: number;
    content: number;
    end: number;
  };
  requirements?: string;
}

// ============================================================
// 事件类型
// ============================================================

export type AgentEventType =
  | 'task_started'
  | 'task_progress'
  | 'task_completed'
  | 'task_failed'
  | 'session_completed'
  | 'session_failed';

export interface AgentEvent {
  type: AgentEventType;
  sessionId: string;
  taskId?: string;
  data?: unknown;
  timestamp: Date;
}