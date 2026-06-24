import { SimpleLRU } from '@se-oss/simple-lru';

import { ScanResult } from './typings';

export const REGEX_CACHE = new SimpleLRU<string, RegExp>(1000);
export const SCAN_CACHE = new SimpleLRU<string, ScanResult>(1000);

/**
 * Clears the compilation cache. Useful for testing or forcing garbage collection.
 */
export function clearCache(): void {
  REGEX_CACHE.clear();
  SCAN_CACHE.clear();
}
