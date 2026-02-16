# MinerU解析引擎

## 概述

MinerU解析引擎是一个工业级AI文档解析内核，负责将PDF、Word等文档解析为结构化的Markdown文本，为PPT大纲生成提供内容输入。系统采用混合架构设计，预留了MinerU专业解析能力的同时，也支持简单的文档上传流程。

## 支持格式

| 格式 | MIME类型 | 扩展名 | 解析状态 | 说明 |
|------|----------|--------|----------|------|
| PDF | application/pdf | .pdf | 预留接口 | 完整版面分析 |
| Word | application/vnd.openxmlformats-officedocument.wordprocessingml.document | .docx | 预留接口 | 结构化提取 |
| Markdown | text/markdown | .md | 预留接口 | 原样保留 |
| Text | text/plain | .txt | 预留接口 | 文本提取 |

## 系统状态说明

**当前实现状态**：API接口已预留，解析功能待实现。

```
现有功能:
✅ 文档上传接口 (/api/upload)
✅ 文件类型校验与存储
✅ 解析引擎健康检查接口
⏳ 文档解析核心功能 (待开发)
⏳ MinerU服务集成 (待配置)
```

## 技术架构

```
用户上传文档
    ↓
文件上传服务 (/api/upload)
    ├── 文件类型校验
    ├── 文件存储到 /uploads/
    └── 返回文件URL
    ↓
调用文档解析接口 (/api/doc-parser/parse)
    ├── 健康检查 (当前可用)
    └── 解析任务 (待实现)
    ↓
MinerU API 调用 (预留)
    ├── 文档版面分析
    ├── 文本提取
    ├── 表格识别
    └── 图片提取
    ↓
返回结构化Markdown
    ↓
前端展示与编辑
```

## 核心实现

### 路由配置

```typescript
// server/src/routes/mineru.routes.ts

import { Router } from 'express';

const router = Router();

// GET /api/doc-parser/health - 健康检查
router.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'Doc parser service is available',
        provider: process.env.DOC_PARSER_PROVIDER || 'MinerU',
        baseUrl: process.env.DOC_PARSER_BASE || 'https://mineru.net'
    });
});

// POST /api/doc-parser/parse - 文档解析 (预留)
router.post('/parse', (req, res) => {
    res.status(501).json({
        error: 'NOT_IMPLEMENTED',
        message: 'Document parsing is not yet implemented',
        note: 'Please contact administrator for document parsing service'
    });
});

export default router;
```

### 配置模型

```prisma
// server/prisma/schema.prisma

// 系统设置表存储解析引擎配置
model AppSettings {
  id        String   @id @default("global")
  config    String   // JSON字符串存储配置
  updatedAt DateTime @updatedAt
}

// 配置示例结构 (JSON):
{
  "docParser": {
    "provider": "MinerU",        // 解析提供商
    "baseUrl": "https://mineru.net",  // API基础地址
    "apiKey": "your-api-key",    // API密钥
    "timeout": 300000,           // 超时时间(毫秒)
    "maxFileSize": 52428800      // 最大文件大小(50MB)
  }
}
```

### 服务层设计 (预留)

