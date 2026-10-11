import React from 'react';
import { RotateCcw } from 'lucide-react';
import { DatasetPreview } from '../types';

interface QualityScoreCardProps {
  dataset: DatasetPreview;
  onStartFresh?: () => void;
}

export const QualityScoreCard: React.FC<QualityScoreCardProps> = ({ dataset, onStartFresh }) => {
  const issuesCount = dataset.issues?.length || 0;
  
  // Count date columns in dataset
  const dateColumnsCount = dataset.columns?.filter(c => 
    c.inferred_type === 'date' || 
    c.inferred_type === 'datetime' || 
    c.name.toLowerCase().includes('date')
  ).length || 0;

  return (
    <div className="bg-[#F8FAFC] border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-sm space-y-6">
      
      {/* Top Header matching reference image */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#0D3B23] tracking-tight">
            Data Validation Results
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            File: <span className="text-slate-700 font-semibold">{dataset.filename}</span>
          </p>
        </div>

        {onStartFresh && (
          <button
            type="button"
            onClick={onStartFresh}
            className="self-start sm:self-auto flex items-center space-x-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-sm transition hover:shadow"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Start Fresh</span>
          </button>
        )}
      </div>

      {/* 4 KPI Metric Cards in a row matching reference image */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        
        {/* 1. Total Rows (Bold Green) */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 text-center shadow-xs hover:border-emerald-300 transition">
          <div className="text-2xl sm:text-3xl font-extrabold text-[#00A86B] tracking-tight">
            {dataset.row_count}
          </div>
          <div className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
            Total Rows
          </div>
        </div>

        {/* 2. Columns (Bold Blue) */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 text-center shadow-xs hover:border-blue-300 transition">
          <div className="text-2xl sm:text-3xl font-extrabold text-[#2563EB] tracking-tight">
            {dataset.column_count}
          </div>
          <div className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
            Columns
          </div>
        </div>

        {/* 3. Issues Found (Bold Orange) */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 text-center shadow-xs hover:border-orange-300 transition">
          <div className="text-2xl sm:text-3xl font-extrabold text-[#EA580C] tracking-tight">
            {issuesCount}
          </div>
          <div className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
            Issues Found
          </div>
        </div>

        {/* 4. Date Columns / Health (Bold Purple) */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 text-center shadow-xs hover:border-purple-300 transition">
          <div className="text-2xl sm:text-3xl font-extrabold text-[#9333EA] tracking-tight">
            {dateColumnsCount > 0 ? dateColumnsCount : `${dataset.quality_score}%`}
          </div>
          <div className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
            {dateColumnsCount > 0 ? 'Date Columns' : 'Quality Health'}
          </div>
        </div>

      </div>

    </div>
  );
};
