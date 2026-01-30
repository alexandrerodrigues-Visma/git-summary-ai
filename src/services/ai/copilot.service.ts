import OpenAI from 'openai';
import type { AIService, AISummaryRequest, AISummaryResponse } from './ai.interface.js';
import { buildSummaryPrompt, parseAIResponse } from '../../prompts/summary.prompt.js';
import { getApiKeyAsync } from '../../config/loader.js';

export class CopilotService implements AIService {
  private client: OpenAI | null = null;
  private model: string;
  private maxTokens: number;
  private apiKey: string | null = null;

  constructor(model?: string, maxTokens: number = 1024) {
    // GitHub Models supports various models - use gpt-4o-mini as default for better availability
    this.model = model || 'gpt-4o-mini';
    this.maxTokens = maxTokens;
  }

  private async ensureClient(): Promise<OpenAI> {
    if (this.client) {
      return this.client;
    }

    const apiKey = await getApiKeyAsync('copilot');
    if (!apiKey) {
      throw new Error('GITHUB_TOKEN is not set. Run `git-summary-ai setup` to configure.');
    }

    this.apiKey = apiKey;
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://models.inference.ai.azure.com',
      defaultHeaders: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    return this.client;
  }

  static async create(model?: string, maxTokens: number = 1024): Promise<CopilotService> {
    const service = new CopilotService(model, maxTokens);
    await service.ensureClient();
    return service;
  }

  async generateSummary(request: AISummaryRequest): Promise<AISummaryResponse> {
    const client = await this.ensureClient();
    const prompt = buildSummaryPrompt(request);

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
    return `GitHub Models (${this.model})`;
  }
}
