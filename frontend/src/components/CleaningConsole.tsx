import React, { useState } from 'react';
import { Bot, Sliders, Columns, Bookmark, History } from 'lucide-react';
import { DatasetPreview, AIStep, AIPlan } from '../types';
import { AIAssistantTab } from './AIAssistantTab';
import { ManualOperationsTab } from './ManualOperationsTab';
import { ColumnManagerTab } from './ColumnManagerTab';
import { RecipesTab } from './RecipesTab';
import { HistoryTab } from './HistoryTab';

interface CleaningConsoleProps {
  dataset: DatasetPreview;
  onGenerateAIPlan: (instruction: string) => Promise<AIPlan | null>;
  onExecuteAIPlan: (steps: AIStep[]) => Promise<void>;
  onApplyOperation: (operation: string, params: Record<string, any>) => Promise<void>;
  onApplyRecipe: (recipeId: string) => Promise<void>;
  isLoading: boolean;
}

export const CleaningConsole: React.FC<CleaningConsoleProps> = ({
  dataset,
  onGenerateAIPlan,
  onExecuteAIPlan,
  onApplyOperation,
  onApplyRecipe,
  isLoading,
}) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'manual' | 'columns' | 'recipes' | 'history'>('ai');

  const tabs = [
    { id: 'ai', label: 'AI Assistant', icon: Bot, badge: 'Smart' },
    { id: 'manual', label: 'Smart Operations', icon: Sliders },
    { id: 'columns', label: 'Column Manager', icon: Columns, count: dataset.columns.length },
    { id: 'recipes', label: 'Recipes (Pipelines)', icon: Bookmark },
    { id: 'history', label: 'Session Changelog', icon: History, count: dataset.applied_operations.length },
  ];

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs">
      
      {/* Navigation Tab Bar */}
      <div className="border-b border-slate-200 bg-slate-50/70 px-4 sm:px-6 flex items-center space-x-1 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-3.5 px-4 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
                isActive
                  ? 'border-[#009A49] text-[#009A49] bg-white font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-700">
                  {tab.badge}
                </span>
              )}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-slate-200 text-slate-700">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="p-6">
        {activeTab === 'ai' && (
          <AIAssistantTab
            onGeneratePlan={onGenerateAIPlan}
            onExecutePlan={onExecuteAIPlan}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'manual' && (
          <ManualOperationsTab
            dataset={dataset}
            onApplyOperation={onApplyOperation}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'columns' && (
          <ColumnManagerTab
            dataset={dataset}
            onApplyOperation={onApplyOperation}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'recipes' && (
          <RecipesTab
            dataset={dataset}
            onApplyRecipe={onApplyRecipe}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'history' && (
          <HistoryTab dataset={dataset} />
        )}
      </div>

    </div>
  );
};
