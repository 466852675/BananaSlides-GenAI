import { AppSettings } from '../types';
import { extractTextFromFile } from '../services/geminiService';

export interface FileParseResult {
    text: string;
    isFallback?: boolean;
    providerUsed?: string;
}

export const extractTextFromUpload = async (
    file: File,
    appSettings: AppSettings,
    onStatusUpdate?: (msg: string, type: 'loading' | 'success' | 'error' | 'info') => void
): Promise<FileParseResult> => {

    const isPDF = file.type === 'application/pdf';
    const isWord = file.name.endsWith('.docx') || file.name.endsWith('.doc') ||
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.type === 'application/msword';
    const isText = file.type === 'text/plain' || file.name.endsWith('.md') || file.name.endsWith('.json') || file.name.endsWith('.txt');

    // For text files, read content using FileReader (more reliable than file.text())
    let preReadTextContent: string | null = null;
    if (isText) {
        try {
            preReadTextContent = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = () => reject(reader.error);
                reader.readAsText(file, 'UTF-8');
            });
        } catch (readError) {
            console.error('[Pre-Read] Failed to read text file:', readError);
        }
    }

    // For Word files, read array buffer immediately
    let preReadWordBuffer: ArrayBuffer | null = null;
    if (isWord) {
        try {
            preReadWordBuffer = await file.arrayBuffer();
        } catch (readError) {
            console.error('[Pre-Read] Failed to read Word file:', readError);
        }
    }

    // Determine Provider Name for logging
    const getProviderName = (task: 'vision') => {
        if (appSettings.ai.provider === 'CustomCombo' && appSettings.ai.customCombo) {
            return 'Custom Combo';
        }
        return appSettings.ai.provider;
    };

    // Show appropriate loading message
    if (onStatusUpdate) {
        if (isPDF && appSettings.docParser?.apiKey) {
            onStatusUpdate("调用 MinerU 解析 PDF 中...", "loading");
        } else if (isWord) {
            onStatusUpdate("正在解析 Word 文档...", "loading");
        } else if (isText) {
            onStatusUpdate("正在读取文本文件...", "loading");
        } else {
            const providerName = getProviderName("vision");
            onStatusUpdate(`调用 ${providerName} API 识别文件中...`, "loading");
        }
    }

    try {
        let text: string;
        let isFallback = false;

        // Use pre-read content if available
        if (preReadTextContent !== null) {
            text = preReadTextContent;
            if (onStatusUpdate) onStatusUpdate("文本文件读取成功", "success");
        } else if (preReadWordBuffer !== null) {
            // Use mammoth with pre-read buffer
            // Dynamic import to avoid bundling issues if not needed immediately, 
            // though standard import is fine if we lazy load this function or module.
            // Since this is a util, we'll stick to dynamic or expect it to be handled by bundler.
            const mammoth = await import('mammoth');
            const result = await mammoth.default.extractRawText({ arrayBuffer: preReadWordBuffer });
            text = result.value || '';
            if (onStatusUpdate) onStatusUpdate("Word 文档解析成功", "success");
        } else {
            // For PDF and other files, use the standard extraction
            // Note: extractTextFromFile inside geminiService might depend on app state or config
            // We assume it functions correctly with just the file or has internal access to what it needs.
            // Checking geminiService signature from context: it seems to just take 'file'.

            const result = await extractTextFromFile(file);
            text = result.text;
            isFallback = result.isFallback || false;

            if (isFallback && onStatusUpdate) {
                onStatusUpdate("MinerU 解析暂不可用，已自动切换至视觉模型为您服务。", "info");
            } else if (onStatusUpdate) {
                // If success message wasn't sent yet
                const providerName = getProviderName("vision");
                // Use a generic success if we don't know exact provider used inside
                onStatusUpdate(isPDF && appSettings.docParser?.apiKey ? "MinerU 解析成功" : `调用 ${providerName} API 识别成功`, "success");
            }
        }

        return { text, isFallback };

    } catch (err) {
        console.error("File read error", err);
        const errorMsg = err instanceof Error ? err.message : "读取文件失败，请重试或直接复制内容。";
        // Let component handle error toast
        throw new Error(errorMsg);
    }
};
