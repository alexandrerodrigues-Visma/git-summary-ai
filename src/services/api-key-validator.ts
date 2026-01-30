import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

export type ApiProvider = 'claude' | 'openai' | 'copilot';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateKeyFormat(provider: ApiProvider, key: string): ValidationResult {
  if (!key || key.trim() === '') {
    return { valid: false, error: 'API key cannot be empty' };
  }

  const trimmedKey = key.trim();

  if (provider === 'claude') {
    if (!trimmedKey.startsWith('sk-ant-')) {
      return { valid: false, error: 'Claude API key should start with "sk-ant-"' };
    }
  } else if (provider === 'openai') {
    if (!trimmedKey.startsWith('sk-')) {
      return { valid: false, error: 'OpenAI API key should start with "sk-"' };
    }
  } else if (provider === 'copilot') {
    if (!trimmedKey.startsWith('ghu_') && !trimmedKey.startsWith('ghp_') && !trimmedKey.startsWith('github_pat_')) {
      return { valid: false, error: 'GitHub Token should start with "ghu_", "ghp_", or "github_pat_"' };
    }
  }

  return { valid: true };
}

export async function validateClaudeKey(apiKey: string): Promise<ValidationResult> {
  const formatCheck = validateKeyFormat('claude', apiKey);
  if (!formatCheck.valid) {
    return formatCheck;
  }

  try {
    const client = new Anthropic({ apiKey: apiKey.trim() });

    // Make a minimal API call to validate the key
    await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'Hi' }],
    });

    return { valid: true };
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return { valid: false, error: 'Invalid API key - authentication failed' };
    }
    if (error instanceof Anthropic.PermissionDeniedError) {
      return { valid: false, error: 'API key lacks required permissions' };
    }
    if (error instanceof Anthropic.RateLimitError) {
      // Rate limit means the key is valid but throttled
      return { valid: true };
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    return { valid: false, error: `API validation failed: ${message}` };
  }
}

export async function validateOpenAIKey(apiKey: string): Promise<ValidationResult> {
  const formatCheck = validateKeyFormat('openai', apiKey);
  if (!formatCheck.valid) {
    return formatCheck;
  }

  try {
    const client = new OpenAI({ apiKey: apiKey.trim() });

    // Use the models endpoint - lightweight validation
    await client.models.list();

    return { valid: true };
  } catch (error) {
    if (error instanceof OpenAI.AuthenticationError) {
      return { valid: false, error: 'Invalid API key - authentication failed' };
    }
    if (error instanceof OpenAI.PermissionDeniedError) {
      return { valid: false, error: 'API key lacks required permissions' };
    }
    if (error instanceof OpenAI.RateLimitError) {
      // Rate limit means the key is valid but throttled
      return { valid: true };
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    return { valid: false, error: `API validation failed: ${message}` };
  }
}

export async function validateCopilotKey(apiKey: string): Promise<ValidationResult> {
  const formatCheck = validateKeyFormat('copilot', apiKey);
  if (!formatCheck.valid) {
    return formatCheck;
  }

  try {
    const client = new OpenAI({ 
      apiKey: apiKey.trim(),
      baseURL: 'https://models.inference.ai.azure.com',
      defaultHeaders: {
        'Authorization': `Bearer ${apiKey.trim()}`,
      },
    });

    // Make a minimal test request to validate the token
    await client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'test' }],
    });

    return { valid: true };
  } catch (error) {
    if (error instanceof OpenAI.AuthenticationError) {
      return { valid: false, error: 'Invalid GitHub Token - authentication failed' };
    }
    if (error instanceof OpenAI.PermissionDeniedError) {
      return { valid: false, error: 'GitHub Token lacks required permissions' };
    }
    if (error instanceof OpenAI.RateLimitError) {
      // Rate limit means the key is valid but throttled
      return { valid: true };
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    return { valid: false, error: `API validation failed: ${message}` };
  }
}

export async function validateApiKey(provider: ApiProvider, apiKey: string): Promise<ValidationResult> {
  if (provider === 'claude') {
    return validateClaudeKey(apiKey);
  }
  if (provider === 'copilot') {
    return validateCopilotKey(apiKey);
  }
  return validateOpenAIKey(apiKey);
}
