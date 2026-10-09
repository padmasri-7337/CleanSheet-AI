import React, { useState } from 'react';
import { X, Database, Bot, ShieldCheck, RefreshCw, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { HealthStatus } from '../types';
import { api } from '../services/api';

interface StatusDetailsModalProps {
  health: HealthStatus | null;
  onRefreshHealth: () => Promise<void>;
  onClose: () => void;
}

export const StatusDetailsModal: React.FC<StatusDetailsModalProps> = ({
  health,
  onRefreshHealth,
  onClose,
}) => {
  const [testingDb, setTestingDb] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleTestDatabase = async () => {
    setTestingDb(true);
    setTestResult(null);
    try {
      const res = await api.testDatabase();
      await onRefreshHealth();
      if (res.success) {
        setTestResult('Ping successful! Connected to MongoDB Atlas cluster.');
      } else {
        setTestResult(
          res.database?.error ||
            'MongoDB connection failed. Operating in resilient in-memory local mode.'
        );
      }
    } catch (err: any) {
      setTestResult('Ping failed: Could not reach backend database endpoint.');
    } finally {
      setTestingDb(false);
    }
  };

  const isDbConnected = health?.database?.is_connected ?? false;
  const isAiConfigured = health?.ai_engine?.is_configured ?? false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Info className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">System Diagnostics & Connectivity</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* MongoDB Diagnostic Section */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-white">MongoDB Atlas Connection</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                isDbConnected
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}
            >
              {health?.database?.status.toUpperCase() || 'UNKNOWN'}
            </span>
          </div>

          <div className="text-xs text-slate-400 space-y-1">
            <div>
              <span className="text-slate-500">Mode: </span>
              <span className="text-slate-200 font-medium">{health?.database?.mode}</span>
            </div>
            {health?.database?.cluster_info && (
              <div>
                <span className="text-slate-500">Cluster: </span>
                <span className="text-slate-200 font-mono">{health.database.cluster_info}</span>
              </div>
            )}
            {health?.database?.database_name && (
              <div>
                <span className="text-slate-500">Database Name: </span>
                <span className="text-slate-200 font-mono">{health.database.database_name}</span>
              </div>
            )}
            {health?.database?.error && (
              <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-800/80 text-amber-300 text-[11px] mt-1">
                {health.database.error}
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-[10px] text-slate-500">
              Tested at: {health?.database?.last_tested_at ? new Date(health.database.last_tested_at).toLocaleTimeString() : 'Startup'}
            </span>
            <button
              onClick={handleTestDatabase}
              disabled={testingDb}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testingDb ? 'animate-spin' : ''}`} />
              <span>Test Connection Ping</span>
            </button>
          </div>

          {testResult && (
            <div className="text-xs p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
              {testResult}
            </div>
          )}
        </div>

        {/* Gemini AI Engine Section */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bot className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold text-white">Google Gemini AI Engine</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                isAiConfigured
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              }`}
            >
              {isAiConfigured ? 'GEMINI READY' : 'HEURISTIC FALLBACK'}
            </span>
          </div>

          <div className="text-xs text-slate-400 space-y-1">
            <div>
              <span className="text-slate-500">Active Model: </span>
              <span className="text-slate-200 font-mono">{health?.ai_engine?.model}</span>
            </div>
            <div>
              <span className="text-slate-500">Provider: </span>
              <span className="text-slate-200">{health?.ai_engine?.provider}</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 flex items-start space-x-2">
            <ShieldCheck className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
            <div>{health?.ai_engine?.privacy_disclosure}</div>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition"
        >
          Close Diagnostics
        </button>

      </div>
    </div>
  );
};
