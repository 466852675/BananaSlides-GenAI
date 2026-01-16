
import axios from 'axios';
import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';
import { DocParserConfig } from '../types';

export class MinerUService {
    
    /**
     * Parse a file using MinerU API (v4)
     * @param filePath Absolute path to the file on local disk
     * @param config Configuration for MinerU (apiKey, baseUrl)
     * @returns Extracted Markdown content
     */
    static async parseFile(filePath: string, config: DocParserConfig): Promise<string> {
        const apiKey = config.apiKey;
        const baseUrl = config.baseUrl || 'https://mineru.openxlab.org.cn';

        if (!apiKey) {
            throw new Error("MinerU API Key is missing");
        }

        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        // Clean Base URL
        let apiBase = baseUrl.replace(/\/api\/v(1|4)\/?$/, '');
        apiBase = apiBase.replace(/\/v(1|4)\/?$/, '');
        while (apiBase.endsWith('/')) {
            apiBase = apiBase.slice(0, -1);
        }
        apiBase = `${apiBase}/api/v4`;

        const fileName = path.basename(filePath);
        // Sanitize filename for API compatibility
        const safeFileName = fileName.replace(/[^\x00-\x7F]/g, "_") || "document.pdf";
        
        console.log(`[MinerU-Service] Starting parse for: ${fileName}`);

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
            const errMsg = e.response?.data?.msg || e.message;
            throw new Error(`MinerU Request Failed (Apply URL): ${errMsg}`);
        }

        if (batchRes.data.code !== 0) {
            throw new Error(`MinerU Apply URL failed: ${batchRes.data.msg}`);
        }

        const { batch_id, file_urls } = batchRes.data.data;
        const uploadUrl = file_urls[0];

        // 2. Upload to OSS
        // Note: fs.readFileSync is synchronous but safe for small files in this context. 
        // For very large files, stream is better but Axios/Fetch PUT usually takes buffer/stream.
        const fileBuffer = fs.readFileSync(filePath);
        
        try {
            const uploadRes = await fetch(uploadUrl, {
                method: 'PUT',
                body: fileBuffer,
            });
            
            if (!uploadRes.ok) {
                const errText = await uploadRes.text();
                throw new Error(`OSS Storage Error ${uploadRes.status}: ${errText}`);
            }
        } catch (e: any) {
            throw new Error(`File Upload to OSS Failed: ${e.message}`);
        }

        // 3. Poll for Results
        let attempt = 0;
        const maxAttempts = 120; // 4 minutes max (2s interval)
        
        while (attempt < maxAttempts) {
            attempt++;
            
            let statusRes;
            try {
                statusRes = await axios.get(`${apiBase}/extract-results/batch/${batch_id}`, {
                    headers: { 'Authorization': `Bearer ${apiKey}` }
                });
            } catch (e: any) {
               // Network glitch during poll shouldn't kill immediately, but for now we throw
               throw new Error(`Polling Status Failed: ${e.message}`);
            }

            const task = statusRes.data.data.extract_result[0];
            
            if (task.state === 'done') {
                const zipUrl = task.full_zip_url;
                
                // 4. Download & Extract Result
                try {
                    const zipRes = await axios.get(zipUrl, { responseType: 'arraybuffer' });
                    const zip = new AdmZip(Buffer.from(zipRes.data));
                    const zipEntries = zip.getEntries();
                    
                    // Helper to build image map for markdown replacement
                    const imageMap: Record<string, string> = {};
                    
                    for (const entry of zipEntries) {
                        if (entry.entryName.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i)) {
                            const imageData = entry.getData();
                            const ext = entry.entryName.split('.').pop()?.toLowerCase() || 'png';
                            const mimeType = ext === 'jpg' ? 'jpeg' : ext;
                            // Convert to base64 for embedding in markdown
                            const base64 = `data:image/${mimeType};base64,${imageData.toString('base64')}`;
                            
                            const entryFileName = entry.entryName.split('/').pop() || entry.entryName;
                            imageMap[entryFileName] = base64;
                            imageMap[entry.entryName] = base64; // Handle full path key too
                        }
                    }
                    
                    const mdEntry = zipEntries.find(e => e.entryName.endsWith('.md'));
                    if (mdEntry) {
                        let markdownContent = mdEntry.getData().toString('utf8');
                        
                        // Embedding images into markdown (Basic Replacement)
                        markdownContent = markdownContent.replace(
                            /!\[([^\]]*)\]\(([^)]+)\)/g,
                            (match, alt, src) => {
                                const srcFileName = src.split('/').pop() || src;
                                // Direct match
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
                        
                        console.log(`[MinerU-Service] Success for: ${fileName}`);
                        return markdownContent;
                    } else {
                        throw new Error('MinerU result ZIP does not contain a markdown file.');
                    }

                } catch (e: any) {
                    throw new Error(`Failed to process result ZIP: ${e.message}`);
                }

            } else if (task.state === 'failed') {
                throw new Error(`MinerU Processing Failed: ${task.err_msg}`);
            }

            // Wait 2s
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        throw new Error("MinerU Timeout: Document processing took too long.");
    }
}
