import { KeychainService } from './keychain.service.js';
import { EnvService } from './env.service.js';
import { logger } from '../../utils/logger.js';
import type { ApiProvider, StoragePreference, CredentialStorage } from './credential.interface.js';

export interface CredentialManagerConfig {
  storage: StoragePreference;
  envLocation: 'local' | 'global';
}

export class CredentialManager {
  private keychainService: KeychainService;
  private envService: EnvService;
  private globalEnvService: EnvService;
  private config: CredentialManagerConfig;

  constructor(config: Partial<CredentialManagerConfig> = {}) {
    this.config = {
      storage: config.storage ?? 'auto',
      envLocation: config.envLocation ?? 'local',
    };

    this.keychainService = new KeychainService();
    this.envService = new EnvService('local');
    this.globalEnvService = new EnvService('global');
  }

  async isKeychainAvailable(): Promise<boolean> {
    return this.keychainService.isAvailable();
  }

  async getPreferredStorage(): Promise<CredentialStorage> {
    if (this.config.storage === 'keychain') {
      const available = await this.keychainService.isAvailable();
      if (available) {
        return this.keychainService;
      }
      // Fall back to env if keychain preferred but not available
    }

    if (this.config.storage === 'env') {
      return this.config.envLocation === 'global' ? this.globalEnvService : this.envService;
    }

    // Auto mode: try keychain first, fall back to env
    const keychainAvailable = await this.keychainService.isAvailable();
    if (keychainAvailable) {
      return this.keychainService;
    }

    return this.config.envLocation === 'global' ? this.globalEnvService : this.envService;
  }

  /**
   * Get API key with fallback chain:
   * 1. Environment variables
   * 2. Keychain (if available and preferred)
   * 3. Local .env file
   * 4. Global .env file
   */
  async getApiKey(provider: ApiProvider): Promise<string | undefined> {
    // Check environment variables first (they always take priority)
    const envVarName = provider === 'claude' ? 'CLAUDE_API_KEY' : provider === 'openai' ? 'OPENAI_API_KEY' : 'GITHUB_TOKEN';
    const envAlias = provider === 'claude' ? 'ANTHROPIC_API_KEY' : undefined;

    if (process.env[envVarName]) {
      return process.env[envVarName];
    }
    if (envAlias && process.env[envAlias]) {
      return process.env[envAlias];
    }

    // Check keychain if available
    if (this.config.storage !== 'env') {
      const keychainAvailable = await this.keychainService.isAvailable();
      if (keychainAvailable) {
        const keychainKey = await this.keychainService.getKey(provider);
        if (keychainKey) {
          return keychainKey;
        }
      }
    }

    // Check local .env file
    const localKey = await this.envService.getKey(provider);
    if (localKey) {
      return localKey;
    }

    // Check global .env file
    const globalKey = await this.globalEnvService.getKey(provider);
    if (globalKey) {
      return globalKey;
    }

    return undefined;
  }

  /**
   * Store API key using the preferred storage method
   */
  async setApiKey(provider: ApiProvider, key: string, storage?: StoragePreference): Promise<string> {
    const storagePreference = storage ?? this.config.storage;

    if (storagePreference === 'keychain' || storagePreference === 'auto') {
      const keychainAvailable = await this.keychainService.isAvailable();
      if (keychainAvailable) {
        await this.keychainService.setKey(provider, key);
        return this.keychainService.getStorageType();
      }
    }

    // Fall back to env file
    const envService = this.config.envLocation === 'global' ? this.globalEnvService : this.envService;
    await envService.setKey(provider, key);
    return envService.getStorageType();
  }

  /**
   * Delete API key from all storage locations
   */
  async deleteApiKey(provider: ApiProvider): Promise<void> {
    // Try to delete from keychain
    const keychainAvailable = await this.keychainService.isAvailable();
    if (keychainAvailable) {
      try {
        await this.keychainService.deleteKey(provider);
      } catch (error) {
        logger.debug(`Failed to delete ${provider} key from keychain: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Delete from local .env
    try {
      await this.envService.deleteKey(provider);
    } catch (error) {
      logger.debug(`Failed to delete ${provider} key from local .env: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Delete from global .env
    try {
      await this.globalEnvService.deleteKey(provider);
    } catch (error) {
      logger.debug(`Failed to delete ${provider} key from global .env: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get info about where keys are currently stored
   */
  async getStorageInfo(provider: ApiProvider): Promise<{ location: string; found: boolean }[]> {
    const results: { location: string; found: boolean }[] = [];

    // Check keychain
    const keychainAvailable = await this.keychainService.isAvailable();
    if (keychainAvailable) {
      const keychainKey = await this.keychainService.getKey(provider);
      results.push({ location: 'OS Keychain', found: !!keychainKey });
    }

    // Check local .env
    const localKey = await this.envService.getKey(provider);
    results.push({ location: `Local .env (${this.envService.getEnvPath()})`, found: !!localKey });

    // Check global .env
    const globalKey = await this.globalEnvService.getKey(provider);
    results.push({ location: `Global .env (${this.globalEnvService.getEnvPath()})`, found: !!globalKey });

    // Check environment variable
    const envVarName = provider === 'claude' ? 'CLAUDE_API_KEY' : 'OPENAI_API_KEY';
    results.push({ location: `Environment variable (${envVarName})`, found: !!process.env[envVarName] });

    return results;
  }

  setConfig(config: Partial<CredentialManagerConfig>): void {
    if (config.storage !== undefined) {
      this.config.storage = config.storage;
    }
    if (config.envLocation !== undefined) {
      this.config.envLocation = config.envLocation;
    }
  }
}

// Singleton instance
let credentialManagerInstance: CredentialManager | null = null;

export function getCredentialManager(config?: Partial<CredentialManagerConfig>): CredentialManager {
  if (!credentialManagerInstance) {
    credentialManagerInstance = new CredentialManager(config);
  } else if (config) {
    credentialManagerInstance.setConfig(config);
  }
  return credentialManagerInstance;
}
