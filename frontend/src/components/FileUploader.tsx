import React, { useRef, useState } from 'react';
import { UploadCloud, FileSpreadsheet, Sparkles, AlertCircle } from 'lucide-react';

interface FileUploaderProps {
  onUpload: (file: File) => Promise<void>;
  onLoadSample: (name: string) => Promise<void>;
  isLoading: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  onUpload,
  onLoadSample,
  isLoading,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndUpload = async (file: File) => {
    setError(null);
    const validExtensions = ['.csv', '.tsv', '.xlsx', '.xls'];
    const fileName = file.name.toLowerCase();
    const hasValidExt = validExtensions.some((ext) => fileName.endsWith(ext));

    if (!hasValidExt) {
      setError('Please upload a valid CSV, TSV, or Excel (.xlsx) file.');
      return;
    }

    if (file.size === 0) {
      setError('Uploaded file is empty (0 bytes).');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setError('File exceeds maximum upload size of 25 MB.');
      return;
    }

    try {
      await onUpload(file);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to parse file. Please verify file formatting.');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await validateAndUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await validateAndUpload(e.target.files[0]);
    }
  };

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isLoading && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-3xl p-10 transition-all cursor-pointer text-center ${
          isDragging
            ? 'border-emerald-500 bg-emerald-50/50 scale-[1.01]'
            : 'border-slate-300 hover:border-emerald-500 bg-white hover:bg-slate-50/70 shadow-sm'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.tsv,.xlsx,.xls"
          className="hidden"
          onChange={handleFileChange}
          disabled={isLoading}
        />

        <div className="flex flex-col items-center justify-center space-y-3.5">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs">
            {isLoading ? (
              <div className="w-7 h-7 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <UploadCloud className="w-8 h-8" />
            )}
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {isLoading ? 'Analyzing & Profiling Dataset...' : 'Upload your spreadsheet'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Drag & drop CSV, TSV, or Excel (.xlsx) files up to 25MB. Files are processed securely in temporary volatile memory.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-500 pt-2 font-medium">
            <span className="px-2.5 py-1 rounded-full bg-slate-100">Automatic Type Inference</span>
            <span className="px-2.5 py-1 rounded-full bg-slate-100">Duplicate & Null Detection</span>
            <span className="px-2.5 py-1 rounded-full bg-slate-100">Leading Zero Protection</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-3 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* One-click Sample Loaders */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-600">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span>Don't have a dataset ready? Try realistic test files:</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => onLoadSample('messy_sales')}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Messy Sales (CSV)</span>
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => onLoadSample('messy_customers')}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600" />
            <span>Messy Customers (Excel)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
