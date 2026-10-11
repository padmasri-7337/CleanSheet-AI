import React, { useState, useMemo } from 'react';
import {
  Flame,
  AlertTriangle,
  CheckCircle2,
  CopyX,
  HelpCircle,
  Sparkles,
  Layers,
  Filter,
  Eye,
  ArrowRight,
  Info,
  Calendar,
  DollarSign
} from 'lucide-react';
import { DatasetPreview, ColumnProfile } from '../types';

interface DataQualityHeatmapProps {
  dataset: DatasetPreview;
  onNavigateToRow?: (rowIndex: number) => void;
  onApplyQuickFix?: (issueId: string) => void;
}

export type DefectType = 'clean' | 'missing' | 'duplicate' | 'format_error' | 'whitespace';

export interface CellQualityInfo {
  rowIndex: number;
  column: string;
  value: any;
  defectType: DefectType;
  defectLabel: string;
  severity: 'none' | 'low' | 'medium' | 'high';
  description: string;
  suggestedAction?: string;
}

// Helper to evaluate cell quality status
export const inspectCellQuality = (
  val: any,
  col: ColumnProfile,
  row: Record<string, any>,
  isDuplicateRow: boolean
): CellQualityInfo => {
  // 1. Missing / Null check
  const isNull =
    val === null ||
    val === undefined ||
    val === '' ||
    String(val).trim() === '' ||
    ['nan', 'null', 'none', 'n/a', 'na', '#n/a', '#value!'].includes(String(val).trim().toLowerCase());

  if (isNull) {
    return {
      rowIndex: 0,
      column: col.name,
      value: val,
      defectType: 'missing',
      defectLabel: 'Missing / Null',
      severity: 'high',
      description: 'Cell is empty or contains an unparsed null indicator.',
      suggestedAction: 'Fill with median/mode or custom default value'
    };
  }

  const strVal = String(val);

  // 2. Duplicate row check
  if (isDuplicateRow) {
    return {
      rowIndex: 0,
      column: col.name,
      value: val,
      defectType: 'duplicate',
      defectLabel: 'Duplicate Row Entry',
      severity: 'high',
      description: 'This row is an exact duplicate of another record in the dataset.',
      suggestedAction: 'Remove duplicate record'
    };
  }

  // 3. Currency symbols or number format issues in numeric columns
  if (
    col.inferred_type === 'string' &&
    /[$€£¥]\s*[\d,]+(\.\d+)?/.test(strVal)
  ) {
    return {
      rowIndex: 0,
      column: col.name,
      value: val,
      defectType: 'format_error',
      defectLabel: 'Unparsed Currency String',
      severity: 'medium',
      description: `Contains currency symbol in text format: "${strVal}".`,
      suggestedAction: 'Convert to numeric float by stripping currency symbols'
    };
  }

  // 4. Inconsistent whitespace check
  if (strVal !== strVal.trim() || /\s{2,}/.test(strVal)) {
    return {
      rowIndex: 0,
      column: col.name,
      value: val,
      defectType: 'whitespace',
      defectLabel: 'Irregular Whitespace',
      severity: 'low',
      description: 'Contains leading, trailing, or double internal spaces.',
      suggestedAction: 'Trim extra whitespace & collapse spaces'
    };
  }

  // 5. Inconsistent date format check
  if (
    (col.inferred_type === 'datetime' || col.name.toLowerCase().includes('date')) &&
    !/^\d{4}-\d{2}-\d{2}$/.test(strVal.trim()) &&
    isNaN(Date.parse(strVal))
  ) {
    return {
      rowIndex: 0,
      column: col.name,
      value: val,
      defectType: 'format_error',
      defectLabel: 'Non-Standard Date Format',
      severity: 'medium',
      description: `Date "${strVal}" is not in standardized ISO YYYY-MM-DD format.`,
      suggestedAction: 'Standardize to ISO YYYY-MM-DD format'
    };
  }

  // Clean cell
  return {
    rowIndex: 0,
    column: col.name,
    value: val,
    defectType: 'clean',
    defectLabel: 'Valid & Clean',
    severity: 'none',
    description: 'Meets data type and formatting validation rules.'
  };
};

