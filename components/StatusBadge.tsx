import React from 'react';
import { StatementData } from '@/lib/types/release';
import { AlertTriangle, Check, X, Edit3, Clock } from 'lucide-react';

export interface StatusBadgeProps {
  status: StatementData['status'];
  isStale?: boolean;
  className?: string;
}

export function StatusBadge({ status, isStale, className = '' }: StatusBadgeProps) {
  if (isStale || status === 'NEEDS_REVIEW') {
    return (
      <span
        role="status"
        aria-label="Status: Stale, needs re-review"
        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm ${className}`}
      >
        <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" aria-hidden="true" />
        <span>STALE - NEEDS RE-REVIEW</span>
      </span>
    );
  }

  switch (status) {
    case 'APPROVED':
      return (
        <span
          role="status"
          aria-label="Status: Approved"
          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm ${className}`}
        >
          <Check className="w-3 h-3 text-emerald-400 shrink-0" aria-hidden="true" />
          <span>APPROVED</span>
        </span>
      );

    case 'REJECTED':
      return (
        <span
          role="status"
          aria-label="Status: Rejected"
          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm ${className}`}
        >
          <X className="w-3 h-3 text-rose-400 shrink-0" aria-hidden="true" />
          <span>REJECTED</span>
        </span>
      );

    case 'EDITED':
      return (
        <span
          role="status"
          aria-label="Status: Edited"
          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border bg-sky-500/20 text-sky-300 border-sky-500/30 ${className}`}
        >
          <Edit3 className="w-3 h-3 text-sky-400 shrink-0" aria-hidden="true" />
          <span>EDITED</span>
        </span>
      );

    case 'DRAFT':
    default:
      return (
        <span
          role="status"
          aria-label="Status: Draft"
          className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full border bg-slate-800 text-slate-400 border-slate-700 ${className}`}
        >
          <Clock className="w-3 h-3 text-slate-500 shrink-0" aria-hidden="true" />
          <span>DRAFT</span>
        </span>
      );
  }
}
export default StatusBadge;
