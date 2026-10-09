import React, { useRef, useState } from 'react';
import { UploadCloud, FileSpreadsheet, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';

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
        className={`relative border-2 border-dashed rounded-2xl p-8 transition-all cursor-pointer text-center ${
          isDragging
            ? 'border-emerald-400 bg-emerald-950/20 scale-[1.01]'
            : 'border-slate-800 hover:border-slate-700 bg-slate-900/50 hover:bg-slate-900/80'
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

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <UploadCloud className="w-7 h-7" />
            )}
          </div>

          <div>
            <h3 className="text-base font-semibold text-white">
              {isLoading ? 'Analyzing & Profiling Dataset...' : 'Upload your messy spreadsheet'}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Drag & drop CSV, TSV, or Excel (.xlsx) files up to 25MB. Files are processed securely in temporary volatile memory.
            </p>
          </div>

          <div className="flex items-center space-x-4 text-[11px] text-slate-500 pt-1">
            <span>• Automatic Type Inference</span>
            <span>• Duplicate & Null Detection</span>
            <span>• Leading Zero Protection</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-3 p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* One-click Sample Loaders */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/80">
        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>Don't have a dataset? Try realistic test files:</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => onLoadSample('messy_sales')}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Messy Sales (CSV)</span>
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => onLoadSample('messy_customers')}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-teal-400" />
            <span>Messy Customers (Excel)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
