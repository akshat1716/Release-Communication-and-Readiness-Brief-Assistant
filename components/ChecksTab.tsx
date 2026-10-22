'use client';

import { CheckCircle2, XCircle, AlertTriangle, RefreshCw, AlertCircle } from 'lucide-react';
import { DeterministicCheckResult } from '@/lib/types/release';

interface ChecksTabProps {
  checks: DeterministicCheckResult[];
  onReRunChecks?: () => Promise<void>;
  isReRunning?: boolean;
  isLoading?: boolean;
  error?: string | null;
}

export default function ChecksTab({
  checks,
  onReRunChecks,
  isReRunning = false,
  isLoading = false,
  error = null,
}: ChecksTabProps) {
  const passCount = checks.filter((c) => c.status === 'PASS').length;
  const failCount = checks.filter((c) => c.status === 'FAIL').length;
  const warnCount = checks.filter((c) => c.status === 'WARN').length;

  return (
    <div className="space-y-6" aria-busy={isLoading || isReRunning} aria-live="polite">
      {/* Overview Stats Bar */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            Deterministic Readiness Checks (Pure Code Engine)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Non-AI rule validation executed directly against release package sections before triggering LLM analysis.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> {passCount} Passed
          </div>
          {warnCount > 0 && (
            <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <AlertTriangle className="w-4 h-4" aria-hidden="true" /> {warnCount} Warnings
            </div>
          )}
          {failCount > 0 && (
            <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <XCircle className="w-4 h-4" aria-hidden="true" /> {failCount} Failed
            </div>
          )}
          {onReRunChecks && (
            <button
              onClick={onReRunChecks}
              disabled={isReRunning || isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:opacity-50"
              aria-label="Re-run deterministic checks"
              title="Re-run deterministic checks"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReRunning ? 'animate-spin' : ''}`} aria-hidden="true" />
              <span>{isReRunning ? 'Running...' : 'Re-run Checks'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Error state with retry */}
      {error && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
          {onReRunChecks && (
            <button
              onClick={onReRunChecks}
              className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium focus-visible:ring-2 focus-visible:ring-rose-400"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Loading Skeleton State */}
      {(isLoading || isReRunning) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" aria-label="Loading checks">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="glass-card p-5 rounded-2xl border border-slate-800 space-y-3 animate-pulse">
              <div className="flex justify-between items-center">
                <div className="h-4 w-24 bg-slate-800 rounded" />
                <div className="h-4 w-16 bg-slate-800 rounded-full" />
              </div>
              <div className="h-4 w-40 bg-slate-700 rounded" />
              <div className="h-3 w-full bg-slate-800 rounded" />
              <div className="h-3 w-3/4 bg-slate-800 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isReRunning && checks.length === 0 && (
        <div className="glass-card p-12 rounded-2xl text-center space-y-3 border border-slate-800">
          <AlertCircle className="w-10 h-10 text-slate-500 mx-auto" aria-hidden="true" />
          <h3 className="text-sm font-bold text-white">No Deterministic Checks Found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Checks run automatically when a release version is created or updated. Click &quot;Re-run Checks&quot; above to evaluate this package.
          </p>
          {onReRunChecks && (
            <button
              onClick={onReRunChecks}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              Run Checks Now
            </button>
          )}
        </div>
      )}

      {/* Check Item Cards */}
      {!isLoading && !isReRunning && checks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {checks.map((check) => {
            const isPass = check.status === 'PASS';
            const isWarn = check.status === 'WARN';

            return (
              <div
                key={check.ruleId}
                className={`glass-card p-5 rounded-2xl border transition-all ${
                  isPass
                    ? 'border-emerald-500/30 bg-emerald-950/10'
                    : isWarn
                    ? 'border-amber-500/30 bg-amber-950/10'
                    : 'border-rose-500/30 bg-rose-950/10'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                    {check.ruleId}
                  </span>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                      isPass
                        ? 'badge-pass'
                        : isWarn
                        ? 'badge-warn'
                        : 'badge-fail'
                    }`}
                  >
                    {isPass && <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />}
                    {isWarn && <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />}
                    {!isPass && !isWarn && <XCircle className="w-3.5 h-3.5" aria-hidden="true" />}
                    {check.status}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white mb-1">{check.name}</h3>
                <p className="text-xs text-slate-300 leading-relaxed mb-2">{check.message}</p>

                {check.details && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono text-slate-400 break-words">
                    {check.details}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
