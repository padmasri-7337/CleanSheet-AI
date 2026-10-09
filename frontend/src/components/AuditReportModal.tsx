import React, { useEffect, useState } from 'react';
import { X, Printer, ShieldCheck, CheckCircle2, TrendingUp, Layers, Hash, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { AuditReport } from '../types';
import { api } from '../services/api';

interface AuditReportModalProps {
  sessionId: string;
  onClose: () => void;
}

export const AuditReportModal: React.FC<AuditReportModalProps> = ({ sessionId, onClose }) => {
  const [report, setReport] = useState<AuditReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const data = await api.getAuditReport(sessionId);
        setReport(data);
      } catch (err) {
        console.error('Failed to load audit report', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReport();
  }, [sessionId]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Transparent Cleaning Audit Report</h3>
              <p className="text-[11px] text-slate-400">Verifiable transformation log and quality impact summary</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-200 text-xs">
          {isLoading || !report ? (
            <div className="py-12 text-center text-slate-500">Generating audit report...</div>
          ) : (
            <>
              {/* Metadata strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 font-mono text-[11px]">
                <div>
                  <span className="text-slate-500 block">Target File</span>
                  <span className="font-semibold text-white">{report.filename}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Audit Timestamp</span>
                  <span className="text-slate-300">
                    {new Date(report.timestamp).toLocaleDateString()} {new Date(report.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Transformations</span>
                  <span className="text-emerald-400 font-bold">{report.operations_executed.length} steps</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Quality Impact</span>
                  <span className="text-emerald-400 font-bold">
                    {report.initial_stats.quality_score} → {report.final_stats.quality_score} pts (+{report.diff_summary.quality_score_improvement})
                  </span>
                </div>
              </div>

              {/* Before vs After Impact Comparison */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                  Before vs After Comparison
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                    <span className="text-[11px] text-slate-500">Total Rows</span>
                    <div className="text-base font-bold text-white mt-1">
                      {report.initial_stats.row_count} → {report.final_stats.row_count}
                    </div>
                    <span className="text-[10px] text-emerald-400">
                      {report.diff_summary.rows_removed} duplicate rows pruned
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                    <span className="text-[11px] text-slate-500">Total Columns</span>
                    <div className="text-base font-bold text-white mt-1">
                      {report.initial_stats.column_count} → {report.final_stats.column_count}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {report.diff_summary.cols_delta === 0 ? 'Preserved structure' : `${report.diff_summary.cols_delta} change`}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                    <span className="text-[11px] text-slate-500">Missing Cells</span>
                    <div className="text-base font-bold text-white mt-1">
                      {report.initial_stats.total_missing_cells} → {report.final_stats.total_missing_cells}
                    </div>
                    <span className="text-[10px] text-emerald-400">
                      {report.diff_summary.missing_resolved} cells resolved
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                    <span className="text-[11px] text-slate-500">Cells Modified</span>
                    <div className="text-base font-bold text-white mt-1">
                      {report.diff_summary.changed_cells_count} cells
                    </div>
                    <span className="text-[10px] text-emerald-400">
                      Cleaned & formatted
                    </span>
                  </div>
                </div>
              </div>

              {/* Operations Executed Detailed Log */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                  Executed Cleaning Operations ({report.operations_executed.length})
                </h4>
                {report.operations_executed.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-950/40 text-slate-500 text-center">
                    No operations applied. Dataset is in original uploaded state.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {report.operations_executed.map((op, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start space-x-3"
                      >
                        <span className="font-mono text-emerald-400 font-bold">#{op.step_number}</span>
                        <div className="flex-1 space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-200">{op.operation}</span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {new Date(op.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-slate-400 text-[11px]">{op.detail?.description}</p>
                          {op.ai_reasoning && (
                            <p className="text-[10px] text-indigo-300">
                              Reasoning: {op.ai_reasoning}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Data Retention & Privacy Disclaimer */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-start space-x-2.5 text-[11px] text-slate-400">
                <ShieldCheck className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-300">Retention & Privacy Guarantee: </span>
                  {report.retention_policy}
                </div>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
};
