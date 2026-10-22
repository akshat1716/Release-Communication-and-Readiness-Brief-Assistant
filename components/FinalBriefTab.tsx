'use client';

import { useState } from 'react';
import { FileCheck, AlertTriangle, Copy, Check, Download, AlertCircle, Loader2 } from 'lucide-react';
import { StatementData, DeterministicCheckResult } from '@/lib/types/release';

interface FinalBriefTabProps {
  releaseId: string;
  versionId: string;
  statements: StatementData[];
  checks: DeterministicCheckResult[];
  onGenerateBrief: (allowPartial: boolean) => Promise<{ markdown?: string; error?: string }>;
  isGenerating?: boolean;
}

export default function FinalBriefTab({
  statements,
  checks,
  onGenerateBrief,
  isGenerating = false,
}: FinalBriefTabProps) {
  const [allowPartial, setAllowPartial] = useState<boolean>(false);
  const [markdownOutput, setMarkdownOutput] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const unreviewedCount = statements.filter((s) => s.status === 'DRAFT' || s.status === 'NEEDS_REVIEW').length;
  const rejectedCount = statements.filter((s) => s.status === 'REJECTED').length;
  const approvedCount = statements.filter(
    (s) => s.status === 'APPROVED' || (s.status === 'EDITED' && !s.isStale)
  ).length;
  const failedCheckCount = checks.filter((c) => c.status === 'FAIL').length;

  const isBlocked = unreviewedCount > 0 || rejectedCount > 0 || failedCheckCount > 0;

  const handleGenerate = async () => {
    setErrorMsg(null);
    const res = await onGenerateBrief(allowPartial);
    if (res.error) {
      setErrorMsg(res.error);
    } else if (res.markdown) {
      setMarkdownOutput(res.markdown);
    }
  };

  const handleCopy = () => {
    if (markdownOutput) {
      navigator.clipboard.writeText(markdownOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (markdownOutput) {
      const blob = new Blob([markdownOutput], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `release-brief.md`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-6" aria-busy={isGenerating} aria-live="polite">
      {/* Overview Banner */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-sky-500/20">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            Reviewed Final Release Brief Generator
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Compiles a publication-ready brief exclusively from human-approved statements and deterministic check evidence.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold shrink-0 flex-wrap">
          <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            {approvedCount} Approved Statements
          </div>
          {unreviewedCount > 0 && (
            <div className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 border border-slate-700">
              {unreviewedCount} Drafts / Needs Review
            </div>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-3"
        >
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1">
            <span className="font-bold">Compilation Blocked</span>
            <p className="leading-relaxed">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Readiness Governance Check Banner */}
      {isBlocked && (
        <div
          role="region"
          aria-label="Readiness Governance Safeguard Alert"
          className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-2"
        >
          <div className="flex items-center gap-2 font-bold text-amber-400">
            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Governance Readiness Safeguard Alert</span>
          </div>
          <p className="leading-relaxed">
            Final brief generation is restricted by default because:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1">
            {unreviewedCount > 0 && (
              <li>
                <strong>{unreviewedCount} statement(s)</strong> are still in DRAFT or NEEDS_REVIEW status.
              </li>
            )}
            {rejectedCount > 0 && (
              <li>
                <strong>{rejectedCount} statement(s)</strong> are marked REJECTED and must be resolved or omitted.
              </li>
            )}
            {failedCheckCount > 0 && (
              <li>
                <strong>{failedCheckCount} deterministic check(s)</strong> are currently FAILING.
              </li>
            )}
          </ul>

          <div className="pt-2 border-t border-amber-500/20 flex items-center gap-2.5">
            <input
              type="checkbox"
              id="allowPartialBriefCheckbox"
              checked={allowPartial}
              onChange={(e) => setAllowPartial(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 text-sky-600 focus:ring-sky-500 bg-slate-900 cursor-pointer"
            />
            <label htmlFor="allowPartialBriefCheckbox" className="text-xs text-slate-200 cursor-pointer select-none">
              Allow Partial Brief Generation (proceed with explicit disclaimer of missing approvals)
            </label>
          </div>
        </div>
      )}

      {/* Compilation Trigger Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="text-xs text-slate-400">
          {isBlocked && !allowPartial
            ? 'Resolve pending draft approvals or enable partial generation above.'
            : 'Ready to compile approved content into release brief.'}
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating || (isBlocked && !allowPartial)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          aria-label="Compile Final Brief"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" aria-hidden="true" />
              <span>Compiling Brief...</span>
            </>
          ) : (
            <>
              <FileCheck className="w-4 h-4" aria-hidden="true" />
              <span>Compile Final Brief</span>
            </>
          )}
        </button>
      </div>

      {/* Loading Skeleton during brief compilation */}
      {isGenerating && (
        <div className="glass-card p-8 rounded-2xl space-y-4 animate-pulse border border-slate-800" aria-label="Compiling release brief">
          <div className="h-5 w-48 bg-slate-800 rounded" />
          <div className="h-4 w-full bg-slate-800 rounded" />
          <div className="h-4 w-3/4 bg-slate-800 rounded" />
          <div className="h-20 w-full bg-slate-900 rounded-xl" />
        </div>
      )}

      {/* Generated Markdown Output View */}
      {markdownOutput && !isGenerating && (
        <div className="glass-card p-5 rounded-2xl space-y-4 border border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              Compiled Publication Brief (Markdown)
            </h3>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium focus-visible:ring-2 focus-visible:ring-sky-500 transition-all"
                aria-label="Copy markdown content to clipboard"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Copy Markdown</span>
                  </>
                )}
              </button>

              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold focus-visible:ring-2 focus-visible:ring-emerald-400 transition-all shadow-md shadow-emerald-600/20"
                aria-label="Download release brief as markdown file"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Download .md</span>
              </button>
            </div>
          </div>

          {/* Inert plain text rendering */}
          <pre
            data-testid="final-brief-markdown"
            className="text-xs text-slate-300 font-mono p-4 rounded-xl bg-slate-950/80 border border-slate-800 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[500px]"
          >
            {markdownOutput}
          </pre>
        </div>
      )}
    </div>
  );
}
