import { Request, Response } from 'express';
import axios from 'axios';
import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';

// MinerU v4 Logic Ported from old server/index.ts
export const parseDoc = async (req: Request, res: Response) => {
    try {
        const file = req.file;
        const config = req.body.config ? JSON.parse(req.body.config) : {};
        const { apiKey, baseUrl } = config;

        if (!file) {
            res.status(400).json({ error: 'No file uploaded' });
            return;
        }

        // 彻底清洗基准路径
        let apiBase = baseUrl.replace(/\/api\/v(1|4)\/?$/, ''); 
        apiBase = apiBase.replace(/\/v(1|4)\/?$/, '');
        while (apiBase.endsWith('/')) {
            apiBase = apiBase.slice(0, -1);
        }
        apiBase = `${apiBase}/api/v4`;

        const safeFileName = file.originalname.replace(/[^\x00-\x7F]/g, "_") || "document.pdf";

        console.log(`[MinerU-Backend] Starting v4 parse for: ${file.originalname}`);

        // 1. Apply Upload URL
        let batchRes;
        try {
            batchRes = await axios.post(`${apiBase}/file-urls/batch`, {
                files: [{ name: safeFileName }],
                model_version: 'vlm'
            }, {
                headers: { 
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
        } catch (e: any) {
            throw new Error(`申请上传链接失败: ${JSON.stringify(e.response?.data || e.message)}`);
        }

        if (batchRes.data.code !== 0) {
            throw new Error(`MinerU Apply URL failed: ${batchRes.data.msg}`);
        }

        const { batch_id, file_urls } = batchRes.data.data;
        const uploadUrl = file_urls[0];

        // 2. Upload to OSS
        const fileBuffer = fs.readFileSync(file.path);
        
        try {
            const uploadRes = await fetch(uploadUrl, {
                method: 'PUT',
                body: fileBuffer,
            });
            
            if (!uploadRes.ok) {
                const errText = await uploadRes.text();
                throw new Error(`OSS 返回 ${uploadRes.status}: ${errText}`);
            }
        } catch (e: any) {
            throw new Error(`文件上传 OSS 失败: ${e.message}`);
        }

        // 3. Poll
        let attempt = 0;
        const maxAttempts = 60; 
        let markdownContent = '';

        while (attempt < maxAttempts) {
            attempt++;
            const statusRes = await axios.get(`${apiBase}/extract-results/batch/${batch_id}`, {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });

            const task = statusRes.data.data.extract_result[0];
            if (task.state === 'done') {
                const zipUrl = task.full_zip_url;

                // 4. Download & Extract
                const zipRes = await axios.get(zipUrl, { responseType: 'arraybuffer' });
                const zip = new AdmZip(Buffer.from(zipRes.data));
                const zipEntries = zip.getEntries();
                
                const imageMap: Record<string, string> = {};
                for (const entry of zipEntries) {
                    if (entry.entryName.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i)) {
                        const imageData = entry.getData();
                        const ext = entry.entryName.split('.').pop()?.toLowerCase() || 'png';
                        const mimeType = ext === 'jpg' ? 'jpeg' : ext;
                        const base64 = `data:image/${mimeType};base64,${imageData.toString('base64')}`;
                        const fileName = entry.entryName.split('/').pop() || entry.entryName;
                        imageMap[fileName] = base64;
                        imageMap[entry.entryName] = base64;
                    }
                }
                
                const mdEntry = zipEntries.find(e => e.entryName.endsWith('.md'));
                if (mdEntry) {
                    markdownContent = mdEntry.getData().toString('utf8');
                    markdownContent = markdownContent.replace(
                        /!\[([^\]]*)\]\(([^)]+)\)/g,
                        (match, alt, src) => {
                            const srcFileName = src.split('/').pop() || src;
                            if (imageMap[srcFileName]) return `![${alt}](${imageMap[srcFileName]})`;
                            if (imageMap[src]) return `![${alt}](${imageMap[src]})`;
                            // Fuzzy match
                            for (const [path, base64] of Object.entries(imageMap)) {
                                if (path.endsWith(srcFileName) || src.includes(path.split('/').pop() || '')) {
                                    return `![${alt}](${base64})`;
                                }
                            }
                            return match;
                        }
                    );
                }
                break;
            } else if (task.state === 'failed') {
                throw new Error(`MinerU task failed: ${task.err_msg}`);
            }

            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        if (!markdownContent) {
            throw new Error('Failed to extract markdown from MinerU result.');
        }

        // Cleanup
        if (fs.existsSync(file.path)) {
            // fs.unlinkSync(file.path); 
            // Warning: middleware might want to keep it? 
            // In upload feature we keep files. But here it's a proxy feature.
            // Better to delete if it's just for processing.
            // But we are sharing upload middleware which saves to uploads/. 
            // If user doesn't want to keep it, we delete.
             fs.unlinkSync(file.path);
        }

        res.json({ markdown: markdownContent });

    } catch (error: any) {
        console.error('[MinerU-Backend] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
};
