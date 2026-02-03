import OpenAI from 'openai';
import type { AIService, AISummaryRequest, AISummaryResponse } from './ai.interface.js';
import { buildSummaryPrompt, parseAIResponse } from '../../prompts/summary.prompt.js';
import { getApiKeyAsync } from '../../config/loader.js';

export class OpenAIService implements AIService {
  private client: OpenAI | null = null;
  private model: string;
  private maxTokens: number;
  private apiKey: string | null = null;

  constructor(model?: string, maxTokens: number = 1024) {
    this.model = model || 'gpt-4o';
    this.maxTokens = maxTokens;
  }

  private async ensureClient(): Promise<OpenAI> {
    if (this.client) {
      return this.client;
    }

    const apiKey = await getApiKeyAsync('openai');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set. Run `git-summary-ai setup` to configure.');
    }

    this.apiKey = apiKey;
    this.client = new OpenAI({ apiKey });
    return this.client;
  }

  static async create(model?: string, maxTokens: number = 1024): Promise<OpenAIService> {
    const service = new OpenAIService(model, maxTokens);
    await service.ensureClient();
    return service;
  }

  async generateSummary(request: AISummaryRequest): Promise<AISummaryResponse> {
    const client = await this.ensureClient();
    const prompt = buildSummaryPrompt(request, request.customInstructions);

    const completion = await client.chat.completions.create({
      model: this.model,
      max_tokens: this.maxTokens,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const responseText = completion.choices[0]?.message?.content || '';

    return parseAIResponse(responseText);
  }

  getProviderName(): string {
    return `OpenAI (${this.model})`;
  }
}
