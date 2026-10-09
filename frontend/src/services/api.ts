import axios from 'axios';
import {
  DatasetPreview,
  HealthStatus,
  AIPlan,
  CleaningRecipe,
  HistoryItem,
  AuditReport,
  User
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

const client = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to requests if available
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('cleansheet_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  // Health & Diagnostics
  getHealth: async (): Promise<HealthStatus> => {
    const res = await client.get<HealthStatus>('/health');
    return res.data;
  },

  testDatabase: async (): Promise<any> => {
    const res = await client.post('/db/test');
    return res.data;
  },

  // Data Operations
  uploadFile: async (file: File): Promise<DatasetPreview> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await client.post<DatasetPreview>('/data/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  loadSample: async (name: string = 'messy_sales'): Promise<DatasetPreview> => {
    const res = await client.get<DatasetPreview>(`/data/sample/${name}`);
    return res.data;
  },

  getPreview: async (sessionId: string): Promise<DatasetPreview> => {
    const res = await client.get<DatasetPreview>(`/data/preview/${sessionId}`);
    return res.data;
  },

  resetSession: async (sessionId: string): Promise<DatasetPreview> => {
    const res = await client.post<DatasetPreview>(`/data/reset/${sessionId}`);
    return res.data;
  },

  getDownloadUrl: (sessionId: string, format: 'csv' | 'xlsx'): string => {
    return `${API_BASE}/data/download/${sessionId}?format=${format}`;
  },

  // Cleaning Operations
  applyStep: async (
    sessionId: string,
    operation: string,
    params: Record<string, any>
  ): Promise<DatasetPreview> => {
    const res = await client.post<DatasetPreview>('/clean/step', {
      session_id: sessionId,
      operation,
      params,
    });
    return res.data;
  },

  dismissIssue: async (
    sessionId: string,
    issueId: string,
    column?: string
  ): Promise<DatasetPreview> => {
    const res = await client.post<DatasetPreview>('/clean/dismiss_issue', {
      session_id: sessionId,
      operation: 'dismiss_issue',
      params: { issue_id: issueId, column },
    });
    return res.data;
  },

  applyBatch: async (
    sessionId: string,
    operations: { operation: string; params: Record<string, any> }[],
    saveToHistory: boolean = true
  ): Promise<DatasetPreview> => {
    const res = await client.post<DatasetPreview>('/clean/batch', {
      session_id: sessionId,
      operations,
      save_to_history: saveToHistory,
    });
    return res.data;
  },

  getAuditReport: async (sessionId: string): Promise<AuditReport> => {
    const res = await client.get<AuditReport>(`/clean/report/${sessionId}`);
    return res.data;
  },

  // AI Integration
  generateAIPlan: async (
    sessionId: string,
    instruction: string,
    contextNotes?: string
  ): Promise<AIPlan> => {
    const res = await client.post<AIPlan>('/ai/plan', {
      session_id: sessionId,
      instruction,
      context_notes: contextNotes,
    });
    return res.data;
  },

  executeAIPlan: async (
    sessionId: string,
    steps: any[],
    saveToHistory: boolean = true
  ): Promise<DatasetPreview> => {
    const res = await client.post<DatasetPreview>('/ai/execute', {
      session_id: sessionId,
      steps,
      save_to_history: saveToHistory,
    });
    return res.data;
  },

  // Recipes
  getRecipes: async (): Promise<{ presets: CleaningRecipe[]; saved_recipes: CleaningRecipe[] }> => {
    const res = await client.get('/recipes');
    return res.data;
  },

  saveRecipe: async (
    name: string,
    description: string,
    operations: { operation: string; params: Record<string, any> }[]
  ): Promise<any> => {
    const res = await client.post('/recipes/save', {
      name,
      description,
      operations,
      is_public: true,
    });
    return res.data;
  },

  deleteRecipe: async (recipeId: string): Promise<any> => {
    const res = await client.delete(`/recipes/${recipeId}`);
    return res.data;
  },

  applyRecipe: async (sessionId: string, recipeId: string): Promise<DatasetPreview> => {
    const res = await client.post<DatasetPreview>('/recipes/apply', {
      session_id: sessionId,
      recipe_id: recipeId,
    });
    return res.data;
  },

  // History
  getHistory: async (): Promise<{ count: number; history: HistoryItem[]; note: string }> => {
    const res = await client.get('/history');
    return res.data;
  },

  // Authentication
  register: async (username: string, email: string, password: string): Promise<{ access_token: string; user: User }> => {
    const res = await client.post('/auth/register', { username, email, password });
    if (res.data.access_token) {
      localStorage.setItem('cleansheet_token', res.data.access_token);
    }
    return res.data;
  },

  login: async (username_or_email: string, password: string): Promise<{ access_token: string; user: User }> => {
    const res = await client.post('/auth/login', { username_or_email, password });
    if (res.data.access_token) {
      localStorage.setItem('cleansheet_token', res.data.access_token);
    }
    return res.data;
  },

  getMe: async (): Promise<User> => {
    const res = await client.get<User>('/auth/me');
    return res.data;
  },

  logout: () => {
    localStorage.removeItem('cleansheet_token');
  },
};
