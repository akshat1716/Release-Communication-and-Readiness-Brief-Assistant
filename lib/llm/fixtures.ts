import { StepAOutput, StepBOutput, StepCOutput, StepDOutput } from './schemas';
import { ReleasePackageData } from '../types/release';

export function getMockStepAOutput(packageData: ReleasePackageData): StepAOutput {
  const classifications = [
    {
      itemId: 'F1',
      impact: 'USER_VISIBLE' as const,
      rationale:
        'Biometric login enables native iOS FaceID and Android Fingerprint auth for end users, significantly enhancing authentication UX.',
    },
    {
      itemId: 'F2',
      impact: 'USER_VISIBLE' as const,
      rationale:
        'Developer Hub webhook payload inspection and retry analytics provide direct user-facing visibility for platform API developers.',
    },
    {
      itemId: 'B1',
      impact: 'PERFORMANCE' as const,
      rationale:
        'Resolving WebSocket event listener memory leak prevents memory degradation under high subscriber concurrency.',
    },
    {
      itemId: 'C1',
      impact: 'BREAKING' as const,
      rationale:
        'Standardizing rate limit HTTP headers changes existing client parser expectations and breaks legacy rate limit header readers.',
    },
  ];

  return { classifications };
}

export function getMockStepBOutput(packageData: ReleasePackageData): StepBOutput {
  const missingInfos = [];

  if (packageData.changedBehaviours.length > 0 && packageData.migrationNotes.length === 0) {
    missingInfos.push({
      category: 'MIGRATION' as const,
      description:
        'Rate limit header behavior change (C1) lacks actionable client migration instructions (M1+).',
      suggestion:
        'Add migration documentation instructing client developers how to update HTTP header interceptors before v3.0 deprecation.',
    });
  }

  if (
    packageData.features.some((f) => f.description.toLowerCase().includes('mobile')) &&
    !packageData.qaSummaries.some((q) => q.description.toLowerCase().includes('mobile'))
  ) {
    missingInfos.push({
      category: 'QA' as const,
      description:
        'Feature F1 claims mobile biometric support (iOS 18 / Android 15), but QA summary (QA1) only reports Desktop Chrome/Firefox testing.',
      suggestion:
        'Execute automated or manual QA test runs on physical iOS and Android devices and attach QA evidence.',
    });
  }

  return { missingInfos };
}

export function getMockStepCOutput(packageData: ReleasePackageData): StepCOutput {
  return {
    verifications: [
      {
        itemId: 'F1',
        claimText:
          'Fully tested on iOS 18 FaceID and Android 15 Fingerprint biometric auth devices',
        status: 'UNSUPPORTED' as const,
        reason:
          'Supplied QA evidence (QA1) documents testing exclusively on Desktop Chrome and Firefox browsers. No mobile device QA test run evidence is provided.',
        qaCitations: ['QA1'],
      },
      {
        itemId: 'F2',
        claimText: 'Webhook payload inspection and 5x retry functionality verified',
        status: 'SUPPORTED' as const,
        reason:
          'QA evidence (QA1 and QA2) confirms 100% pass rate for webhook retries and load testing at 50,000 concurrent webhooks/sec.',
        qaCitations: ['QA1', 'QA2'],
      },
      {
        itemId: 'B1',
        claimText: 'WebSocket memory leak resolved under high concurrency',
        status: 'PARTIALLY_SUPPORTED' as const,
        reason:
          'QA load test (QA2) verified high concurrency payload delivery, but specific memory profiling telemetry for WebSocket listeners was not explicitly detailed in QA evidence.',
        qaCitations: ['QA2'],
      },
    ],
  };
}

export function getMockStepDOutput(packageData: ReleasePackageData): StepDOutput {
  return {
    internalStatements: [
      {
        audience: 'INTERNAL' as const,
        text: 'Integrated native iOS 18 FaceID and Android 15 Fingerprint biometric authentication into mobile auth workflow [F1].',
        citations: ['F1'],
      },
      {
        audience: 'INTERNAL' as const,
        text: 'Added real-time webhook payload inspection and 5-tier retry analytics in Developer Hub [F2], verified at 50,000 req/sec [QA2].',
        citations: ['F2', 'QA2'],
      },
      {
        audience: 'INTERNAL' as const,
        text: 'Fixed high-concurrency WebSocket memory leak caused by uncleaned event listeners during push disconnections [B1].',
        citations: ['B1'],
      },
      {
        audience: 'INTERNAL' as const,
        text: 'Standardized rate limiting HTTP response headers to RateLimit-Remaining and RateLimit-Reset [C1].',
        citations: ['C1'],
      },
    ],
    clientStatements: [
      {
        audience: 'CLIENT' as const,
        text: 'Mobile application users can now log in seamlessly using iOS FaceID and Android Fingerprint biometrics [F1, U1].',
        citations: ['F1', 'U1'],
      },
      {
        audience: 'CLIENT' as const,
        text: 'API Developers gain immediate visibility into outgoing webhook payloads with automated retry management [F2, U2].',
        citations: ['F2', 'U2'],
      },
      {
        audience: 'CLIENT' as const,
        text: 'Enhanced connection stability and reduced memory overhead for real-time streaming subscriptions [B1].',
        citations: ['B1'],
      },
      {
        audience: 'CLIENT' as const,
        text: 'API Rate limit headers updated to standard HTTP RateLimit specifications [C1, U2].',
        citations: ['C1', 'U2'],
      },
    ],
    risksAndLimitations: [
      {
        text: 'Mobile biometric feature F1 lacks physical iOS/Android device QA evidence in QA1.',
        source: 'AI_IDENTIFIED' as const,
        severity: 'HIGH' as const,
        citations: ['F1', 'QA1'],
      },
      {
        text: 'Rate limit header specification change (C1) breaks legacy header parsers without documented client migration notes.',
        source: 'AI_IDENTIFIED' as const,
        severity: 'HIGH' as const,
        citations: ['C1'],
      },
      {
        text: 'Webhook delivery history logs are retained for 30 days only before requiring external archiving.',
        source: 'PACKAGE' as const,
        severity: 'LOW' as const,
        citations: ['L1'],
      },
    ],
  };
}
