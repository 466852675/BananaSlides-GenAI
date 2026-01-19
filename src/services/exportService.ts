
import { GeneratedSlide } from '../types';
import jsPDF from 'jspdf';
import PptxGenJS from 'pptxgenjs';
import JSZip from 'jszip';
import { urlToBase64 } from '../utils';

// Helper to trigger download from Blob
const saveBlob = (blob: Blob, fileName: string) => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    link.click(); // Standard click might fail in some browsers without this
    URL.revokeObjectURL(link.href);
};

// Helper to get the best variant (first one) as Base64
// Now ASYNC to handle file URLs
const getSlideImageBase64 = async (item: GeneratedSlide): Promise<string | null> => {
    if (item.status === 'success' && item.variants && item.variants.length > 0) {
        const raw = item.variants[0];
        if (!raw) return null;

        // If it's already a Data URL (Base64), return it
        if (raw.startsWith('data:')) {
            return raw;
        }

        // If it's a file URL (e.g. /api/images/...), convert to Base64
        try {
            return await urlToBase64(raw);
        } catch (error) {
            console.error(`[ExportService] Failed to fetch image from URL: ${raw}`, error);
            // Fallback to previewUrl if available and it's a base64
            if (item.previewUrl?.startsWith('data:')) {
                return item.previewUrl;
            }
            return null;
        }
    }
    return null;
};

export const exportToZip = async (items: GeneratedSlide[], filename: string = 'slides-images') => {
    const zip = new JSZip();
    const validItems = items.filter(item => item.status === 'success' && item.variants.length > 0);

    if (validItems.length === 0) {
        throw new Error("没有可导出的已完成页面。");
    }

    // Process all items in parallel
    await Promise.all(validItems.map(async (item, index) => {
        const imgData = await getSlideImageBase64(item);
        if (imgData) {
            // Remove data:image/png;base64, prefix if present
            const base64Data = imgData.includes(',') ? imgData.split(',')[1] : imgData;
            // Format: 01_Title.png
            const safeTitle = (item.title || `slide-${index + 1}`).replace(/[^a-z0-9\u4e00-\u9fa5]/gi, '_');
            zip.file(`${String(index + 1).padStart(2, '0')}_${safeTitle}.png`, base64Data, { base64: true });
        }
    }));

    const content = await zip.generateAsync({ type: "blob" });
    saveBlob(content, `${filename}.zip`);
};

export const exportToPdf = async (items: GeneratedSlide[], filename: string = 'presentation') => {
    const validItems = items.filter(item => item.status === 'success' && item.variants.length > 0);

    if (validItems.length === 0) {
        throw new Error("没有可导出的已完成页面。");
    }

    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [254, 142.8] // 16:9 ratio
    });

    for (let i = 0; i < validItems.length; i++) {
        const item = validItems[i];
        if (i > 0) doc.addPage();

        const imgData = await getSlideImageBase64(item);
        if (imgData) {
            doc.addImage(imgData, 'PNG', 0, 0, 254, 142.8);
        }
    }

    doc.save(`${filename}.pdf`);
};

export const exportToPptx = async (items: GeneratedSlide[], filename: string = 'presentation') => {
    const validItems = items.filter(item => item.status === 'success' && item.variants.length > 0);

    if (validItems.length === 0) {
        throw new Error("没有可导出的已完成页面。");
    }

    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_16x9';

    for (const item of validItems) {
        const slide = pptx.addSlide();
        const imgData = await getSlideImageBase64(item);

        if (imgData) {
            slide.background = { data: imgData };
        }

        if (item.textContent) {
            slide.addNotes(item.textContent);
        }
    }

    await pptx.writeFile({ fileName: `${filename}.pptx` });
};

