import React, { useRef, useState } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { StoredResource } from '../types';
import { resolveResourceUrl } from '../utils/resource';
import { uploadFile } from '../api/client';

interface ImageUploaderProps {
  label?: string;
  subLabel?: string;
  files: StoredResource[];
  onFilesSelected: (files: StoredResource[]) => void;
  onRemoveFile: (index: number) => void;
  multiple?: boolean;
  accept?: string;
  variant?: 'style-ref' | 'default';
  onClick?: () => void;
  autoUpload?: boolean;
  readOnly?: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  label,
  subLabel,
  files,
  onFilesSelected,
  onRemoveFile,
  multiple = false,
  accept = "image/*",
  variant = 'default',
  onClick,
  autoUpload = false,
  readOnly = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);

      if (autoUpload) {
        setIsUploading(true);
        const uploadedUrls: string[] = [];
        try {
          for (const file of selectedFiles) {
            const formData = new FormData();
            formData.append('file', file);
            // Upload to backend using helper
            const url = await uploadFile(file);
            if (url) {
              uploadedUrls.push(url);
            }
          }
          if (uploadedUrls.length > 0) {
            onFilesSelected(uploadedUrls);
          }
        } catch (error) {
          console.error("Upload failed", error);
          alert("上传失败，请重试");
        } finally {
          setIsUploading(false);
        }
      } else {
        // Classic behavior
        onFilesSelected(selectedFiles);
      }
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerSelect = () => {
    if (!isUploading && !readOnly) {
      fileInputRef.current?.click();
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (readOnly) return;
    if (onClick) {
      onClick();
    } else {
      triggerSelect();
    }
  };

  if (variant === 'style-ref') {
    return (
      <div className={`w-full h-full relative group ${readOnly ? 'pointer-events-none' : ''}`}>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple={multiple}
          accept={accept}
          className="hidden"
          disabled={readOnly}
        />

        {files.length > 0 ? (
          <div className="w-full h-full relative rounded-lg overflow-hidden border border-rose-200">
            <img
              src={resolveResourceUrl(files[0])}
              alt="style ref"
              className="w-full h-full object-cover"
            />
            {!readOnly && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveFile(0);
                }}
                className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-colors"
              >
                <X size={12} />
              </button>
            )}
          </div>
        ) : (
          <div
            onClick={handleClick}
            className={`w-full h-full min-h-[100px] border-2 border-dashed border-slate-300 transition-all rounded-lg flex flex-col items-center justify-center text-center p-2 bg-slate-50 ${readOnly ? 'opacity-50 cursor-default' : 'hover:border-rose-400 hover:bg-rose-50/30 cursor-pointer'
              }`}
          >
            {isUploading ? (
              <Loader2 className="animate-spin text-rose-500" size={16} />
            ) : (
              <div className={`bg-white p-2 rounded-full mb-2 shadow-sm border border-slate-100 ${readOnly ? 'text-slate-300' : 'text-rose-500'}`}>
                <Upload size={16} />
              </div>
            )}
            <span className="text-[10px] font-medium text-slate-500 leading-tight">
              {isUploading ? "上传中..." : (label || "上传参考图")}
            </span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="w-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple={multiple}
        accept={accept}
        className="hidden"
        disabled={readOnly}
      />
      <div
        onClick={handleClick}
        className={`w-full border-2 border-dashed border-slate-300 transition-all rounded-lg flex flex-col items-center justify-center text-center p-8 bg-slate-50 ${isUploading || readOnly ? 'opacity-50 pointer-events-none' : 'hover:border-rose-400 hover:bg-rose-50/30 cursor-pointer'
          }`}
      >
        {isUploading ? (
          <Loader2 className="animate-spin text-rose-500 mb-3" size={24} />
        ) : (
          <div className="bg-white p-3 rounded-full mb-3 shadow-sm text-rose-500 border border-slate-100">
            <Upload size={24} />
          </div>
        )}
        <span className="font-medium text-slate-700 block mb-1">
          {isUploading ? "正在上传..." : (label || "点击上传图片")}
        </span>
        <span className="text-xs text-slate-400 block">
          {subLabel || "支持拖拽上传"}
        </span>
      </div>
    </div>
  );
};
