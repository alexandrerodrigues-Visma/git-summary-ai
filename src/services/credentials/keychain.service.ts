import type { CredentialStorage, ApiProvider } from './credential.interface.js';

const SERVICE_NAME = 'git-summary-ai';

function getAccountName(provider: ApiProvider): string {
  if (provider === 'claude') return 'CLAUDE_API_KEY';
  if (provider === 'openai') return 'OPENAI_API_KEY';
  if (provider === 'github') return 'GITHUB_TOKEN';
  return 'GITHUB_TOKEN'; // copilot also uses GITHUB_TOKEN
}

export class KeychainService implements CredentialStorage {
  private keytar: typeof import('keytar') | null = null;
  private available: boolean | null = null;

  private async loadKeytar(): Promise<typeof import('keytar') | null> {
    if (this.keytar !== null) {
      return this.keytar;
    }

    try {
      // Dynamic import to handle cases where keytar is not installed
      this.keytar = await import('keytar');
      return this.keytar;
    } catch {
      this.keytar = null;
      return null;
    }
  }

  async isAvailable(): Promise<boolean> {
    if (this.available !== null) {
      return this.available;
    }

    const keytar = await this.loadKeytar();
    if (!keytar) {
      this.available = false;
      return false;
    }

    try {
      // Test if keytar actually works on this system
      await keytar.findCredentials(SERVICE_NAME);
      this.available = true;
      return true;
    } catch {
      this.available = false;
      return false;
    }
  }

  async getKey(provider: ApiProvider): Promise<string | undefined> {
    const keytar = await this.loadKeytar();
    if (!keytar) {
      return undefined;
    }

    try {
      const password = await keytar.getPassword(SERVICE_NAME, getAccountName(provider));
      return password ?? undefined;
    } catch {
      return undefined;
    }
  }

  async setKey(provider: ApiProvider, key: string): Promise<void> {
    const keytar = await this.loadKeytar();
    if (!keytar) {
      throw new Error('Keychain is not available on this system');
    }

    await keytar.setPassword(SERVICE_NAME, getAccountName(provider), key);
  }

  async deleteKey(provider: ApiProvider): Promise<void> {
    const keytar = await this.loadKeytar();
    if (!keytar) {
      throw new Error('Keychain is not available on this system');
    }

    await keytar.deletePassword(SERVICE_NAME, getAccountName(provider));
  }

  getStorageType(): string {
    return 'OS Keychain';
  }
}
