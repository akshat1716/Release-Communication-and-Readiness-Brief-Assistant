'use client';

import { useState } from 'react';
import { Plus, Trash2, Sparkles, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { ReleasePackageData, ReleasePackageItem, ItemCategory } from '@/lib/types/release';
import { SAMPLE_RELEASE_PACKAGE } from '@/lib/fixtures/sample-release';

interface PackageEditorProps {
  initialData?: ReleasePackageData;
  onSave: (data: ReleasePackageData) => Promise<void>;
  isSaving?: boolean;
}

const CATEGORY_CONFIG: Array<{
  key: keyof Omit<ReleasePackageData, 'releaseName' | 'versionLabel'>;
  category: ItemCategory;
  prefix: string;
  label: string;
  placeholderTitle: string;
  placeholderDesc: string;
}> = [
  {
    key: 'features',
    category: 'FEATURE',
    prefix: 'F',
    label: 'Completed Features',
    placeholderTitle: 'e.g. Mobile Biometric Login',
    placeholderDesc: 'Detailed functional description of feature',
  },
  {
    key: 'bugFixes',
    category: 'BUGFIX',
    prefix: 'B',
    label: 'Bug Fixes',
    placeholderTitle: 'e.g. WebSocket Memory Leak',
    placeholderDesc: 'Description of bug fix and root cause',
  },
  {
    key: 'changedBehaviours',
    category: 'BEHAVIOUR',
    prefix: 'C',
    label: 'Changed Behaviour',
    placeholderTitle: 'e.g. HTTP Rate Limit Header Standardization',
    placeholderDesc: 'Details on changed system behavior or response formats',
  },
  {
    key: 'qaSummaries',
    category: 'QA',
    prefix: 'QA',
    label: 'QA Evidence & Test Summaries',
    placeholderTitle: 'e.g. Desktop Chrome E2E Suite',
    placeholderDesc: 'QA test run evidence, pass rates, and environments tested',
  },
  {
    key: 'knownLimitations',
    category: 'LIMITATION',
    prefix: 'L',
    label: 'Known Limitations & Constraints',
    placeholderTitle: 'e.g. 30-day Retention Window',
    placeholderDesc: 'Operational constraints or unresolved minor issues',
  },
  {
    key: 'migrationNotes',
    category: 'MIGRATION',
    prefix: 'M',
    label: 'Migration & Configuration Notes',
    placeholderTitle: 'e.g. Client Header Parser Update',
    placeholderDesc: 'Instructions for API consumers or sysadmins',
  },
  {
    key: 'affectedUserGroups',
    category: 'USER_GROUP',
    prefix: 'U',
    label: 'Affected User Groups & Roles',
    placeholderTitle: 'e.g. Mobile Application End Users',
    placeholderDesc: 'Target user cohorts or internal roles impacted',
  },
];

export default function PackageEditor({ initialData, onSave, isSaving }: PackageEditorProps) {
  const [pkgData, setPkgData] = useState<ReleasePackageData>(
    initialData || {
      releaseName: '',
      versionLabel: '',
      features: [],
      bugFixes: [],
      changedBehaviours: [],
      qaSummaries: [],
      knownLimitations: [],
      migrationNotes: [],
      affectedUserGroups: [],
    }
  );

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleLoadSample = () => {
    setPkgData(SAMPLE_RELEASE_PACKAGE);
    setMessage({
      type: 'success',
      text: 'Loaded realistic sample release package (includes deliberate gaps and an unsupported claim for testing).',
    });
  };

  const getNextStableId = (key: keyof Omit<ReleasePackageData, 'releaseName' | 'versionLabel'>, prefix: string) => {
    const items = pkgData[key];
    const existingNums = items
      .map((i) => {
        const match = i.id.match(new RegExp(`^${prefix}(\\d+)$`, 'i'));
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((n) => !isNaN(n));
    const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
    return `${prefix}${nextNum}`;
  };

  const addItem = (
    key: keyof Omit<ReleasePackageData, 'releaseName' | 'versionLabel'>,
    category: ItemCategory,
    prefix: string
  ) => {
    const newId = getNextStableId(key, prefix);
    const newItem: ReleasePackageItem = {
      id: newId,
      category,
      title: '',
      description: '',
    };
    setPkgData((prev) => ({
      ...prev,
      [key]: [...prev[key], newItem],
    }));
  };

  const removeItem = (
    key: keyof Omit<ReleasePackageData, 'releaseName' | 'versionLabel'>,
    id: string
  ) => {
    setPkgData((prev) => ({
      ...prev,
      [key]: prev[key].filter((i) => i.id !== id),
    }));
  };

  const updateItem = (
    key: keyof Omit<ReleasePackageData, 'releaseName' | 'versionLabel'>,
    id: string,
    field: 'title' | 'description',
    value: string
  ) => {
    setPkgData((prev) => ({
      ...prev,
      [key]: prev[key].map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkgData.releaseName.trim() || !pkgData.versionLabel.trim()) {
      setMessage({ type: 'error', text: 'Release name and version label are required.' });
      return;
    }
    try {
      await onSave(pkgData);
      setMessage({ type: 'success', text: 'Release package saved successfully.' });
    } catch (err: unknown) {
      const errText = err instanceof Error ? err.message : 'Save failed';
      setMessage({ type: 'error', text: errText });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Top Banner & Sample Button */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-sky-500/20">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            Release Package Definition
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Items receive stable identifiers (F1, B1, C1, QA1, L1, M1, U1) for precise AI citation tracking.
          </p>
        </div>
        <button
          type="button"
          onClick={handleLoadSample}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/30 text-xs font-semibold transition-all shrink-0"
        >
          <Sparkles className="w-4 h-4 text-indigo-400" />
          Load Sample Release Package
        </button>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-xs font-medium border ${
            message.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Primary Package Metadata */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card p-4 rounded-xl space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Release Name</label>
          <input
            type="text"
            value={pkgData.releaseName}
            onChange={(e) => setPkgData({ ...pkgData, releaseName: e.target.value })}
            placeholder="e.g. Core Platform v2.4.0"
            className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            required
          />
        </div>
        <div className="glass-card p-4 rounded-xl space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Version Label / Tag</label>
          <input
            type="text"
            value={pkgData.versionLabel}
            onChange={(e) => setPkgData({ ...pkgData, versionLabel: e.target.value })}
            placeholder="e.g. v2.4.0-rc1"
            className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            required
          />
        </div>
      </div>

      {/* Package Categories Accordion Sections */}
      <div className="space-y-5">
        {CATEGORY_CONFIG.map(({ key, category, prefix, label, placeholderTitle, placeholderDesc }) => {
          const items = pkgData[key];
          return (
            <div key={key} className="glass-card p-5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 text-xs font-mono font-bold">
                    {prefix}*
                  </span>
                  <h3 className="text-sm font-bold text-slate-200">{label}</h3>
                  <span className="text-xs text-slate-400">({items.length})</span>
                </div>
                <button
                  type="button"
                  onClick={() => addItem(key, category, prefix)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/40 text-sky-300 text-xs font-medium border border-sky-500/30 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add {prefix} Item
                </button>
              </div>

              {items.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 text-center text-xs text-slate-500 italic">
                  No {label.toLowerCase()} added yet. Click &quot;Add {prefix} Item&quot; to define an entry.
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col md:flex-row gap-3 items-start"
                    >
                      <div className="shrink-0 px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-sky-400 font-mono text-xs font-bold">
                        {item.id}
                      </div>

                      <div className="flex-1 space-y-2 w-full">
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => updateItem(key, item.id, 'title', e.target.value)}
                          placeholder={placeholderTitle}
                          className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                        />
                        <textarea
                          rows={2}
                          value={item.description}
                          onChange={(e) => updateItem(key, item.id, 'description', e.target.value)}
                          placeholder={placeholderDesc}
                          className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 resize-none"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(key, item.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all self-end md:self-center"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Save Button Bar */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="submit"
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-sky-600/20 disabled:opacity-50 transition-all"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving Version...' : 'Save & Submit Version'}
        </button>
      </div>
    </form>
  );
}
