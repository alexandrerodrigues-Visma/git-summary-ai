import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configSchema, type Config } from '../src/config/schema.js';

describe('Config Schema', () => {
  describe('configSchema validation', () => {
    it('should validate a complete valid config', () => {
      const validConfig = {
        provider: 'claude',
        model: 'claude-3-5-sonnet-20241022',
        models: {
          claude: 'claude-3-5-sonnet-20241022',
          openai: 'gpt-4o',
        },
        maxTokens: 2048,
        targetBranch: 'main',
        excludePatterns: ['node_modules', 'dist'],
        commitPrefix: 'feat: ',
        language: 'en',
        promptTemplate: 'Custom template',
      };

      const result = configSchema.parse(validConfig);
      expect(result).toEqual(validConfig);
    });

    it('should use default values for optional fields', () => {
      const minimalConfig = {
        provider: 'claude',
      };

      const result = configSchema.parse(minimalConfig);
      expect(result.provider).toBe('claude');
      expect(result.maxTokens).toBe(1024);
      expect(result.targetBranch).toBe('main');
      expect(result.excludePatterns).toEqual([]);
      expect(result.language).toBe('en');
    });

    it('should validate all supported providers', () => {
      const providers = ['claude', 'openai', 'copilot', 'gemini'];
      
      providers.forEach(provider => {
        const config = { provider };
        const result = configSchema.parse(config);
        expect(result.provider).toBe(provider);
      });
    });

    it('should reject invalid provider', () => {
      const invalidConfig = {
        provider: 'invalid-provider',
      };

      expect(() => configSchema.parse(invalidConfig)).toThrow();
    });

    it('should reject negative maxTokens', () => {
      const invalidConfig = {
        provider: 'claude',
        maxTokens: -100,
      };

      expect(() => configSchema.parse(invalidConfig)).toThrow();
    });

    it('should accept optional model configurations per provider', () => {
      const config = {
        provider: 'claude',
        models: {
          claude: 'claude-3-5-sonnet-20241022',
          openai: 'gpt-4o',
          gemini: 'gemini-2.0-flash-exp',
        },
      };

      const result = configSchema.parse(config);
      expect(result.models?.claude).toBe('claude-3-5-sonnet-20241022');
      expect(result.models?.openai).toBe('gpt-4o');
      expect(result.models?.gemini).toBe('gemini-2.0-flash-exp');
    });

    it('should accept custom excludePatterns', () => {
      const config = {
        provider: 'claude',
        excludePatterns: ['*.test.ts', 'coverage', 'dist'],
      };

      const result = configSchema.parse(config);
      expect(result.excludePatterns).toEqual(['*.test.ts', 'coverage', 'dist']);
    });

    it('should accept custom promptTemplate', () => {
      const customTemplate = 'Generate a commit message for: {diff}';
      const config = {
        provider: 'openai',
        promptTemplate: customTemplate,
      };

      const result = configSchema.parse(config);
      expect(result.promptTemplate).toBe(customTemplate);
    });
  });
});
