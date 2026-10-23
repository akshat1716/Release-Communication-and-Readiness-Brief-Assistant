'use client';

import { Play, Sparkles, AlertCircle, CheckCircle2, RotateCcw, FileText, ArrowRight, Clock, ShieldCheck, RefreshCw } from 'lucide-react';
import {
  AIClassificationData,
  AIMissingInfoData,
  AIClaimVerificationData,
} from '@/lib/types/release';

export type StepKey = 'step-a' | 'step-b' | 'step-c' | 'step-d';
export type StepStatus = 'idle' | 'running' | 'completed' | 'failed';

export interface StepProgressState {
  key: StepKey;
  name: string;
  status: StepStatus;
  durationMs?: number;
  tokensUsed?: number;
  estimatedCostUsd?: number;
  error?: string;
}

interface AnalysisTabProps {
  classifications: AIClassificationData[];
  missingInfos: AIMissingInfoData[];
  verifications: AIClaimVerificationData[];
  stepStates: StepProgressState[];
  onRunWholeWorkflow: () => Promise<void>;
  onRetryStep: (stepKey: StepKey) => Promise<void>;
  onResumeFrom: (stepKey: StepKey) => Promise<void>;
  isAnalyzing: boolean;
  currentStep?: string;
  analysisError?: string | null;
}

