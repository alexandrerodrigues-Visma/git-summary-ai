import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import type { AIService, AISummaryRequest, AISummaryResponse } from './ai.interface.js';
import { buildSummaryPrompt, parseAIResponse } from '../../prompts/summary.prompt.js';
import { getApiKeyAsync, getPromptTemplate } from '../../config/loader.js';

export class GeminiService implements AIService {
  private client: GoogleGenerativeAI | null = null;
  private model: string;
  private maxTokens: number;
  private apiKey: string | null = null;

  constructor(model?: string, maxTokens: number = 1024) {
    this.model = model || 'gemini-2.0-flash-exp';
    this.maxTokens = maxTokens;
  }

  private async ensureClient(): Promise<GoogleGenerativeAI> {
    if (this.client) {
      return this.client;
    }

    const apiKey = await getApiKeyAsync('gemini');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set. Run `git-summary-ai setup` to configure.');
    }

    this.apiKey = apiKey;
    this.client = new GoogleGenerativeAI(apiKey);
    return this.client;
  }

  static async create(model?: string, maxTokens: number = 1024): Promise<GeminiService> {
    const service = new GeminiService(model, maxTokens);
    await service.ensureClient();
    return service;
  }

  async generateSummary(request: AISummaryRequest): Promise<AISummaryResponse> {
    const client = await this.ensureClient();
    const template = await getPromptTemplate();
    const prompt = buildSummaryPrompt(request, request.customInstructions, template);

    const model = client.getGenerativeModel({
      model: this.model,
      generationConfig: {
        maxOutputTokens: this.maxTokens,
        temperature: 0.7,
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
      ],
    });

    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      const usage = result.response.usageMetadata ? {
        inputTokens: result.response.usageMetadata.promptTokenCount,
        outputTokens: result.response.usageMetadata.candidatesTokenCount,
        totalTokens: result.response.usageMetadata.totalTokenCount,
      } : undefined;

      return {
        ...parseAIResponse(responseText),
        usage,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      // Check for specific error types
      if (message.toLowerCase().includes('api key') || message.toLowerCase().includes('authentication')) {
        throw new Error('Invalid Gemini API key - authentication failed');
      }
      if (message.toLowerCase().includes('quota') || message.toLowerCase().includes('rate limit')) {
        // Rate limit is not a fatal error - the key is valid
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (message.toLowerCase().includes('safety') || message.toLowerCase().includes('blocked')) {
        throw new Error('Request was blocked by safety filters. Please rephrase and try again.');
      }
      if (message.toLowerCase().includes('model') && message.toLowerCase().includes('not found')) {
        throw new Error(`Model '${this.model}' not found or not available`);
      }

      throw error;
    }
  }

  getProviderName(): string {
    return `Gemini (${this.model})`;
  }

  getModelName(): string {
    return this.model;
  }
}
