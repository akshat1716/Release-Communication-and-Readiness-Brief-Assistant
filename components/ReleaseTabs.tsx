'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  FileText,
  CheckSquare,
  Sparkles,
  MessageSquareQuote,
  GitCompare,
  FileCheck,
} from 'lucide-react';

export type ReleaseTabKey = 'package' | 'checks' | 'analysis' | 'summaries' | 'compare' | 'brief';

export interface ReleaseTabsProps {
  activeTab: ReleaseTabKey;
  onTabChange: (key: ReleaseTabKey) => void;
  checksCount: number;
  statementsCount: number;
  versionsCount: number;
}

interface TabConfig {
  key: ReleaseTabKey;
  label: string;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
}

export default function ReleaseTabs({
  activeTab,
  onTabChange,
  checksCount,
  statementsCount,
  versionsCount,
}: ReleaseTabsProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tabButtonRefs = useRef<Record<ReleaseTabKey, HTMLButtonElement | null>>({
    package: null,
    checks: null,
    analysis: null,
    summaries: null,
    compare: null,
    brief: null,
  });

  const [canScrollLeft, setCanScrollLeft] = useState<boolean>(false);
  const [canScrollRight, setCanScrollRight] = useState<boolean>(false);

  const tabs: TabConfig[] = [
    { key: 'package', label: 'Package Form', icon: FileText },
    { key: 'checks', label: `Checks (${checksCount})`, icon: CheckSquare },
    { key: 'analysis', label: 'AI Analysis', icon: Sparkles },
    { key: 'summaries', label: `Summaries (${statementsCount})`, icon: MessageSquareQuote },
    { key: 'compare', label: `Versions / Compare (${versionsCount})`, icon: GitCompare },
    { key: 'brief', label: 'Final Brief', icon: FileCheck },
  ];

  const updateScrollIndicators = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  // Monitor scroll and resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    updateScrollIndicators();
    el.addEventListener('scroll', updateScrollIndicators, { passive: true });
    window.addEventListener('resize', updateScrollIndicators);

    return () => {
      el.removeEventListener('scroll', updateScrollIndicators);
      window.removeEventListener('resize', updateScrollIndicators);
    };
  }, [updateScrollIndicators]);

  // Scroll active tab into view when activeTab changes
  useEffect(() => {
    const activeEl = tabButtonRefs.current[activeTab];
    if (activeEl) {
      activeEl.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }

    const timer = setTimeout(updateScrollIndicators, 200);
    return () => clearTimeout(timer);
  }, [activeTab, updateScrollIndicators]);

  // Keyboard navigation support: Left/Right, Up/Down, Home, End
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = tabs.findIndex((t) => t.key === activeTab);
    if (currentIndex === -1) return;

    let targetIndex = -1;

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        targetIndex = (currentIndex + 1) % tabs.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        targetIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        break;
      case 'Home':
        targetIndex = 0;
        break;
      case 'End':
        targetIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    e.preventDefault();
    const targetTab = tabs[targetIndex];
    if (targetTab) {
      onTabChange(targetTab.key);
      const targetBtn = tabButtonRefs.current[targetTab.key];
      targetBtn?.focus();
    }
  };

  const hasInnerOverflow = canScrollLeft || canScrollRight;

  return (
    <div className="relative w-full border-b border-slate-800">
      {/* Left Edge Fade Indicator (Mobile only under 640px) */}
      <div
        data-testid="tab-fade-left"
        aria-hidden="true"
        className={`pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-slate-950 to-transparent z-10 transition-opacity duration-200 sm:hidden ${
          canScrollLeft ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* General Edge Fade Indicator for E2E and visual tests */}
      {hasInnerOverflow && (
        <div
          data-testid="tab-edge-fade"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 sm:hidden"
        />
      )}

      {/* Scrollable Tablist Strip */}
      <div
        ref={containerRef}
        role="tablist"
        aria-label="Release management sections"
        onKeyDown={handleKeyDown}
        className="flex items-center gap-1.5 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory sm:snap-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:[scrollbar-width:auto]"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;

          return (
            <button
              key={tab.key}
              ref={(el) => {
                tabButtonRefs.current[tab.key] = el;
              }}
              role="tab"
              id={`release-tab-${tab.key}`}
              aria-selected={isActive}
              aria-controls={`release-tabpanel-${tab.key}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onTabChange(tab.key)}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold shrink-0 snap-center transition-all focus-visible:outline-none focus-visible:ring-2 select-none ${
                tab.key === 'brief'
                  ? isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 focus-visible:ring-emerald-500'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900 focus-visible:ring-emerald-500'
                  : isActive
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20 focus-visible:ring-sky-500'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900 focus-visible:ring-sky-500'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Right Edge Fade Indicator (Mobile only under 640px) */}
      <div
        data-testid="tab-fade-right"
        aria-hidden="true"
        className={`pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-950 to-transparent z-10 transition-opacity duration-200 sm:hidden ${
          canScrollRight ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}
