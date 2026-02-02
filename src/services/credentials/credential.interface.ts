export type ApiProvider = 'claude' | 'openai' | 'copilot' | 'gemini' | 'github';

export interface CredentialStorage {
  /** Get an API key for a provider */
  getKey(provider: ApiProvider): Promise<string | undefined>;

  /** Store an API key for a provider */
  setKey(provider: ApiProvider, key: string): Promise<void>;

  /** Delete an API key for a provider */
  deleteKey(provider: ApiProvider): Promise<void>;

  /** Check if this storage backend is available */
  isAvailable(): Promise<boolean>;

  /** Get the storage type name for display */
  getStorageType(): string;
}

export type StoragePreference = 'keychain' | 'env' | 'auto';

export interface CredentialConfig {
  storage: StoragePreference;
  envLocation: 'local' | 'global';
}
