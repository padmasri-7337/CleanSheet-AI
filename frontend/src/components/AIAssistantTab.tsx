import React, { useState } from 'react';
import { Sparkles, Bot, Check, CheckSquare, Square, AlertTriangle, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
import { AIPlan, AIStep } from '../types';

interface AIAssistantTabProps {
  onGeneratePlan: (instruction: string) => Promise<AIPlan | null>;
  onExecutePlan: (steps: AIStep[]) => Promise<void>;
  isLoading: boolean;
}

const PROMPT_SUGGESTIONS = [
  "Remove duplicate rows, normalize headers to snake_case, and standardize dates to YYYY-MM-DD",
  "Convert currency strings to numeric numbers, trim extra spaces, and capitalize customer names",
  "Fill missing numeric fields with median, fill missing text with 'Unknown', and protect customer IDs",
  "Clean everything: remove duplicates, fix headers, parse dates, and strip currency symbols"
];

export const AIAssistantTab: React.FC<AIAssistantTabProps> = ({
  onGeneratePlan,
  onExecutePlan,
  isLoading,
}) => {
  const [instruction, setInstruction] = useState('');
  const [plan, setPlan] = useState<AIPlan | null>(null);
  const [steps, setSteps] = useState<AIStep[]>([]);

  const handleGenerate = async (textToUse?: string) => {
    const text = textToUse || instruction;
    if (!text.trim()) return;
    const generatedPlan = await onGeneratePlan(text);
    if (generatedPlan) {
      setPlan(generatedPlan);
      setSteps(generatedPlan.steps);
    }
  };

  const toggleStepApproval = (stepId: string) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, approved: !s.approved } : s))
    );
  };

  const toggleAll = (approve: boolean) => {
    setSteps((prev) => prev.map((s) => ({ ...s, approved: approve })));
  };

  const approvedCount = steps.filter((s) => s.approved).length;

  const handleExecute = async () => {
    const approvedSteps = steps.filter((s) => s.approved);
    if (approvedSteps.length === 0) return;
    await onExecutePlan(approvedSteps);
    // Clear plan after execution or keep it
    setPlan(null);
    setSteps([]);
    setInstruction('');
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'high':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">High Impact</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">Moderate</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Safe</span>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Privacy Notice Banner */}
      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start space-x-2.5">
        <ShieldCheck className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-slate-400">
          <span className="font-semibold text-slate-300">Privacy & Safety Guard: </span>
          Only schema column names, inferred data types, and up to 2 anonymized sample snippets are provided to AI models.
          Transformations are strictly executed via pre-validated deterministic Python functions—never arbitrary code.
        </div>
      </div>

      {/* Instruction Input Form */}
      <div className="space-y-3">
        <label className="block text-xs font-semibold text-slate-300">
          Describe what you want to clean or transform:
        </label>
        
        <div className="relative">
          <textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="e.g. Remove duplicate orders, standardize all dates to ISO format, remove currency symbols from price, and trim spaces..."
            rows={3}
            disabled={isLoading}
            className="w-full px-4 py-3 bg-slate-950/70 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-xs text-slate-100 placeholder-slate-500 transition resize-none"
          />

          <button
            type="button"
            disabled={isLoading || !instruction.trim()}
            onClick={() => handleGenerate()}
            className="absolute bottom-3 right-3 flex items-center space-x-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md disabled:opacity-50 transition"
          >
            {isLoading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Bot className="w-3.5 h-3.5" />
            )}
            <span>Generate Cleaning Plan</span>
          </button>
        </div>

        {/* Suggestion Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] text-slate-500 mr-1 flex items-center">
            <Sparkles className="w-3 h-3 text-amber-400 mr-1" /> Quick Prompts:
          </span>
          {PROMPT_SUGGESTIONS.map((sug, i) => (
            <button
              key={i}
              type="button"
              disabled={isLoading}
              onClick={() => {
                setInstruction(sug);
                handleGenerate(sug);
              }}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/60 transition"
            >
              {sug.length > 55 ? `${sug.substring(0, 55)}...` : sug}
            </button>
          ))}
        </div>
      </div>

      {/* Proposed Cleaning Plan Review Interface */}
      {plan && (
        <div className="mt-6 p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4 animate-in fade-in duration-200">
          
          {/* Plan Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-2">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-white">Proposed Cleaning Plan</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {plan.source === 'gemini_ai' ? 'Powered by Gemini AI' : 'Deterministic Heuristic Fallback'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">{plan.summary}</p>
              {plan.note && <p className="text-[11px] text-amber-400/90 mt-0.5">{plan.note}</p>}
            </div>

            {/* Select/Deselect All */}
            <div className="flex items-center space-x-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => toggleAll(true)}
                className="text-[11px] text-slate-400 hover:text-emerald-400 underline"
              >
                Approve All
              </button>
              <span className="text-slate-600">•</span>
              <button
                type="button"
                onClick={() => toggleAll(false)}
                className="text-[11px] text-slate-400 hover:text-rose-400 underline"
              >
                Reject All
              </button>
            </div>
          </div>

          {/* Steps list with individual approval toggles */}
          <div className="space-y-3">
            {steps.map((step, idx) => (
              <div
                key={step.id}
                onClick={() => toggleStepApproval(step.id)}
                className={`p-3.5 rounded-xl border transition cursor-pointer flex items-start space-x-3 ${
                  step.approved
                    ? 'bg-slate-900/90 border-slate-700 hover:border-emerald-500/50'
                    : 'bg-slate-950/40 border-slate-800/60 opacity-60'
                }`}
              >
                {/* Approval Checkbox */}
                <div className="pt-0.5 text-emerald-400 flex-shrink-0">
                  {step.approved ? (
                    <CheckSquare className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-600" />
                  )}
                </div>

                {/* Step Details */}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono font-semibold text-slate-200">
                        Step {idx + 1}: {step.operation}
                      </span>
                      {getRiskBadge(step.risk_level)}
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 font-medium">{step.description}</p>
                  <p className="text-[11px] text-slate-400">
                    <span className="text-slate-500">Reasoning: </span>
                    {step.reasoning}
                  </p>

                  <div className="text-[10px] font-mono text-slate-500 bg-slate-950 px-2 py-1 rounded border border-slate-800/80 w-fit mt-1">
                    params: {JSON.stringify(step.params)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Execution Button */}
          <div className="pt-3 flex items-center justify-between border-t border-slate-800">
            <span className="text-xs text-slate-400">
              {approvedCount} of {steps.length} transformations approved
            </span>

            <button
              type="button"
              disabled={isLoading || approvedCount === 0}
              onClick={handleExecute}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>Execute Approved Transformations ({approvedCount})</span>
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
