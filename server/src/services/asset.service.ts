import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

/**
 * AssetService - 管理 AI 生成的静态资源
 * 
 * 职责:
 * 1. 将 Base64 图片保存到本地文件系统
 * 2. 下载远程 URL (如 DALL-E) 并本地化
 * 3. 为未来 S3 迁移提供抽象接口
 */

const ASSETS_DIR = path.join(process.cwd(), 'uploads', 'assets');

// 确保 assets 目录存在
if (!fs.existsSync(ASSETS_DIR)) {
    fs.mkdirSync(ASSETS_DIR, { recursive: true });
    console.log('[AssetService] Created assets directory:', ASSETS_DIR);
}

export class AssetService {
    
    /**
     * 保存 Base64 图片到本地
     * @param base64Data - Base64 字符串 (可能包含 data:image/png;base64, 前缀)
     * @param extension - 文件扩展名，默认 'png'
     * @returns 相对 URL 路径 (e.g., /uploads/assets/xxx.png)
     */
    static async saveBase64(base64Data: string, extension: string = 'png'): Promise<string> {
        try {
            // 移除 Data URL 前缀 (如果有)
            const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, '');
            
            // 生成唯一文件名
            const filename = `asset-${uuidv4()}.${extension}`;
            const filepath = path.join(ASSETS_DIR, filename);
            
            // 写入文件
            const buffer = Buffer.from(base64Clean, 'base64');
            fs.writeFileSync(filepath, buffer);
            
            console.log(`[AssetService] Saved Base64 image: ${filename} (${(buffer.length / 1024).toFixed(2)} KB)`);
            
            // 返回相对路径 (前端/数据库使用)
            return `/uploads/assets/${filename}`;
            
        } catch (error: any) {
            console.error('[AssetService] Failed to save Base64:', error.message);
            throw new Error(`AssetService.saveBase64 failed: ${error.message}`);
        }
    }
    
    /**
     * 下载远程图片并保存到本地
     * @param url - 远程图片 URL (e.g., OpenAI DALL-E URL)
     * @param extension - 文件扩展名，默认 'png'
     * @returns 相对 URL 路径
     */
    static async downloadAndSave(url: string, extension: string = 'png'): Promise<string> {
        try {
            console.log(`[AssetService] Downloading from: ${url.substring(0, 80)}...`);
            
            // 下载图片
            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: 30000, // 30s timeout
                headers: {
                    'User-Agent': 'YH-AI-PPT/1.0'
                }
            });
            
            // 生成唯一文件名
            const filename = `asset-${uuidv4()}.${extension}`;
            const filepath = path.join(ASSETS_DIR, filename);
            
            // 写入文件
            fs.writeFileSync(filepath, response.data);
            
            console.log(`[AssetService] Downloaded and saved: ${filename} (${(response.data.length / 1024).toFixed(2)} KB)`);
            
            return `/uploads/assets/${filename}`;
            
        } catch (error: any) {
            console.error('[AssetService] Failed to download:', error.message);
            throw new Error(`AssetService.downloadAndSave failed: ${error.message}`);
        }
    }
    
    /**
     * 智能保存: 自动判断是 Base64 还是 URL
     * @param dataOrUrl - Base64 字符串或 HTTP URL
     * @param extension - 文件扩展名
     * @returns 相对 URL 路径
     */
    static async save(dataOrUrl: string, extension: string = 'png'): Promise<string> {
        // 判断是 URL 还是 Base64
        if (dataOrUrl.startsWith('http://') || dataOrUrl.startsWith('https://')) {
            return this.downloadAndSave(dataOrUrl, extension);
        } else if (dataOrUrl.startsWith('data:image') || dataOrUrl.length > 1000) {
            // 如果是 Data URL 或者超长字符串，认为是 Base64
            return this.saveBase64(dataOrUrl, extension);
        } else {
            // 已经是本地路径，直接返回
            return dataOrUrl;
        }
    }
    
    /**
     * 删除资源 (预留接口，用于清理)
     * @param urlPath - 相对路径 (e.g., /uploads/assets/xxx.png)
     */
    static async delete(urlPath: string): Promise<void> {
        try {
            // 提取文件名
            const filename = path.basename(urlPath);
            const filepath = path.join(ASSETS_DIR, filename);
            
            if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath);
                console.log(`[AssetService] Deleted: ${filename}`);
            }
        } catch (error: any) {
            console.error('[AssetService] Failed to delete:', error.message);
        }
    }
}
