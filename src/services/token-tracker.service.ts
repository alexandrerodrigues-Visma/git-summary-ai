import { randomUUID } from 'crypto';
import { getUsageStorage, type UsageRecord } from './usage-storage.service.js';
import type { Provider } from '../config/schema.js';

export interface TokenSummary {
  totalTokens: number;
  totalInput: number;
  totalOutput: number;
  requestCount: number;
  byProvider: Record<string, {
    tokens: number;
    requests: number;
    inputTokens: number;
    outputTokens: number;
  }>;
  byModel: Record<string, {
    tokens: number;
    requests: number;
  }>;
  periodStart: Date;
  periodEnd: Date;
}

export class TokenTracker {
  private storage = getUsageStorage();

  async recordUsage(data: {
    provider: Provider;
    model: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    operation: 'summarize' | 'analyze' | 'regenerate';
  }): Promise<void> {
    const record: UsageRecord = {
      id: randomUUID(),
      timestamp: new Date(),
      provider: data.provider,
      model: data.model,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      totalTokens: data.totalTokens,
      operation: data.operation,
    };

    await this.storage.appendRecord(record);
  }

  async getSummary(startDate?: Date, endDate?: Date): Promise<TokenSummary> {
    let records: UsageRecord[];

    if (startDate && endDate) {
      records = await this.storage.getRecordsByDateRange(startDate, endDate);
    } else {
      records = await this.storage.loadRecords();
    }

    const summary: TokenSummary = {
      totalTokens: 0,
      totalInput: 0,
      totalOutput: 0,
      requestCount: records.length,
      byProvider: {},
      byModel: {},
      periodStart: startDate || (records[0]?.timestamp || new Date()),
      periodEnd: endDate || (records[records.length - 1]?.timestamp || new Date()),
    };

    for (const record of records) {
      // Total tokens
      summary.totalTokens += record.totalTokens;
      summary.totalInput += record.inputTokens;
      summary.totalOutput += record.outputTokens;

      // By provider
      if (!summary.byProvider[record.provider]) {
        summary.byProvider[record.provider] = {
          tokens: 0,
          requests: 0,
          inputTokens: 0,
          outputTokens: 0,
        };
      }
      summary.byProvider[record.provider].tokens += record.totalTokens;
      summary.byProvider[record.provider].inputTokens += record.inputTokens;
      summary.byProvider[record.provider].outputTokens += record.outputTokens;
      summary.byProvider[record.provider].requests += 1;

      // By model
      if (!summary.byModel[record.model]) {
        summary.byModel[record.model] = {
          tokens: 0,
          requests: 0,
        };
      }
      summary.byModel[record.model].tokens += record.totalTokens;
      summary.byModel[record.model].requests += 1;
    }

    return summary;
  }

  async getAllRecords(): Promise<UsageRecord[]> {
    return this.storage.loadRecords();
  }

  async pruneOldRecords(olderThan: Date): Promise<number> {
    return this.storage.pruneOldRecords(olderThan);
  }

  async clearHistory(): Promise<void> {
    await this.storage.clearRecords();
  }

  async exportToJSON(filePath: string): Promise<void> {
    const fs = await import('fs/promises');
    const records = await this.getAllRecords();
    
    const exportData = {
      exportDate: new Date().toISOString(),
      recordCount: records.length,
      records: records,
    };

    await fs.writeFile(filePath, JSON.stringify(exportData, null, 2), 'utf-8');
  }

  getStoragePath(): string {
    return this.storage.getStoragePath();
  }
}

// Singleton instance
let instance: TokenTracker | null = null;

export function getTokenTracker(): TokenTracker {
  if (!instance) {
    instance = new TokenTracker();
  }
  return instance;
}
