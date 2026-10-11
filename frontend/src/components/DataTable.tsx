import React, { useState, useMemo } from 'react';
import { Table, Eye, Search, ChevronLeft, ChevronRight, CheckCircle2, SplitSquareVertical, Flame, AlertTriangle } from 'lucide-react';
import { DatasetPreview } from '../types';
import { inspectCellQuality } from './DataQualityHeatmap';

interface DataTableProps {
  dataset: DatasetPreview;
}

export const DataTable: React.FC<DataTableProps> = ({ dataset }) => {
  const [viewMode, setViewMode] = useState<'cleaned' | 'raw' | 'diff' | 'heatmap'>('cleaned');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const rawRows = dataset.raw_preview_rows || [];
  const cleanRows = dataset.preview_rows || [];
  const columns = dataset.columns;

  const currentDatasetRows = viewMode === 'raw' ? rawRows : cleanRows;

  // Track duplicate rows in preview
  const duplicateRowIndices = useMemo(() => {
    const seen = new Set<string>();
    const dupes = new Set<number>();
    currentDatasetRows.forEach((row, idx) => {
      const rowKey = JSON.stringify(row);
      if (seen.has(rowKey)) {
        dupes.add(idx);
      } else {
        seen.add(rowKey);
      }
    });
    return dupes;
  }, [currentDatasetRows]);

  // Filter rows by search term
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return currentDatasetRows;
    const term = searchTerm.toLowerCase();
    return currentDatasetRows.filter((row) =>
      Object.values(row).some((val) =>
        String(val ?? '').toLowerCase().includes(term)
      )
    );
  }, [currentDatasetRows, searchTerm]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
      
      {/* Table Toolbar */}
      <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        
        {/* View Mode Toggle Buttons */}
        <div className="flex flex-wrap items-center space-x-1.5 p-1 bg-white rounded-xl border border-slate-200 shadow-xs w-fit">
          <button
            onClick={() => { setViewMode('cleaned'); setCurrentPage(1); }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewMode === 'cleaned'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Cleaned Preview</span>
          </button>

          <button
            onClick={() => { setViewMode('raw'); setCurrentPage(1); }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewMode === 'raw'
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Raw Original</span>
          </button>

          <button
            onClick={() => { setViewMode('diff'); setCurrentPage(1); }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewMode === 'diff'
                ? 'bg-amber-50 text-amber-700 border border-amber-200 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <SplitSquareVertical className="w-3.5 h-3.5" />
            <span>Diff Highlight</span>
          </button>

          <button
            onClick={() => { setViewMode('heatmap'); setCurrentPage(1); }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewMode === 'heatmap'
                ? 'bg-gradient-to-r from-amber-50 to-rose-50 text-amber-900 border border-amber-300 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>Quality Heatmap</span>
          </button>
        </div>

        {/* Search & Page Size */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search table..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-xs"
            />
          </div>

          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
            className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 shadow-xs focus:outline-none focus:border-emerald-500"
          >
            <option value={10}>10 rows</option>
            <option value={25}>25 rows</option>
            <option value={50}>50 rows</option>
          </select>
        </div>

      </div>

      {/* Table Content */}
      <div className="overflow-x-auto max-h-[500px]">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-100/90 sticky top-0 z-10 border-b border-slate-200">
            <tr>
              <th className="py-3 px-3 text-slate-400 font-mono w-10 text-center">#</th>
              {columns.map((col) => (
                <th key={col.name} className="py-3 px-4 font-semibold text-slate-700 whitespace-nowrap">
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center space-x-1.5">
                      <span>{col.name}</span>
                      <span className="text-[10px] font-normal text-slate-500 font-mono px-1.5 py-0.5 rounded bg-white border border-slate-200 shadow-2xs">
                        {col.inferred_type}
                      </span>
                    </div>

                    {/* Mini Column Quality Indicator in Heatmap Mode */}
                    {viewMode === 'heatmap' && (
                      <div className="flex items-center space-x-1 pt-0.5">
                        <div className="w-16 bg-slate-200 h-1.5 rounded-full overflow-hidden flex">
                          <div
                            style={{ width: `${Math.max(5, 100 - col.missing_pct)}%` }}
                            className={`${col.missing_pct === 0 ? 'bg-emerald-500' : 'bg-amber-500'} h-full`}
                          />
                        </div>
                        <span className="text-[9px] font-mono text-slate-400">
                          {Math.round(100 - col.missing_pct)}% clean
                        </span>
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 font-mono">
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="py-8 text-center text-slate-400 font-sans">
                  No matching records found.
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, rowIdx) => {
                const globalRowIdx = (currentPage - 1) * pageSize + rowIdx;
                const correspondingRawRow = rawRows[globalRowIdx];
                const isDupe = duplicateRowIndices.has(globalRowIdx);

                return (
                  <tr key={rowIdx} className={`transition ${isDupe && viewMode === 'heatmap' ? 'bg-rose-50/50' : 'hover:bg-slate-50/80'}`}>
                    <td className="py-2.5 px-3 text-slate-400 text-center text-[11px]">
                      {globalRowIdx + 1}
                    </td>

                    {columns.map((col) => {
                      const val = row[col.name];
                      const rawVal = correspondingRawRow ? correspondingRawRow[col.name] : undefined;
                      const isMissing = val === null || val === undefined || val === '';
                      const isChanged = viewMode === 'diff' && rawVal !== undefined && String(val) !== String(rawVal);
                      
                      // Calculate quality status for heatmap mode
                      const qualityInfo = viewMode === 'heatmap' ? inspectCellQuality(val, col, row, isDupe) : null;

                      let cellClassName = 'py-2.5 px-4 whitespace-nowrap text-slate-800';

                      if (viewMode === 'heatmap' && qualityInfo) {
                        if (qualityInfo.defectType === 'missing') {
                          cellClassName = 'py-2.5 px-4 whitespace-nowrap bg-amber-100/70 text-amber-900 border-l-2 border-amber-500 font-semibold';
                        } else if (qualityInfo.defectType === 'duplicate') {
                          cellClassName = 'py-2.5 px-4 whitespace-nowrap bg-rose-100/70 text-rose-900 border-l-2 border-rose-500 font-semibold';
                        } else if (qualityInfo.defectType === 'format_error') {
                          cellClassName = 'py-2.5 px-4 whitespace-nowrap bg-purple-100/70 text-purple-900 border-l-2 border-purple-500 font-semibold';
                        } else if (qualityInfo.defectType === 'whitespace') {
                          cellClassName = 'py-2.5 px-4 whitespace-nowrap bg-sky-100/70 text-sky-900 border-l-2 border-sky-500 font-semibold';
                        } else {
                          cellClassName = 'py-2.5 px-4 whitespace-nowrap text-slate-800 hover:bg-emerald-50/40';
                        }
                      } else if (isMissing) {
                        cellClassName = 'py-2.5 px-4 whitespace-nowrap text-amber-600/80 italic font-sans text-[11px]';
                      } else if (isChanged) {
                        cellClassName = 'py-2.5 px-4 whitespace-nowrap bg-amber-50/80 text-emerald-800 font-bold border-l-2 border-emerald-500';
                      }

                      return (
                        <td
                          key={col.name}
                          className={cellClassName}
                          title={qualityInfo ? `${qualityInfo.defectLabel}: ${qualityInfo.description}` : undefined}
                        >
                          {viewMode === 'heatmap' && qualityInfo && qualityInfo.defectType !== 'clean' ? (
                            <div className="flex items-center space-x-1.5">
                              <span>{String(val ?? '')}</span>
                              <span className="text-[9px] font-sans font-bold px-1.5 py-0.2 rounded bg-white/90 border border-slate-300 text-slate-700">
                                {qualityInfo.defectType === 'missing'
                                  ? 'null'
                                  : qualityInfo.defectType === 'duplicate'
                                  ? 'duplicate'
                                  : qualityInfo.defectType === 'format_error'
                                  ? 'format'
                                  : 'whitespace'}
                              </span>
                            </div>
                          ) : isMissing ? (
                            <span className="px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-sans font-medium">
                              null
                            </span>
                          ) : isChanged ? (
                            <div className="flex items-center space-x-1.5">
                              <span>{String(val)}</span>
                              <span className="text-[10px] text-slate-400 line-through">
                                ({String(rawVal)})
                              </span>
                            </div>
                          ) : (
                            String(val ?? '')
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Pagination Footer */}
      <div className="p-3 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
        <div>
          Showing {Math.min(filteredRows.length, (currentPage - 1) * pageSize + 1)} to{' '}
          {Math.min(filteredRows.length, currentPage * pageSize)} of {filteredRows.length} rows
          {dataset.row_count > 100 && (
            <span className="text-slate-400 ml-1">(preview limited to first 100 rows)</span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30 shadow-2xs"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="font-semibold text-slate-700">
            Page {currentPage} of {totalPages}
          </span>

          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30 shadow-2xs"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
};
