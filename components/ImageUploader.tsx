
import React, { useRef } from 'react';
import { Upload, X } from 'lucide-react';

interface ImageUploaderProps {
  label?: string;
  subLabel?: string;
  files: File[];
  onFilesSelected: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  multiple?: boolean;
  accept?: string;
  variant?: 'style-ref' | 'default'; 
  onClick?: () => void;
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
  onClick
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      onFilesSelected(newFiles);
    }
    // Reset input
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const triggerSelect = () => {
    fileInputRef.current?.click();
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
        onClick();
    } else {
        triggerSelect();
    }
  };

  if (variant === 'style-ref') {
     return (
         <div className="w-full h-full relative group">
             <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                multiple={multiple}
                accept={accept}
                className="hidden"
              />
              
             {files.length > 0 ? (
                 <div className="w-full h-full relative rounded-lg overflow-hidden border border-rose-200">
                     <img 
                        src={URL.createObjectURL(files[0])} 
                        alt="style ref" 
                        className="w-full h-full object-cover" 
                     />
                     <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemoveFile(0);
                        }}
                        className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-colors"
                      >
                        <X size={12} />
                      </button>
                 </div>
             ) : (
                <div 
                    onClick={handleClick}
                    className="w-full h-full min-h-[100px] border-2 border-dashed border-slate-300 hover:border-rose-400 hover:bg-rose-50/30 transition-all rounded-lg cursor-pointer flex flex-col items-center justify-center text-center p-2 bg-slate-50"
                >
                    <div className="bg-white p-2 rounded-full mb-2 shadow-sm text-rose-500 border border-slate-100">
                        <Upload size={16} />
                    </div>
                    <span className="text-[10px] font-medium text-slate-500 leading-tight">
                        {label || "上传参考图"}
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
      />
      <div 
          onClick={handleClick}
          className="w-full border-2 border-dashed border-slate-300 hover:border-rose-400 hover:bg-rose-50/30 transition-all rounded-lg cursor-pointer flex flex-col items-center justify-center text-center p-8 bg-slate-50"
      >
          <div className="bg-white p-3 rounded-full mb-3 shadow-sm text-rose-500 border border-slate-100">
              <Upload size={24} />
          </div>
          <span className="font-medium text-slate-700 block mb-1">
              {label || "点击上传图片"}
          </span>
           <span className="text-xs text-slate-400 block">
              {subLabel || "支持拖拽上传"}
          </span>
      </div>
    </div>
  );
};
