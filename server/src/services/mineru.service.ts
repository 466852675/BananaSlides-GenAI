import axios from 'axios';
import * as fs from 'fs';
import FormData from 'form-data';

interface MinerUConfig {
    apiKey: string;
    baseUrl: string;
    provider: string;
}

export class MinerUService {
    static async parseFile(
        filePath: string,
        config: MinerUConfig,
        modelVersion: string = 'vlm'
    ): Promise<string> {
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        const formData = new FormData();
        formData.append('file', fs.createReadStream(filePath));

        try {
            // 兼容用户配置完整 URL 的情况
            // 如果 baseUrl 已经包含 /api/v1/parse，直接使用
            // 否则，追加 /api/v1/parse
            const baseUrl = config.baseUrl.endsWith('/api/v1/parse') 
                ? config.baseUrl 
                : config.baseUrl.replace(/\/+$/, '') + '/api/v1/parse';
            
            console.log(`[MinerUService] Calling MinerU API: ${baseUrl}`);
            
            const response = await axios.post(
                baseUrl,
                formData,
                {
                    headers: {
                        ...formData.getHeaders(),
                        'Authorization': `Bearer ${config.apiKey}`
                    },
                    timeout: 120000
                }
            );

            if (response.data && response.data.markdown) {
                return response.data.markdown;
            }

            if (response.data && response.data.text) {
                return response.data.text;
            }

            throw new Error('Invalid response format from MinerU API');
        } catch (error: any) {
            if (error.response) {
                throw new Error(
                    `MinerU API error: ${error.response.status} - ${error.response.data?.message || error.message}`
                );
            }
            throw new Error(`MinerU service error: ${error.message}`);
        }
    }
}