export default function AnalysisTab({
  classifications,
  missingInfos,
  verifications,
  stepStates,
  onRunWholeWorkflow,
  onRetryStep,
  onResumeFrom,
  isAnalyzing,
  currentStep,
  analysisError,
}: AnalysisTabProps) {
  const hasResults = classifications.length > 0 || missingInfos.length > 0 || verifications.length > 0;

  const getImpactBadgeClass = (impact: string) => {
    switch (impact) {
      case 'BREAKING':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'USER_VISIBLE':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
      case 'SECURITY':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'PERFORMANCE':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      default:
        return 'bg-slate-700/40 text-slate-300 border-slate-600';
    }
  };

  const getClaimStatusBadge = (status: string) => {
    switch (status) {
      case 'SUPPORTED':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'PARTIALLY_SUPPORTED':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'UNSUPPORTED':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold';
      default:
        return 'bg-slate-700/40 text-slate-300 border-slate-600';
    }
  };

  return (
    <div className="space-y-6" aria-busy={isAnalyzing} aria-live="polite">
      {/* Header and Workflow Trigger Controls */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-sky-500/20">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            Multi-Step AI Analysis Pipeline & Step Recovery
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Executes Step A (Classifications), Step B (Gap Analysis), Step C (QA Claim Audit), and Step D (Summaries) as independent endpoints to guarantee serverless reliability.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onRunWholeWorkflow}
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-sky-600/20 disabled:opacity-50 transition-all focus-visible:ring-2 focus-visible:ring-sky-400"
            aria-label={hasResults ? 'Re-run whole workflow' : 'Start multi-step AI analysis'}
          >
            {isAnalyzing ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin text-sky-200" aria-hidden="true" />
                <span>Running Pipeline...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 text-white" aria-hidden="true" />
                <span>{hasResults ? 'Re-Run Whole Workflow' : 'Start Multi-Step AI Analysis'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Global Analysis Error Banner */}
      {analysisError && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" aria-hidden="true" />
            <span>{analysisError}</span>
          </div>
        </div>
      )}

      {/* 4-Step Granular Status and Recovery Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {stepStates.map((step) => {
          const isCurrent = step.status === 'running';
          const isDone = step.status === 'completed';
          const isFail = step.status === 'failed';

          return (
            <div
              key={step.key}
              className={`glass-card p-4 rounded-xl border transition-all space-y-2.5 ${
                isCurrent
                  ? 'border-sky-500 bg-sky-950/20 ring-1 ring-sky-500/30'
                  : isDone
                  ? 'border-emerald-500/30 bg-emerald-950/10'
                  : isFail
                  ? 'border-rose-500/40 bg-rose-950/20'
                  : 'border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-slate-400 uppercase">
                  {step.key}
                </span>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    isDone
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : isFail
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : isCurrent
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 animate-pulse'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {isDone && <CheckCircle2 className="w-3 h-3 text-emerald-400" aria-hidden="true" />}
                  {isFail && <AlertCircle className="w-3 h-3 text-rose-400" aria-hidden="true" />}
                  {isCurrent && <RefreshCw className="w-3 h-3 text-sky-400 animate-spin" aria-hidden="true" />}
                  {step.status.toUpperCase()}
                </span>
              </div>

              <h4 className="text-xs font-semibold text-white truncate">{step.name}</h4>

              {/* Telemetry (Duration, Tokens, Cost) */}
              <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap">
                {step.durationMs !== undefined && (
                  <span className="flex items-center gap-0.5">
                    <Clock className="w-3 h-3 text-slate-500" aria-hidden="true" />
                    <span>{(step.durationMs / 1000).toFixed(1)}s</span>
                  </span>
                )}
                {step.tokensUsed !== undefined && step.tokensUsed > 0 && (
                  <span>{step.tokensUsed} tokens</span>
                )}
                {step.estimatedCostUsd !== undefined && step.estimatedCostUsd > 0 && (
                  <span className="text-emerald-400 font-mono">${step.estimatedCostUsd.toFixed(4)}</span>
                )}
              </div>

              {/* Step Error Snippet */}
              {isFail && step.error && (
                <div className="p-2 rounded bg-rose-950/40 border border-rose-500/30 text-[11px] text-rose-300 leading-tight break-words">
                  {step.error}
                </div>
              )}

              {/* Per-Step Recovery Actions */}
              {isFail && !isAnalyzing && (
                <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                  <button
                    onClick={() => onRetryStep(step.key)}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-semibold text-center focus-visible:ring-2 focus-visible:ring-sky-400 transition-all"
                    aria-label={`Retry only ${step.name}`}
                  >
                    Retry Step {step.key.replace('step-', '').toUpperCase()}
                  </button>

                  <button
                    onClick={() => onResumeFrom(step.key)}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold text-center focus-visible:ring-2 focus-visible:ring-indigo-400 transition-all"
                    aria-label={`Resume workflow starting from ${step.name}`}
                  >
                    Resume from Step {step.key.replace('step-', '').toUpperCase()}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress Bar when Analyzing */}
      {isAnalyzing && (
        <div className="glass-card p-4 rounded-xl space-y-2">
          <div className="flex justify-between text-xs text-slate-300 font-medium">
            <span>Executing Analysis Pipeline</span>
            <span className="text-sky-400 font-mono">{currentStep || 'In progress...'}</span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 animate-pulse w-3/4" />
          </div>
        </div>
      )}

      {/* Empty State */}
      {!hasResults && !isAnalyzing && (
        <div className="glass-card p-12 rounded-2xl text-center space-y-3 border border-slate-800">
          <Sparkles className="w-10 h-10 text-sky-400 mx-auto opacity-70" aria-hidden="true" />
          <h3 className="text-sm font-bold text-white">No AI Analysis Run Yet</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Click &quot;Start Multi-Step AI Analysis&quot; above to classify user impact, identify missing info gaps, and audit QA evidence support with token and cost telemetry.
          </p>
        </div>
      )}

      {/* Results View */}
      {hasResults && (
        <div className="space-y-6">
          {/* Step A: Change Classifications */}
          <div className="glass-card p-5 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <FileText className="w-4 h-4 text-sky-400" aria-hidden="true" />
              <h3 className="text-sm font-bold text-white">Step A: User Impact Classifications</h3>
              <span className="text-xs text-slate-400">({classifications.length} items)</span>
            </div>

            {classifications.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No classifications generated for this version.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {classifications.map((item) => (
                  <div key={item.itemId} className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-sky-400">{item.itemId}</span>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${getImpactBadgeClass(item.impact)}`}>
                        {item.impact}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed break-words">{item.rationale}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Step B: Missing Release Info / Gaps */}
          <div className="glass-card p-5 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <AlertCircle className="w-4 h-4 text-amber-400" aria-hidden="true" />
              <h3 className="text-sm font-bold text-white">Step B: Operational Gaps &amp; Missing Information</h3>
              <span className="text-xs text-slate-400">({missingInfos.length} items)</span>
            </div>

            {missingInfos.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No operational gaps detected.</p>
            ) : (
              <div className="space-y-3">
                {missingInfos.map((info, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {info.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed break-words">{info.description}</p>
                    {info.suggestion && (
                      <div className="text-xs text-sky-300 bg-sky-950/20 p-2.5 rounded-lg border border-sky-500/20 flex items-start gap-1.5">
                        <ArrowRight className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" aria-hidden="true" />
                        <span className="break-words"><strong>Recommendation:</strong> {info.suggestion}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Step C: QA Evidence Claim Support Audit */}
          <div className="glass-card p-5 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              <h3 className="text-sm font-bold text-white">Step C: QA Evidence Claim Verification Audit</h3>
              <span className="text-xs text-slate-400">({verifications.length} claims verified)</span>
            </div>

            {verifications.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No claim audits generated yet.</p>
            ) : (
              <div className="space-y-3">
                {verifications.map((v, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-sky-400">Item: {v.itemId}</span>
                      <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded border ${getClaimStatusBadge(v.status)}`}>
                        {v.status}
                      </span>
                    </div>

                    <div className="text-xs text-white font-medium bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 break-words">
                      &quot;{v.claimText}&quot;
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed break-words">{v.reason}</p>

                    {v.qaCitations && v.qaCitations.length > 0 && (
                      <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                        <span className="text-[11px] text-slate-400">Supporting QA:</span>
                        {v.qaCitations.map((c) => (
                          <span key={c} className="badge-citation px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
