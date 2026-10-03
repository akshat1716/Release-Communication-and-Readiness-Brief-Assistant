import { describe, it, expect } from 'vitest';
import { comparePackageData, compareStatements } from '../lib/diff';
import { SAMPLE_RELEASE_PACKAGE } from '../lib/fixtures/sample-release';
import { ReleasePackageData, StatementData } from '../lib/types/release';

describe('Version Diffing Engine', () => {
  it('should detect added, modified, and removed package items', () => {
    const v1: ReleasePackageData = SAMPLE_RELEASE_PACKAGE;
    const v2: ReleasePackageData = {
      ...SAMPLE_RELEASE_PACKAGE,
      features: [
        {
          ...SAMPLE_RELEASE_PACKAGE.features[0],
          description: 'Updated biometric description with face recognition details',
        },
        {
          id: 'F3',
          category: 'FEATURE',
          title: 'Brand New Feature 3',
          description: 'Added F3 to v2 package',
        },
      ],
      bugFixes: [], // Removed B1
    };

    const diff = comparePackageData(v1, v2);

    expect(diff.added.some((i) => i.id === 'F3')).toBe(true);
    expect(diff.modified.some((i) => i.id === 'F1')).toBe(true);
    expect(diff.removed.some((i) => i.id === 'B1')).toBe(true);
  });

  it('should detect statement modifications and additions', () => {
    const stmtsV1: StatementData[] = [
      {
        id: 's1',
        audience: 'INTERNAL',
        text: 'Initial technical statement text',
        originalText: 'Initial technical statement text',
        citations: ['F1'],
        status: 'DRAFT',
        sourceHash: 'hash1',
        isStale: false,
        orderIndex: 1,
      },
    ];

    const stmtsV2: StatementData[] = [
      {
        id: 's1',
        audience: 'INTERNAL',
        text: 'Human edited technical statement text',
        originalText: 'Initial technical statement text',
        citations: ['F1', 'QA1'],
        status: 'APPROVED',
        sourceHash: 'hash1',
        isStale: false,
        orderIndex: 1,
      },
    ];

    const diff = compareStatements(stmtsV1, stmtsV2);

    expect(diff.modified.length).toBe(1);
    expect(diff.modified[0].textV1).toBe('Initial technical statement text');
    expect(diff.modified[0].textV2).toBe('Human edited technical statement text');
    expect(diff.modified[0].statusV2).toBe('APPROVED');
  });
});
