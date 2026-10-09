import React from 'react';
import { ShieldAlert, TrendingUp, CheckCircle, AlertTriangle, Layers, Hash } from 'lucide-react';
import { DatasetPreview } from '../types';

interface QualityScoreCardProps {
  dataset: DatasetPreview;
}

export const QualityScoreCard: React.FC<QualityScoreCardProps> = ({ dataset }) => {
  const diff = dataset.diff_summary;
  const currentScore = dataset.quality_score;
  const originalScore = diff?.original_quality_score ?? currentScore;
  const scoreImprovement = currentScore - originalScore;

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
    if (score >= 65) return 'text-amber-400 border-amber-500/40 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/40 bg-rose-500/10';
  };

  const getGaugeStroke = (score: number) => {
    if (score >= 85) return '#34d399';
    if (score >= 65) return '#fbbf24';
    return '#f87171';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      
      {/* Quality Score Gauge Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-medium">
            <span>Data Quality Health</span>
          </div>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">{currentScore}</span>
            <span className="text-xs text-slate-400 font-medium">/ 100</span>
          </div>

          {scoreImprovement > 0 && (
            <div className="flex items-center space-x-1 mt-2 text-xs font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/60 w-fit">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+{scoreImprovement} pts improved</span>
            </div>
          )}
          {scoreImprovement === 0 && (
            <div className="text-[11px] text-slate-500 mt-2">
              Original baseline: {originalScore}/100
            </div>
          )}
        </div>

        {/* Circular Gauge */}
        <div className="relative w-16 h-16 flex items-center justify-center">
          <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-slate-800"
              strokeWidth="3.5"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              strokeDasharray={`${currentScore}, 100`}
              strokeWidth="3.5"
              strokeLinecap="round"
              stroke={getGaugeStroke(currentScore)}
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <span className="absolute text-xs font-bold text-slate-200">
            {currentScore}%
          </span>
        </div>
      </div>

      {/* Row Stats */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400 font-medium">Rows & Columns</span>
          <Layers className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="mt-2">
          <div className="text-2xl font-bold text-white tracking-tight">
            {dataset.row_count}{' '}
            <span className="text-xs font-normal text-slate-400">rows</span>
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            {dataset.column_count} columns
          </div>
        </div>
        {diff?.rows_removed > 0 ? (
          <div className="text-[11px] text-emerald-400 font-medium mt-2">
            ↓ {diff.rows_removed} rows removed (deduplication)
          </div>
        ) : (
          <div className="text-[11px] text-slate-500 mt-2">
            Original: {diff?.original_rows || dataset.row_count} rows
          </div>
        )}
      </div>

      {/* Missing Values Stats */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400 font-medium">Missing Cells</span>
          <AlertTriangle className={`w-4 h-4 ${dataset.total_missing_cells > 0 ? 'text-amber-400' : 'text-emerald-400'}`} />
        </div>
        <div className="mt-2">
          <div className="text-2xl font-bold text-white tracking-tight">
            {dataset.total_missing_cells}
            <span className="text-xs font-normal text-slate-400 ml-1">
              ({dataset.missing_pct}%)
            </span>
          </div>
        </div>
        {diff?.missing_resolved > 0 ? (
          <div className="text-[11px] text-emerald-400 font-medium mt-2">
            ✓ {diff.missing_resolved} cells filled/resolved
          </div>
        ) : (
          <div className="text-[11px] text-slate-500 mt-2">
            {dataset.total_missing_cells === 0 ? 'All cells complete' : 'Action needed'}
          </div>
        )}
      </div>

      {/* Duplicate Rows Stats */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400 font-medium">Exact Duplicates</span>
          <Hash className={`w-4 h-4 ${dataset.duplicate_rows > 0 ? 'text-rose-400' : 'text-emerald-400'}`} />
        </div>
        <div className="mt-2">
          <div className="text-2xl font-bold text-white tracking-tight">
            {dataset.duplicate_rows}
          </div>
        </div>
        {diff?.duplicates_removed > 0 ? (
          <div className="text-[11px] text-emerald-400 font-medium mt-2">
            ✓ {diff.duplicates_removed} duplicates cleaned
          </div>
        ) : (
          <div className="text-[11px] text-slate-500 mt-2">
            {dataset.duplicate_rows === 0 ? 'No duplicates found' : 'Ready for removal'}
          </div>
        )}
      </div>

    </div>
  );
};
