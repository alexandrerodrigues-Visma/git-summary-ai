import Anthropic from '@anthropic-ai/sdk';
import type { AIService, AISummaryRequest, AISummaryResponse } from './ai.interface.js';
import { buildSummaryPrompt, parseAIResponse } from '../../prompts/summary.prompt.js';
import { getApiKey } from '../../config/loader.js';

export class ClaudeService implements AIService {
  private client: Anthropic;
  private model: string;
  private maxTokens: number;

  constructor(model?: string, maxTokens: number = 1024) {
    const apiKey = getApiKey('claude');
    if (!apiKey) {
      throw new Error('CLAUDE_API_KEY environment variable is not set');
    }

    this.client = new Anthropic({ apiKey });
    this.model = model || 'claude-sonnet-4-20250514';
    this.maxTokens = maxTokens;
  }

  async generateSummary(request: AISummaryRequest): Promise<AISummaryResponse> {
    const prompt = buildSummaryPrompt(request);

    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const textContent = message.content.find(c => c.type === 'text');
    const responseText = textContent?.type === 'text' ? textContent.text : '';

    return parseAIResponse(responseText);
  }

  getProviderName(): string {
    return `Claude (${this.model})`;
  }
}
