import type { Provider } from '../../config/schema';

/**
 * Normalized model structure for caching
 */
export interface CachedModel {
  id: string;
  displayName: string;
  provider: Provider;
}

/**
 * Per-provider cache data
 */
export interface ProviderCache {
  models: CachedModel[];
  lastFetched: string; // ISO timestamp
  fetchStatus: 'success' | 'failure' | 'stale';
  ttl: number; // milliseconds
}

/**
 * Full cache file structure
 */
export interface ModelsCache {
  version: string;
  lastUpdated: string; // ISO timestamp
  providers: {
    [K in Provider]?: ProviderCache;
  };
}

/**
 * Options for model resolution
 */
export interface GetModelsOptions {
  forceRefresh?: boolean;
  useStaticFallback?: boolean;
}

/**
 * Result of model fetching operation
 */
export interface FetchResult {
  provider: Provider;
  success: boolean;
  models?: CachedModel[];
  error?: string;
}

/**
 * Refresh result with status per provider
 */
export interface RefreshResult {
  timestamp: string;
  results: {
    [K in Provider]?: {
      success: boolean;
      count?: number;
      error?: string;
    };
  };
}
