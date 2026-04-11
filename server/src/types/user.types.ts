// server/src/types/user.types.ts
// 用户角色和状态类型定义

// 用户角色常量
export const UserRole = {
    USER: 'USER',
    VIP: 'VIP',
    PROFESSIONAL: 'PROFESSIONAL',
    ENTERPRISE: 'ENTERPRISE',
    ADMIN: 'ADMIN',
    SUPER_ADMIN: 'SUPER_ADMIN'
} as const;

// 用户状态常量
export const UserStatus = {
    ACTIVE: 'ACTIVE',
    DISABLED: 'DISABLED',
    LOCKED: 'LOCKED'
} as const;

// 消息类型常量
export const MessageType = {
    SYSTEM: 'SYSTEM',
    SECURITY: 'SECURITY',
    ACTIVITY: 'ACTIVITY',
    PROMOTION: 'PROMOTION',
    ORDER: 'ORDER',
    POINTS: 'POINTS',
    VIP: 'VIP',
    AI: 'AI',
    REFUND: 'REFUND',
    LEAD: 'LEAD'
} as const;

// 订单状态常量
export const OrderStatus = {
    PENDING: 'PENDING',
    PAID: 'PAID',
    FAILED: 'FAILED',
    CANCELLED: 'CANCELLED',
    REFUNDED: 'REFUNDED',
    EXPIRED: 'EXPIRED'
} as const;

// 退款状态常量
export const RefundStatus = {
    PENDING: 'PENDING',
    PENDING_SECOND: 'PENDING_SECOND',
    PROCESSING: 'PROCESSING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
    MANUAL_REQUIRED: 'MANUAL_REQUIRED'
} as const;

// Agent 模式常量
export const AgentMode = {
    GUIDED: 'GUIDED',
    AUTO: 'AUTO'
} as const;

// Agent 会话状态常量
export const AgentSessionStatus = {
    ACTIVE: 'ACTIVE',
    PAUSED: 'PAUSED',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
    CANCELLED: 'CANCELLED'
} as const;

// Agent 任务状态常量
export const AgentTaskStatus = {
    PENDING: 'PENDING',
    RUNNING: 'RUNNING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
    CANCELLED: 'CANCELLED'
} as const;

// Agent 任务类型常量
export const AgentTaskType = {
    CONFIG_CONFIRM: 'CONFIG_CONFIRM',
    OUTLINE: 'OUTLINE',
    CONTENT: 'CONTENT',
    IMAGE: 'IMAGE',
    GENERATE_OUTLINE: 'GENERATE_OUTLINE',
    EXPAND_CONTENT: 'EXPAND_CONTENT',
    GENERATE_IMAGE: 'GENERATE_IMAGE',
    BATCH_GENERATE_IMAGES: 'BATCH_GENERATE_IMAGES',
    MODIFY_SLIDE: 'MODIFY_SLIDE',
    SWITCH_STYLE_TEMPLATE: 'SWITCH_STYLE_TEMPLATE',
    IMPORT_DOCUMENT: 'IMPORT_DOCUMENT',
    EXPORT_PROJECT: 'EXPORT_PROJECT',
    FINALIZE_PROJECT: 'FINALIZE_PROJECT',
    // 额外的任务类型
    EXPORT: 'EXPORT',
    MODIFY: 'MODIFY',
    STYLE: 'STYLE',
    IMAGE_BY_PAGE: 'IMAGE_BY_PAGE',
    FINAL_OVERVIEW: 'FINAL_OVERVIEW',
    IMPORT: 'IMPORT',
    SNAPSHOT: 'SNAPSHOT'
} as const;

// 类型定义
export type UserRoleType = typeof UserRole[keyof typeof UserRole];
export type UserStatusType = typeof UserStatus[keyof typeof UserStatus];
export type MessageTypeType = typeof MessageType[keyof typeof MessageType];
export type OrderStatusType = typeof OrderStatus[keyof typeof OrderStatus];
export type RefundStatusType = typeof RefundStatus[keyof typeof RefundStatus];
export type AgentModeType = typeof AgentMode[keyof typeof AgentMode];
export type AgentSessionStatusType = typeof AgentSessionStatus[keyof typeof AgentSessionStatus];
export type AgentTaskStatusType = typeof AgentTaskStatus[keyof typeof AgentTaskStatus];
export type AgentTaskTypeType = typeof AgentTaskType[keyof typeof AgentTaskType];