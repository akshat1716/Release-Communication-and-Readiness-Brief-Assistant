import { ReleasePackageData } from '../types/release';

export const SAMPLE_RELEASE_PACKAGE: ReleasePackageData = {
  releaseName: 'Core Platform v2.4.0',
  versionLabel: 'v2.4.0-rc1',
  features: [
    {
      id: 'F1',
      category: 'FEATURE',
      title: 'Mobile Cross-Platform Biometric Authentication',
      description:
        'Added support for iOS 18 FaceID and Android 15 Fingerprint biometric authentication during login and sensitive transactions. Fully tested on iOS 18 and Android 15 devices.',
    },
    {
      id: 'F2',
      category: 'FEATURE',
      title: 'Real-time Webhook Payload Inspection',
      description:
        'Developers can now inspect outgoing webhook HTTP payloads, retry failed deliveries up to 5 times, and view latency analytics in the Developer Hub dashboard.',
    },
  ],
  bugFixes: [
    {
      id: 'B1',
      category: 'BUGFIX',
      title: 'WebSocket Memory Leak in High-Concurrency Subscriptions',
      description:
        'Resolved a memory leak caused by uncleaned event listeners when WebSocket clients disconnect abruptly during push notifications.',
    },
  ],
  changedBehaviours: [
    {
      id: 'C1',
      category: 'BEHAVIOUR',
      title: 'Strict API Rate Limiting Header Format',
      description:
        'API rate limit headers changed from X-RateLimit-Remaining to standardized HTTP headers RateLimit-Remaining and RateLimit-Reset. Legacy headers will be removed in v3.0.',
    },
  ],
  qaSummaries: [
    {
      id: 'QA1',
      category: 'QA',
      title: 'Web Application End-to-End Test Suite',
      description:
        'Executed 142 automated E2E tests on Chrome 128 (Desktop) and Firefox 130. 100% pass rate achieved for web dashboard login, webhook retries, and settings navigation.',
    },
    {
      id: 'QA2',
      category: 'QA',
      title: 'Load Testing for API Webhooks',
      description:
        'Simulated 50,000 concurrent webhooks/sec for 30 minutes. Average latency stayed at 42ms with zero packet drop.',
    },
  ],
  knownLimitations: [
    {
      id: 'L1',
      category: 'LIMITATION',
      title: 'Webhook History Retention Limit',
      description:
        'Webhook delivery logs are retained for 30 days only. Export to S3/GCS required for compliance archiving exceeding 30 days.',
    },
  ],
  migrationNotes: [], // Intentionally empty to trigger CHECK_BEHAVIOUR_MIGRATION failure
  affectedUserGroups: [
    {
      id: 'U1',
      category: 'USER_GROUP',
      title: 'Mobile Application Users (iOS & Android)',
      description: 'End users logging into mobile applications using biometric credentials.',
    },
    {
      id: 'U2',
      category: 'USER_GROUP',
      title: 'API Developers & System Administrators',
      description: 'Engineering teams consuming REST/WebSocket APIs and configuring webhooks.',
    },
  ],
};
