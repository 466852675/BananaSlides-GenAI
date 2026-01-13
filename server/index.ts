import express from 'express';
import cors from 'cors';
import multer from 'multer';
import axios from 'axios';
import AdmZip from 'adm-zip';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const app = express();
const port = process.env.PORT || 1111;

app.use(cors());
app.use(express.json());

// 配置 Multer 处理文件上传
const upload = multer({ dest: 'uploads/' });

// MinerU v4 解析接口
app.post('/api/doc-parser/parse', upload.single('file'), async (req: express.Request, res: express.Response) => {
    try {
        const file = req.file;
        const config = req.body.config ? JSON.parse(req.body.config) : {};
        const { apiKey, baseUrl } = config;

        if (!file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // 彻底清洗基准路径，确保不带冗余版本号和斜杠
        let apiBase = baseUrl.replace(/\/api\/v(1|4)\/?$/, ''); 
        apiBase = apiBase.replace(/\/v(1|4)\/?$/, '');
        while (apiBase.endsWith('/')) {
            apiBase = apiBase.slice(0, -1);
        }
        
        // 强制使用 v4 路径
        apiBase = `${apiBase}/api/v4`;

        // 清洗文件名，防止乱码导致 API 报错
        const safeFileName = file.originalname.replace(/[^\x00-\x7F]/g, "_") || "document.pdf";

        console.log(`[MinerU-Backend] Starting v4 parse for: ${file.originalname} (Safe name: ${safeFileName})`);
        console.log(`[MinerU-Backend] API Endpoint Base: ${apiBase}`);

        // 1. 申请上传链接
        console.log(`[MinerU-Backend] Step 1: Applying for upload URL to ${apiBase}/file-urls/batch ...`);
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
            console.error(`[MinerU-Backend] Step 1 Failed. Status: ${e.response?.status}`);
            console.error(`[MinerU-Backend] Request URL: ${e.config?.url}`);
            console.error(`[MinerU-Backend] Request Headers:`, JSON.stringify(e.config?.headers));
            console.error(`[MinerU-Backend] Response Data:`, JSON.stringify(e.response?.data));
            throw new Error(`申请上传链接失败 (${e.response?.status || 'network'}): ${JSON.stringify(e.response?.data || e.message)}`);
        }

        if (batchRes.data.code !== 0) {
            throw new Error(`MinerU Apply URL failed: ${batchRes.data.msg}`);
        }

        const { batch_id, file_urls } = batchRes.data.data;
        const uploadUrl = file_urls[0];
        console.log(`[MinerU-Backend] Applied successfully. Batch ID: ${batch_id}`);

        // 2. 执行上传 (PUT) - 使用原生 https 模块避免 axios 添加多余头
        console.log(`[MinerU-Backend] Step 2: Uploading to OSS...`);
        console.log(`[MinerU-Backend] Upload URL: ${uploadUrl.substring(0, 80)}...`);
        
        const fileBuffer = fs.readFileSync(file.path);
        console.log(`[MinerU-Backend] File size: ${fileBuffer.length} bytes`);
        
        try {
            // 使用原生 fetch API (Node 18+) 进行上传，更少的默认头
            const uploadRes = await fetch(uploadUrl, {
                method: 'PUT',
                body: fileBuffer,
            });
            
            if (!uploadRes.ok) {
                const errText = await uploadRes.text();
                console.error(`[MinerU-Backend] OSS Upload Failed:`, uploadRes.status, errText);
                throw new Error(`OSS 返回 ${uploadRes.status}: ${errText.substring(0, 200)}`);
            }
        } catch (e: any) {
            console.error(`[MinerU-Backend] Step 2 Failed:`, e.message);
            throw new Error(`文件上传 OSS 失败: ${e.message}`);
        }

        console.log(`[MinerU-Backend] File uploaded successfully.`);

        // 3. 轮询结果
        console.log(`[MinerU-Backend] Step 3: Polling for status...`);
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
                console.log('[MinerU-Backend] Step 3: Parser task finished successfully.');
                const zipUrl = task.full_zip_url;

                // 4. 下载并解压
                console.log(`[MinerU-Backend] Step 4: Downloading result ZIP...`);
                const zipRes = await axios.get(zipUrl, { responseType: 'arraybuffer' });
                const zip = new AdmZip(Buffer.from(zipRes.data));
                const zipEntries = zip.getEntries();
                
                // 4.1 提取所有图片并转为 Base64 Map
                console.log(`[MinerU-Backend] Step 4.1: Extracting images and converting to Base64...`);
                const imageMap: Record<string, string> = {};
                for (const entry of zipEntries) {
                    if (entry.entryName.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i)) {
                        try {
                            const imageData = entry.getData();
                            const ext = entry.entryName.split('.').pop()?.toLowerCase() || 'png';
                            const mimeType = ext === 'jpg' ? 'jpeg' : ext;
                            const base64 = `data:image/${mimeType};base64,${imageData.toString('base64')}`;
                            // 提取相对路径中的文件名部分用于匹配
                            const fileName = entry.entryName.split('/').pop() || entry.entryName;
                            imageMap[fileName] = base64;
                            // 同时保存完整路径以防万一
                            imageMap[entry.entryName] = base64;
                        } catch (imgErr) {
                            console.warn(`[MinerU-Backend] Failed to process image: ${entry.entryName}`);
                        }
                    }
                }
                console.log(`[MinerU-Backend] Extracted ${Object.keys(imageMap).length / 2} images.`);
                
                // 4.2 提取 Markdown 内容
                const mdEntry = zipEntries.find(e => e.entryName.endsWith('.md'));
                if (mdEntry) {
                    markdownContent = mdEntry.getData().toString('utf8');
                    
                    // 4.3 替换 Markdown 中的图片路径为 Base64
                    console.log(`[MinerU-Backend] Step 4.3: Replacing image paths with Base64...`);
                    markdownContent = markdownContent.replace(
                        /!\[([^\]]*)\]\(([^)]+)\)/g,
                        (match, alt, src) => {
                            // 提取 src 中的文件名
                            const srcFileName = src.split('/').pop() || src;
                            // 尝试匹配 imageMap
                            if (imageMap[srcFileName]) {
                                return `![${alt}](${imageMap[srcFileName]})`;
                            }
                            if (imageMap[src]) {
                                return `![${alt}](${imageMap[src]})`;
                            }
                            // 尝试模糊匹配
                            for (const [path, base64] of Object.entries(imageMap)) {
                                if (path.endsWith(srcFileName) || src.includes(path.split('/').pop() || '')) {
                                    return `![${alt}](${base64})`;
                                }
                            }
                            return match; // 未找到则保持原样
                        }
                    );
                }
                break;
            } else if (task.state === 'failed') {
                throw new Error(`MinerU task failed: ${task.err_msg}`);
            }

            console.log(`[MinerU-Backend] Polling attempt ${attempt}: ${task.state}`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        if (!markdownContent) {
            throw new Error('Failed to extract markdown from MinerU result.');
        }

        // 清理临时文件
        if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }

        console.log(`[MinerU-Backend] Parse completed successfully.`);
        res.json({ markdown: markdownContent });

    } catch (error: any) {
        console.error('[MinerU-Backend] Critical Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`MinerU Proxy Server running at http://localhost:${port}`);
});
