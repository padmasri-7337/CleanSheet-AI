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
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5 text-white font-bold" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight text-slate-900">CleanSheet</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  AI
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">Intelligent Spreadsheet Cleaning</p>
            </div>
          </div>

          {/* System Status Indicators (Light Theme) */}
          <div className="hidden md:flex items-center space-x-2.5">
            {/* MongoDB Badge */}
            <button
              type="button"
              onClick={onOpenStatusModal}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                isDbConnected
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100/60'
                  : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100/60'
              }`}
              title="Click to inspect MongoDB connection details"
            >
              <Database className="w-3.5 h-3.5" />
              <span>{isDbConnected ? 'MongoDB Atlas' : 'Local In-Memory'}</span>
              <span className={`w-2 h-2 rounded-full ${isDbConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            </button>

            {/* AI Engine Badge */}
            <button
              type="button"
              onClick={onOpenStatusModal}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold border border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100/60 transition"
              title="Click to inspect AI Engine details"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>{isAiConfigured ? 'Google Gemini' : 'Heuristic Engine'}</span>
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
            </button>

            {/* Privacy Badge */}
            <div className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
              <span>Zero Raw Storage</span>
            </div>
          </div>

          {/* Action Buttons & User Menu */}
          <div className="flex items-center space-x-2">
            
            {hasActiveSession && sessionId && (
              <>
                {/* Audit Report Button */}
                <button
                  type="button"
                  onClick={onOpenReport}
                  className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition shadow-xs"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>Report</span>
                </button>

                {/* Reset Button */}
                <button
                  type="button"
                  onClick={onReset}
                  className="hidden sm:flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition"
                  title="Revert all changes to original dataset"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>

                {/* Download Menu */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setDownloadOpen(!downloadOpen)}
                    className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#009A49] hover:bg-[#00823E] text-white shadow-xs transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                    <ChevronDown className="w-3 h-3 ml-0.5" />
                  </button>

                  {downloadOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl py-1 z-50 animate-in fade-in">
                      <a
                        href={api.getDownloadUrl(sessionId, 'csv')}
                        download
                        onClick={() => setDownloadOpen(false)}
                        className="flex items-center space-x-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <FileText className="w-4 h-4 text-emerald-600" />
                        <span>Cleaned CSV (.csv)</span>
                      </a>
                      <a
                        href={api.getDownloadUrl(sessionId, 'xlsx')}
                        download
                        onClick={() => setDownloadOpen(false)}
                        className="flex items-center space-x-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 border-t border-slate-100"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-teal-600" />
                        <span>Cleaned Excel (.xlsx)</span>
                      </a>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Auth Button */}
            {currentUser ? (
              <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
                <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
                  <UserIcon className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="max-w-[100px] truncate">{currentUser.username}</span>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition shadow-xs"
              >
                <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                <span>Sign In / Register</span>
              </button>
            )}

          </div>

        </div>
      </div>
    </header>
  );
};
