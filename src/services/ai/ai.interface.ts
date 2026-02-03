export interface AISummaryRequest {
  diff: string;
  branchName: string;
  filesChanged: string[];
  stats: {
    insertions: number;
    deletions: number;
  };
  customInstructions?: string;
}

export interface AISummaryResponse {
  title?: string;  // Optional conventional commit title
  summary: string;
  commitMessage: string;
  usage?: {  // Optional token usage data
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

export interface AIService {
  generateSummary(request: AISummaryRequest): Promise<AISummaryResponse>;
  getProviderName(): string;
  getModelName(): string;  // Get the model name being used
}
