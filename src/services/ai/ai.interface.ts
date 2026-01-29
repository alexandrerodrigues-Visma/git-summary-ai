export interface AISummaryRequest {
  diff: string;
  branchName: string;
  filesChanged: string[];
  stats: {
    insertions: number;
    deletions: number;
  };
}

export interface AISummaryResponse {
  summary: string;
  commitMessage: string;
}

export interface AIService {
  generateSummary(request: AISummaryRequest): Promise<AISummaryResponse>;
  getProviderName(): string;
}
