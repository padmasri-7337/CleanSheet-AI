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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <Info className="w-5 h-5 text-[#009A49]" />
            <h3 className="text-base font-bold text-slate-900">System Diagnostics & Connectivity</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* MongoDB Diagnostic Section */}
        <div className="p-4.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-[#009A49]" />
              <span className="text-xs font-bold text-slate-900">MongoDB Atlas Connection</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                isDbConnected
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-100 text-amber-800 border border-amber-200'
              }`}
            >
              {health?.database?.status.toUpperCase() || 'UNKNOWN'}
            </span>
          </div>

          <div className="text-xs text-slate-600 space-y-1">
            <div>
              <span className="text-slate-400">Mode: </span>
              <span className="text-slate-800 font-semibold">{health?.database?.mode}</span>
            </div>
            {health?.database?.cluster_info && (
              <div>
                <span className="text-slate-400">Cluster: </span>
                <span className="text-slate-800 font-mono">{health.database.cluster_info}</span>
              </div>
            )}
            {health?.database?.database_name && (
              <div>
                <span className="text-slate-400">Database Name: </span>
                <span className="text-slate-800 font-mono">{health.database.database_name}</span>
              </div>
            )}
            {health?.database?.error && (
              <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] mt-1">
                {health.database.error}
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-slate-200/80">
            <span className="text-[10px] text-slate-400 font-mono">
              Tested at: {health?.database?.last_tested_at ? new Date(health.database.last_tested_at).toLocaleTimeString() : 'Startup'}
            </span>
            <button
              onClick={handleTestDatabase}
              disabled={testingDb}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 transition shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testingDb ? 'animate-spin' : ''}`} />
              <span>Test Connection Ping</span>
            </button>
          </div>

          {testResult && (
            <div className="text-xs p-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 shadow-2xs">
              {testResult}
            </div>
          )}
        </div>

        {/* Gemini AI Engine Section */}
        <div className="p-4.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bot className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold text-slate-900">Google Gemini AI Engine</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                isAiConfigured
                  ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                  : 'bg-cyan-100 text-cyan-800 border border-cyan-200'
              }`}
            >
              {isAiConfigured ? 'GEMINI READY' : 'HEURISTIC FALLBACK'}
            </span>
          </div>

          <div className="text-xs text-slate-600 space-y-1">
            <div>
              <span className="text-slate-400">Active Model: </span>
              <span className="text-slate-800 font-mono font-medium">{health?.ai_engine?.model}</span>
            </div>
            <div>
              <span className="text-slate-400">Provider: </span>
              <span className="text-slate-800 font-medium">{health?.ai_engine?.provider}</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-[11px] text-slate-600 flex items-start space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>{health?.ai_engine?.privacy_disclosure}</div>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 transition"
        >
          Close Diagnostics
        </button>

      </div>
    </div>
  );
};
