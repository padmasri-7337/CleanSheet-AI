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
  Info,
  LayoutDashboard,
  Layers,
  History,
  Sliders,
  Flame,
  Network
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
import { DataQualityHeatmap } from './components/DataQualityHeatmap';
import { ErrorImpactMap } from './components/ErrorImpactMap';
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
      showNotification(`Resolved: ${issue.title}`, 'success');
    } catch (err: any) {
      showNotification(err?.response?.data?.detail || 'Quick fix failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Batch auto-correction for all selected issues
  const handleApplyBatchFixes = async (issuesToFix: DetectedIssue[]) => {
    if (!dataset) return;
    setIsLoading(true);
    try {
      let currentSessionId = dataset.session_id;
      let latestDataset: DatasetPreview = dataset;
      for (const issue of issuesToFix) {
        latestDataset = await api.applyStep(
          currentSessionId,
          issue.suggested_action,
          issue.suggested_params
        );
      }
      setDataset(latestDataset);
      showNotification(`Successfully auto-corrected ${issuesToFix.length} quality issues!`, 'success');
    } catch (err: any) {
      showNotification(err?.response?.data?.detail || 'Batch auto-correction encountered an error.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Dismiss issue
  const handleDismissIssue = async (issue: DetectedIssue) => {
    if (!dataset) return;
    setIsLoading(true);
    try {
      const col = issue.affected_columns && issue.affected_columns.length > 0 ? issue.affected_columns[0] : undefined;
      const res = await api.dismissIssue(dataset.session_id, issue.id, col);
      setDataset(res);
      showNotification(`Dismissed notice: ${issue.title}`, 'info');
    } catch (err: any) {
      showNotification(err?.response?.data?.detail || 'Failed to dismiss issue', 'error');
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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex selection:bg-emerald-500 selection:text-white">
      
      {/* Left Icon Rail Navigation (matching screenshot design) */}
      <aside className="w-16 bg-white border-r border-slate-200/90 hidden md:flex flex-col items-center py-5 justify-between flex-shrink-0 z-30 shadow-xs">
        {/* Top Logo and Menu */}
        <div className="flex flex-col items-center space-y-6">
          <div className="w-10 h-10 rounded-2xl bg-[#009A49] flex items-center justify-center text-white shadow-xs font-black text-sm tracking-tighter">
            CS
          </div>
          
          <nav className="flex flex-col items-center space-y-3.5 text-slate-500">
            <button
              onClick={() => {
                if (dataset) {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className="p-2.5 rounded-2xl bg-emerald-50 text-[#009A49] hover:bg-emerald-100 transition shadow-2xs"
              title="Data Validation Overview"
            >
              <LayoutDashboard className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                document.getElementById('quality-heatmap-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="p-2.5 rounded-2xl hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition"
              title="Data Quality Heatmap"
            >
              <Flame className="w-5 h-5 text-amber-500" />
            </button>
            <button
              onClick={() => {
                document.getElementById('error-impact-map-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="p-2.5 rounded-2xl hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition"
              title="Error Impact Map (CSV Risk & Downstream Cascades)"
            >
              <Network className="w-5 h-5 text-rose-500" />
            </button>
            <button
              onClick={() => {
                document.getElementById('cleaning-console-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="p-2.5 rounded-2xl hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition"
              title="AI & Smart Cleaning Console"
            >
              <Sparkles className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                document.getElementById('interactive-data-view')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="p-2.5 rounded-2xl hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition"
              title="Spreadsheet Preview"
            >
              <FileSpreadsheet className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsReportModalOpen(true)}
              disabled={!dataset}
              className="p-2.5 rounded-2xl hover:bg-slate-100 text-slate-600 hover:text-slate-900 disabled:opacity-40 transition"
              title="Audit Report"
            >
              <Layers className="w-5 h-5" />
            </button>
          </nav>
        </div>

        {/* Bottom Diagnostics / Status */}
        <div className="flex flex-col items-center space-y-3">
          <button
            onClick={() => setIsStatusModalOpen(true)}
            className="p-2.5 rounded-2xl hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition"
            title="Diagnostics & Connectivity"
          >
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </button>
        </div>
      </aside>

      {/* Main View Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
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
              className={`px-4 py-2.5 rounded-2xl shadow-xl border text-xs font-semibold flex items-center space-x-2 ${
                notification.type === 'success'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : notification.type === 'error'
                  ? 'bg-rose-50 border-rose-300 text-rose-900'
                  : 'bg-indigo-50 border-indigo-300 text-indigo-900'
              }`}
            >
              {notification.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              <span>{notification.message}</span>
            </div>
          </div>
        )}

        {/* Main Content Container */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-6">
          
          {!dataset ? (
            /* Empty State: Hero & Upload */
            <div className="max-w-3xl mx-auto space-y-8 py-6">
              <div className="text-center space-y-3">
                <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-emerald-100/70 border border-emerald-200 text-[#009A49] text-xs font-bold shadow-2xs">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI-Assisted Spreadsheet Cleansing & Standardization</span>
                </div>

                <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
                  Turn messy spreadsheets into{' '}
                  <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 bg-clip-text text-transparent">
                    analysis-ready datasets
                  </span>
                </h1>

                <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto">
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
                <div className="p-5 rounded-2xl bg-white border border-slate-200 text-center space-y-2 shadow-xs hover:border-slate-300 transition">
                  <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-200">
                    <Bot className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">Gemini AI Plans</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Natural language instructions converted into approved deterministic Python transformations.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 text-center space-y-2 shadow-xs hover:border-slate-300 transition">
                  <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center mx-auto border border-indigo-200">
                    <Database className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">MongoDB Atlas</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Reusable cleaning recipes and session history with offline fallback resilience.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 text-center space-y-2 shadow-xs hover:border-slate-300 transition">
                  <div className="w-9 h-9 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto border border-teal-200">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">Zero Raw Data Storage</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Ephemeral in-memory processing with explicit TTL retention policy.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Active Dataset Dashboard */
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Top Bar with Dataset Metadata */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#009A49]">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">{dataset.filename}</h2>
                    <p className="text-xs text-slate-500 font-mono">
                      Format: {dataset.file_format.toUpperCase()} • Size: {Math.round(dataset.file_size / 1024)} KB • Ephemeral Session
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setDataset(null)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs transition"
                  >
                    Upload Another File
                  </button>
                </div>
              </div>

              {/* 1. Quality Score & 4 KPI Cards (matches reference picture) */}
              <QualityScoreCard
                dataset={dataset}
                onStartFresh={handleReset}
              />

              {/* 2. Detected Issues 2-Column Grid Banner (matches reference picture) */}
              <IssueListBanner
                issues={dataset.issues}
                onApplyQuickFix={handleApplyQuickFix}
                onApplyBatchFixes={handleApplyBatchFixes}
                onContinueToDataView={() => {
                  document.getElementById('interactive-data-view')?.scrollIntoView({ behavior: 'smooth' });
                }}
                isLoading={isLoading}
              />

              {/* 3. Data Quality Heatmap (Visual Defect Concentration Matrix & Column Breakdown) */}
              <div id="quality-heatmap-section">
                <DataQualityHeatmap
                  dataset={dataset}
                  onNavigateToRow={(rowIdx) => {
                    document.getElementById('interactive-data-view')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                />
              </div>

              {/* 3.5. Error Impact Map (Downstream Cascades & Calculation Shielding - CSV Only) */}
              <div id="error-impact-map-section">
                <ErrorImpactMap
                  dataset={dataset}
                  onApplyQuickFix={handleApplyQuickFix}
                  onApplyOperation={handleApplyOperation}
                  isLoading={isLoading}
                />
              </div>

              {/* 4. Cleaning Console (AI Assistant, Manual Operations, Columns, Recipes, History) */}
              <div id="cleaning-console-section" className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">Cleaning & Transformation Suite</h3>
                  <span className="text-xs text-slate-500">Fine-tune transforms, execute pipelines, or run AI prompts</span>
                </div>
                <CleaningConsole
                  dataset={dataset}
                  onGenerateAIPlan={handleGenerateAIPlan}
                  onExecuteAIPlan={handleExecuteAIPlan}
                  onApplyOperation={handleApplyOperation}
                  onApplyRecipe={handleApplyRecipe}
                  isLoading={isLoading}
                />
              </div>

              {/* 5. Data Preview Table: Cleaned vs Raw vs Diff vs Quality Heatmap */}
              <div id="interactive-data-view" className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Interactive Spreadsheet Preview</h3>
                    <p className="text-xs text-slate-500">Showing first 100 rows with real-time updates and live quality heatmaps</p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Live Synced
                  </span>
                </div>
                <DataTable dataset={dataset} />
              </div>

            </div>
          )}

        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 py-6 mt-12 bg-white text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-800">CleanSheet AI</span>
              <span>— Full-Stack AI Spreadsheet Cleanser</span>
            </div>

            <div className="flex items-center space-x-4 text-slate-600 font-medium">
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

      </div>

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

