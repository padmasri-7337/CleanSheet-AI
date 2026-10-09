import React, { useState } from 'react';
import { Columns, ArrowUp, ArrowDown, Trash2, Edit2, Check, RefreshCw } from 'lucide-react';
import { DatasetPreview, ColumnProfile } from '../types';

interface ColumnManagerTabProps {
  dataset: DatasetPreview;
  onApplyOperation: (operation: string, params: Record<string, any>) => Promise<void>;
  isLoading: boolean;
}

export const ColumnManagerTab: React.FC<ColumnManagerTabProps> = ({
  dataset,
  onApplyOperation,
  isLoading,
}) => {
  const [editingCol, setEditingCol] = useState<string | null>(null);
  const [newName, setNewName] = useState<string>('');

  const columns = dataset.columns;

  const handleStartRename = (colName: string) => {
    setEditingCol(colName);
    setNewName(colName);
  };

  const handleSaveRename = async (oldName: string) => {
    if (!newName.trim() || newName === oldName) {
      setEditingCol(null);
      return;
    }
    await onApplyOperation('column_operations', {
      action: 'rename',
      rename_map: { [oldName]: newName.trim() },
    });
    setEditingCol(null);
  };

  const handleDropColumn = async (colName: string) => {
    if (confirm(`Are you sure you want to drop column "${colName}"?`)) {
      await onApplyOperation('column_operations', {
        action: 'drop',
        columns: [colName],
      });
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const colNames = columns.map((c) => c.name);
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= colNames.length) return;

    const temp = colNames[index];
    colNames[index] = colNames[targetIdx];
    colNames[targetIdx] = temp;

    await onApplyOperation('column_operations', {
      action: 'reorder',
      new_order: colNames,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h4 className="text-sm font-semibold text-white flex items-center space-x-2">
            <Columns className="w-4 h-4 text-emerald-400" />
            <span>Column Schema & Structure ({columns.length} columns)</span>
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Rename headers, reorder sequences, or drop unnecessary columns from your dataset.
          </p>
        </div>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-800/80">
        {columns.map((col, idx) => (
          <div
            key={col.name}
            className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-slate-800/30 transition"
          >
            {/* Column Info & Rename */}
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <span className="text-xs font-mono text-slate-500 w-6">#{idx + 1}</span>

              {editingCol === col.name ? (
                <div className="flex items-center space-x-2 flex-1 max-w-sm">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="px-2.5 py-1 bg-slate-950 border border-emerald-500 rounded-lg text-xs text-white w-full"
                    autoFocus
                  />
                  <button
                    onClick={() => handleSaveRename(col.name)}
                    className="p-1 rounded bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2 truncate">
                  <span className="text-xs font-bold text-slate-200 truncate">{col.name}</span>
                  <button
                    onClick={() => handleStartRename(col.name)}
                    className="text-slate-500 hover:text-slate-300 p-1"
                    title="Rename column"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                </div>
              )}

              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-800 text-slate-400 border border-slate-700">
                {col.inferred_type}
              </span>

              {col.missing_count > 0 && (
                <span className="text-[10px] text-amber-400">
                  {col.missing_count} missing ({col.missing_pct}%)
                </span>
              )}
            </div>

            {/* Actions: Reorder & Delete */}
            <div className="flex items-center space-x-1 flex-shrink-0">
              <button
                type="button"
                disabled={isLoading || idx === 0}
                onClick={() => handleMove(idx, 'up')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition"
                title="Move up"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                disabled={isLoading || idx === columns.length - 1}
                onClick={() => handleMove(idx, 'down')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition"
                title="Move down"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                disabled={isLoading || columns.length <= 1}
                onClick={() => handleDropColumn(col.name)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 disabled:opacity-30 transition"
                title="Drop column"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
