import React, { useState, useEffect } from 'react';
import { History, Clock, FileSpreadsheet, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import { HistoryItem, DatasetPreview } from '../types';
import { api } from '../services/api';

interface HistoryTabProps {
  dataset: DatasetPreview;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({ dataset }) => {
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const data = await api.getHistory();
        setHistoryList(data.history || []);
      } catch (err) {
        console.error('Failed to load history', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, []);

  return (
    <div className="space-y-6">
      
      {/* Active Session Audit Changelog */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-white font-semibold text-sm">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span>Current Session Changelog ({dataset.applied_operations.length} steps)</span>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            ID: {dataset.session_id.substring(0, 8)}...
          </span>
        </div>

        {dataset.applied_operations.length === 0 ? (
          <div className="text-xs text-slate-500 py-3">
            No transformations applied yet. Upload a dataset and execute AI or manual cleaning steps.
          </div>
        ) : (
          <div className="space-y-2.5">
            {dataset.applied_operations.map((op, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-start space-x-3 text-xs"
              >
                <span className="font-mono text-emerald-400 font-semibold pt-0.5">
                  #{op.step_number}
                </span>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">{op.operation}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(op.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-slate-400">{op.detail?.description || 'Executed transformation'}</p>
                  {op.ai_reasoning && (
                    <p className="text-[11px] text-indigo-300/80">
                      AI Reasoning: {op.ai_reasoning}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past Sessions from Database */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-400 tracking-wider uppercase">
            MongoDB Cleaning History ({historyList.length})
          </h4>
          <div className="flex items-center space-x-1 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
            <span>Metadata & Metrics Only</span>
          </div>
        </div>

        {isLoading ? (
          <div className="text-xs text-slate-500 py-4 text-center">Loading past sessions...</div>
        ) : historyList.length === 0 ? (
          <div className="p-6 rounded-2xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
            No prior sessions saved in MongoDB yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80 bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
            {historyList.map((item) => (
              <div key={item._id} className="p-4 flex items-center justify-between hover:bg-slate-800/20 transition">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">{item.filename}</span>
                    <span className="text-[10px] text-slate-500">
                      ({Math.round(item.file_size / 1024)} KB)
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {item.operations_count} operations executed • {item.result_metrics?.rows_removed ?? 0} duplicates removed • {item.result_metrics?.missing_resolved ?? 0} missing filled
                  </div>
                </div>

                <div className="text-right text-[11px] text-slate-500">
                  {new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
