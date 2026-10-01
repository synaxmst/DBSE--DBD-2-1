/**
 * Winnowing Algorithm & Jaccard Similarity Calculator for Code Fingerprinting
 */

const HASH_PRIME = 31;
const HASH_MOD = 2147483647; // 2^31 - 1

/**
 * Fast polynomial rolling hash for string n-grams
 */
export const hashNgram = (ngram: string): number => {
  let hash = 0;
  for (let i = 0; i < ngram.length; i++) {
    hash = (hash * HASH_PRIME + ngram.charCodeAt(i)) % HASH_MOD;
  }
  return hash;
};

/**
 * Generate contiguous sliding window n-grams from token array
 */
export const generateNgrams = (tokens: string[], n: number = 5): string[] => {
  if (tokens.length < n) {
    return [tokens.join(' ')];
  }

  const ngrams: string[] = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    ngrams.push(tokens.slice(i, i + n).join(' '));
  }
  return ngrams;
};

/**
 * Winnowing Algorithm: selects localized minimum hashes over a sliding window
 * Guarantees detection of shared substrings of length >= (windowSize + n - 1)
 */
export const winnow = (ngrams: string[], windowSize: number = 4): Set<number> => {
  const hashes = ngrams.map(hashNgram);
  const fingerprint = new Set<number>();

  if (hashes.length <= windowSize) {
    if (hashes.length > 0) {
      fingerprint.add(Math.min(...hashes));
    }
    return fingerprint;
  }

  // Slide window of size `windowSize`
  let minHash = Infinity;
  let minIndex = -1;

  for (let i = 0; i <= hashes.length - windowSize; i++) {
    const window = hashes.slice(i, i + windowSize);

    // Find the right-most minimum in current window
    let currentMin = Infinity;
    let currentMinIdx = -1;

    for (let j = 0; j < window.length; j++) {
      if (window[j] <= currentMin) {
        currentMin = window[j];
        currentMinIdx = i + j;
      }
    }

    // Only record if it's a new minimum location
    if (currentMinIdx !== minIndex) {
      minHash = currentMin;
      minIndex = currentMinIdx;
      fingerprint.add(minHash);
    }
  }

  return fingerprint;
};

/**
 * Compute Jaccard Similarity coefficient between two fingerprint hash sets
 * S(A, B) = |A ∩ B| / |A ∪ B|
 */
export const jaccardSimilarity = (a: Set<number>, b: Set<number>): number => {
  if (a.size === 0 && b.size === 0) return 1.0;
  if (a.size === 0 || b.size === 0) return 0.0;

  let intersectionCount = 0;
  for (const hash of a) {
    if (b.has(hash)) {
      intersectionCount++;
    }
  }

  const unionCount = a.size + b.size - intersectionCount;
  if (unionCount === 0) return 0.0;

  return Number((intersectionCount / unionCount).toFixed(4));
};