```typescript
// server/src/services/mineru.service.ts (预留实现)

import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

interface ParseOptions {
  extractImages?: boolean;      // 是否提取图片
  extractTables?: boolean;      // 是否提取表格
  ocrEnabled?: boolean;         // 是否启用OCR
  language?: string;            // 文档语言
}

interface ParseResult {
  markdown: string;             // 解析后的Markdown
  images: Array<{
    name: string;
    url: string;
    page: number;
  }>;
  tables: Array<{
    content: string[][];
    page: number;
  }>;
  metadata: {
    title?: string;
    author?: string;
    pageCount: number;
    wordCount: number;
  };
}

export class MinerUService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.DOC_PARSER_BASE || 'https://mineru.net';
    this.apiKey = process.env.DOC_PARSER_KEY || '';
  }

  /**
   * 解析文档
   * @param filePath 本地文件路径
   * @param options 解析选项
   */
  async parseDocument(
    filePath: string, 
    options: ParseOptions = {}
  ): Promise<ParseResult> {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    formData.append('options', JSON.stringify(options));

    const response = await axios.post(
      `${this.baseUrl}/api/parse`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${this.apiKey}`
        },
        timeout: 300000,  // 5分钟超时
        maxBodyLength: 50 * 1024 * 1024  // 50MB
      }
    );

    return this.transformResult(response.data);
  }

  /**
   * 检查服务健康状态
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/health`, {
        timeout: 5000
      });
      return response.data.status === 'ok';
    } catch {
      return false;
    }
  }

  /**
   * 转换解析结果
   */
  private transformResult(rawData: any): ParseResult {
    return {
      markdown: rawData.markdown || '',
      images: rawData.images || [],
      tables: rawData.tables || [],
      metadata: {
        title: rawData.metadata?.title,
        author: rawData.metadata?.author,
        pageCount: rawData.metadata?.page_count || 0,
        wordCount: rawData.metadata?.word_count || 0
      }
    };
  }
}
```

## API 接口规范

### 健康检查

```
GET /api/doc-parser/health
```

**响应 (当前实现)：**
```json
{
  "status": "ok",
  "message": "Doc parser service is available",
  "provider": "MinerU",
  "baseUrl": "https://mineru.net"
}
```

### 文档解析 (预留)

```
POST /api/doc-parser/parse
Content-Type: application/json
```

**请求体：**
```json
{
  "fileUrl": "/uploads/document.pdf",
  "options": {
    "extractImages": true,
    "extractTables": true,
    "ocrEnabled": true,
    "language": "zh"
  }
}
```

**响应 (当前实现)：**
```json
{
  "error": "NOT_IMPLEMENTED",
  "message": "Document parsing is not yet implemented",
  "note": "Please contact administrator for document parsing service"
}
```

**预期响应 (实现后)：**
```json
{
  "success": true,
  "data": {
    "markdown": "# 文档标题\n\n正文内容...",
    "images": [
      {
        "name": "image_001.png",
        "url": "/uploads/extracted/image_001.png",
        "page": 1
      }
    ],
    "tables": [
      {
        "content": [["列1", "列2"], ["数据1", "数据2"]],
        "page": 2
      }
    ],
    "metadata": {
      "title": "文档标题",
      "author": "作者名",
      "pageCount": 10,
      "wordCount": 5000
    }
  }
}
```

## 环境配置

```env
# server/.env

# 文档解析配置
DOC_PARSER_PROVIDER=MinerU
DOC_PARSER_BASE=https://mineru.net
DOC_PARSER_KEY=your-mineru-api-key

# 解析选项默认值
DOC_PARSER_EXTRACT_IMAGES=true
DOC_PARSER_EXTRACT_TABLES=true
DOC_PARSER_OCR_ENABLED=true
```

## 前端组件设计

### 文档上传与解析组件

```tsx
// DocumentUploader.tsx
import React, { useState } from 'react';
import { Upload, FileText, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface DocumentUploaderProps {
  onParsed: (content: string) => void;
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  onParsed
}) => {
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // 文件类型校验
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/markdown',
      'text/plain'
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error('请上传 PDF、Word、Markdown 或 Text 文件');
      return;
    }

    setFile(selectedFile);
    setUploading(true);

    try {
      // 1. 上传文件
      const formData = new FormData();
      formData.append('file', selectedFile);

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const uploadData = await uploadRes.json();

      if (!uploadData.success) {
        throw new Error(uploadData.message);
      }

      // 2. 调用解析服务
      setUploading(false);
      setParsing(true);

      const parseRes = await fetch('/api/doc-parser/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileUrl: uploadData.url,
          options: {
            extractImages: true,
            extractTables: true
          }
        })
      });

      const parseData = await parseRes.json();

      if (parseData.success) {
        onParsed(parseData.data.markdown);
        toast.success('文档解析成功');
      } else {
        throw new Error(parseData.message || '解析失败');
      }
    } catch (error: any) {
      toast.error(error.message || '处理失败');
    } finally {
      setUploading(false);
      setParsing(false);
    }
  };

  const isProcessing = uploading || parsing;

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
      <input
        type="file"
        accept=".pdf,.docx,.md,.txt"
        onChange={handleFileSelect}
        disabled={isProcessing}
        className="hidden"
        id="doc-upload"
      />
      
      <label
        htmlFor="doc-upload"
        className={`cursor-pointer flex flex-col items-center gap-4 ${
          isProcessing ? 'opacity-50' : ''
        }`}
      >
        {isProcessing ? (
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
        ) : (
          <FileText className="w-12 h-12 text-gray-400" />
        )}
        
        <div>
          <p className="text-lg font-medium text-gray-700">
            {uploading ? '上传中...' : parsing ? '解析中...' : '点击上传文档'}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            支持 PDF、Word、Markdown、Text 格式
          </p>
        </div>

        {file && (
          <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
            <FileText className="w-4 h-4" />
            {file.name}
          </div>
        )}
      </label>

      {/* 服务状态提示 */}
      <div className="mt-4 flex items-center justify-center gap-2 text-sm text-yellow-600 bg-yellow-50 px-4 py-2 rounded">
        <AlertCircle className="w-4 h-4" />
        <span>文档解析服务即将上线，敬请期待</span>
      </div>
    </div>
  );
};
```

### 解析结果展示组件

```tsx
// ParsedContentViewer.tsx
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy, Check } from 'lucide-react';

