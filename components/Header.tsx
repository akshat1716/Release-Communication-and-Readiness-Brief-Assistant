'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, Layers, ChevronDown, ChevronUp } from 'lucide-react';

export default function Header() {
  const [isGovernanceExpanded, setIsGovernanceExpanded] = useState(false);

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 px-3 sm:px-4 lg:px-8 py-2 sm:py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5 sm:gap-3">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="p-1.5 sm:p-2 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform shrink-0">
            <Layers className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-lg font-bold text-white tracking-tight flex items-center gap-1.5 sm:gap-2">
              <span className="truncate max-w-[190px] sm:max-w-none" title="Release Communication Assistant">
                Release Communication Assistant
              </span>
              <span className="text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0">
                Readiness Brief
              </span>
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-400 hidden sm:block">
              Structured LLM analysis & human governance pipeline
            </p>
          </div>
        </Link>

        {/* Desktop Governance Rule Copy (>= 768px): Unchanged full banner */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium max-w-xl">
          <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
          <span>
            <strong>Human Governance Policy:</strong> AI generates drafts and flags gaps. Only human reviewers can approve release statements or mark a brief as approved.
          </span>
        </div>

        {/* Mobile Governance Rule Banner (< 768px): Compact one-line with expand control */}
        <div className="flex md:hidden flex-col w-full rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium overflow-hidden">
          <div className="flex items-center justify-between px-2.5 py-1.5 gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" aria-hidden="true" />
              <span className="truncate text-[11px]">
                <strong>Human review required:</strong> AI drafts require manual approval
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsGovernanceExpanded(!isGovernanceExpanded)}
              aria-expanded={isGovernanceExpanded}
              aria-controls="mobile-governance-details"
              className="text-[10px] text-amber-400 hover:text-amber-200 font-semibold px-1.5 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 flex items-center gap-0.5 shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400"
              aria-label={isGovernanceExpanded ? 'Collapse human governance policy' : 'Expand human governance policy'}
            >
              <span>{isGovernanceExpanded ? 'Hide' : 'Details'}</span>
              {isGovernanceExpanded ? (
                <ChevronUp className="w-3 h-3" aria-hidden="true" />
              ) : (
                <ChevronDown className="w-3 h-3" aria-hidden="true" />
              )}
            </button>
          </div>
          {isGovernanceExpanded && (
            <div
              id="mobile-governance-details"
              className="px-2.5 pb-2 pt-0.5 text-[11px] leading-relaxed text-amber-200/90 border-t border-amber-500/20 mt-0.5"
            >
              AI generates drafts and flags gaps. Only human reviewers can approve release statements or mark a brief as approved.
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
