
import { GeneratedSlide } from '../types';
import jsPDF from 'jspdf';
import PptxGenJS from 'pptxgenjs';
import JSZip from 'jszip';
import { saveAs } from 'file-saver'; // Usually needed for JSZip, but we can implement a simple save helper if needed, or use JSZip's internal generateAsync

// Helper to trigger download from Blob
const saveBlob = (blob: Blob, fileName: string) => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
};

// Helper to get the best variant (first one)
const getSlideImage = (item: GeneratedSlide): string | null => {
    if (item.status === 'success' && item.variants && item.variants.length > 0) {
        return item.variants[0];
    }
    return null;
};

export const exportToZip = async (items: GeneratedSlide[], filename: string = 'slides-images') => {
    const zip = new JSZip();
    const validItems = items.filter(item => item.status === 'success' && item.variants.length > 0);
    
    if (validItems.length === 0) {
        alert("没有可导出的已完成页面。");
        return;
    }

    validItems.forEach((item, index) => {
        const imgData = getSlideImage(item);
        if (imgData) {
            // Remove data:image/png;base64, prefix
            const base64Data = imgData.split(',')[1];
            // Format: 01_Title.png
            const safeTitle = (item.title || `slide-${index + 1}`).replace(/[^a-z0-9\u4e00-\u9fa5]/gi, '_');
            zip.file(`${String(index + 1).padStart(2, '0')}_${safeTitle}.png`, base64Data, {base64: true});
        }
    });

    const content = await zip.generateAsync({type: "blob"});
    saveBlob(content, `${filename}.zip`);
};

export const exportToPdf = (items: GeneratedSlide[], filename: string = 'presentation') => {
    const validItems = items.filter(item => item.status === 'success' && item.variants.length > 0);

    if (validItems.length === 0) {
        alert("没有可导出的已完成页面。");
        return;
    }

    // Default A4 landscape roughly, or 16:9 ratio
    // 16:9 ratio @ 254mm width ~ 142.8mm height
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [254, 142.8] // Custom 16:9-ish size
    });

    validItems.forEach((item, index) => {
        if (index > 0) doc.addPage();
        
        const imgData = getSlideImage(item);
        if (imgData) {
            // Add image to cover the whole PDF page
            doc.addImage(imgData, 'PNG', 0, 0, 254, 142.8);
        }
    });

    doc.save(`${filename}.pdf`);
};

export const exportToPptx = async (items: GeneratedSlide[], filename: string = 'presentation') => {
    const validItems = items.filter(item => item.status === 'success' && item.variants.length > 0);

    if (validItems.length === 0) {
        alert("没有可导出的已完成页面。");
        return;
    }

    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_16x9'; 

    validItems.forEach((item) => {
        const slide = pptx.addSlide();
        const imgData = getSlideImage(item);
        
        if (imgData) {
            // Set image as background or full size image
            slide.background = { data: imgData };
            // Alternatively: slide.addImage({ data: imgData, x: 0, y: 0, w: '100%', h: '100%' });
        }
        
        // Add hidden notes if text content exists
        if (item.textContent) {
            slide.addNotes(item.textContent);
        }
    });

    await pptx.writeFile({ fileName: `${filename}.pptx` });
};
