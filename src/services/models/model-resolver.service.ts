import { AVAILABLE_MODELS, type Provider } from '../../config/models';
import { ModelCacheService } from './model-cache.service';
import { ModelFetcherService } from './model-fetcher.service';
import type { CachedModel, GetModelsOptions, RefreshResult } from './types';

/**
 * High-level service for resolving models with caching and fallback chain
 */
export class ModelResolverService {
  /**
   * Get models for a provider with full fallback chain:
   * Cache (if fresh) → API Fetch → Static Fallback
   */
  static async getModels(
    provider: Provider,
    apiKey?: string,
    options: GetModelsOptions = {}
  ): Promise<CachedModel[]> {
    // Step 1: Try cache if not forcing refresh
    if (!options.forceRefresh) {
      const cached = ModelCacheService.getCachedModels(provider);
      if (cached) {
        return cached;
      }
    }

    // Step 2: Try API fetch if API key is provided
    if (apiKey) {
      const fetchResult = await ModelFetcherService.fetchModels(provider, apiKey);
      if (fetchResult.success && fetchResult.models) {
        // Cache the successful result
        ModelCacheService.setCachedModels(provider, fetchResult.models);
        return fetchResult.models;
      }
    }

    // Step 3: Fall back to static models
    return this.getStaticModels(provider);
  }

  /**
   * Refresh models from API and update cache
   */
  static async refreshModels(
    provider: Provider,
    apiKey: string
  ): Promise<{
    success: boolean;
    count?: number;
    error?: string;
  }> {
    const fetchResult = await ModelFetcherService.fetchModels(provider, apiKey);

    if (fetchResult.success && fetchResult.models) {
      ModelCacheService.setCachedModels(provider, fetchResult.models);
      return {
        success: true,
        count: fetchResult.models.length,
      };
    }

    return {
      success: false,
      error: fetchResult.error,
    };
  }

  /**
   * Refresh all providers with available API keys
   */
  static async refreshAllProviders(
    getApiKey: (provider: Provider) => Promise<string | null>
  ): Promise<RefreshResult> {
    const providers: Provider[] = ['claude', 'openai', 'copilot', 'gemini'];
    const results: RefreshResult['results'] = {};

    for (const provider of providers) {
      const apiKey = await getApiKey(provider);
      if (!apiKey) {
        results[provider] = {
          success: false,
          error: 'No API key configured',
        };
        continue;
      }

      const result = await this.refreshModels(provider, apiKey);
      results[provider] = result;
    }

    return {
      timestamp: new Date().toISOString(),
      results,
    };
  }

  /**
   * Get static fallback models for a provider
   */
  static getStaticModels(provider: Provider): CachedModel[] {
    const staticModels = AVAILABLE_MODELS[provider];
    return staticModels.map((model) => ({
      id: model.id,
      displayName: model.name,
      provider,
    }));
  }

  /**
   * Check if a model is valid for a provider (from cache or static)
   */
  static async isValidModel(
    provider: Provider,
    modelId: string,
    apiKey?: string
  ): Promise<boolean> {
    const models = await this.getModels(provider, apiKey);
    return models.some((m) => m.id === modelId);
  }

  /**
   * Check if a model is valid using only static models (synchronous)
   */
  static isValidModelStatic(provider: Provider, modelId: string): boolean {
    return AVAILABLE_MODELS[provider].some((m) => m.id === modelId);
  }

  /**
   * Get human-readable cache status for a provider
   */
  static getCacheStatus(provider: Provider): {
    isCached: boolean;
    isExpired: boolean;
    lastFetched?: string;
    age?: string;
    source: 'cached' | 'static';
  } {
    const status = ModelCacheService.getCacheStatus(provider);

    return {
      ...status,
      source: status.isCached && !status.isExpired ? 'cached' : 'static',
    };
  }

  /**
   * Clear all caches
   */
  static clearAllCaches(): void {
    ModelCacheService.clearCache();
  }

  /**
   * Clear cache for a specific provider
   */
  static clearCache(provider: Provider): void {
    ModelCacheService.clearProviderCache(provider);
  }
}
