import { describe, it, expect } from 'vitest';
import { sha256, hashItemContent, computeCitedSourceHash } from '../lib/crypto';
import { ReleasePackageItem } from '../lib/types/release';

describe('Crypto SHA-256 Utility', () => {
  it('should compute consistent sha256 hash', () => {
    const hash1 = sha256('test-string');
    const hash2 = sha256('test-string');
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // hex sha256 length
  });

  it('should compute hash for package item', () => {
    const item: ReleasePackageItem = {
      id: 'F1',
      category: 'FEATURE',
      title: 'OAuth2 Authentication',
      description: 'Support login with Google and GitHub',
    };
    const itemHash = hashItemContent(item);
    expect(itemHash).toBeDefined();
    expect(itemHash).toHaveLength(64);
  });

  it('should detect item changes in cited source hash', () => {
    const item1: ReleasePackageItem = {
      id: 'F1',
      category: 'FEATURE',
      title: 'OAuth2 Authentication',
      description: 'Support login with Google',
    };
    const item2: ReleasePackageItem = {
      id: 'QA1',
      category: 'QA',
      title: 'OAuth Testing',
      description: 'Tested OAuth flow with Google',
    };

    const hashV1 = computeCitedSourceHash(['F1', 'QA1'], [item1, item2]);

    // Update item1 description
    const item1Modified: ReleasePackageItem = {
      ...item1,
      description: 'Support login with Google, GitHub, and Apple',
    };

    const hashV2 = computeCitedSourceHash(['F1', 'QA1'], [item1Modified, item2]);

    expect(hashV1).not.toBe(hashV2);
  });
});
