import type { AIService } from './ai.interface.js';
import { ClaudeService } from './claude.service.js';
import { OpenAIService } from './openai.service.js';
import { CopilotService } from './copilot.service.js';
import { GeminiService } from './gemini.service.js';
import type { Config } from '../../config/schema.js';

export async function createAIService(config: Config): Promise<AIService> {
  const { provider, model, maxTokens } = config;

  switch (provider) {
    case 'claude':
      return ClaudeService.create(model, maxTokens);
    case 'openai':
      return OpenAIService.create(model, maxTokens);
    case 'copilot':
      return CopilotService.create(model, maxTokens);
    case 'gemini':
      return GeminiService.create(model, maxTokens);
    default:
      throw new Error(`Unknown AI provider: ${provider}`);
  }
}

export type { AIService, AISummaryRequest, AISummaryResponse } from './ai.interface.js';
export { ClaudeService } from './claude.service.js';
export { OpenAIService } from './openai.service.js';
export { CopilotService } from './copilot.service.js';
export { GeminiService } from './gemini.service.js';
