'use client';

import { Play, Sparkles, AlertCircle, CheckCircle2, ShieldAlert, FileText, ArrowRight } from 'lucide-react';
import {
  AIClassificationData,
  AIMissingInfoData,
  AIClaimVerificationData,
} from '@/lib/types/release';

interface AnalysisTabProps {
  classifications: AIClassificationData[];
  missingInfos: AIMissingInfoData[];
  verifications: AIClaimVerificationData[];
  onRunAnalysis: () => Promise<void>;
  isAnalyzing: boolean;
  currentStep?: string;
  analysisError?: string | null;
}

export default function AnalysisTab({
  classifications,
  missingInfos,
  verifications,
  onRunAnalysis,
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
    <div className="space-y-6">
      {/* Run Analysis Trigger Header */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-sky-500/20">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            Multi-Step AI Analysis Pipeline
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Executes Step A (Classifications), Step B (Gap Analysis), Step C (QA Claim Support Audit), and Step D (Summaries) as independent endpoints to guarantee performance.
          </p>
        </div>

        <button
          onClick={onRunAnalysis}
          disabled={isAnalyzing}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-sky-600/20 disabled:opacity-50 transition-all shrink-0"
        >
          {isAnalyzing ? (
            <>
              <Sparkles className="w-4 h-4 animate-spin text-sky-200" />
              <span>Analyzing ({currentStep || 'In Progress'})...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 text-white" />
              <span>{hasResults ? 'Re-Run AI Workflow' : 'Start Multi-Step AI Analysis'}</span>
            </>
          )}
        </button>
      </div>

      {analysisError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{analysisError}</span>
        </div>
      )}

      {/* Progress Bar when Analyzing */}
      {isAnalyzing && (
        <div className="glass-card p-4 rounded-xl space-y-2">
          <div className="flex justify-between text-xs text-slate-300 font-medium">
            <span>Executing Analysis Pipeline</span>
            <span className="text-sky-400 font-mono">{currentStep || 'Initializing...'}</span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 animate-pulse w-3/4" />
          </div>
        </div>
      )}

      {!hasResults && !isAnalyzing && (
        <div className="glass-card p-12 rounded-2xl text-center space-y-3 border border-slate-800">
          <Sparkles className="w-10 h-10 text-sky-400 mx-auto opacity-70" />
          <h3 className="text-sm font-bold text-white">No AI Analysis Run Yet</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Click &quot;Start Multi-Step AI Analysis&quot; above to classify user impact, identify missing info gaps, and audit QA evidence support.
          </p>
        </div>
      )}

      {hasResults && (
        <div className="space-y-6">
          {/* Step A: Change Classifications */}
          <div className="glass-card p-5 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <FileText className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-bold text-white">Step A: User Impact Classifications</h3>
              <span className="text-xs text-slate-400">({classifications.length} items)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {classifications.map((item) => (
                <div key={item.itemId} className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-sky-400">{item.itemId}</span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${getImpactBadgeClass(item.impact)}`}>
                      {item.impact}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{item.rationale}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Step B: Missing Information & Gaps */}
          <div className="glass-card p-5 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Step B: AI Missing Information & Operational Gap Suggestions</h3>
              <span className="text-xs text-slate-400">({missingInfos.length} identified)</span>
            </div>

            {missingInfos.length === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>No critical missing information or gaps detected by AI.</span>
              </div>
            ) : (
              <div className="space-y-3">
                {missingInfos.map((gap, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 font-mono">
                        {gap.category}
                      </span>
                      <span>Missing Information Warning</span>
                    </div>
                    <p className="text-xs text-slate-200">{gap.description}</p>
                    <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex items-start gap-2">
                      <ArrowRight className="w-3.5 h-3.5 text-sky-400 mt-0.5 shrink-0" />
                      <span><strong>AI Recommendation:</strong> {gap.suggestion}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Step C: QA Claim Verification Audit */}
          <div className="glass-card p-5 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <h3 className="text-sm font-bold text-white">Step C: QA Claim Support Audit</h3>
              <span className="text-xs text-slate-400">({verifications.length} verified claims)</span>
            </div>

            <div className="space-y-3">
              {verifications.map((v) => (
                <div
                  key={v.itemId}
                  className={`p-4 rounded-xl border space-y-2 ${
                    v.status === 'UNSUPPORTED'
                      ? 'bg-rose-950/20 border-rose-500/40'
                      : v.status === 'PARTIALLY_SUPPORTED'
                      ? 'bg-amber-950/20 border-amber-500/30'
                      : 'bg-slate-900/80 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-sky-400">{v.itemId}</span>
                      <span className="text-xs font-semibold text-white">{v.claimText}</span>
                    </div>
                    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded border ${getClaimStatusBadge(v.status)}`}>
                      {v.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{v.reason}</p>

                  {v.qaCitations && v.qaCitations.length > 0 && (
                    <div className="flex items-center gap-2 pt-1 text-xs text-slate-400">
                      <span>QA Evidence Citations:</span>
                      {v.qaCitations.map((c) => (
                        <span key={c} className="badge-citation px-2 py-0.5 rounded text-[10px] font-mono">
                          {c}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
