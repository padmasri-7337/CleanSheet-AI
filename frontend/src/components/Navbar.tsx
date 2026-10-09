import React, { useState } from 'react';
import {
  Sparkles,
  Database,
  Bot,
  ShieldCheck,
  Download,
  RotateCcw,
  FileSpreadsheet,
  FileText,
  User as UserIcon,
  LogOut,
  ChevronDown
} from 'lucide-react';
import { HealthStatus, User } from '../types';
import { api } from '../services/api';

interface NavbarProps {
  health: HealthStatus | null;
  hasActiveSession: boolean;
  sessionId: string | null;
  currentUser: User | null;
  onReset: () => void;
  onOpenReport: () => void;
  onOpenStatusModal: () => void;
  onOpenAuthModal: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  health,
  hasActiveSession,
  sessionId,
  currentUser,
  onReset,
  onOpenReport,
  onOpenStatusModal,
  onOpenAuthModal,
  onLogout,
}) => {
  const [downloadOpen, setDownloadOpen] = useState(false);

  const isDbConnected = health?.database?.is_connected ?? false;
  const isAiConfigured = health?.ai_engine?.is_configured ?? false;

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Sparkles className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight text-white">CleanSheet</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  AI
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Intelligent Spreadsheet Cleaning</p>
            </div>
          </div>

          {/* System Status Indicators */}
          <div className="hidden md:flex items-center space-x-3">
            {/* MongoDB Badge */}
            <button
              onClick={onOpenStatusModal}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                isDbConnected
                  ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300 hover:bg-emerald-900/40'
                  : 'bg-amber-950/40 border-amber-800 text-amber-300 hover:bg-amber-900/40'
              }`}
              title="Click to inspect MongoDB connection details"
            >
              <Database className="w-3.5 h-3.5" />
              <span>{isDbConnected ? 'MongoDB Atlas' : 'Local DB Fallback'}</span>
              <span className={`w-2 h-2 rounded-full ${isDbConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            </button>

            {/* AI Engine Badge */}
            <button
              onClick={onOpenStatusModal}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-indigo-800 bg-indigo-950/40 text-indigo-300 hover:bg-indigo-900/40 transition-colors"
              title="Click to inspect AI Engine details"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>{isAiConfigured ? 'Gemini 2.5 Flash' : 'Heuristic Engine'}</span>
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
            </button>

            {/* Privacy Badge */}
            <div className="flex items-center space-x-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-800/80 text-slate-300 border border-slate-700">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
              <span>Zero Long-Term Storage</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2.5">
            {hasActiveSession && (
              <>
                <button
                  onClick={onReset}
                  className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
                  title="Reset dataset back to original raw uploaded state"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>

                <button
                  onClick={onOpenReport}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800 transition"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Audit Report</span>
                </button>

                {/* Export Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setDownloadOpen(!downloadOpen)}
                    className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                    <ChevronDown className="w-3 h-3 ml-0.5" />
                  </button>

                  {downloadOpen && sessionId && (
                    <div className="absolute right-0 mt-2 w-48 rounded-xl bg-slate-900 border border-slate-800 shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      <a
                        href={api.getDownloadUrl(sessionId, 'csv')}
                        download
                        onClick={() => setDownloadOpen(false)}
                        className="flex items-center space-x-2.5 px-4 py-2.5 text-xs text-slate-200 hover:bg-slate-800 hover:text-white transition"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                        <div>
                          <div className="font-semibold">Cleaned CSV (.csv)</div>
                          <div className="text-[10px] text-slate-400">Comma-delimited text</div>
                        </div>
                      </a>
                      <a
                        href={api.getDownloadUrl(sessionId, 'xlsx')}
                        download
                        onClick={() => setDownloadOpen(false)}
                        className="flex items-center space-x-2.5 px-4 py-2.5 text-xs text-slate-200 hover:bg-slate-800 hover:text-white transition border-t border-slate-800"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-teal-400" />
                        <div>
                          <div className="font-semibold">Cleaned Excel (.xlsx)</div>
                          <div className="text-[10px] text-slate-400">Auto-formatted widths</div>
                        </div>
                      </a>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Auth Pill */}
            {currentUser ? (
              <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
                <span className="text-xs font-medium text-slate-300 hidden sm:inline">
                  {currentUser.username}
                </span>
                <button
                  onClick={onLogout}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuthModal}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 transition"
              >
                <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                <span>Sign In</span>
              </button>
            )}

          </div>

        </div>
      </div>
    </header>
  );
};
