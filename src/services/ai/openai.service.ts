import OpenAI from 'openai';
import type { AIService, AISummaryRequest, AISummaryResponse } from './ai.interface.js';
import { buildSummaryPrompt, parseAIResponse } from '../../prompts/summary.prompt.js';
import { getApiKey } from '../../config/loader.js';

export class OpenAIService implements AIService {
  private client: OpenAI;
  private model: string;
  private maxTokens: number;

  constructor(model?: string, maxTokens: number = 1024) {
    const apiKey = getApiKey('openai');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }

    this.client = new OpenAI({ apiKey });
    this.model = model || 'gpt-4o';
    this.maxTokens = maxTokens;
  }

  async generateSummary(request: AISummaryRequest): Promise<AISummaryResponse> {
    const prompt = buildSummaryPrompt(request);

    const completion = await this.client.chat.completions.create({
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
