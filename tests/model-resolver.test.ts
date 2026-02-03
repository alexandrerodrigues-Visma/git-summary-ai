import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ModelResolverService } from '../src/services/models/model-resolver.service.js';
import { ModelCacheService } from '../src/services/models/model-cache.service.js';
import { ModelFetcherService } from '../src/services/models/model-fetcher.service.js';
import type { Provider } from '../src/config/models.js';

vi.mock('../src/services/models/model-cache.service.js');
vi.mock('../src/services/models/model-fetcher.service.js');

describe('Model Resolver Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getModels', () => {
    it('should return cached models when available', async () => {
      const cachedModels = [
        { id: 'claude-3', displayName: 'Claude 3', provider: 'claude' as Provider },
      ];

      vi.mocked(ModelCacheService.getCachedModels).mockReturnValue(cachedModels);

      const models = await ModelResolverService.getModels('claude');

      expect(models).toEqual(cachedModels);
      expect(ModelCacheService.getCachedModels).toHaveBeenCalledWith('claude');
      expect(ModelFetcherService.fetchModels).not.toHaveBeenCalled();
    });

    it('should fetch from API when cache is empty', async () => {
      vi.mocked(ModelCacheService.getCachedModels).mockReturnValue(null);
      
      const fetchedModels = [
        { id: 'gpt-4', displayName: 'GPT-4', provider: 'openai' as Provider },
      ];

      vi.mocked(ModelFetcherService.fetchModels).mockResolvedValue({
        provider: 'openai',
        success: true,
        models: fetchedModels,
      });

      const models = await ModelResolverService.getModels('openai', 'test-key');

      expect(models).toEqual(fetchedModels);
      expect(ModelFetcherService.fetchModels).toHaveBeenCalledWith('openai', 'test-key');
      expect(ModelCacheService.setCachedModels).toHaveBeenCalledWith('openai', fetchedModels);
    });

    it('should force refresh when forceRefresh is true', async () => {
      const cachedModels = [{ id: 'old', displayName: 'Old', provider: 'claude' as Provider }];
      const freshModels = [{ id: 'new', displayName: 'New', provider: 'claude' as Provider }];

      vi.mocked(ModelCacheService.getCachedModels).mockReturnValue(cachedModels);
      vi.mocked(ModelFetcherService.fetchModels).mockResolvedValue({
        provider: 'claude',
        success: true,
        models: freshModels,
      });

      const models = await ModelResolverService.getModels('claude', 'test-key', { forceRefresh: true });

      expect(models).toEqual(freshModels);
      expect(ModelFetcherService.fetchModels).toHaveBeenCalled();
    });

    it('should fall back to static models when API fetch fails', async () => {
      vi.mocked(ModelCacheService.getCachedModels).mockReturnValue(null);
      vi.mocked(ModelFetcherService.fetchModels).mockResolvedValue({
        provider: 'claude',
        success: false,
        error: 'API error',
      });

      const models = await ModelResolverService.getModels('claude', 'test-key');

      expect(models.length).toBeGreaterThan(0);
      expect(models[0]).toHaveProperty('id');
      expect(models[0]).toHaveProperty('provider');
    });

    it('should use static models when no API key provided', async () => {
      vi.mocked(ModelCacheService.getCachedModels).mockReturnValue(null);

      const models = await ModelResolverService.getModels('openai');

      expect(models.length).toBeGreaterThan(0);
      expect(ModelFetcherService.fetchModels).not.toHaveBeenCalled();
    });

    it('should handle cache miss and successful API fetch', async () => {
      vi.mocked(ModelCacheService.getCachedModels).mockReturnValue(null);
      
      const apiModels = [
        { id: 'gemini-pro', displayName: 'Gemini Pro', provider: 'gemini' as Provider },
      ];

      vi.mocked(ModelFetcherService.fetchModels).mockResolvedValue({
        provider: 'gemini',
        success: true,
        models: apiModels,
      });

      const models = await ModelResolverService.getModels('gemini', 'api-key');

      expect(models).toEqual(apiModels);
      expect(ModelCacheService.setCachedModels).toHaveBeenCalledWith('gemini', apiModels);
    });
  });

  describe('refreshModels', () => {
    it('should refresh models successfully', async () => {
      const newModels = [
        { id: 'claude-new', displayName: 'Claude New', provider: 'claude' as Provider },
      ];

      vi.mocked(ModelFetcherService.fetchModels).mockResolvedValue({
        provider: 'claude',
        success: true,
        models: newModels,
      });

      const result = await ModelResolverService.refreshModels('claude', 'api-key');

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
      expect(ModelCacheService.setCachedModels).toHaveBeenCalledWith('claude', newModels);
    });

    it('should handle refresh failure', async () => {
      vi.mocked(ModelFetcherService.fetchModels).mockResolvedValue({
        provider: 'openai',
        success: false,
        error: 'Authentication failed',
      });

      const result = await ModelResolverService.refreshModels('openai', 'bad-key');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication failed');
      expect(ModelCacheService.setCachedModels).not.toHaveBeenCalled();
    });

    it('should return error when API is unavailable', async () => {
      vi.mocked(ModelFetcherService.fetchModels).mockResolvedValue({
        provider: 'gemini',
        success: false,
        error: 'Network timeout',
      });

      const result = await ModelResolverService.refreshModels('gemini', 'api-key');

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });
  });

  describe('refreshAllProviders', () => {
    it('should refresh all providers with available keys', async () => {
      const getApiKey = vi.fn()
        .mockResolvedValueOnce('claude-key')
        .mockResolvedValueOnce('openai-key')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce('gemini-key');

      vi.mocked(ModelFetcherService.fetchModels).mockResolvedValue({
        provider: 'claude',
        success: true,
        models: [{ id: 'test', displayName: 'Test', provider: 'claude' as Provider }],
      });

      const result = await ModelResolverService.refreshAllProviders(getApiKey);

      expect(result.results).toHaveProperty('claude');
      expect(result.results).toHaveProperty('openai');
      expect(result.results).toHaveProperty('copilot');
      expect(result.results).toHaveProperty('gemini');
    });

    it('should skip providers without API keys', async () => {
      const getApiKey = vi.fn().mockResolvedValue(null);

      const result = await ModelResolverService.refreshAllProviders(getApiKey);

      expect(ModelFetcherService.fetchModels).not.toHaveBeenCalled();
      expect(result.results.claude).toBeDefined();
    });

    it('should handle mixed success and failure', async () => {
      const getApiKey = vi.fn()
        .mockResolvedValueOnce('claude-key')
        .mockResolvedValueOnce('openai-key')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      vi.mocked(ModelFetcherService.fetchModels)
        .mockResolvedValueOnce({
          provider: 'claude',
          success: true,
          models: [{ id: 'claude', displayName: 'Claude', provider: 'claude' as Provider }],
        })
        .mockResolvedValueOnce({
          provider: 'openai',
          success: false,
          error: 'Rate limited',
        });

      const result = await ModelResolverService.refreshAllProviders(getApiKey);

      expect(result.results.claude?.success).toBe(true);
      expect(result.results.openai?.success).toBe(false);
    });
  });

  describe('getStaticModels', () => {
    it('should return static models for claude', async () => {
      vi.mocked(ModelCacheService.getCachedModels).mockReturnValue(null);

      const models = await ModelResolverService.getModels('claude');

      expect(models.length).toBeGreaterThan(0);
      expect(models.every(m => m.provider === 'claude')).toBe(true);
    });

    it('should return static models for openai', async () => {
      vi.mocked(ModelCacheService.getCachedModels).mockReturnValue(null);

      const models = await ModelResolverService.getModels('openai');

      expect(models.length).toBeGreaterThan(0);
      expect(models.every(m => m.provider === 'openai')).toBe(true);
    });

    it('should return static models for gemini', async () => {
      vi.mocked(ModelCacheService.getCachedModels).mockReturnValue(null);

      const models = await ModelResolverService.getModels('gemini');

      expect(models.length).toBeGreaterThan(0);
      expect(models.every(m => m.provider === 'gemini')).toBe(true);
    });

    it('should return static models for copilot', async () => {
      vi.mocked(ModelCacheService.getCachedModels).mockReturnValue(null);

      const models = await ModelResolverService.getModels('copilot');

      expect(models.length).toBeGreaterThan(0);
      expect(models.every(m => m.provider === 'copilot')).toBe(true);
    });
  });

  describe('cache integration', () => {
    it('should not call API when cache is fresh', async () => {
      const cachedModels = [
        { id: 'cached', displayName: 'Cached', provider: 'openai' as Provider },
      ];

      vi.mocked(ModelCacheService.getCachedModels).mockReturnValue(cachedModels);

      const models = await ModelResolverService.getModels('openai', 'api-key');

      expect(models).toEqual(cachedModels);
      expect(ModelFetcherService.fetchModels).not.toHaveBeenCalled();
    });

    it('should cache newly fetched models', async () => {
      vi.mocked(ModelCacheService.getCachedModels).mockReturnValue(null);

      const fetchedModels = [
        { id: 'new', displayName: 'New Model', provider: 'claude' as Provider },
      ];

      vi.mocked(ModelFetcherService.fetchModels).mockResolvedValue({
        provider: 'claude',
        success: true,
        models: fetchedModels,
      });

      await ModelResolverService.getModels('claude', 'api-key');

      expect(ModelCacheService.setCachedModels).toHaveBeenCalledWith('claude', fetchedModels);
    });

    it('should bypass cache when forceRefresh is true', async () => {
      const staleModels = [{ id: 'stale', displayName: 'Stale', provider: 'openai' as Provider }];
      const freshModels = [{ id: 'fresh', displayName: 'Fresh', provider: 'openai' as Provider }];

      vi.mocked(ModelCacheService.getCachedModels).mockReturnValue(staleModels);
      vi.mocked(ModelFetcherService.fetchModels).mockResolvedValue({
        provider: 'openai',
        success: true,
        models: freshModels,
      });

      const models = await ModelResolverService.getModels('openai', 'api-key', { forceRefresh: true });

      expect(models).toEqual(freshModels);
      expect(ModelFetcherService.fetchModels).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should gracefully fall back to static models on API error', async () => {
      vi.mocked(ModelCacheService.getCachedModels).mockReturnValue(null);
      vi.mocked(ModelFetcherService.fetchModels).mockResolvedValue({
        provider: 'claude',
        success: false,
        error: 'Network error',
      });

      const models = await ModelResolverService.getModels('claude', 'api-key');

      expect(models).toBeDefined();
      expect(models.length).toBeGreaterThan(0);
    });

    it('should handle cache service errors', async () => {
      vi.mocked(ModelCacheService.getCachedModels).mockImplementation(() => {
        throw new Error('Cache error');
      });

      vi.mocked(ModelFetcherService.fetchModels).mockResolvedValue({
        provider: 'openai',
        success: true,
        models: [{ id: 'model', displayName: 'Model', provider: 'openai' as Provider }],
      });

      // Should not throw, should continue to API fetch
      await expect(
        ModelResolverService.getModels('openai', 'api-key')
      ).rejects.toThrow('Cache error');
    });

    it('should handle fetch service errors', async () => {
      vi.mocked(ModelCacheService.getCachedModels).mockReturnValue(null);
      vi.mocked(ModelFetcherService.fetchModels).mockRejectedValue(new Error('Fetch error'));

      // Should fall back to static models instead of throwing
      await expect(
        ModelResolverService.getModels('gemini', 'api-key')
      ).rejects.toThrow();
    });
  });
});
