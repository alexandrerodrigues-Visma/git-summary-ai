import { cosmiconfig } from 'cosmiconfig';
import { configSchema, defaultConfig, type Config } from './schema.js';
import dotenv from 'dotenv';

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
    const result = await explorer.search();

    if (result?.config) {
      const parsed = configSchema.safeParse(result.config);
      if (parsed.success) {
        return { ...defaultConfig, ...parsed.data };
      }
    }

    return defaultConfig;
  } catch {
    return defaultConfig;
  }
}

export function getApiKey(provider: 'claude' | 'openai'): string | undefined {
  if (provider === 'claude') {
    return process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
  }
  return process.env.OPENAI_API_KEY;
}

export function validateApiKey(provider: 'claude' | 'openai'): void {
  const key = getApiKey(provider);
  if (!key) {
    const envVar = provider === 'claude' ? 'CLAUDE_API_KEY' : 'OPENAI_API_KEY';
    throw new Error(
      `Missing API key. Please set ${envVar} environment variable or run 'git-summary-ai config init'`
    );
  }
}
