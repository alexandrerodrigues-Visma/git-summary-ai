import { cosmiconfig } from 'cosmiconfig';
import { configSchema, defaultConfig, type Config } from './schema.js';
import { getDefaultModel, type Provider } from './models.js';
import dotenv from 'dotenv';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { getCredentialManager } from '../services/credentials/index.js';

// Load environment variables
dotenv.config();

const explorer = cosmiconfig('git-summary-ai', {
  searchPlaces: [
    'package.json',
    '.git-summary-airc',
    '.git-summary-airc.json',
    '.git-summary-airc.yaml',
    '.git-summary-airc.yml',
    '.git-summary-airc.js',
    '.git-summary-airc.cjs',
    'git-summary-ai.config.js',
    'git-summary-ai.config.cjs',
  ],
});

export async function loadConfig(): Promise<Config> {
  try {
    // First, try to load global config
    const globalConfig = await loadGlobalConfig();
    
    // Then, try to load project-local config (for per-project overrides like targetBranch)
    const result = await explorer.search();

    if (result?.config) {
      const parsed = configSchema.safeParse(result.config);
      if (parsed.success) {
        // Merge: global config < project config
        return { ...defaultConfig, ...globalConfig, ...parsed.data };
      }
    }

    // No project config, use global config or defaults
    return { ...defaultConfig, ...globalConfig };
  } catch {
    return defaultConfig;
  }
}

async function loadGlobalConfig(): Promise<Partial<Config>> {
  try {
    const globalConfigPath = join(homedir(), '.git-summary-ai', 'config.json');
    const content = await readFile(globalConfigPath, 'utf-8');
    const config = JSON.parse(content);
    const parsed = configSchema.partial().safeParse(config);
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}

/**
 * Get API key synchronously from environment variables only.
 * Use getApiKeyAsync for full credential manager support.
 */
export function getApiKey(provider: 'claude' | 'openai' | 'copilot' | 'gemini'): string | undefined {
  if (provider === 'claude') {
    return process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
  }
  if (provider === 'openai') {
    return process.env.OPENAI_API_KEY;
  }
  if (provider === 'gemini') {
    return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  }
  return process.env.GITHUB_TOKEN;
}

/**
 * Get API key asynchronously with full credential manager support.
 * Checks: environment variables -> keychain -> .env files
 */
export async function getApiKeyAsync(provider: 'claude' | 'openai' | 'copilot' | 'gemini'): Promise<string | undefined> {
  const credentialManager = getCredentialManager();
  return credentialManager.getApiKey(provider);
}

export function validateApiKey(provider: 'claude' | 'openai' | 'copilot' | 'gemini'): void {
  const key = getApiKey(provider);
  if (!key) {
    const envVar = provider === 'claude' ? 'CLAUDE_API_KEY' : provider === 'openai' ? 'OPENAI_API_KEY' : provider === 'gemini' ? 'GEMINI_API_KEY' : 'GITHUB_TOKEN';
    throw new Error(
      `Missing API key. Please set ${envVar} environment variable or run 'git-summary-ai setup'`
    );
  }
}

export async function validateApiKeyAsync(provider: 'claude' | 'openai' | 'copilot' | 'gemini'): Promise<void> {
  const key = await getApiKeyAsync(provider);
  if (!key) {
    const envVar = provider === 'claude' ? 'CLAUDE_API_KEY' : provider === 'openai' ? 'OPENAI_API_KEY' : provider === 'gemini' ? 'GEMINI_API_KEY' : 'GITHUB_TOKEN';
    throw new Error(
      `Missing API key. Please set ${envVar} environment variable or run 'git-summary-ai setup'`
    );
  }
}

/**
 * Get all configured AI providers with available API keys
 */
export async function getConfiguredProviders(): Promise<Array<'claude' | 'openai' | 'copilot' | 'gemini'>> {
  const credentialManager = getCredentialManager();
  const providers: Array<'claude' | 'openai' | 'copilot' | 'gemini'> = [];

  for (const provider of ['claude', 'openai', 'copilot', 'gemini'] as const) {
    const key = await credentialManager.getApiKey(provider);
    if (key) {
      providers.push(provider);
    }
  }

  return providers;
}

/**
 * Validate and resolve the AI provider to use
 * Checks if provider is configured, falls back to config default if not specified
 */
export async function resolveProvider(requestedProvider?: string): Promise<'claude' | 'openai' | 'copilot' | 'gemini'> {
  const config = await loadConfig();
  const provider = (requestedProvider || config.provider) as 'claude' | 'openai' | 'copilot' | 'gemini';
  
  // Check if the provider has an API key configured
  const key = await getApiKeyAsync(provider);
  if (!key) {
    const configuredProviders = await getConfiguredProviders();
    
    if (configuredProviders.length === 0) {
      throw new Error(
        `No AI providers configured. Please run 'git-summary-ai setup' to configure an AI provider.`
      );
    }
    
    throw new Error(
      `Provider '${provider}' is not configured. Available providers: ${configuredProviders.join(', ')}.\n` +
      `Run 'git-summary-ai setup' to configure ${provider}.`
    );
  }
  
  return provider;
}

/**
 * Get the model to use for a provider
 * Priority: explicit model param > config.models[provider] > config.model (legacy) > default for provider
 */
export async function getModelForProvider(provider: 'claude' | 'openai' | 'copilot' | 'gemini', explicitModel?: string): Promise<string> {
  if (explicitModel) {
    return explicitModel;
  }

  const config = await loadConfig();
  
  // Check provider-specific model configuration
  if (config.models?.[provider]) {
    return config.models[provider]!;
  }
  
  // Fall back to legacy global model config
  if (config.model) {
    return config.model;
  }
  
  // Use provider default
  return getDefaultModel(provider as Provider);
}

/**
 * Get the custom prompt template from config
 * Returns undefined if no custom template is set
 */
export async function getPromptTemplate(): Promise<string | undefined> {
  const config = await loadConfig();
  return config.promptTemplate;
}
