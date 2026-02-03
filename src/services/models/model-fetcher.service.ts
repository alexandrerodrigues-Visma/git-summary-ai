import type { Provider } from '../../config/models';
import type { FetchResult } from './types';

const ANTHROPIC_VERSION = '2023-06-01';

/**
 * Service for fetching models from provider APIs
 */
export class ModelFetcherService {
  /**
   * Fetch models for a provider
   */
  static async fetchModels(provider: Provider, apiKey: string): Promise<FetchResult> {
    try {
      switch (provider) {
        case 'claude':
          return await this.fetchClaudeModels(apiKey);
        case 'openai':
          return await this.fetchOpenAIModels(apiKey);
        case 'copilot':
          return await this.fetchCopilotModels(apiKey);
        case 'gemini':
          return await this.fetchGeminiModels(apiKey);
        default:
          return {
            provider,
            success: false,
            error: `Unknown provider: ${provider}`,
          };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        provider,
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Fetch Claude models from Anthropic API
   */
  private static async fetchClaudeModels(apiKey: string): Promise<FetchResult> {
    try {
      const response = await fetch('https://api.anthropic.com/v1/models', {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
        },
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }

      const data = (await response.json()) as {
        data?: Array<{ id: string; display_name?: string }>;
      };

      if (!data.data || !Array.isArray(data.data)) {
        throw new Error('Invalid API response format');
      }

      // Filter models and transform to CachedModel format
      const models = data.data
        .filter(
          (model) =>
            model.id &&
            (model.id.startsWith('claude-') ||
              model.id.startsWith('claude2-') ||
              model.id.includes('claude'))
        )
        .map((model) => ({
          id: model.id,
          displayName: model.display_name || model.id,
          provider: 'claude' as const,
        }));

      if (models.length === 0) {
        throw new Error('No Claude models found in API response');
      }

      return {
        provider: 'claude',
        success: true,
        models,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        provider: 'claude',
        success: false,
        error: `Failed to fetch Claude models: ${errorMessage}`,
      };
    }
  }

  /**
   * Fetch OpenAI models
   */
  private static async fetchOpenAIModels(apiKey: string): Promise<FetchResult> {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }

      const data = (await response.json()) as {
        data?: Array<{ id: string }>;
      };

      if (!data.data || !Array.isArray(data.data)) {
        throw new Error('Invalid API response format');
      }

      // Filter for GPT models and transform to CachedModel format
      const models = data.data
        .filter((model) => model.id && model.id.includes('gpt'))
        .map((model) => ({
          id: model.id,
          displayName: model.id,
          provider: 'openai' as const,
        }))
        .sort((a, b) => b.id.localeCompare(a.id)); // Newer models first

      if (models.length === 0) {
        throw new Error('No GPT models found in API response');
      }

      return {
        provider: 'openai',
        success: true,
        models,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        provider: 'openai',
        success: false,
        error: `Failed to fetch OpenAI models: ${errorMessage}`,
      };
    }
  }

  /**
   * Fetch GitHub Models (Copilot)
   */
  private static async fetchCopilotModels(apiKey: string): Promise<FetchResult> {
    try {
      const response = await fetch('https://models.inference.ai.azure.com/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }

      const data = (await response.json()) as {
        data?: Array<{ id: string; friendly_name?: string }>;
      };

      if (!data.data || !Array.isArray(data.data)) {
        throw new Error('Invalid API response format');
      }

      // Filter for supported models (gpt, o1, etc.)
      const models = data.data
        .filter((model) => model.id && (model.id.includes('gpt') || model.id.includes('o1')))
        .map((model) => ({
          id: model.id,
          displayName: model.friendly_name || model.id,
          provider: 'copilot' as const,
        }))
        .sort((a, b) => b.id.localeCompare(a.id)); // Newer models first

      if (models.length === 0) {
        throw new Error('No models found in API response');
      }

      return {
        provider: 'copilot',
        success: true,
        models,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        provider: 'copilot',
        success: false,
        error: `Failed to fetch GitHub Models: ${errorMessage}`,
      };
    }
  }

  /**
   * Fetch Gemini models
   */
  private static async fetchGeminiModels(apiKey: string): Promise<FetchResult> {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }

      const data = (await response.json()) as {
        models?: Array<{
          name: string;
          displayName?: string;
          supportedGenerationMethods?: string[];
        }>;
      };

      if (!data.models || !Array.isArray(data.models)) {
        throw new Error('Invalid API response format');
      }

      // Filter models that support generateContent
      const models = data.models
        .filter(
          (model) =>
            model.name &&
            model.supportedGenerationMethods?.includes('generateContent')
        )
        .map((model) => {
          // Extract model ID from "models/gemini-x-y" format
          const modelId = model.name.replace('models/', '');
          return {
            id: modelId,
            displayName: model.displayName || modelId,
            provider: 'gemini' as const,
          };
        })
        .sort((a, b) => b.id.localeCompare(a.id)); // Newer models first

      if (models.length === 0) {
        throw new Error('No Gemini models with generateContent support found');
      }

      return {
        provider: 'gemini',
        success: true,
        models,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        provider: 'gemini',
        success: false,
        error: `Failed to fetch Gemini models: ${errorMessage}`,
      };
    }
  }
}
