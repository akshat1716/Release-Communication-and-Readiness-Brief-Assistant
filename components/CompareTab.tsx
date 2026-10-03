'use client';

import { useState, useEffect, useCallback } from 'react';
import { GitCompare, Plus, Minus, Edit, ArrowRight, Loader2 } from 'lucide-react';
import { ItemDiffResult, StatementDiffResult } from '@/lib/diff';

interface CompareTabProps {
  releaseId: string;
  totalVersions: number;
  currentVersionNum: number;
}

export default function CompareTab({ releaseId, totalVersions, currentVersionNum }: CompareTabProps) {
  const [v1, setV1] = useState<number>(Math.max(1, currentVersionNum - 1));
  const [v2, setV2] = useState<number>(currentVersionNum);

  const [packageDiff, setPackageDiff] = useState<ItemDiffResult | null>(null);
  const [statementDiff, setStatementDiff] = useState<StatementDiffResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchComparison = useCallback(async () => {
    if (v1 === v2) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/releases/${releaseId}/compare?v1=${v1}&v2=${v2}`);
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to compare versions');
      }

      setPackageDiff(data.packageDiff);
      setStatementDiff(data.statementDiff);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error comparing versions');
    } finally {
      setIsLoading(false);
    }
  }, [releaseId, v1, v2]);

  useEffect(() => {
    fetchComparison();
  }, [fetchComparison]);

  const versionNumbers = Array.from({ length: totalVersions }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      {/* Version Selector Header */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-sky-500/20">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            Side-by-Side Version Diff & History Comparison
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Compare package items and generated statement evolution across immutable snapshots.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400 font-semibold">Base (v1):</span>
            <select
              value={v1}
              onChange={(e) => setV1(Number(e.target.value))}
              className="bg-slate-800 text-sky-400 font-mono font-bold rounded px-2 py-0.5 border border-slate-700 focus:outline-none"
            >
              {versionNumbers.map((n) => (
                <option key={n} value={n}>
                  v{n}
                </option>
              ))}
            </select>
          </div>

          <ArrowRight className="w-4 h-4 text-slate-500" />

          <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400 font-semibold">Target (v2):</span>
            <select
              value={v2}
              onChange={(e) => setV2(Number(e.target.value))}
              className="bg-slate-800 text-indigo-400 font-mono font-bold rounded px-2 py-0.5 border border-slate-700 focus:outline-none"
            >
              {versionNumbers.map((n) => (
                <option key={n} value={n}>
                  v{n}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {v1 === v2 && (
        <div className="glass-card p-8 rounded-2xl text-center text-xs text-slate-400 border border-slate-800">
          Select two distinct versions above to compare differences.
        </div>
      )}

      {isLoading && (
        <div className="glass-card p-12 rounded-2xl text-center space-y-2">
          <Loader2 className="w-6 h-6 text-sky-400 animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Computing package and statement diffs...</p>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
          {error}
        </div>
      )}

      {packageDiff && statementDiff && !isLoading && v1 !== v2 && (
        <div className="space-y-6">
          {/* Package Items Diff */}
          <div className="glass-card p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <GitCompare className="w-4 h-4 text-sky-400" />
                Package Items Diff (v{v1} vs v{v2})
              </h3>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-emerald-400 font-semibold">+{packageDiff.added.length} Added</span>
                <span className="text-amber-400 font-semibold">~{packageDiff.modified.length} Modified</span>
                <span className="text-rose-400 font-semibold">-{packageDiff.removed.length} Removed</span>
              </div>
            </div>

            {/* Added Items */}
            {packageDiff.added.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Added Items in v{v2}:
                </h4>
                {packageDiff.added.map((item) => (
                  <div key={item.id} className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-xs">
                    <span className="font-mono font-bold text-emerald-400 mr-2">[{item.id}]</span>
                    <strong className="text-white">{item.title}:</strong> {item.description}
                  </div>
                ))}
              </div>
            )}

            {/* Modified Items */}
            {packageDiff.modified.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-amber-400 flex items-center gap-1">
                  <Edit className="w-3.5 h-3.5" /> Modified Items:
                </h4>
                {packageDiff.modified.map((mod) => (
                  <div key={mod.id} className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 text-xs space-y-1">
                    <div className="font-mono font-bold text-amber-400">[{mod.id}] Category: {mod.category}</div>
                    <div className="text-rose-300 font-mono text-[11px] line-through">- v{v1}: {mod.titleV1} — {mod.descV1}</div>
                    <div className="text-emerald-300 font-mono text-[11px]">+ v{v2}: {mod.titleV2} — {mod.descV2}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Removed Items */}
            {packageDiff.removed.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-rose-400 flex items-center gap-1">
                  <Minus className="w-3.5 h-3.5" /> Removed Items from v{v1}:
                </h4>
                {packageDiff.removed.map((item) => (
                  <div key={item.id} className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/30 text-xs line-through text-rose-300">
                    <span className="font-mono font-bold mr-2">[{item.id}]</span>
                    {item.title}: {item.description}
                  </div>
                ))}
              </div>
            )}

            {packageDiff.added.length === 0 && packageDiff.modified.length === 0 && packageDiff.removed.length === 0 && (
              <p className="text-xs text-slate-400 italic">No package item changes between v{v1} and v{v2}.</p>
            )}
          </div>

          {/* Statement Changes Diff */}
          <div className="glass-card p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Generated Statements Diff</h3>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-emerald-400 font-semibold">+{statementDiff.added.length} Added</span>
                <span className="text-amber-400 font-semibold">~{statementDiff.modified.length} Modified</span>
              </div>
            </div>

            {statementDiff.modified.map((mod, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-400 font-mono text-[11px]">
                  <span>Statement #{mod.id}</span>
                  <span>Status: v{v1} ({mod.statusV1}) → v{v2} ({mod.statusV2})</span>
                </div>
                <div className="text-rose-300 line-through">- v{v1}: {mod.textV1}</div>
                <div className="text-emerald-300">+ v{v2}: {mod.textV2}</div>
              </div>
            ))}

            {statementDiff.modified.length === 0 && statementDiff.added.length === 0 && (
              <p className="text-xs text-slate-400 italic">No statement wording differences between v{v1} and v{v2}.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
