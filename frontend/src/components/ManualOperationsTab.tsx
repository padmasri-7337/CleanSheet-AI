import React, { useState } from 'react';
import {
  CopyX,
  HelpCircle,
  CaseSensitive,
  Sparkles,
  Calendar,
  DollarSign,
  Binary,
  Replace,
  Play,
  RotateCcw
} from 'lucide-react';
import { DatasetPreview } from '../types';

interface ManualOperationsTabProps {
  dataset: DatasetPreview;
  onApplyOperation: (operation: string, params: Record<string, any>) => Promise<void>;
  isLoading: boolean;
}

export const ManualOperationsTab: React.FC<ManualOperationsTabProps> = ({
  dataset,
  onApplyOperation,
  isLoading,
}) => {
  const columns = dataset.columns.map((c) => c.name);

  // Operation specific state
  // 1. Deduplication
  const [dedupSubset, setDedupSubset] = useState<string[]>([]);
  const [dedupKeep, setDedupKeep] = useState<'first' | 'last'>('first');

  // 2. Missing Values
  const [missingStrategy, setMissingStrategy] = useState<string>('fill_median');
  const [missingCols, setMissingCols] = useState<string[]>([]);
  const [missingCustomVal, setMissingCustomVal] = useState<string>('Unknown');

  // 3. Normalization & Whitespace
  const [headerStyle, setHeaderStyle] = useState<string>('snake_case');
  const [collapseSpaces, setCollapseSpaces] = useState<boolean>(true);

  // 4. Type conversions
  const [targetType, setTargetType] = useState<string>('datetime');
  const [typeCols, setTypeCols] = useState<string[]>([]);
  const [dateFormat, setDateFormat] = useState<string>('%Y-%m-%d');

  // 5. Casing
  const [casingType, setCasingType] = useState<string>('title');
  const [casingCols, setCasingCols] = useState<string[]>([]);

  // 6. Find & Replace
  const [searchPattern, setSearchPattern] = useState<string>('');
  const [replaceValue, setReplaceValue] = useState<string>('');
  const [findReplaceCols, setFindReplaceCols] = useState<string[]>([]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

      {/* 1. Duplicate Removal Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center space-x-2 text-white font-semibold text-sm">
          <CopyX className="w-4 h-4 text-rose-400" />
          <span>Remove Duplicate Rows</span>
        </div>
        <p className="text-xs text-slate-400">
          Identifies identical records across all columns or specific identifier columns.
        </p>

        <div className="space-y-3 pt-1">
          <div>
            <label className="block text-[11px] font-medium text-slate-300 mb-1">
              Keep which occurrence:
            </label>
            <div className="flex space-x-3 text-xs">
              <label className="flex items-center space-x-1.5 cursor-pointer text-slate-300">
                <input
                  type="radio"
                  name="keep"
                  checked={dedupKeep === 'first'}
                  onChange={() => setDedupKeep('first')}
                  className="text-emerald-500 focus:ring-emerald-500"
                />
                <span>First Occurrence</span>
              </label>
              <label className="flex items-center space-x-1.5 cursor-pointer text-slate-300">
                <input
                  type="radio"
                  name="keep"
                  checked={dedupKeep === 'last'}
                  onChange={() => setDedupKeep('last')}
                  className="text-emerald-500 focus:ring-emerald-500"
                />
                <span>Last Occurrence</span>
              </label>
            </div>
          </div>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => onApplyOperation('remove_duplicates', { subset: null, keep: dedupKeep })}
            className="w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700 hover:border-rose-500/40 transition"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Remove Exact Duplicates ({dataset.duplicate_rows} detected)</span>
          </button>
        </div>
      </div>

      {/* 2. Missing Values Handler Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center space-x-2 text-white font-semibold text-sm">
          <HelpCircle className="w-4 h-4 text-amber-400" />
          <span>Handle Missing / Null Values</span>
        </div>
        <p className="text-xs text-slate-400">
          Impute missing values with statistical measures or remove empty rows/columns.
        </p>

        <div className="space-y-3 pt-1">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">Strategy</label>
              <select
                value={missingStrategy}
                onChange={(e) => setMissingStrategy(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
              >
                <option value="fill_median">Fill with Median (Numeric)</option>
                <option value="fill_mean">Fill with Mean (Numeric)</option>
                <option value="fill_mode">Fill with Mode (Frequent)</option>
                <option value="fill_value">Fill with Custom Value</option>
                <option value="ffill">Forward Fill (ffill)</option>
                <option value="drop_rows">Drop Rows with Missing</option>
              </select>
            </div>

            {missingStrategy === 'fill_value' ? (
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">Custom Value</label>
                <input
                  type="text"
                  value={missingCustomVal}
                  onChange={(e) => setMissingCustomVal(e.target.value)}
                  placeholder="e.g. Unknown, N/A, 0"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                />
              </div>
            ) : (
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">Target Columns</label>
                <select
                  onChange={(e) => {
                    const val = e.target.value;
                    setMissingCols(val === '__all__' ? [] : [val]);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                >
                  <option value="__all__">All Columns with Missing</option>
                  {columns.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={isLoading}
            onClick={() =>
              onApplyOperation('handle_missing', {
                strategy: missingStrategy,
                columns: missingCols.length > 0 ? missingCols : null,
                value: missingStrategy === 'fill_value' ? missingCustomVal : null,
              })
            }
            className="w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 hover:border-amber-500/40 transition"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Apply Missing Value Imputation</span>
          </button>
        </div>
      </div>

      {/* 3. Header Normalization & Whitespace Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center space-x-2 text-white font-semibold text-sm">
          <CaseSensitive className="w-4 h-4 text-emerald-400" />
          <span>Normalize Column Headers</span>
        </div>
        <p className="text-xs text-slate-400">
          Converts messy column headers with spaces, symbols, and irregular casing.
        </p>

        <div className="space-y-3 pt-1">
          <div>
            <label className="block text-[11px] font-medium text-slate-300 mb-1">Header Style</label>
            <select
              value={headerStyle}
              onChange={(e) => setHeaderStyle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
            >
              <option value="snake_case">snake_case (e.g. customer_name)</option>
              <option value="camelCase">camelCase (e.g. customerName)</option>
              <option value="lower">lowercase (e.g. customer name)</option>
              <option value="upper">UPPERCASE (e.g. CUSTOMER NAME)</option>
              <option value="trim_clean">Trim Extra Whitespace</option>
            </select>
          </div>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => onApplyOperation('normalize_headers', { style: headerStyle })}
            className="w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 hover:border-emerald-500/40 transition"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Normalize Headers to {headerStyle}</span>
          </button>
        </div>
      </div>

      {/* 4. Whitespace Trimming Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center space-x-2 text-white font-semibold text-sm">
          <Sparkles className="w-4 h-4 text-teal-400" />
          <span>Trim Whitespace in Text</span>
        </div>
        <p className="text-xs text-slate-400">
          Strips leading/trailing spaces and collapses internal double-spaces across text columns.
        </p>

        <div className="space-y-3 pt-1">
          <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={collapseSpaces}
              onChange={(e) => setCollapseSpaces(e.target.checked)}
              className="rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-emerald-500"
            />
            <span>Collapse consecutive internal spaces ("  " to " ")</span>
          </label>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => onApplyOperation('trim_whitespace', { columns: null, collapse_internal: collapseSpaces })}
            className="w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 hover:border-teal-500/40 transition"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Trim All Text Columns</span>
          </button>
        </div>
      </div>

      {/* 5. Type Conversions (Dates, Currency, Identifiers) Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center space-x-2 text-white font-semibold text-sm">
          <Calendar className="w-4 h-4 text-indigo-400" />
          <span>Data Type & Format Standardizer</span>
        </div>
        <p className="text-xs text-slate-400">
          Parses inconsistent dates, strips currency formatting, or protects leading zero IDs.
        </p>

        <div className="space-y-3 pt-1">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">Target Format</label>
              <select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
              >
                <option value="datetime">Date: ISO YYYY-MM-DD</option>
                <option value="currency_numeric">Currency: Strip symbols to Float</option>
                <option value="identifier">Identifier: Protect Leading Zeros</option>
                <option value="integer">Integer: Round to Whole Number</option>
                <option value="boolean">Boolean: True/False</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">Target Column</label>
              <select
                onChange={(e) => setTypeCols([e.target.value])}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
              >
                <option value="">Select column...</option>
                {columns.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            disabled={isLoading || typeCols.length === 0}
            onClick={() =>
              onApplyOperation('convert_types', {
                columns: typeCols,
                target_type: targetType,
                date_format: dateFormat,
              })
            }
            className="w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 hover:border-indigo-500/40 disabled:opacity-50 transition"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Convert Column to {targetType}</span>
          </button>
        </div>
      </div>

      {/* 6. Text Casing & Find/Replace Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center space-x-2 text-white font-semibold text-sm">
          <Replace className="w-4 h-4 text-sky-400" />
          <span>Find & Replace Text</span>
        </div>
        <p className="text-xs text-slate-400">
          Substitutes text snippets or values across columns.
        </p>

        <div className="space-y-3 pt-1">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">Search Text</label>
              <input
                type="text"
                value={searchPattern}
                onChange={(e) => setSearchPattern(e.target.value)}
                placeholder="e.g. N/A or typo"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">Replace With</label>
              <input
                type="text"
                value={replaceValue}
                onChange={(e) => setReplaceValue(e.target.value)}
                placeholder="e.g. Clean text"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
              />
            </div>
          </div>

          <button
            type="button"
            disabled={isLoading || !searchPattern}
            onClick={() =>
              onApplyOperation('find_replace', {
                search_pattern: searchPattern,
                replace_value: replaceValue,
                columns: null,
                is_regex: false,
              })
            }
            className="w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 hover:border-sky-500/40 disabled:opacity-50 transition"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Execute Find & Replace</span>
          </button>
        </div>
      </div>

    </div>
  );
};
