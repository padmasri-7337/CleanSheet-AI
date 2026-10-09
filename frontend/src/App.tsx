import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Database,
  Bot,
  ShieldCheck,
  RotateCcw,
  Download,
  Info
} from 'lucide-react';
import {
  DatasetPreview,
  HealthStatus,
  User,
  DetectedIssue,
  AIStep,
  AIPlan
} from './types';
import { api } from './services/api';
import { Navbar } from './components/Navbar';
import { FileUploader } from './components/FileUploader';
import { QualityScoreCard } from './components/QualityScoreCard';
import { IssueListBanner } from './components/IssueListBanner';
import { CleaningConsole } from './components/CleaningConsole';
import { DataTable } from './components/DataTable';
import { AuditReportModal } from './components/AuditReportModal';
import { StatusDetailsModal } from './components/StatusDetailsModal';
import { AuthModal } from './components/AuthModal';

export const App: React.FC = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [dataset, setDataset] = useState<DatasetPreview | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Modals
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Fetch initial health and current user
  const fetchHealth = async () => {
    try {
      const data = await api.getHealth();
      setHealth(data);
    } catch (err) {
      console.warn('Backend not yet reachable on startup', err);
    }
  };

  useEffect(() => {
    fetchHealth();
    if (localStorage.getItem('cleansheet_token')) {
      api.getMe()
        .then((user) => setCurrentUser(user))
        .catch(() => localStorage.removeItem('cleansheet_token'));
    }
  }, []);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Upload file handler
  const handleUpload = async (file: File) => {
    setIsLoading(true);
    try {
      const res = await api.uploadFile(file);
      setDataset(res);
      showNotification(`Dataset "${file.name}" loaded with ${res.row_count} rows.`, 'success');
    } catch (err: any) {
      showNotification(err?.response?.data?.detail || 'Failed to upload file.', 'error');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Load sample dataset
  const handleLoadSample = async (name: string) => {
    setIsLoading(true);
    try {
      const res = await api.loadSample(name);
      setDataset(res);
      showNotification(`Loaded sample dataset with ${res.row_count} rows and ${res.issues.length} detected issues.`, 'success');
    } catch (err: any) {
      showNotification(err?.response?.data?.detail || 'Failed to load sample dataset.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset dataset
  const handleReset = async () => {
    if (!dataset) return;
    if (confirm('Reset dataset back to original uploaded state? All modifications will be reverted.')) {
      setIsLoading(true);
      try {
        const res = await api.resetSession(dataset.session_id);
        setDataset(res);
        showNotification('Dataset restored to raw uploaded state.', 'info');
      } catch (err: any) {
        showNotification(err?.response?.data?.detail || 'Failed to reset dataset.', 'error');
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Apply single manual operation
  const handleApplyOperation = async (operation: string, params: Record<string, any>) => {
    if (!dataset) return;
    setIsLoading(true);
    try {
      const res = await api.applyStep(dataset.session_id, operation, params);
      setDataset(res);
      showNotification(`Applied operation: ${operation}`, 'success');
    } catch (err: any) {
      showNotification(err?.response?.data?.detail || `Failed to execute ${operation}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick fix from issue banner
  const handleApplyQuickFix = async (issue: DetectedIssue) => {
    if (!dataset) return;
    setIsLoading(true);
    try {
      const res = await api.applyStep(dataset.session_id, issue.suggested_action, issue.suggested_params);
      setDataset(res);
      showNotification(`Fixed: ${issue.title}`, 'success');
    } catch (err: any) {
      showNotification(err?.response?.data?.detail || 'Quick fix failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // AI Plan generation
  const handleGenerateAIPlan = async (instruction: string): Promise<AIPlan | null> => {
    if (!dataset) return null;
    setIsLoading(true);
    try {
      const plan = await api.generateAIPlan(dataset.session_id, instruction);
      showNotification(`AI proposed ${plan.steps.length} cleaning steps.`, 'info');
      return plan;
    } catch (err: any) {
      showNotification(err?.response?.data?.detail || 'Failed to generate cleaning plan.', 'error');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // AI Plan execution
  const handleExecuteAIPlan = async (steps: AIStep[]) => {
    if (!dataset) return;
    setIsLoading(true);
    try {
      const res = await api.executeAIPlan(dataset.session_id, steps);
      setDataset(res);
      showNotification(`Successfully executed ${steps.length} approved AI cleaning steps!`, 'success');
    } catch (err: any) {
      showNotification(err?.response?.data?.detail || 'Failed to execute AI plan.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Apply Recipe
  const handleApplyRecipe = async (recipeId: string) => {
    if (!dataset) return;
    setIsLoading(true);
    try {
      const res = await api.applyRecipe(dataset.session_id, recipeId);
      setDataset(res);
      showNotification('Recipe pipeline applied successfully!', 'success');
    } catch (err: any) {
      showNotification(err?.response?.data?.detail || 'Failed to apply recipe.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      
      {/* Top Navbar */}
      <Navbar
        health={health}
        hasActiveSession={!!dataset}
        sessionId={dataset?.session_id || null}
        currentUser={currentUser}
        onReset={handleReset}
        onOpenReport={() => setIsReportModalOpen(true)}
        onOpenStatusModal={() => setIsStatusModalOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={() => {
          api.logout();
          setCurrentUser(null);
          showNotification('Signed out.', 'info');
        }}
      />

      {/* Floating Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div
            className={`px-4 py-2.5 rounded-2xl shadow-2xl border text-xs font-semibold flex items-center space-x-2 ${
              notification.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-700 text-emerald-200'
                : notification.type === 'error'
                ? 'bg-rose-950/90 border-rose-700 text-rose-200'
                : 'bg-indigo-950/90 border-indigo-700 text-indigo-200'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {!dataset ? (
          /* Empty State: Hero & Upload */
          <div className="max-w-3xl mx-auto space-y-8 py-8">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI-Assisted Spreadsheet Cleansing & Standardization</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
                Turn messy spreadsheets into{' '}
                <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent">
                  analysis-ready datasets
                </span>
              </h1>

              <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
                Detect duplicates, impute missing values, parse irregular dates, preserve leading-zero IDs, and convert natural language into validated deterministic cleaning pipelines.
              </p>
            </div>

            {/* Upload Component */}
            <FileUploader
              onUpload={handleUpload}
              onLoadSample={handleLoadSample}
              isLoading={isLoading}
            />

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-1.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                  <Bot className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-white">Gemini AI Plans</h4>
                <p className="text-[11px] text-slate-400">
                  Natural language instructions converted into approved deterministic Python transformations.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-1.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto">
                  <Database className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-white">MongoDB Atlas</h4>
                <p className="text-[11px] text-slate-400">
                  Reusable cleaning recipes and session history with offline fallback resilience.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-1.5">
                <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-white">Zero Raw Data Storage</h4>
                <p className="text-[11px] text-slate-400">
                  Ephemeral in-memory processing with explicit TTL retention policy.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Active Dataset Dashboard */
          <div className="space-y-6 animate-in fade-in duration-200">
            
            {/* Top Bar with Dataset Metadata */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">{dataset.filename}</h2>
                  <p className="text-xs text-slate-400 font-mono">
                    Format: {dataset.file_format.toUpperCase()} • Size: {Math.round(dataset.file_size / 1024)} KB • Ephemeral Session
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setDataset(null)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  Upload Another File
                </button>
              </div>
            </div>

            {/* Quality Score & Metrics */}
            <QualityScoreCard dataset={dataset} />

            {/* Detected Issues Banner */}
            <IssueListBanner
              issues={dataset.issues}
              onApplyQuickFix={handleApplyQuickFix}
              isLoading={isLoading}
            />

            {/* Cleaning Console: AI Assistant, Manual Operations, Columns, Recipes, History */}
            <CleaningConsole
              dataset={dataset}
              onGenerateAIPlan={handleGenerateAIPlan}
              onExecuteAIPlan={handleExecuteAIPlan}
              onApplyOperation={handleApplyOperation}
              onApplyRecipe={handleApplyRecipe}
              isLoading={isLoading}
            />

            {/* Data Preview Table: Cleaned vs Raw vs Diff */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Interactive Spreadsheet Preview</h3>
                <span className="text-xs text-slate-400">
                  Showing first 100 rows with real-time updates
                </span>
              </div>
              <DataTable dataset={dataset} />
            </div>

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 mt-12 bg-slate-950/60 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-400">CleanSheet AI</span>
            <span>— Full-Stack AI Spreadsheet Cleanser</span>
          </div>

          <div className="flex items-center space-x-4">
            <span>FastAPI</span>
            <span>•</span>
            <span>Pandas</span>
            <span>•</span>
            <span>MongoDB Atlas</span>
            <span>•</span>
            <span>Gemini AI</span>
            <span>•</span>
            <span>React + Vite</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {isReportModalOpen && dataset && (
        <AuditReportModal
          sessionId={dataset.session_id}
          onClose={() => setIsReportModalOpen(false)}
        />
      )}

      {isStatusModalOpen && (
        <StatusDetailsModal
          health={health}
          onRefreshHealth={fetchHealth}
          onClose={() => setIsStatusModalOpen(false)}
        />
      )}

      {isAuthModalOpen && (
        <AuthModal
          onSuccess={(user) => {
            setCurrentUser(user);
            showNotification(`Welcome, ${user.username}!`, 'success');
          }}
          onClose={() => setIsAuthModalOpen(false)}
        />
      )}

    </div>
  );
};

export default App;
