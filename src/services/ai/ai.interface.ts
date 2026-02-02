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
}

export interface AIService {
  generateSummary(request: AISummaryRequest): Promise<AISummaryResponse>;
  getProviderName(): string;
}
