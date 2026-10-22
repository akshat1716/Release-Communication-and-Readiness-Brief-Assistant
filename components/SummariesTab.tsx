'use client';

import { useState } from 'react';
import { Check, X, Edit3, RotateCcw, AlertTriangle, ShieldCheck, History, AlertCircle } from 'lucide-react';
import { StatementData, AudienceType } from '@/lib/types/release';
import StatusBadge from './StatusBadge';

interface SummariesTabProps {
  statements: StatementData[];
  onUpdateStatement: (id: string, text?: string, status?: StatementData['status']) => Promise<void>;
  isUpdating?: boolean;
  isLoading?: boolean;
  error?: string | null;
}

export default function SummariesTab({
  statements,
  onUpdateStatement,
  isUpdating = false,
  isLoading = false,
  error = null,
}: SummariesTabProps) {
  const [activeAudience, setActiveAudience] = useState<AudienceType>('INTERNAL');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>('');

  const filteredStatements = statements.filter((s) => s.audience === activeAudience);

  const startEdit = (stmt: StatementData) => {
    setEditingId(stmt.id);
    setEditText(stmt.text);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const saveEdit = async (id: string) => {
    await onUpdateStatement(id, editText);
    setEditingId(null);
  };

  const handleStatus = async (id: string, newStatus: StatementData['status']) => {
    await onUpdateStatement(id, undefined, newStatus);
  };

  return (
    <div className="space-y-6" aria-busy={isLoading} aria-live="polite">
      {/* Top Banner & Governance Policy */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-sky-500/20">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            Audience-Specific Release Summaries & Statement Governance
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Review, edit, approve, or reject each generated statement. Original AI output is preserved alongside edits.
          </p>
        </div>

        {/* Audience Toggle Tabs */}
        <div
          role="tablist"
          aria-label="Select audience view"
          className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 shrink-0"
        >
          <button
            role="tab"
            aria-selected={activeAudience === 'INTERNAL'}
            onClick={() => setActiveAudience('INTERNAL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
              activeAudience === 'INTERNAL'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Internal Technical
          </button>
          <button
            role="tab"
            aria-selected={activeAudience === 'CLIENT'}
            onClick={() => setActiveAudience('CLIENT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              activeAudience === 'CLIENT'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Client / Non-Tech
          </button>
        </div>
      </div>

      {/* Human Approval Disclaimer Banner */}
      <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-300 flex items-center gap-2.5">
        <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" aria-hidden="true" />
        <span>
          <strong>Human Review Safeguard:</strong> Generated statements start strictly as <strong>DRAFT</strong>. Final Brief compilation requires human review & approval.
        </span>
      </div>

      {/* Error state */}
      {error && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2.5"
        >
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-4" aria-label="Loading statements">
          {[1, 2, 3].map((n) => (
            <div key={n} className="glass-card p-5 rounded-2xl border border-slate-800 space-y-3 animate-pulse">
              <div className="flex justify-between items-center">
                <div className="h-4 w-12 bg-slate-800 rounded" />
                <div className="h-5 w-24 bg-slate-800 rounded-full" />
              </div>
              <div className="h-4 w-full bg-slate-800 rounded" />
              <div className="h-4 w-5/6 bg-slate-800 rounded" />
              <div className="pt-2 flex justify-between">
                <div className="h-8 w-24 bg-slate-800 rounded-lg" />
                <div className="flex gap-2">
                  <div className="h-8 w-16 bg-slate-800 rounded-lg" />
                  <div className="h-8 w-16 bg-slate-800 rounded-lg" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredStatements.length === 0 && (
        <div className="glass-card p-12 rounded-2xl text-center text-slate-400 text-xs space-y-3 border border-slate-800">
          <History className="w-10 h-10 text-slate-500 mx-auto opacity-70" aria-hidden="true" />
          <h3 className="text-sm font-bold text-white">No {activeAudience.toLowerCase()} statements generated yet</h3>
          <p className="max-w-md mx-auto text-slate-400 leading-relaxed">
            Run the AI analysis pipeline to generate audience-specific drafts with automatic citation linkage.
          </p>
        </div>
      )}

      {/* Statements List */}
      {!isLoading && filteredStatements.length > 0 && (
        <div className="space-y-4">
          {filteredStatements.map((stmt, idx) => (
            <div
              key={stmt.id}
              className={`glass-card p-5 rounded-2xl border transition-all space-y-3 ${
                stmt.isStale
                  ? 'border-amber-500/40 bg-amber-950/10'
                  : stmt.status === 'APPROVED'
                  ? 'border-emerald-500/30 bg-emerald-950/10'
                  : stmt.status === 'REJECTED'
                  ? 'border-rose-500/20 bg-rose-950/10 opacity-75'
                  : 'border-slate-800'
              }`}
            >
              {/* Card Header & Status Badges */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-slate-400">#{idx + 1}</span>
                  <StatusBadge status={stmt.status} isStale={stmt.isStale} />
                </div>

                {/* Citation Badges */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-slate-400 mr-1">Citations:</span>
                  {stmt.citations && stmt.citations.length > 0 ? (
                    stmt.citations.map((c) => (
                      <span key={c} className="badge-citation px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                        {c}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-slate-500 italic">No citations</span>
                  )}
                </div>
              </div>

              {/* Stale Alert Banner */}
              {stmt.isStale && stmt.staleReason && (
                <div
                  role="alert"
                  className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>
                    <strong>Stale Citation Notice:</strong> {stmt.staleReason}
                  </span>
                </div>
              )}

              {/* Statement Text View / Inline Editor */}
              {editingId === stmt.id ? (
                <div className="space-y-2">
                  <label htmlFor={`edit-stmt-${stmt.id}`} className="sr-only">
                    Edit statement text
                  </label>
                  <textarea
                    id={`edit-stmt-${stmt.id}`}
                    rows={3}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full bg-slate-900 border border-sky-500/50 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none font-sans"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={cancelEdit}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium focus-visible:ring-2 focus-visible:ring-slate-500"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => saveEdit(stmt.id)}
                      disabled={isUpdating}
                      className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold focus-visible:ring-2 focus-visible:ring-sky-400 disabled:opacity-50"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Plain-text safe rendering (escaped by React, no raw HTML interpretation) */}
                  <p className="text-xs text-slate-100 leading-relaxed font-medium break-words whitespace-pre-wrap">
                    {stmt.text}
                  </p>

                  {/* Preserved Original Text Comparison */}
                  {stmt.text !== stmt.originalText && (
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                      <div className="flex items-center gap-1 font-semibold text-slate-500">
                        <RotateCcw className="w-3 h-3" aria-hidden="true" /> Preserved Original AI Output:
                      </div>
                      <p className="italic leading-relaxed break-words whitespace-pre-wrap">{stmt.originalText}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Action Controls Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                <button
                  onClick={() => startEdit(stmt)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all focus-visible:ring-2 focus-visible:ring-sky-500"
                  aria-label={`Edit statement #${idx + 1}`}
                >
                  <Edit3 className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
                  <span>Edit Statement</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleStatus(stmt.id, 'REJECTED')}
                    disabled={isUpdating}
                    aria-label={`Reject statement #${idx + 1}`}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all focus-visible:ring-2 focus-visible:ring-rose-500 disabled:opacity-50 ${
                      stmt.status === 'REJECTED'
                        ? 'bg-rose-600 text-white border-rose-500'
                        : 'bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border-rose-500/30'
                    }`}
                  >
                    <X className="w-3.5 h-3.5 text-rose-400" aria-hidden="true" />
                    <span>Reject</span>
                  </button>

                  <button
                    onClick={() => handleStatus(stmt.id, 'APPROVED')}
                    disabled={isUpdating}
                    aria-label={`Approve statement #${idx + 1}`}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold border transition-all focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50 ${
                      stmt.status === 'APPROVED'
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/20'
                        : 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border-emerald-500/30'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                    <span>Approve</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