export const DataQualityHeatmap: React.FC<DataQualityHeatmapProps> = ({
  dataset,
  onNavigateToRow
}) => {
  const [activeFilter, setActiveFilter] = useState<DefectType | 'all'>('all');
  const [selectedCell, setSelectedCell] = useState<CellQualityInfo | null>(null);
  const [viewTab, setViewTab] = useState<'matrix' | 'columns' | 'rows'>('matrix');
  const [hoveredCell, setHoveredCell] = useState<CellQualityInfo | null>(null);

  const rawRows = dataset.preview_rows || [];
  const columns = dataset.columns || [];

  // Compute duplicate rows index set in preview
  const duplicateRowIndices = useMemo(() => {
    const seen = new Set<string>();
    const dupes = new Set<number>();
    rawRows.forEach((row, idx) => {
      const rowKey = JSON.stringify(row);
      if (seen.has(rowKey)) {
        dupes.add(idx);
      } else {
        seen.add(rowKey);
      }
    });
    return dupes;
  }, [rawRows]);

  // Compute cell quality matrix for preview rows
  const matrixData = useMemo(() => {
    return rawRows.slice(0, 50).map((row, rowIdx) => {
      const isDupe = duplicateRowIndices.has(rowIdx);
      const rowCells: CellQualityInfo[] = columns.map((col) => {
        const info = inspectCellQuality(row[col.name], col, row, isDupe);
        return { ...info, rowIndex: rowIdx };
      });
      return { rowIndex: rowIdx, cells: rowCells, isDuplicate: isDupe };
    });
  }, [rawRows, columns, duplicateRowIndices]);

  // Column level aggregations
  const columnStats = useMemo(() => {
    return columns.map((col) => {
      let missing = 0;
      let formatErrors = 0;
      let whitespace = 0;
      let clean = 0;
      const total = rawRows.length || 1;

      rawRows.forEach((row, rowIdx) => {
        const isDupe = duplicateRowIndices.has(rowIdx);
        const info = inspectCellQuality(row[col.name], col, row, isDupe);
        if (info.defectType === 'missing') missing++;
        else if (info.defectType === 'format_error') formatErrors++;
        else if (info.defectType === 'whitespace') whitespace++;
        else clean++;
      });

      const cleanPct = Math.round((clean / total) * 100);
      const missingPct = Math.round((missing / total) * 100);
      const formatPct = Math.round((formatErrors / total) * 100);
      const wsPct = Math.round((whitespace / total) * 100);
      const defectPct = 100 - cleanPct;

      return {
        column: col,
        name: col.name,
        type: col.inferred_type,
        cleanPct,
        missingPct,
        formatPct,
        wsPct,
        defectPct,
        totalIssues: missing + formatErrors + whitespace
      };
    });
  }, [columns, rawRows, duplicateRowIndices]);

  // Overall statistics
  const totalCells = matrixData.length * columns.length || 1;
  const defectCounts = useMemo(() => {
    let missing = 0;
    let duplicate = 0;
    let format = 0;
    let whitespace = 0;
    let clean = 0;

    matrixData.forEach((r) => {
      r.cells.forEach((c) => {
        if (c.defectType === 'missing') missing++;
        else if (c.defectType === 'duplicate') duplicate++;
        else if (c.defectType === 'format_error') format++;
        else if (c.defectType === 'whitespace') whitespace++;
        else clean++;
      });
    });

    return { missing, duplicate, format, whitespace, clean };
  }, [matrixData]);

  // Most problematic and cleanest columns
  const sortedColumns = [...columnStats].sort((a, b) => b.defectPct - a.defectPct);
  const worstColumn = sortedColumns[0];
  const bestColumn = sortedColumns[sortedColumns.length - 1];

  // Helper to get styling for defect type
  const getCellColor = (type: DefectType, isHovered: boolean = false) => {
    switch (type) {
      case 'missing':
        return isHovered ? 'bg-amber-400 border-amber-500' : 'bg-amber-200 border-amber-300 text-amber-900';
      case 'duplicate':
        return isHovered ? 'bg-rose-500 border-rose-600' : 'bg-rose-200 border-rose-300 text-rose-900';
      case 'format_error':
        return isHovered ? 'bg-purple-400 border-purple-500' : 'bg-purple-200 border-purple-300 text-purple-900';
      case 'whitespace':
        return isHovered ? 'bg-sky-400 border-sky-500' : 'bg-sky-200 border-sky-300 text-sky-900';
      case 'clean':
      default:
        return isHovered ? 'bg-emerald-300 border-emerald-400' : 'bg-emerald-100 border-emerald-200 text-emerald-800';
    }
  };

  const getDefectBadgeColor = (type: DefectType) => {
    switch (type) {
      case 'missing':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'duplicate':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'format_error':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'whitespace':
        return 'bg-sky-100 text-sky-800 border-sky-300';
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
      
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white shadow-xs">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                Data Quality Heatmap
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                Visual Defect Concentration
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Instantly identify quality hotspots, invalid formats, missing fields, and duplicate clusters across columns and rows.
            </p>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center space-x-1 p-1 bg-slate-100 rounded-xl border border-slate-200 shadow-2xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewTab('matrix')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewTab === 'matrix'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            2D Matrix Grid
          </button>
          <button
            type="button"
            onClick={() => setViewTab('columns')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewTab === 'columns'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Column Density
          </button>
        </div>
      </div>

      {/* 2. Hotspot Summary Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Highest Defect Hotspot */}
        <div className="p-4 rounded-2xl bg-[#FFF8F8] border border-rose-200/90 flex items-start justify-between shadow-2xs">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">
              Primary Hotspot Column
            </span>
            <div className="text-base font-extrabold text-slate-900 truncate">
              {worstColumn ? worstColumn.name : 'None'}
            </div>
            <p className="text-xs text-rose-600 font-medium">
              {worstColumn ? `${worstColumn.defectPct}% defect rate (${worstColumn.totalIssues} issues)` : 'No defects detected'}
            </p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 flex-shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>

        {/* Cleanest Column */}
        <div className="p-4 rounded-2xl bg-[#F4FBF7] border border-emerald-200/90 flex items-start justify-between shadow-2xs">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
              Highest Quality Column
            </span>
            <div className="text-base font-extrabold text-slate-900 truncate">
              {bestColumn ? bestColumn.name : 'None'}
            </div>
            <p className="text-xs text-emerald-600 font-medium">
              {bestColumn ? `${bestColumn.cleanPct}% clean & standardized` : '100% Valid'}
            </p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        {/* Defect Distribution Summary */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start justify-between shadow-2xs">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Sample Defect Density
            </span>
            <div className="text-base font-extrabold text-slate-900">
              {dataset.quality_score}% Quality Health
            </div>
            <p className="text-xs text-slate-500">
              {defectCounts.missing + defectCounts.duplicate + defectCounts.format + defectCounts.whitespace} total anomalies in preview sample
            </p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-slate-200 flex items-center justify-center text-slate-700 flex-shrink-0">
            <Layers className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* 3. Filter Pills Legend Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
          <span className="text-slate-500 mr-1 text-[11px]">Filter Heatmap:</span>

          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1 rounded-lg border transition ${
              activeFilter === 'all'
                ? 'bg-slate-900 text-white border-slate-900 font-bold shadow-2xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            All Cells ({totalCells})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('missing')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg border transition ${
              activeFilter === 'missing'
                ? 'bg-amber-400 text-amber-950 border-amber-500 font-bold shadow-2xs'
                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Missing ({defectCounts.missing})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('duplicate')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg border transition ${
              activeFilter === 'duplicate'
                ? 'bg-rose-500 text-white border-rose-600 font-bold shadow-2xs'
                : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>Duplicates ({defectCounts.duplicate})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('format_error')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg border transition ${
              activeFilter === 'format_error'
                ? 'bg-purple-500 text-white border-purple-600 font-bold shadow-2xs'
                : 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            <span>Format Error ({defectCounts.format})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('whitespace')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg border transition ${
              activeFilter === 'whitespace'
                ? 'bg-sky-500 text-white border-sky-600 font-bold shadow-2xs'
                : 'bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
            <span>Whitespace ({defectCounts.whitespace})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('clean')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg border transition ${
              activeFilter === 'clean'
                ? 'bg-emerald-600 text-white border-emerald-700 font-bold shadow-2xs'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Clean ({defectCounts.clean})</span>
          </button>
        </div>

        <div className="text-[11px] text-slate-400 font-mono">
          Hover cell for details • Click to inspect
        </div>
      </div>

      {/* 4. Tab 1: 2D Interactive Matrix Grid */}
      {viewTab === 'matrix' && (
        <div className="space-y-4">
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50 p-4">
            
            {/* Column Headers for Matrix */}
            <div className="overflow-x-auto">
              <div className="min-w-fit space-y-2">
                
                {/* Column Titles Bar */}
                <div className="flex items-center space-x-1 pb-1">
                  <div className="w-10 text-[10px] font-mono text-slate-400 text-center flex-shrink-0">
                    Row
                  </div>
                  {columns.map((col) => (
                    <div
                      key={col.name}
                      className="w-20 text-[11px] font-bold text-slate-700 truncate px-1 text-center flex-shrink-0"
                      title={`${col.name} (${col.inferred_type})`}
                    >
                      {col.name}
                    </div>
                  ))}
                </div>

                {/* 2D Heatmap Cell Grid */}
                <div className="space-y-1 max-h-[360px] overflow-y-auto pr-1">
                  {matrixData.map((row) => (
                    <div key={row.rowIndex} className="flex items-center space-x-1">
                      {/* Row Label */}
                      <div className="w-10 text-[10px] font-mono text-slate-400 text-center flex-shrink-0">
                        #{row.rowIndex + 1}
                      </div>

                      {/* Cells */}
                      {row.cells.map((cell) => {
                        const isDimmed = activeFilter !== 'all' && cell.defectType !== activeFilter;
                        const isHovered = hoveredCell?.rowIndex === cell.rowIndex && hoveredCell?.column === cell.column;

                        return (
                          <div
                            key={cell.column}
                            onMouseEnter={() => setHoveredCell(cell)}
                            onMouseLeave={() => setHoveredCell(null)}
                            onClick={() => {
                              setSelectedCell(cell);
                              if (onNavigateToRow) {
                                onNavigateToRow(cell.rowIndex);
                              }
                            }}
                            className={`w-20 h-7 rounded-md border text-[10px] font-mono font-bold flex items-center justify-center cursor-pointer transition select-none truncate px-1 ${getCellColor(
                              cell.defectType,
                              isHovered
                            )} ${isDimmed ? 'opacity-20' : 'opacity-100 shadow-2xs hover:scale-105'}`}
                            title={`Row ${cell.rowIndex + 1}, ${cell.column}: ${cell.defectLabel}`}
                          >
                            {cell.defectType === 'missing'
                              ? 'null'
                              : cell.defectType === 'duplicate'
                              ? 'dupe'
                              : cell.defectType === 'format_error'
                              ? 'err'
                              : cell.defectType === 'whitespace'
                              ? 'space'
                              : '✓'}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>

              </div>
            </div>

          </div>

          {/* Active Hover / Selected Cell Inspector Drawer */}
          {(hoveredCell || selectedCell) && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-150">
              <div className="flex items-start space-x-3">
                <div className="mt-0.5">
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getDefectBadgeColor(
                      (hoveredCell || selectedCell)!.defectType
                    )}`}
                  >
                    {(hoveredCell || selectedCell)!.defectLabel}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-900">
                    Row #{(hoveredCell || selectedCell)!.rowIndex + 1} • Column: "
                    {(hoveredCell || selectedCell)!.column}"
                  </div>
                  <p className="text-xs text-slate-600">
                    {(hoveredCell || selectedCell)!.description}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Current value: <span className="font-bold text-slate-800">"{String((hoveredCell || selectedCell)!.value ?? 'null')}"</span>
                  </p>
                </div>
              </div>

              {(hoveredCell || selectedCell)!.suggestedAction && (
                <div className="text-left sm:text-right flex-shrink-0">
                  <span className="text-[10px] text-slate-400 block">Recommended Fix</span>
                  <span className="text-xs font-bold text-[#009A49]">
                    {(hoveredCell || selectedCell)!.suggestedAction}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 5. Tab 2: Column Defect Density Breakdown */}
      {viewTab === 'columns' && (
        <div className="space-y-3.5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {columnStats.map((stat) => (
              <div
                key={stat.name}
                className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-900">{stat.name}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-500 bg-slate-100 border border-slate-200">
                      {stat.type}
                    </span>
                  </div>

                  <span
                    className={`text-xs font-bold ${
                      stat.cleanPct === 100
                        ? 'text-emerald-700'
                        : stat.cleanPct > 70
                        ? 'text-amber-700'
                        : 'text-rose-700'
                    }`}
                  >
                    {stat.cleanPct}% Clean
                  </span>
                </div>

                {/* Multi-Segment Quality Density Stacked Bar */}
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex border border-slate-200">
                  {stat.cleanPct > 0 && (
                    <div
                      style={{ width: `${stat.cleanPct}%` }}
                      className="bg-emerald-500 h-full transition-all"
                      title={`${stat.cleanPct}% Valid & Clean`}
                    />
                  )}
                  {stat.missingPct > 0 && (
                    <div
                      style={{ width: `${stat.missingPct}%` }}
                      className="bg-amber-400 h-full transition-all"
                      title={`${stat.missingPct}% Missing`}
                    />
                  )}
                  {stat.formatPct > 0 && (
                    <div
                      style={{ width: `${stat.formatPct}%` }}
                      className="bg-purple-500 h-full transition-all"
                      title={`${stat.formatPct}% Format Errors`}
                    />
                  )}
                  {stat.wsPct > 0 && (
                    <div
                      style={{ width: `${stat.wsPct}%` }}
                      className="bg-sky-400 h-full transition-all"
                      title={`${stat.wsPct}% Irregular Whitespace`}
                    />
                  )}
                </div>

                {/* Segment breakdown details */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5 font-medium">
                  <div className="flex items-center space-x-3">
                    {stat.missingPct > 0 && (
                      <span className="text-amber-700">Missing: {stat.missingPct}%</span>
                    )}
                    {stat.formatPct > 0 && (
                      <span className="text-purple-700">Format: {stat.formatPct}%</span>
                    )}
                    {stat.wsPct > 0 && (
                      <span className="text-sky-700">Whitespace: {stat.wsPct}%</span>
                    )}
                  </div>
                  <span>{stat.totalIssues} issues</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
