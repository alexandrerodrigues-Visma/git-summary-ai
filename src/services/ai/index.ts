import type { AIService } from './ai.interface.js';
import { ClaudeService } from './claude.service.js';
import { OpenAIService } from './openai.service.js';
import type { Config } from '../../config/schema.js';

export function createAIService(config: Config): AIService {
  const { provider, model, maxTokens } = config;

  switch (provider) {
    case 'claude':
      return new ClaudeService(model, maxTokens);
    case 'openai':
      return new OpenAIService(model, maxTokens);
    default:
      throw new Error(`Unknown AI provider: ${provider}`);
  }
}

export type { AIService, AISummaryRequest, AISummaryResponse } from './ai.interface.js';
export { ClaudeService } from './claude.service.js';
export { OpenAIService } from './openai.service.js';
