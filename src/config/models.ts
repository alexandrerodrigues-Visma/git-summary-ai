/**
 * Available AI models for each provider
 */

export const AVAILABLE_MODELS = {
  claude: [
    {
      id: 'claude-sonnet-4-20250514',
      name: 'Claude Sonnet 4 (Latest)',
      description: 'Most capable model, best for complex tasks',
      default: true,
    },
    {
      id: 'claude-3-7-sonnet-20250219',
      name: 'Claude 3.7 Sonnet',
      description: 'Balanced performance and speed',
      default: false,
    },
    {
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet',
      description: 'Previous generation, still highly capable',
      default: false,
    },
    {
      id: 'claude-3-5-haiku-20241022',
      name: 'Claude 3.5 Haiku',
      description: 'Faster responses, lower cost',
      default: false,
    },
  ],
  openai: [
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      description: 'Most capable multimodal model',
      default: true,
    },
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      description: 'Faster and more affordable',
      default: false,
    },
    {
      id: 'gpt-4-turbo',
      name: 'GPT-4 Turbo',
      description: 'Previous generation flagship',
      default: false,
    },
    {
      id: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      description: 'Fast and cost-effective',
      default: false,
    },
  ],
  copilot: [
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      description: 'Default GitHub Models endpoint',
      default: true,
    },
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      description: 'More capable, may have rate limits',
      default: false,
    },
    {
      id: 'o1-preview',
      name: 'O1 Preview',
      description: 'Advanced reasoning model',
      default: false,
    },
    {
      id: 'o1-mini',
      name: 'O1 Mini',
      description: 'Smaller reasoning model',
      default: false,
    },
  ],
} as const;

export type Provider = keyof typeof AVAILABLE_MODELS;

/**
 * Get default model for a provider
 */
export function getDefaultModel(provider: Provider): string {
  const models = AVAILABLE_MODELS[provider];
  const defaultModel = models.find(m => m.default);
  return defaultModel?.id || models[0].id;
}

/**
 * Check if a model is valid for a provider
 */
export function isValidModel(provider: Provider, modelId: string): boolean {
  return AVAILABLE_MODELS[provider].some(m => m.id === modelId);
}

/**
 * Get model display name
 */
export function getModelName(provider: Provider, modelId: string): string {
  const model = AVAILABLE_MODELS[provider].find(m => m.id === modelId);
  return model?.name || modelId;
}
