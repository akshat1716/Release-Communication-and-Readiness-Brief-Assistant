'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import PackageEditor from '@/components/PackageEditor';
import ChecksTab from '@/components/ChecksTab';
import AnalysisTab, { StepKey, StepProgressState } from '@/components/AnalysisTab';
import SummariesTab from '@/components/SummariesTab';
import CompareTab from '@/components/CompareTab';
import FinalBriefTab from '@/components/FinalBriefTab';
import {
  FileText,
  CheckSquare,
  Sparkles,
  MessageSquareQuote,
  GitCompare,
  FileCheck,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import {
  ReleasePackageData,
  StatementData,
  DeterministicCheckResult,
  AIClassificationData,
  AIMissingInfoData,
  AIClaimVerificationData,
} from '@/lib/types/release';

const INITIAL_STEPS: StepProgressState[] = [
  { key: 'step-a', name: 'Step A: User Impact Classifications', status: 'idle' },
  { key: 'step-b', name: 'Step B: Operational Gap Analysis', status: 'idle' },
  { key: 'step-c', name: 'Step C: QA Claim Verification', status: 'idle' },
  { key: 'step-d', name: 'Step D: Audience Summaries & Risks', status: 'idle' },
];

export default function ReleaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const releaseId = params.id as string;

  const [activeTab, setActiveTab] = useState<
    'package' | 'checks' | 'analysis' | 'summaries' | 'compare' | 'brief'
  >('package');

  const [loading, setLoading] = useState<boolean>(true);
  const [savingPackage, setSavingPackage] = useState<boolean>(false);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [checksError, setChecksError] = useState<string | null>(null);
  const [isReRunningChecks, setIsReRunningChecks] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [stepStates, setStepStates] = useState<StepProgressState[]>(INITIAL_STEPS);
  const inFlightAbortRef = useRef<AbortController | null>(null);

  const [releaseName, setReleaseName] = useState<string>('');
  const [versionLabel, setVersionLabel] = useState<string>('');
  const [currentVersionId, setCurrentVersionId] = useState<string>('');
  const [currentVersionNum, setCurrentVersionNum] = useState<number>(1);
  const [totalVersionsCount, setTotalVersionsCount] = useState<number>(1);

  const [packageData, setPackageData] = useState<ReleasePackageData | null>(null);
  const [checks, setChecks] = useState<DeterministicCheckResult[]>([]);
  const [classifications, setClassifications] = useState<AIClassificationData[]>([]);
  const [missingInfos, setMissingInfos] = useState<AIMissingInfoData[]>([]);
  const [verifications, setVerifications] = useState<AIClaimVerificationData[]>([]);
  const [statements, setStatements] = useState<StatementData[]>([]);

  // Abort any in-flight requests on component unmount
  useEffect(() => {
    return () => {
      if (inFlightAbortRef.current) {
        inFlightAbortRef.current.abort();
      }
    };
  }, []);

  const fetchRelease = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/releases/${releaseId}`, { signal });
      const data = await res.json();

      if (!data.success || !data.release) {
        throw new Error(data.error || 'Release not found');
      }

      const rel = data.release;
      setReleaseName(rel.name);
      setVersionLabel(rel.versionLabel);
      setCurrentVersionNum(rel.currentVersionNum);
      setTotalVersionsCount(rel.versions.length);

      const activeVer = rel.versions[0]; // Latest version
      if (activeVer) {
        setCurrentVersionId(activeVer.id);
        const pkg: ReleasePackageData = JSON.parse(activeVer.packageSnapshot);
        setPackageData(pkg);

        setChecks(
          activeVer.checks.map((c: DeterministicCheckResult) => ({
            ruleId: c.ruleId,
            name: c.name,
            status: c.status,
            message: c.message,
            details: c.details || undefined,
          }))
        );

        setClassifications(activeVer.classifications || []);
        setMissingInfos(activeVer.missingInfos || []);

        setVerifications(
          (activeVer.claimVerifications || []).map((v: { itemId: string; claimText: string; status: string; reason: string; qaCitations: string }) => ({
            itemId: v.itemId,
            claimText: v.claimText,
            status: v.status as AIClaimVerificationData['status'],
            reason: v.reason,
            qaCitations: JSON.parse(v.qaCitations || '[]'),
          }))
        );

        setStatements(
          (activeVer.statements || []).map((s: { id: string; audience: string; text: string; originalText: string; citations: string; status: string; sourceHash: string; isStale: boolean; staleReason?: string; orderIndex: number }) => ({
            id: s.id,
            audience: s.audience as StatementData['audience'],
            text: s.text,
            originalText: s.originalText,
            citations: JSON.parse(s.citations || '[]'),
            status: s.status as StatementData['status'],
            sourceHash: s.sourceHash,
            isStale: s.isStale,
            staleReason: s.staleReason || undefined,
            orderIndex: s.orderIndex,
          }))
        );
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Component unmounted, ignore abort cleanly
      }
      setError(err instanceof Error ? err.message : 'Error fetching release detail');
    } finally {
      setLoading(false);
    }
  }, [releaseId]);

  useEffect(() => {
    const controller = new AbortController();
    inFlightAbortRef.current = controller;
    fetchRelease(controller.signal);

    return () => {
      controller.abort();
      if (inFlightAbortRef.current) {
        inFlightAbortRef.current.abort();
      }
    };
  }, [fetchRelease]);

  const handleSavePackageVersion = async (newPkgData: ReleasePackageData) => {
    setSavingPackage(true);
    try {
      const res = await fetch(`/api/releases/${releaseId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPkgData),
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed saving new version');
      }

      await fetchRelease();
    } catch (err: unknown) {
      throw err;
    } finally {
      setSavingPackage(false);
    }
  };

  const handleReRunChecks = async () => {
    if (!currentVersionId) return;
    setIsReRunningChecks(true);
    setChecksError(null);
    try {
      const res = await fetch(`/api/releases/${releaseId}/versions/${currentVersionId}/checks`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setChecks(data.checks);
      } else {
        throw new Error(data.error || 'Checks failed to run');
      }
    } catch (err: unknown) {
      setChecksError(err instanceof Error ? err.message : 'Error running checks');
    } finally {
      setIsReRunningChecks(false);
    }
  };

  /**
   * Runs an individual analysis step with execution telemetry and state tracking.
   */
  const executeSingleStep = async (
    stepKey: StepKey,
    signal: AbortSignal
  ): Promise<boolean> => {
    const stepDef = INITIAL_STEPS.find((s) => s.key === stepKey);
    const stepName = stepDef?.name || stepKey;
    const startTime = Date.now();

    setStepStates((prev) =>
      prev.map((s) =>
        s.key === stepKey
          ? { ...s, status: 'running', error: undefined }
          : s
      )
    );
    setCurrentStep(stepName);

    try {
      const res = await fetch(
        `/api/releases/${releaseId}/versions/${currentVersionId}/analyze/${stepKey}`,
        { method: 'POST', signal }
      );
      const data = await res.json();
      const durationMs = Date.now() - startTime;

      if (!res.ok || !data.success) {
        const errorMsg =
          typeof data.error === 'object' && data.error?.message
            ? data.error.message
            : data.error || `${stepName} failed`;

        setStepStates((prev) =>
          prev.map((s) =>
            s.key === stepKey
              ? { ...s, status: 'failed', durationMs, error: errorMsg }
              : s
          )
        );
        throw new Error(errorMsg);
      }

      setStepStates((prev) =>
        prev.map((s) =>
          s.key === stepKey
            ? {
                ...s,
                status: 'completed',
                durationMs,
                tokensUsed: data.tokensUsed,
                estimatedCostUsd: data.estimatedCostUsd,
                error: undefined,
              }
            : s
        )
      );

      return true;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return false;
      }
      throw err;
    }
  };

  /**
   * Re-runs the entire 4-step workflow from the beginning.
   */
  const handleRunWholeWorkflow = async () => {
    if (!currentVersionId || analyzing) return;
    setAnalyzing(true);
    setAnalysisError(null);

    const controller = new AbortController();
    inFlightAbortRef.current = controller;

    setStepStates(INITIAL_STEPS);

    try {
      const stepKeys: StepKey[] = ['step-a', 'step-b', 'step-c', 'step-d'];
      for (const key of stepKeys) {
        await executeSingleStep(key, controller.signal);
      }

      await fetchRelease();
      setActiveTab('analysis');
    } catch (err: unknown) {
      setAnalysisError(err instanceof Error ? err.message : 'Analysis pipeline failed');
    } finally {
      setAnalyzing(false);
      setCurrentStep('');
      inFlightAbortRef.current = null;
    }
  };

  /**
   * Retries ONLY a single failed step without rerunning preceding completed steps.
   */
  const handleRetryStep = async (stepKey: StepKey) => {
    if (!currentVersionId || analyzing) return;
    setAnalyzing(true);
    setAnalysisError(null);

    const controller = new AbortController();
    inFlightAbortRef.current = controller;

    try {
      await executeSingleStep(stepKey, controller.signal);
      await fetchRelease();
    } catch (err: unknown) {
      setAnalysisError(err instanceof Error ? err.message : `Retry for ${stepKey} failed`);
    } finally {
      setAnalyzing(false);
      setCurrentStep('');
      inFlightAbortRef.current = null;
    }
  };

  /**
   * Resumes workflow starting from a specific step, skipping completed steps.
   */
  const handleResumeFrom = async (startStepKey: StepKey) => {
    if (!currentVersionId || analyzing) return;
    setAnalyzing(true);
    setAnalysisError(null);

    const controller = new AbortController();
    inFlightAbortRef.current = controller;

    const allKeys: StepKey[] = ['step-a', 'step-b', 'step-c', 'step-d'];
    const startIndex = allKeys.indexOf(startStepKey);
    const stepsToRun = startIndex >= 0 ? allKeys.slice(startIndex) : allKeys;

    try {
      for (const key of stepsToRun) {
        await executeSingleStep(key, controller.signal);
      }
      await fetchRelease();
      setActiveTab('analysis');
    } catch (err: unknown) {
      setAnalysisError(err instanceof Error ? err.message : 'Resume failed');
    } finally {
      setAnalyzing(false);
      setCurrentStep('');
      inFlightAbortRef.current = null;
    }
  };

  const handleUpdateStatement = async (id: string, text?: string, status?: StatementData['status']) => {
    try {
      const res = await fetch(`/api/statements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, status }),
      });
      const data = await res.json();
      if (data.success && data.statement) {
        const updated = data.statement;
        setStatements((prev) =>
          prev.map((s) =>
            s.id === id
              ? {
                  ...s,
                  text: updated.text,
                  status: updated.status as StatementData['status'],
                  isStale: updated.isStale,
                }
              : s
          )
        );
      }
    } catch (err: unknown) {
      console.error(err);
    }
  };

  const handleGenerateFinalBrief = async (allowPartial: boolean) => {
    try {
      const res = await fetch(
        `/api/releases/${releaseId}/versions/${currentVersionId}/final-brief`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ allowPartial }),
        }
      );
      const data = await res.json();
      if (!data.success) {
        return { error: data.error };
      }
      return { markdown: data.markdown };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : 'Failed generating final brief' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col" aria-busy="true">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 text-sky-400 animate-spin mx-auto" aria-hidden="true" />
            <p className="text-xs text-slate-400">Loading release details...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      <Header />

      <main className="max-w-7xl mx-auto px-4 lg:px-8 pt-6 space-y-6">
        {/* Top Breadcrumb & Title Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-sky-500 rounded"
              aria-label="Back to Dashboard"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Back to Dashboard
            </button>

            <h1 className="text-xl lg:text-2xl font-extrabold text-white tracking-tight flex items-center gap-3 flex-wrap">
              <span>{releaseName}</span>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                {versionLabel} (v{currentVersionNum})
              </span>
            </h1>
          </div>

          {/* Action Trigger Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleRunWholeWorkflow}
              disabled={analyzing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition-all focus-visible:ring-2 focus-visible:ring-indigo-400"
              aria-label={analyzing ? 'Analysis currently in progress' : 'Run full multi-step AI analysis'}
            >
              <Sparkles className={`w-4 h-4 ${analyzing ? 'animate-spin' : ''}`} aria-hidden="true" />
              <span>{analyzing ? 'Analyzing...' : 'Run Full AI Analysis'}</span>
            </button>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300"
          >
            {error}
          </div>
        )}

        {/* 6 Navigation Tabs */}
        <div
          role="tablist"
          aria-label="Release management sections"
          className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-800"
        >
          <button
            role="tab"
            aria-selected={activeTab === 'package'}
            onClick={() => setActiveTab('package')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all focus-visible:ring-2 focus-visible:ring-sky-500 ${
              activeTab === 'package'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" aria-hidden="true" /> Package Form
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'checks'}
            onClick={() => setActiveTab('checks')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all focus-visible:ring-2 focus-visible:ring-sky-500 ${
              activeTab === 'checks'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <CheckSquare className="w-4 h-4" aria-hidden="true" /> Checks ({checks.length})
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'analysis'}
            onClick={() => setActiveTab('analysis')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all focus-visible:ring-2 focus-visible:ring-sky-500 ${
              activeTab === 'analysis'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4" aria-hidden="true" /> AI Analysis
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'summaries'}
            onClick={() => setActiveTab('summaries')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all focus-visible:ring-2 focus-visible:ring-sky-500 ${
              activeTab === 'summaries'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <MessageSquareQuote className="w-4 h-4" aria-hidden="true" /> Summaries ({statements.length})
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'compare'}
            onClick={() => setActiveTab('compare')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all focus-visible:ring-2 focus-visible:ring-sky-500 ${
              activeTab === 'compare'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <GitCompare className="w-4 h-4" aria-hidden="true" /> Versions / Compare ({totalVersionsCount})
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'brief'}
            onClick={() => setActiveTab('brief')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all focus-visible:ring-2 focus-visible:ring-emerald-500 ${
              activeTab === 'brief'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <FileCheck className="w-4 h-4" aria-hidden="true" /> Final Brief
          </button>
        </div>

        {/* Tab Content Display */}
        <div className="pt-2">
          {activeTab === 'package' && packageData && (
            <PackageEditor
              initialData={packageData}
              onSave={handleSavePackageVersion}
              isSaving={savingPackage}
            />
          )}

          {activeTab === 'checks' && (
            <ChecksTab
              checks={checks}
              onReRunChecks={handleReRunChecks}
              isReRunning={isReRunningChecks}
              error={checksError}
            />
          )}

          {activeTab === 'analysis' && (
            <AnalysisTab
              classifications={classifications}
              missingInfos={missingInfos}
              verifications={verifications}
              stepStates={stepStates}
              onRunWholeWorkflow={handleRunWholeWorkflow}
              onRetryStep={handleRetryStep}
              onResumeFrom={handleResumeFrom}
              isAnalyzing={analyzing}
              currentStep={currentStep}
              analysisError={analysisError}
            />
          )}

          {activeTab === 'summaries' && (
            <SummariesTab
              statements={statements}
              onUpdateStatement={handleUpdateStatement}
            />
          )}

          {activeTab === 'compare' && (
            <CompareTab
              releaseId={releaseId}
              totalVersions={totalVersionsCount}
              currentVersionNum={currentVersionNum}
            />
          )}

          {activeTab === 'brief' && (
            <FinalBriefTab
              releaseId={releaseId}
              versionId={currentVersionId}
              statements={statements}
              checks={checks}
              onGenerateBrief={handleGenerateFinalBrief}
            />
          )}
        </div>
      </main>
    </div>
  );
}
