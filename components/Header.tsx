'use client';

import Link from 'next/link';
import { ShieldCheck, Sparkles, Layers } from 'lucide-react';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              Release Communication Assistant
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                Readiness Brief
              </span>
            </h1>
            <p className="text-xs text-slate-400">Structured LLM analysis & human governance pipeline</p>
          </div>
        </Link>

        {/* Prominent Governance Rule Copy */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium max-w-xl">
          <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>Human Governance Policy:</strong> AI generates drafts and flags gaps. Only human reviewers can approve release statements or mark a brief as approved.
          </span>
        </div>
      </div>
    </header>
  );
}
