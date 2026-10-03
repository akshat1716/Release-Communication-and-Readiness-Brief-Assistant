'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import { Layers, Plus, Sparkles, ChevronRight, FileCheck, Loader2 } from 'lucide-react';
import { SAMPLE_RELEASE_PACKAGE } from '@/lib/fixtures/sample-release';

interface ReleaseSummary {
  id: string;
  name: string;
  versionLabel: string;
  currentVersionNum: number;
  updatedAt: string;
  versions: Array<{ id: string; versionNum: number }>;
}

export default function HomePage() {
  const [releases, setReleases] = useState<ReleaseSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [creating, setCreating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReleases = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/releases');
      const data = await res.json();

      if (data.success && Array.isArray(data.releases)) {
        setReleases(data.releases);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching releases');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReleases();
  }, [fetchReleases]);

  const handleCreateSample = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/releases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(SAMPLE_RELEASE_PACKAGE),
      });
      const data = await res.json();
      if (data.success && data.release) {
        window.location.href = `/releases/${data.release.id}`;
      } else {
        setError(data.error || 'Failed creating release');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed creating sample release');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      <Header />

      <main className="max-w-7xl mx-auto px-4 lg:px-8 pt-8 space-y-8">
        {/* Welcome Hero Panel */}
        <div className="glass-panel p-8 rounded-3xl relative overflow-hidden border border-sky-500/20">
          <div className="absolute -right-16 -top-16 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="max-w-2xl space-y-3 relative z-10">
            <span className="px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold">
              Readiness & Governance Platform
            </span>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
              Release Communication & Brief Assistant
            </h1>
            <p className="text-xs lg:text-sm text-slate-300 leading-relaxed">
              Submit structured release packages, run 6 pure-code readiness checks, analyze user impact and QA evidence gaps with multi-step LLM analysis, and generate reviewed final briefs built exclusively from human-approved statements.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={handleCreateSample}
                disabled={creating}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-sky-600/20 disabled:opacity-50 transition-all"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Load Sample Release Package
              </button>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
            {error}
          </div>
        )}

        {/* Dashboard Releases Grid Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Active Release Packages
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400">
                {releases.length}
              </span>
            </h2>
            <p className="text-xs text-slate-400">Manage release packages, version history, and human review workflows.</p>
          </div>

          <button
            onClick={handleCreateSample}
            disabled={creating}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
          >
            <Plus className="w-4 h-4 text-sky-400" />
            New Release Package
          </button>
        </div>

        {/* Loading Spinner / Empty State / Grid */}
        {loading ? (
          <div className="glass-card p-12 rounded-2xl text-center space-y-2">
            <Loader2 className="w-6 h-6 text-sky-400 animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Loading release packages...</p>
          </div>
        ) : releases.length === 0 ? (
          <div className="glass-card p-12 rounded-3xl text-center space-y-4 border border-slate-800">
            <Layers className="w-12 h-12 text-slate-500 mx-auto opacity-60" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">No Releases Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Get started quickly by loading our realistic sample package containing intentional QA evidence gaps and unsupported claims.
              </p>
            </div>
            <button
              onClick={handleCreateSample}
              disabled={creating}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-lg shadow-sky-600/20"
            >
              <Sparkles className="w-4 h-4" />
              Load Sample Package
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {releases.map((rel) => (
              <Link
                key={rel.id}
                href={`/releases/${rel.id}`}
                className="glass-card p-6 rounded-2xl border border-slate-800 hover:border-sky-500/40 hover:bg-slate-900/80 transition-all group flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      {rel.versionLabel}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      v{rel.currentVersionNum} snapshot
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-sky-300 transition-colors">
                    {rel.name}
                  </h3>
                </div>

                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1 text-[11px]">
                    <FileCheck className="w-3.5 h-3.5 text-emerald-400" /> Ready for Review
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-sky-400 group-hover:translate-x-1 transition-transform">
                    View Details <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
