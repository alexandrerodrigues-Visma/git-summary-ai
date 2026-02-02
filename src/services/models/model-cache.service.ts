import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { Provider } from '../../config/schema';
import type { CachedModel, ModelsCache, ProviderCache } from './types';

const CACHE_DIR = join(homedir(), '.git-summary-ai');
const CACHE_FILE = join(CACHE_DIR, 'models-cache.json');
const DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Service for managing model cache
 */
export class ModelCacheService {
  /**
   * Ensures cache directory exists
   */
  private static ensureCacheDir(): void {
    if (!existsSync(CACHE_DIR)) {
      mkdirSync(CACHE_DIR, { recursive: true });
    }
  }

  /**
   * Load cache from disk
   */
  static loadCache(): ModelsCache {
    this.ensureCacheDir();

    if (!existsSync(CACHE_FILE)) {
      return this.createEmptyCache();
    }

    try {
      const content = readFileSync(CACHE_FILE, 'utf-8');
      const cache = JSON.parse(content) as ModelsCache;

      // Validate cache structure
      if (!cache.version || !cache.lastUpdated || !cache.providers) {
        console.warn('[models] Invalid cache structure, recreating');
        return this.createEmptyCache();
      }

      return cache;
    } catch (error) {
      console.warn('[models] Failed to load cache:', error instanceof Error ? error.message : String(error));
      return this.createEmptyCache();
    }
  }

  /**
   * Save cache to disk
   */
  static saveCache(cache: ModelsCache): void {
    this.ensureCacheDir();

    try {
      writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
    } catch (error) {
      console.warn('[models] Failed to save cache:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Get cached models for a provider
   */
  static getCachedModels(provider: Provider): CachedModel[] | null {
    const cache = this.loadCache();
    const providerCache = cache.providers[provider];

    if (!providerCache) {
      return null;
    }

    // Check if cache is expired
    if (this.isCacheExpired(providerCache)) {
      return null;
    }

    return providerCache.models;
  }

  /**
   * Set cached models for a provider
   */
  static setCachedModels(provider: Provider, models: CachedModel[], ttl: number = DEFAULT_TTL): void {
    const cache = this.loadCache();

    const providerCache: ProviderCache = {
      models,
      lastFetched: new Date().toISOString(),
      fetchStatus: 'success',
      ttl,
    };

    cache.providers[provider] = providerCache;
    cache.lastUpdated = new Date().toISOString();

    this.saveCache(cache);
  }

  /**
   * Clear all cached models
   */
  static clearCache(): void {
    const cache = this.createEmptyCache();
    this.saveCache(cache);
  }

  /**
   * Clear cache for a specific provider
   */
  static clearProviderCache(provider: Provider): void {
    const cache = this.loadCache();
    delete cache.providers[provider];
    cache.lastUpdated = new Date().toISOString();
    this.saveCache(cache);
  }

  /**
   * Get cache status for a provider
   */
  static getCacheStatus(provider: Provider): {
    isCached: boolean;
    isExpired: boolean;
    lastFetched?: string;
    age?: string;
  } {
    const cache = this.loadCache();
    const providerCache = cache.providers[provider];

    if (!providerCache) {
      return { isCached: false, isExpired: false };
    }

    const isExpired = this.isCacheExpired(providerCache);

    return {
      isCached: true,
      isExpired,
      lastFetched: providerCache.lastFetched,
      age: this.getHumanReadableAge(providerCache.lastFetched),
    };
  }

  /**
   * Check if provider cache is expired
   */
  private static isCacheExpired(providerCache: ProviderCache): boolean {
    const lastFetched = new Date(providerCache.lastFetched).getTime();
    const now = Date.now();
    return now - lastFetched > providerCache.ttl;
  }

  /**
   * Get human-readable age string
   */
  private static getHumanReadableAge(isoTimestamp: string): string {
    const lastFetched = new Date(isoTimestamp).getTime();
    const now = Date.now();
    const diffMs = now - lastFetched;

    const minutes = Math.floor(diffMs / (60 * 1000));
    const hours = Math.floor(diffMs / (60 * 60 * 1000));
    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }

  /**
   * Create empty cache structure
   */
  private static createEmptyCache(): ModelsCache {
    return {
      version: '1.0',
      lastUpdated: new Date().toISOString(),
      providers: {},
    };
  }

  /**
   * Get cache file path (for testing)
   */
  static getCacheFilePath(): string {
    return CACHE_FILE;
  }
}
