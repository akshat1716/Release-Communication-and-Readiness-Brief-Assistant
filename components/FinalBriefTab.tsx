'use client';

import { useState } from 'react';
import { FileCheck, AlertTriangle, Copy, Check, ShieldCheck, Download } from 'lucide-react';
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
  isGenerating,
}: FinalBriefTabProps) {
  const [allowPartial, setAllowPartial] = useState<boolean>(false);
  const [markdownOutput, setMarkdownOutput] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const unreviewedCount = statements.filter((s) => s.status === 'DRAFT').length;
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
      const blob = new Blob([markdownOutput], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `release-brief.md`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-6">
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

        <div className="flex items-center gap-2 text-xs font-semibold shrink-0">
          <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            {approvedCount} Approved Statements
          </div>
          {unreviewedCount > 0 && (
            <div className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 border border-slate-700">
              {unreviewedCount} Drafts Remaining
            </div>
          )}
        </div>
      </div>

      {/* Readiness Governance Check Banner */}
      {isBlocked && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Governance Readiness Safeguard Alert</span>
          </div>
          <p className="leading-relaxed">
            Final brief generation is restricted by default because:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-300 font-mono text-[11px]">
            {failedCheckCount > 0 && (
              <li className="text-rose-300">{failedCheckCount} deterministic check(s) failed</li>
            )}
            {unreviewedCount > 0 && (
              <li>{unreviewedCount} statement(s) are still in unreviewed DRAFT status</li>
            )}
            {rejectedCount > 0 && (
              <li className="text-rose-300">{rejectedCount} statement(s) were REJECTED</li>
            )}
          </ul>
        </div>
      )}

      {/* Partial Override Toggle Bar */}
      <div className="glass-card p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-slate-800">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={allowPartial}
            onChange={(e) => setAllowPartial(e.target.checked)}
            className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500"
          />
          <div className="text-xs">
            <span className="font-semibold text-white">Allow Partial Brief Generation (Override Governance Lock)</span>
            <p className="text-slate-400 text-[11px]">
              Includes explicit warning disclaimers detailing excluded unreviewed/rejected statements and failed checks.
            </p>
          </div>
        </label>

        <button
          onClick={handleGenerate}
          disabled={isGenerating || (isBlocked && !allowPartial)}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
        >
          <FileCheck className="w-4 h-4" />
          {isGenerating ? 'Compiling Brief...' : 'Generate Reviewed Brief'}
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 font-mono">
          {errorMsg}
        </div>
      )}

      {/* Generated Markdown Preview Box */}
      {markdownOutput && (
        <div className="glass-card p-5 rounded-2xl space-y-4 border border-emerald-500/30">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Publication-Ready Release Brief Output
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-sky-400" />}
                {copied ? 'Copied!' : 'Copy Markdown'}
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                Download .md
              </button>
            </div>
          </div>

          <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 overflow-x-auto whitespace-pre-wrap leading-relaxed">
            {markdownOutput}
          </pre>
        </div>
      )}
    </div>
  );
}
