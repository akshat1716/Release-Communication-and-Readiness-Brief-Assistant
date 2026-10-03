'use client';

import { CheckCircle2, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { DeterministicCheckResult } from '@/lib/types/release';

interface ChecksTabProps {
  checks: DeterministicCheckResult[];
  onReRunChecks?: () => Promise<void>;
  isReRunning?: boolean;
}

export default function ChecksTab({ checks, onReRunChecks, isReRunning }: ChecksTabProps) {
  const passCount = checks.filter((c) => c.status === 'PASS').length;
  const failCount = checks.filter((c) => c.status === 'FAIL').length;
  const warnCount = checks.filter((c) => c.status === 'WARN').length;

  return (
    <div className="space-y-6">
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

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="w-4 h-4" /> {passCount} Passed
          </div>
          {warnCount > 0 && (
            <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <AlertTriangle className="w-4 h-4" /> {warnCount} Warnings
            </div>
          )}
          {failCount > 0 && (
            <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <XCircle className="w-4 h-4" /> {failCount} Failed
            </div>
          )}
          {onReRunChecks && (
            <button
              onClick={onReRunChecks}
              disabled={isReRunning}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition-all"
              title="Re-run deterministic checks"
            >
              <RefreshCw className={`w-4 h-4 ${isReRunning ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Check Item Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {checks.map((check) => {
          const isPass = check.status === 'PASS';
          const isWarn = check.status === 'WARN';
          const isFail = check.status === 'FAIL';

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
                  {isPass && <CheckCircle2 className="w-3.5 h-3.5" />}
                  {isWarn && <AlertTriangle className="w-3.5 h-3.5" />}
                  {isFail && <XCircle className="w-3.5 h-3.5" />}
                  {check.status}
                </span>
              </div>

              <h3 className="text-sm font-bold text-white mb-1">{check.name}</h3>
              <p className="text-xs text-slate-300 leading-relaxed mb-2">{check.message}</p>

              {check.details && (
                <div className="mt-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono text-slate-400">
                  {check.details}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
