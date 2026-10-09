import React, { useState, useMemo } from 'react';
import { Table, Eye, Search, ChevronLeft, ChevronRight, CheckCircle2, SplitSquareVertical } from 'lucide-react';
import { DatasetPreview } from '../types';

interface DataTableProps {
  dataset: DatasetPreview;
}

export const DataTable: React.FC<DataTableProps> = ({ dataset }) => {
  const [viewMode, setViewMode] = useState<'cleaned' | 'raw' | 'diff'>('cleaned');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const rawRows = dataset.raw_preview_rows || [];
  const cleanRows = dataset.preview_rows || [];
  const columns = dataset.columns;

  const currentDatasetRows = viewMode === 'raw' ? rawRows : cleanRows;

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
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      
      {/* Table Toolbar */}
      <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        
        {/* View Mode Toggle Buttons */}
        <div className="flex items-center space-x-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 w-fit">
          <button
            onClick={() => { setViewMode('cleaned'); setCurrentPage(1); }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewMode === 'cleaned'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Cleaned Preview</span>
          </button>

          <button
            onClick={() => { setViewMode('raw'); setCurrentPage(1); }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewMode === 'raw'
                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Raw Original</span>
          </button>

          <button
            onClick={() => { setViewMode('diff'); setCurrentPage(1); }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewMode === 'diff'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <SplitSquareVertical className="w-3.5 h-3.5" />
            <span>Diff Highlight</span>
          </button>
        </div>

        {/* Search & Page Size */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search table..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-emerald-500"
            />
          </div>

          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
            className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300"
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
          <thead className="bg-slate-950/80 sticky top-0 z-10 border-b border-slate-800">
            <tr>
              <th className="py-3 px-3 text-slate-500 font-mono w-10 text-center">#</th>
              {columns.map((col) => (
                <th key={col.name} className="py-3 px-4 font-semibold text-slate-200 whitespace-nowrap">
                  <div className="flex items-center space-x-1.5">
                    <span>{col.name}</span>
                    <span className="text-[10px] font-normal text-slate-500 font-mono px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800">
                      {col.inferred_type}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800/60 font-mono">
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="py-8 text-center text-slate-500">
                  No matching records found.
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, rowIdx) => {
                const globalRowIdx = (currentPage - 1) * pageSize + rowIdx;
                const correspondingRawRow = rawRows[globalRowIdx];

                return (
                  <tr key={rowIdx} className="hover:bg-slate-800/30 transition">
                    <td className="py-2.5 px-3 text-slate-600 text-center text-[11px]">
                      {globalRowIdx + 1}
                    </td>

                    {columns.map((col) => {
                      const val = row[col.name];
                      const rawVal = correspondingRawRow ? correspondingRawRow[col.name] : undefined;
                      const isMissing = val === null || val === undefined || val === '';
                      const isChanged = viewMode === 'diff' && rawVal !== undefined && String(val) !== String(rawVal);

                      return (
                        <td
                          key={col.name}
                          className={`py-2.5 px-4 whitespace-nowrap ${
                            isMissing
                              ? 'text-amber-500/80 italic font-sans text-[11px]'
                              : isChanged
                              ? 'bg-amber-500/10 text-emerald-300 font-bold border-l-2 border-emerald-400'
                              : 'text-slate-300'
                          }`}
                        >
                          {isMissing ? (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[10px]">
                              null
                            </span>
                          ) : isChanged ? (
                            <div className="flex items-center space-x-1.5">
                              <span>{String(val)}</span>
                              <span className="text-[10px] text-slate-500 line-through">
                                ({String(rawVal)})
                              </span>
                            </div>
                          ) : (
                            String(val)
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
      <div className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <div>
          Showing {Math.min(filteredRows.length, (currentPage - 1) * pageSize + 1)} to{' '}
          {Math.min(filteredRows.length, currentPage * pageSize)} of {filteredRows.length} rows
          {dataset.row_count > 100 && (
            <span className="text-slate-500 ml-1">(preview limited to first 100 rows)</span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-300 hover:text-white disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="font-semibold text-slate-200">
            Page {currentPage} of {totalPages}
          </span>

          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-300 hover:text-white disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
};
