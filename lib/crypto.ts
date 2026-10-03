import crypto from 'crypto';
import { ReleasePackageItem } from './types/release';

/**
 * Compute SHA-256 hash of a string
 */
export function sha256(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Compute SHA-256 hash for a single ReleasePackageItem content
 */
export function hashItemContent(item: ReleasePackageItem): string {
  const payload = `${item.id}:${item.category}:${item.title.trim()}:${item.description.trim()}`;
  return sha256(payload);
}

/**
 * Compute SHA-256 source hash for a list of cited item IDs.
 * Finds cited items from the full package list, sorts them by ID for stability,
 * and hashes their combined content.
 */
export function computeCitedSourceHash(
  citationIds: string[],
  allItems: ReleasePackageItem[]
): string {
  if (!citationIds || citationIds.length === 0) {
    return sha256('NO_CITATIONS');
  }

  const itemsMap = new Map(allItems.map((it) => [it.id, it]));
  
  // Sort IDs for deterministic order
  const sortedIds = [...citationIds].sort();
  const contentChunks: string[] = [];

  for (const id of sortedIds) {
    const item = itemsMap.get(id);
    if (item) {
      contentChunks.push(hashItemContent(item));
    } else {
      // Cited item doesn't exist in package
      contentChunks.push(`MISSING:${id}`);
    }
  }

  return sha256(contentChunks.join('||'));
}
