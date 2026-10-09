import React, { useState } from 'react';
import { AlertCircle, CheckCircle, ChevronDown, ChevronUp, Zap, Check, ShieldCheck } from 'lucide-react';
import { DetectedIssue } from '../types';

interface IssueListBannerProps {
  issues: DetectedIssue[];
  onApplyQuickFix: (issue: DetectedIssue) => Promise<void>;
  onDismissIssue?: (issue: DetectedIssue) => Promise<void>;
  isLoading: boolean;
}

export const IssueListBanner: React.FC<IssueListBannerProps> = ({
  issues,
  onApplyQuickFix,
  onDismissIssue,
  isLoading,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!issues || issues.length === 0) {
    return (
      <div className="bg-emerald-950/30 border border-emerald-700/60 rounded-2xl p-4 flex items-center space-x-3 shadow-lg shadow-emerald-950/20">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
          <CheckCircle className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-emerald-300">All Quality Issues Resolved!</h4>
          <p className="text-xs text-emerald-400/90">
            No duplicates, missing values, unparsed dates, or format inconsistencies detected. Dataset is clean and analysis-ready.
          </p>
        </div>
      </div>
    );
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">High Priority</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">Medium</span>;
      case 'low':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">Low</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Info</span>;
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
      {/* Header */}
      <div className="px-5 py-3.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <AlertCircle className="w-4 h-4 text-amber-400" />
          <h4 className="text-sm font-semibold text-white">
            Detected Issues ({issues.length})
          </h4>
          <span className="text-xs text-slate-400 hidden sm:inline">
            • Review detected anomalies and apply 1-click fixes
          </span>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-slate-400 hover:text-white flex items-center space-x-1"
        >
          <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Issues List */}
      {isExpanded && (
        <div className="divide-y divide-slate-800/80 max-h-72 overflow-y-auto">
          {issues.map((issue) => (
            <div
              key={issue.id}
              className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/30 transition"
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  {getSeverityBadge(issue.severity)}
                  <span className="text-xs font-semibold text-slate-200">{issue.title}</span>
                </div>
                <p className="text-[11px] text-slate-400">{issue.description}</p>
              </div>

              <div className="flex items-center space-x-2 flex-shrink-0">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => onApplyQuickFix(issue)}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition whitespace-nowrap shadow-sm"
                >
                  <Zap className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Quick Fix</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
