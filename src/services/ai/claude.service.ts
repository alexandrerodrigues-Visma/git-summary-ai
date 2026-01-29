import Anthropic from '@anthropic-ai/sdk';
import type { AIService, AISummaryRequest, AISummaryResponse } from './ai.interface.js';
import { buildSummaryPrompt, parseAIResponse } from '../../prompts/summary.prompt.js';
import { getApiKeyAsync } from '../../config/loader.js';

export class ClaudeService implements AIService {
  private client: Anthropic | null = null;
  private model: string;
  private maxTokens: number;
  private apiKey: string | null = null;

  constructor(model?: string, maxTokens: number = 1024) {
    this.model = model || 'claude-sonnet-4-20250514';
    this.maxTokens = maxTokens;
  }

  private async ensureClient(): Promise<Anthropic> {
    if (this.client) {
      return this.client;
    }

    const apiKey = await getApiKeyAsync('claude');
    if (!apiKey) {
      throw new Error('CLAUDE_API_KEY is not set. Run `git-summary-ai setup` to configure.');
    }

    this.apiKey = apiKey;
    this.client = new Anthropic({ apiKey });
    return this.client;
  }

  static async create(model?: string, maxTokens: number = 1024): Promise<ClaudeService> {
    const service = new ClaudeService(model, maxTokens);
    await service.ensureClient();
    return service;
  }

  async generateSummary(request: AISummaryRequest): Promise<AISummaryResponse> {
    const client = await this.ensureClient();
    const prompt = buildSummaryPrompt(request);

    const message = await client.messages.create({
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
