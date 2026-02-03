import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { Provider } from '../config/schema.js';

export interface UsageRecord {
  id: string;
  timestamp: Date;
  provider: Provider;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  operation: 'summarize' | 'analyze' | 'regenerate';
}

interface StorageData {
  version: string;
  records: UsageRecord[];
}

const CONFIG_DIR = join(homedir(), '.git-summary-ai');
const USAGE_FILE = join(CONFIG_DIR, 'token-usage.json');
const MAX_RECORDS = 10000;

export class UsageStorage {
  private async ensureConfigDir(): Promise<void> {
    try {
      await fs.mkdir(CONFIG_DIR, { recursive: true });
    } catch (_error) {
      // Directory might already exist, ignore error
    }
  }

  async loadRecords(): Promise<UsageRecord[]> {
    try {
      await this.ensureConfigDir();
      const content = await fs.readFile(USAGE_FILE, 'utf-8');
      const data: StorageData = JSON.parse(content);
      
      // Convert timestamp strings back to Date objects
      return data.records.map(record => ({
        ...record,
        timestamp: new Date(record.timestamp),
      }));
    } catch (error) {
      // File doesn't exist or is corrupted - return empty array
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      
      // Handle corrupted file
      console.error('Warning: token-usage.json is corrupted, starting fresh');
      return [];
    }
  }

  async saveRecords(records: UsageRecord[]): Promise<void> {
    try {
      await this.ensureConfigDir();
      
      // Limit to MAX_RECORDS (keep most recent)
      const limitedRecords = records.slice(-MAX_RECORDS);
      
      const data: StorageData = {
        version: '1.0',
        records: limitedRecords,
      };
      
      await fs.writeFile(USAGE_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save token usage:', error);
      // Don't throw - tracking failure shouldn't break the tool
    }
  }

  async appendRecord(record: UsageRecord): Promise<void> {
    const records = await this.loadRecords();
    records.push(record);
    await this.saveRecords(records);
  }

  async clearRecords(): Promise<void> {
    await this.saveRecords([]);
  }

  async getRecordsByDateRange(startDate: Date, endDate: Date): Promise<UsageRecord[]> {
    const records = await this.loadRecords();
    return records.filter(record => {
      const recordDate = new Date(record.timestamp);
      return recordDate >= startDate && recordDate <= endDate;
    });
  }

  async pruneOldRecords(olderThan: Date): Promise<number> {
    const records = await this.loadRecords();
    const filtered = records.filter(record => new Date(record.timestamp) >= olderThan);
    const removedCount = records.length - filtered.length;
    
    if (removedCount > 0) {
      await this.saveRecords(filtered);
    }
    
    return removedCount;
  }

  getStoragePath(): string {
    return USAGE_FILE;
  }
}

// Singleton instance
let instance: UsageStorage | null = null;

export function getUsageStorage(): UsageStorage {
  if (!instance) {
    instance = new UsageStorage();
  }
  return instance;
}
