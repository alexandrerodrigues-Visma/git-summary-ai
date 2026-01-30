import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { CredentialStorage, ApiProvider } from './credential.interface.js';

function getEnvVarName(provider: ApiProvider): string {
  if (provider === 'claude') return 'CLAUDE_API_KEY';
  if (provider === 'openai') return 'OPENAI_API_KEY';
  if (provider === 'github') return 'GITHUB_TOKEN';
  return 'GITHUB_TOKEN'; // copilot also uses GITHUB_TOKEN
}

export class EnvService implements CredentialStorage {
  private location: 'local' | 'global';

  constructor(location: 'local' | 'global' = 'local') {
    this.location = location;
  }

  private getEnvFilePath(): string {
    if (this.location === 'global') {
      return join(homedir(), '.git-summary-ai', '.env');
    }
    return join(process.cwd(), '.env');
  }

  private getEnvDirPath(): string {
    if (this.location === 'global') {
      return join(homedir(), '.git-summary-ai');
    }
    return process.cwd();
  }

  async isAvailable(): Promise<boolean> {
    // .env file storage is always available
    return true;
  }

  private async readEnvFile(): Promise<Map<string, string>> {
    const envPath = this.getEnvFilePath();
    const envVars = new Map<string, string>();

    if (!existsSync(envPath)) {
      return envVars;
    }

    try {
      const content = await readFile(envPath, 'utf-8');
      const lines = content.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith('#')) {
          continue;
        }

        const equalIndex = trimmed.indexOf('=');
        if (equalIndex > 0) {
          const key = trimmed.slice(0, equalIndex).trim();
          let value = trimmed.slice(equalIndex + 1).trim();

          // Remove surrounding quotes if present
          if ((value.startsWith('"') && value.endsWith('"')) ||
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }

          envVars.set(key, value);
        }
      }
    } catch {
      // File doesn't exist or can't be read
    }

    return envVars;
  }

  private async writeEnvFile(envVars: Map<string, string>): Promise<void> {
    const envPath = this.getEnvFilePath();
    const dirPath = this.getEnvDirPath();

    // Ensure directory exists
    if (!existsSync(dirPath)) {
      await mkdir(dirPath, { recursive: true });
    }

    // Read existing file to preserve comments and order
    let existingContent = '';
    if (existsSync(envPath)) {
      existingContent = await readFile(envPath, 'utf-8');
    }

    const existingLines = existingContent.split('\n');
    const updatedKeys = new Set<string>();
    const newLines: string[] = [];

    // Process existing lines, updating values as needed
    for (const line of existingLines) {
      const trimmed = line.trim();

      // Preserve comments and empty lines
      if (!trimmed || trimmed.startsWith('#')) {
        newLines.push(line);
        continue;
      }

      const equalIndex = trimmed.indexOf('=');
      if (equalIndex > 0) {
        const key = trimmed.slice(0, equalIndex).trim();

        if (envVars.has(key)) {
          // Update existing key
          newLines.push(`${key}=${envVars.get(key)}`);
          updatedKeys.add(key);
        } else {
          // Keep unchanged
          newLines.push(line);
        }
      } else {
        newLines.push(line);
      }
    }

    // Add new keys that weren't in the file
    for (const [key, value] of envVars) {
      if (!updatedKeys.has(key)) {
        newLines.push(`${key}=${value}`);
      }
    }

    // Write back
    let content = newLines.join('\n');
    // Ensure file ends with newline
    if (!content.endsWith('\n')) {
      content += '\n';
    }

    await writeFile(envPath, content, 'utf-8');
  }

  async getKey(provider: ApiProvider): Promise<string | undefined> {
    const envVarName = getEnvVarName(provider);

    // First check process.env
    const envValue = process.env[envVarName];
    if (envValue) {
      return envValue;
    }

    // Then check .env file
    const envVars = await this.readEnvFile();
    const value = envVars.get(envVarName);

    // Return undefined for placeholder values
    if (value && !value.includes('your-') && !value.includes('-here')) {
      return value;
    }

    return undefined;
  }

  async setKey(provider: ApiProvider, key: string): Promise<void> {
    const envVarName = getEnvVarName(provider);
    const envVars = await this.readEnvFile();
    envVars.set(envVarName, key);
    await this.writeEnvFile(envVars);
  }

  async deleteKey(provider: ApiProvider): Promise<void> {
    const envVarName = getEnvVarName(provider);
    const envVars = await this.readEnvFile();

    if (envVars.has(envVarName)) {
      envVars.delete(envVarName);
      await this.writeEnvFile(envVars);
    }
  }

  getStorageType(): string {
    return this.location === 'global' ? 'Global .env file' : 'Local .env file';
  }

  getEnvPath(): string {
    return this.getEnvFilePath();
  }
}
