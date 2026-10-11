import React, { useState, useEffect } from 'react';
import { Bookmark, Play, Plus, Trash2, CheckCircle2, BookmarkPlus, Layers } from 'lucide-react';
import { CleaningRecipe, DatasetPreview } from '../types';
import { api } from '../services/api';

interface RecipesTabProps {
  dataset: DatasetPreview;
  onApplyRecipe: (recipeId: string) => Promise<void>;
  isLoading: boolean;
}

export const RecipesTab: React.FC<RecipesTabProps> = ({
  dataset,
  onApplyRecipe,
  isLoading,
}) => {
  const [recipes, setRecipes] = useState<{ presets: CleaningRecipe[]; saved_recipes: CleaningRecipe[] }>({
    presets: [],
    saved_recipes: [],
  });
  const [saveName, setSaveName] = useState('');
  const [saveDesc, setSaveDesc] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchRecipes = async () => {
    try {
      const data = await api.getRecipes();
      setRecipes(data);
    } catch (err) {
      console.error('Failed to load recipes', err);
    }
  };

  useEffect(() => {
    fetchRecipes();
  }, []);

  const handleSaveCurrentWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveName.trim()) return;
    if (dataset.applied_operations.length === 0) {
      setMessage('No operations have been applied in this session to save.');
      return;
    }

    setIsSaving(true);
    setMessage(null);
    try {
      const ops = dataset.applied_operations.map((o) => ({
        operation: o.operation,
        params: o.params,
      }));
      await api.saveRecipe(saveName.trim(), saveDesc.trim(), ops);
      setSaveName('');
      setSaveDesc('');
      setMessage(`Recipe "${saveName}" successfully saved to MongoDB Atlas!`);
      await fetchRecipes();
    } catch (err: any) {
      setMessage(err?.response?.data?.detail || 'Failed to save recipe.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this saved recipe?')) {
      await api.deleteRecipe(id);
      await fetchRecipes();
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Save current pipeline banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
        <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
          <BookmarkPlus className="w-4 h-4 text-[#009A49]" />
          <span>Save Current Session as Reusable Recipe</span>
        </div>
        <p className="text-xs text-slate-500">
          Capture the {dataset.applied_operations.length} transformation steps applied in this session into a reusable pipeline stored in MongoDB Atlas.
        </p>

        <form onSubmit={handleSaveCurrentWorkflow} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <input
              type="text"
              placeholder="Recipe name (e.g. Sales Sanitizer)"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 focus:border-emerald-500 rounded-xl text-xs text-slate-800 placeholder-slate-400 shadow-2xs focus:outline-none"
              required
            />
          </div>
          <div>
            <input
              type="text"
              placeholder="Description (optional)"
              value={saveDesc}
              onChange={(e) => setSaveDesc(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 focus:border-emerald-500 rounded-xl text-xs text-slate-800 placeholder-slate-400 shadow-2xs focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={isSaving || dataset.applied_operations.length === 0}
            className="flex items-center justify-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#009A49] hover:bg-[#00823E] text-white disabled:opacity-50 transition shadow-2xs"
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Save to MongoDB</span>
          </button>
        </form>

        {message && (
          <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
            {message}
          </div>
        )}
      </div>

      {/* Preset Recipes */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-600 tracking-wider uppercase">
          Standard Presets
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recipes.presets.map((recipe) => (
            <div
              key={recipe._id}
              className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-300 shadow-xs transition"
            >
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-900">{recipe.name}</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Preset
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">{recipe.description}</p>
                <div className="text-[10px] text-slate-400 mt-2 font-mono">
                  {recipe.operations.length} automated steps
                </div>
              </div>

              <button
                type="button"
                disabled={isLoading}
                onClick={() => onApplyRecipe(recipe._id)}
                className="mt-4 flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition shadow-2xs"
              >
                <Play className="w-3 h-3" />
                <span>Apply Preset</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Saved Recipes in MongoDB */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-600 tracking-wider uppercase">
          Saved Pipelines ({recipes.saved_recipes.length})
        </h4>

        {recipes.saved_recipes.length === 0 ? (
          <div className="p-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 text-center text-xs text-slate-400">
            No custom recipes saved yet. Apply cleaning steps and save your workflow above!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recipes.saved_recipes.map((recipe) => (
              <div
                key={recipe._id}
                className="bg-white border border-slate-200 rounded-2xl p-4 flex items-start justify-between hover:border-slate-300 shadow-xs transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-900">{recipe.name}</span>
                    <span className="text-[10px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-semibold">
                      MongoDB
                    </span>
                  </div>
                  {recipe.description && (
                    <p className="text-[11px] text-slate-500">{recipe.description}</p>
                  )}
                  <div className="text-[10px] text-slate-400 font-mono">
                    {recipe.operations.length} steps • Saved {recipe.created_at ? new Date(recipe.created_at).toLocaleDateString() : ''}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => onApplyRecipe(recipe._id)}
                    className="p-1.5 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition"
                    title="Apply recipe"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleDelete(recipe._id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition"
                    title="Delete recipe"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