interface ParsedContentViewerProps {
  content: string;
  metadata?: {
    title?: string;
    author?: string;
    pageCount?: number;
    wordCount?: number;
  };
}

export const ParsedContentViewer: React.FC<ParsedContentViewerProps> = ({
  content,
  metadata
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-lg border">
      {/* 头部信息 */}
      {metadata && (
        <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            {metadata.title && (
              <span className="font-medium text-gray-900">
                {metadata.title}
              </span>
            )}
            {metadata.pageCount && (
              <span>{metadata.pageCount} 页</span>
            )}
            {metadata.wordCount && (
              <span>{metadata.wordCount} 字</span>
            )}
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                已复制
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                复制内容
              </>
            )}
          </button>
        </div>
      )}

      {/* 内容预览 */}
      <div className="p-4 max-h-96 overflow-auto">
        <ReactMarkdown className="prose prose-sm max-w-none">
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
};
```

## 集成到PPT生成流程

```
用户流程:

1. 创建项目
   ↓
2. 选择"导入文档"
   ↓
3. 上传PDF/Word文档
   ├── 调用 /api/upload 存储文件
   └── 显示上传进度
   ↓
4. 自动调用解析服务
   ├── 调用 /api/doc-parser/parse
   └── 显示解析进度
   ↓
5. 解析完成
   ├── 提取标题生成PPT主题
   ├── 按章节生成大纲
   └── 提取关键内容作为正文
   ↓
6. 进入大纲编辑
   └── 用户可修改AI生成的结构
   ↓
7. 生成PPT
```

## 未来规划

### 近期 (Q1 2026)

- [ ] 实现MinerU服务集成
- [ ] 完成文档解析API
- [ ] 支持PDF和Word格式
- [ ] 基础文本提取功能

### 中期 (Q2 2026)

- [ ] 表格结构化提取
- [ ] 图片提取与关联
- [ ] OCR文字识别
- [ ] 公式识别与转换

### 远期 (Q3 2026)

- [ ] 智能章节分割
- [ ] 关键信息自动提取
- [ ] 多语言文档支持
- [ ] 批量文档处理

## 扩展阅读

- [上传文件管理](./上传文件管理.md) - 文档上传接口
- [大纲生成算法](../02_AI生成能力/大纲生成.md) - 解析后的内容生成大纲
- [项目管理系统](../01_用户工作台/项目管理系统设计.md) - 文档导入流程
- [AI引擎配置](../14_AI引擎/AI引擎配置.md) - 解析服务配置

---

*最后更新: 2026-02-16*  
*文档版本: v2.0 (基于实际代码扩充)*  
*实现状态: API预留，功能待开发*
