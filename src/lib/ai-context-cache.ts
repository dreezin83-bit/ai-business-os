/**
 * In-memory LRU cache for AI context.
 * Avoids rebuilding the 10K+ token system prompt on every AI message.
 *
 * TTL: 5 minutes per business
 * Invalidation: call invalidateAiContextCache(businessId) after config changes
 */

import { type AiContext } from "@/lib/ai-context";

interface CacheEntry {
  context: AiContext;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const MAX_CACHE_SIZE = 500;
const TTL_MS = 5 * 60 * 1000; // 5 minutes

export function getCachedAiContext(businessId: string): AiContext | null {
  const entry = cache.get(businessId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(businessId);
    return null;
  }
  // Move to end for LRU
  cache.delete(businessId);
  cache.set(businessId, entry);
  return entry.context;
}

export function setCachedAiContext(businessId: string, context: AiContext): void {
  // Enforce max size — evict oldest entry
  if (cache.size >= MAX_CACHE_SIZE) {
    const oldest = cache.keys().next();
    if (oldest.value) cache.delete(oldest.value);
  }
  cache.set(businessId, {
    context,
    expiresAt: Date.now() + TTL_MS,
  });
}

export function invalidateAiContextCache(businessId: string): void {
  cache.delete(businessId);
}

export function getCacheStats(): { size: number; maxSize: number } {
  return { size: cache.size, maxSize: MAX_CACHE_SIZE };
}
