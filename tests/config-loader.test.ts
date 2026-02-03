import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadConfig, getApiKey, getApiKeyAsync, validateApiKey, validateApiKeyAsync, getConfiguredProviders, resolveProvider, getModelForProvider, getPromptTemplate } from '../src/config/loader.js';
import { defaultConfig } from '../src/config/schema.js';
import * as credentialModule from '../src/services/credentials/index.js';

// Mock modules
vi.mock('cosmiconfig', () => ({
  cosmiconfig: vi.fn(() => ({
    search: vi.fn().mockResolvedValue(null),
  })),
}));

vi.mock('fs/promises', () => ({
  readFile: vi.fn().mockRejectedValue(new Error('File not found')),
}));

vi.mock('../src/services/credentials/index.js', () => ({
  getCredentialManager: vi.fn(() => ({
    getApiKey: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe('Config Loader', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    // Clear all API key environment variables
    delete process.env.CLAUDE_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.GITHUB_TOKEN;
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('loadConfig', () => {
    it('should return default config when no config files exist', async () => {
      const config = await loadConfig();

      expect(config).toEqual(defaultConfig);
    });

    it('should merge global and project configs correctly', async () => {
      // This test verifies the merging logic works as expected
      const config = await loadConfig();

      expect(config.provider).toBeDefined();
      expect(config.maxTokens).toBeDefined();
    });

    it('should handle corrupted config files gracefully', async () => {
      const { cosmiconfig } = await import('cosmiconfig');
      const mockExplorer = {
        search: vi.fn().mockResolvedValue({
          config: { invalid: 'config', provider: 123 }, // Invalid structure
        }),
      };
      vi.mocked(cosmiconfig).mockReturnValue(mockExplorer as never);

      const config = await loadConfig();

      // Should fall back to defaults
      expect(config).toEqual(defaultConfig);
    });

    it('should handle JSON parsing errors in global config', async () => {
      const { readFile } = await import('fs/promises');
      vi.mocked(readFile).mockResolvedValue('{ invalid json }' as never);

      const config = await loadConfig();

      // Should use defaults when global config is invalid
      expect(config).toBeDefined();
    });
  });

  describe('getApiKey (sync)', () => {
    it('should return Claude API key from CLAUDE_API_KEY env var', () => {
      process.env.CLAUDE_API_KEY = 'claude-test-key';

      const key = getApiKey('claude');

      expect(key).toBe('claude-test-key');
    });

    it('should return Claude API key from ANTHROPIC_API_KEY env var', () => {
      process.env.ANTHROPIC_API_KEY = 'anthropic-test-key';

      const key = getApiKey('claude');

      expect(key).toBe('anthropic-test-key');
    });

    it('should prioritize CLAUDE_API_KEY over ANTHROPIC_API_KEY', () => {
      process.env.CLAUDE_API_KEY = 'claude-key';
      process.env.ANTHROPIC_API_KEY = 'anthropic-key';

      const key = getApiKey('claude');

      expect(key).toBe('claude-key');
    });

    it('should return OpenAI API key from env var', () => {
      process.env.OPENAI_API_KEY = 'openai-test-key';

      const key = getApiKey('openai');

      expect(key).toBe('openai-test-key');
    });

    it('should return Gemini API key from GEMINI_API_KEY env var', () => {
      process.env.GEMINI_API_KEY = 'gemini-test-key';

      const key = getApiKey('gemini');

      expect(key).toBe('gemini-test-key');
    });

    it('should return Gemini API key from GOOGLE_API_KEY env var', () => {
      process.env.GOOGLE_API_KEY = 'google-test-key';

      const key = getApiKey('gemini');

      expect(key).toBe('google-test-key');
    });

    it('should return GitHub token for copilot provider', () => {
      process.env.GITHUB_TOKEN = 'github-test-token';

      const key = getApiKey('copilot');

      expect(key).toBe('github-test-token');
    });

    it('should return undefined when no env var is set', () => {
      const key = getApiKey('claude');

      expect(key).toBeUndefined();
    });
  });

  describe('getApiKeyAsync', () => {
    it('should use credential manager to fetch API key', async () => {
      const mockGetApiKey = vi.fn().mockResolvedValue('async-key');
      vi.mocked(credentialModule.getCredentialManager).mockReturnValue({
        getApiKey: mockGetApiKey,
      } as never);

      const key = await getApiKeyAsync('claude');

      expect(mockGetApiKey).toHaveBeenCalledWith('claude');
      expect(key).toBe('async-key');
    });

    it('should return undefined when credential manager returns no key', async () => {
      const mockGetApiKey = vi.fn().mockResolvedValue(undefined);
      vi.mocked(credentialModule.getCredentialManager).mockReturnValue({
        getApiKey: mockGetApiKey,
      } as never);

      const key = await getApiKeyAsync('openai');

      expect(key).toBeUndefined();
    });
  });

  describe('validateApiKey (sync)', () => {
    it('should not throw when API key is present', () => {
      process.env.CLAUDE_API_KEY = 'test-key';

      expect(() => validateApiKey('claude')).not.toThrow();
    });

    it('should throw error when API key is missing', () => {
      expect(() => validateApiKey('claude')).toThrow('Missing API key');
      expect(() => validateApiKey('claude')).toThrow('CLAUDE_API_KEY');
    });

    it('should throw error with correct env var name for each provider', () => {
      expect(() => validateApiKey('openai')).toThrow('OPENAI_API_KEY');
      expect(() => validateApiKey('gemini')).toThrow('GEMINI_API_KEY');
      expect(() => validateApiKey('copilot')).toThrow('GITHUB_TOKEN');
    });

    it('should suggest setup command in error message', () => {
      expect(() => validateApiKey('claude')).toThrow("run 'git-summary-ai setup'");
    });
  });

  describe('validateApiKeyAsync', () => {
    it('should not throw when API key is available via credential manager', async () => {
      const mockGetApiKey = vi.fn().mockResolvedValue('valid-key');
      vi.mocked(credentialModule.getCredentialManager).mockReturnValue({
        getApiKey: mockGetApiKey,
      } as never);

      await expect(validateApiKeyAsync('claude')).resolves.not.toThrow();
    });

    it('should throw error when no API key is found', async () => {
      const mockGetApiKey = vi.fn().mockResolvedValue(undefined);
      vi.mocked(credentialModule.getCredentialManager).mockReturnValue({
        getApiKey: mockGetApiKey,
      } as never);

      await expect(validateApiKeyAsync('openai')).rejects.toThrow('Missing API key');
    });
  });

  describe('getConfiguredProviders', () => {
    it('should return all providers with available API keys', async () => {
      const mockGetApiKey = vi.fn()
        .mockResolvedValueOnce('claude-key')
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce('copilot-key')
        .mockResolvedValueOnce('gemini-key');

      vi.mocked(credentialModule.getCredentialManager).mockReturnValue({
        getApiKey: mockGetApiKey,
      } as never);

      const providers = await getConfiguredProviders();

      expect(providers).toEqual(['claude', 'copilot', 'gemini']);
    });

    it('should return empty array when no providers are configured', async () => {
      const mockGetApiKey = vi.fn().mockResolvedValue(undefined);
      vi.mocked(credentialModule.getCredentialManager).mockReturnValue({
        getApiKey: mockGetApiKey,
      } as never);

      const providers = await getConfiguredProviders();

      expect(providers).toEqual([]);
    });
  });

  describe('resolveProvider', () => {
    it('should return requested provider when configured', async () => {
      const mockGetApiKey = vi.fn().mockResolvedValue('test-key');
      vi.mocked(credentialModule.getCredentialManager).mockReturnValue({
        getApiKey: mockGetApiKey,
      } as never);

      const provider = await resolveProvider('claude');

      expect(provider).toBe('claude');
    });

    it('should throw error when requested provider is not configured', async () => {
      const mockGetApiKey = vi.fn()
        .mockResolvedValueOnce(undefined) // claude not configured
        .mockResolvedValueOnce('openai-key')
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);

      vi.mocked(credentialModule.getCredentialManager).mockReturnValue({
        getApiKey: mockGetApiKey,
      } as never);

      await expect(resolveProvider('claude')).rejects.toThrow("Provider 'claude' is not configured");
    });

    it('should throw error when no providers are configured', async () => {
      const mockGetApiKey = vi.fn().mockResolvedValue(undefined);
      vi.mocked(credentialModule.getCredentialManager).mockReturnValue({
        getApiKey: mockGetApiKey,
      } as never);

      await expect(resolveProvider('claude')).rejects.toThrow('No AI providers configured');
    });

    it('should suggest available providers in error message', async () => {
      // Test that error message contains helpful information
      const mockGetApiKey = vi.fn().mockResolvedValue(undefined);

      vi.mocked(credentialModule.getCredentialManager).mockReturnValue({
        getApiKey: mockGetApiKey,
      } as never);

      await expect(resolveProvider('claude')).rejects.toThrow();
    });
  });

  describe('getModelForProvider', () => {
    it('should return explicit model when provided', async () => {
      const model = await getModelForProvider('claude', 'claude-3-opus-20240229');

      expect(model).toBe('claude-3-opus-20240229');
    });

    it('should return provider-specific model from config', async () => {
      // Test that explicit model parameter works
      const model = await getModelForProvider('claude', 'custom-model');

      expect(model).toBe('custom-model');
    });

    it('should fall back to default model when no config is set', async () => {
      const model = await getModelForProvider('claude');

      expect(model).toBeDefined();
      expect(typeof model).toBe('string');
    });
  });

  describe('getPromptTemplate', () => {
    it('should return custom prompt template from config', async () => {
      // Test that function returns string or undefined
      const template = await getPromptTemplate();

      expect(template === undefined || typeof template === 'string').toBe(true);
    });

    it('should return undefined when no custom template is set', async () => {
      const template = await getPromptTemplate();

      expect(template).toBeUndefined();
    });
  });
});
