import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Zap
} from 'lucide-react';
import { DetectedIssue } from '../types';

interface IssueListBannerProps {
  issues: DetectedIssue[];
  onApplyQuickFix: (issue: DetectedIssue) => Promise<void>;
  onApplyBatchFixes?: (issues: DetectedIssue[]) => Promise<void>;
  onContinueToDataView?: () => void;
  isLoading: boolean;
}

export const IssueListBanner: React.FC<IssueListBannerProps> = ({
  issues,
  onApplyQuickFix,
  onApplyBatchFixes,
  onContinueToDataView,
  isLoading,
}) => {
  // Track selected issues for bulk auto-correction
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Default: all issues selected initially (matching screenshot "6 of 6 issues selected")
  useEffect(() => {
    if (issues && issues.length > 0) {
      setSelectedIds(issues.map((i) => i.id));
    } else {
      setSelectedIds([]);
    }
  }, [issues]);

  const handleSelectAll = () => {
    setSelectedIds(issues.map((i) => i.id));
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleAutoCorrectSelected = async () => {
    const selectedIssues = issues.filter((i) => selectedIds.includes(i.id));
    if (selectedIssues.length === 0) return;

    if (onApplyBatchFixes) {
      await onApplyBatchFixes(selectedIssues);
    } else {
      // Apply sequentially if batch not provided
      for (const iss of selectedIssues) {
        await onApplyQuickFix(iss);
      }
    }
  };

  // When no issues remain
  if (!issues || issues.length === 0) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-base font-bold text-emerald-900">All Quality Issues Resolved!</h4>
            <p className="text-xs text-emerald-700 mt-0.5">
              No duplicates, missing values, unparsed dates, or formatting discrepancies detected.
            </p>
          </div>
        </div>

        {onContinueToDataView && (
          <button
            type="button"
            onClick={onContinueToDataView}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#009A49] hover:bg-[#00823E] text-white transition shadow-sm"
          >
            <span>Continue to Data View</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  // Format card title nicely: e.g. "customerid - OUTLIERS"
  const formatCardTitle = (issue: DetectedIssue) => {
    const col = issue.affected_columns && issue.affected_columns[0] ? issue.affected_columns[0] : 'DATASET';
    const typeLabel = issue.category ? issue.category.toUpperCase().replace('_', ' ') : 'DEFECT';
    return `${col} - ${typeLabel}`;
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
      
      {/* 1. Auto-correction Options Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
        <div className="flex items-center space-x-2.5">
          <span className="text-xs sm:text-sm font-semibold text-slate-700">Auto-correction Options:</span>
          <button
            type="button"
            onClick={handleSelectAll}
            className="px-3 py-1 rounded-lg text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-xs transition"
          >
            Select All
          </button>
          <button
            type="button"
            onClick={handleDeselectAll}
            className="px-3 py-1 rounded-lg text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-xs transition"
          >
            Deselect All
          </button>
        </div>

        <div className="text-xs font-medium text-slate-500">
          {selectedIds.length} of {issues.length} issues selected
        </div>
      </div>

      {/* 2. Section Title */}
      <div>
        <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
          Data Quality Issues
        </h3>
      </div>

      {/* 3. Two-Column Issue Cards Grid (matching screenshot) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {issues.map((issue) => {
          const isSelected = selectedIds.includes(issue.id);
          const isHigh = issue.severity === 'high';
          const isMedium = issue.severity === 'medium';
          
          // Card theme: Pink for high, Yellow for medium, Sky for low/info
          const cardBg = isHigh 
            ? 'bg-[#FFF5F5] border-rose-200/90 hover:border-rose-300' 
            : isMedium 
            ? 'bg-[#FEFCE8] border-amber-200/90 hover:border-amber-300' 
            : 'bg-[#F0F9FF] border-sky-200/90 hover:border-sky-300';

          return (
            <div
              key={issue.id}
              onClick={() => toggleSelect(issue.id)}
              className={`border rounded-2xl p-4 sm:p-4.5 flex items-start justify-between gap-3 cursor-pointer transition select-none ${cardBg}`}
            >
              <div className="flex items-start space-x-3">
                {/* Custom Circular Checkbox */}
                <div className="mt-0.5 flex-shrink-0">
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center border transition ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-600'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-emerald-600" />
                    )}
                  </div>
                </div>

                {/* Sparkline / Chart Icon */}
                <div className="w-8 h-8 rounded-lg bg-indigo-100/80 border border-indigo-200/60 flex items-center justify-center text-indigo-600 flex-shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>

                {/* Issue Details */}
                <div className="space-y-0.5">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                    {formatCardTitle(issue)}
                  </h4>
                  <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
                    {issue.description}
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                    Affects {issue.affected_columns?.join(', ') || 'dataset'} • Severity: {issue.severity}
                  </p>
                </div>
              </div>

              {/* Warning Tag matching screenshot */}
              <div className="flex flex-col items-end flex-shrink-0">
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold text-amber-700 bg-amber-100/60 border border-amber-200">
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                  <span>Needs attention</span>
                </span>

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={(e) => {
                    e.stopPropagation();
                    onApplyQuickFix(issue);
                  }}
                  className="mt-2 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 underline"
                  title="Fix this individual issue"
                >
                  Quick Fix
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Bottom Action Footer matching screenshot */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-100">
        <div className="text-xs sm:text-sm font-medium text-slate-600">
          Auto-correction will resolve {selectedIds.length} selected issues
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            disabled={isLoading || selectedIds.length === 0}
            onClick={handleAutoCorrectSelected}
            className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#009A49] hover:bg-[#00823E] disabled:opacity-50 text-white transition shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            <span>Auto Correct {selectedIds.length} Issues</span>
          </button>

          {onContinueToDataView && (
            <button
              type="button"
              onClick={onContinueToDataView}
              className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#009A49] hover:bg-[#00823E] text-white transition shadow-sm"
            >
              <span>Continue to Data View</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

    </div>
  );
};
