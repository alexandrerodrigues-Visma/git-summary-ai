import { cosmiconfig } from 'cosmiconfig';
import { configSchema, defaultConfig, type Config } from './schema.js';
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
export function getApiKey(provider: 'claude' | 'openai' | 'copilot'): string | undefined {
  if (provider === 'claude') {
    return process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
  }
  if (provider === 'openai') {
    return process.env.OPENAI_API_KEY;
  }
  return process.env.GITHUB_TOKEN;
}

/**
 * Get API key asynchronously with full credential manager support.
 * Checks: environment variables -> keychain -> .env files
 */
export async function getApiKeyAsync(provider: 'claude' | 'openai' | 'copilot'): Promise<string | undefined> {
  const credentialManager = getCredentialManager();
  return credentialManager.getApiKey(provider);
}

export function validateApiKey(provider: 'claude' | 'openai' | 'copilot'): void {
  const key = getApiKey(provider);
  if (!key) {
    const envVar = provider === 'claude' ? 'CLAUDE_API_KEY' : provider === 'openai' ? 'OPENAI_API_KEY' : 'GITHUB_TOKEN';
    throw new Error(
      `Missing API key. Please set ${envVar} environment variable or run 'git-summary-ai setup'`
    );
  }
}

export async function validateApiKeyAsync(provider: 'claude' | 'openai' | 'copilot'): Promise<void> {
  const key = await getApiKeyAsync(provider);
  if (!key) {
    const envVar = provider === 'claude' ? 'CLAUDE_API_KEY' : provider === 'openai' ? 'OPENAI_API_KEY' : 'GITHUB_TOKEN';
    throw new Error(
      `Missing API key. Please set ${envVar} environment variable or run 'git-summary-ai setup'`
    );
  }
}
