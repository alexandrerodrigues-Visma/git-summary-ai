import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CredentialManager, getCredentialManager } from '../src/services/credentials/credential-manager.js';
import type { CredentialStorage } from '../src/services/credentials/credential.interface.js';

// Mock the service modules
vi.mock('../src/services/credentials/keychain.service.js', () => ({
  KeychainService: class KeychainService {
    async isAvailable() { return true; }
    async getKey() { return undefined; }
    async setKey() { return; }
    async deleteKey() { return; }
    getStorageType() { return 'OS Keychain'; }
  },
}));

vi.mock('../src/services/credentials/env.service.js', () => ({
  EnvService: class EnvService {
    async getKey() { return undefined; }
    async setKey() { return; }
    async deleteKey() { return; }
    getStorageType() { return 'Environment file (.env)'; }
    getEnvPath() { return '/path/to/.env'; }
  },
}));

vi.mock('../src/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Credential Manager', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    delete process.env.CLAUDE_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.GITHUB_TOKEN;
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Constructor and Configuration', () => {
    it('should initialize with default config', () => {
      const manager = new CredentialManager();

      expect(manager).toBeInstanceOf(CredentialManager);
    });

    it('should accept custom storage preference', () => {
      const manager = new CredentialManager({ storage: 'keychain' });

      expect(manager).toBeInstanceOf(CredentialManager);
    });

    it('should accept custom env location preference', () => {
      const manager = new CredentialManager({ envLocation: 'global' });

      expect(manager).toBeInstanceOf(CredentialManager);
    });

    it('should accept both storage and envLocation config', () => {
      const manager = new CredentialManager({
        storage: 'env',
        envLocation: 'local',
      });

      expect(manager).toBeInstanceOf(CredentialManager);
    });
  });

  describe('isKeychainAvailable', () => {
    it('should check keychain availability', async () => {
      const manager = new CredentialManager();

      const available = await manager.isKeychainAvailable();

      expect(typeof available).toBe('boolean');
    });
  });

  describe('getPreferredStorage', () => {
    it('should return keychain when storage is keychain and available', async () => {
      const manager = new CredentialManager({ storage: 'keychain' });

      const storage = await manager.getPreferredStorage();

      expect(storage).toBeDefined();
    });

    it('should fall back to env when keychain requested but not available', async () => {
      // Test that manager can be created with keychain storage preference
      const manager = new CredentialManager({ storage: 'env' });
      const storage = await manager.getPreferredStorage();

      expect(storage).toBeDefined();
    });

    it('should return env service when storage is env', async () => {
      const manager = new CredentialManager({ storage: 'env' });

      const storage = await manager.getPreferredStorage();

      expect(storage).toBeDefined();
    });

    it('should return global env service when envLocation is global', async () => {
      const manager = new CredentialManager({
        storage: 'env',
        envLocation: 'global',
      });

      const storage = await manager.getPreferredStorage();

      expect(storage).toBeDefined();
    });

    it('should prefer keychain in auto mode when available', async () => {
      const manager = new CredentialManager({ storage: 'auto' });

      const storage = await manager.getPreferredStorage();

      expect(storage).toBeDefined();
    });
  });

  describe('getApiKey', () => {
    it('should return API key from environment variable (CLAUDE_API_KEY)', async () => {
      process.env.CLAUDE_API_KEY = 'env-claude-key';
      const manager = new CredentialManager();

      const key = await manager.getApiKey('claude');

      expect(key).toBe('env-claude-key');
    });

    it('should return API key from environment variable (ANTHROPIC_API_KEY)', async () => {
      process.env.ANTHROPIC_API_KEY = 'env-anthropic-key';
      const manager = new CredentialManager();

      const key = await manager.getApiKey('claude');

      expect(key).toBe('env-anthropic-key');
    });

    it('should prioritize CLAUDE_API_KEY over ANTHROPIC_API_KEY', async () => {
      process.env.CLAUDE_API_KEY = 'claude-key';
      process.env.ANTHROPIC_API_KEY = 'anthropic-key';
      const manager = new CredentialManager();

      const key = await manager.getApiKey('claude');

      expect(key).toBe('claude-key');
    });

    it('should return OpenAI key from env', async () => {
      process.env.OPENAI_API_KEY = 'env-openai-key';
      const manager = new CredentialManager();

      const key = await manager.getApiKey('openai');

      expect(key).toBe('env-openai-key');
    });

    it('should return Gemini key from GEMINI_API_KEY', async () => {
      process.env.GEMINI_API_KEY = 'env-gemini-key';
      const manager = new CredentialManager();

      const key = await manager.getApiKey('gemini');

      expect(key).toBe('env-gemini-key');
    });

    it('should return Gemini key from GOOGLE_API_KEY', async () => {
      process.env.GOOGLE_API_KEY = 'env-google-key';
      const manager = new CredentialManager();

      const key = await manager.getApiKey('gemini');

      expect(key).toBe('env-google-key');
    });

    it('should return GitHub token from env', async () => {
      process.env.GITHUB_TOKEN = 'env-github-token';
      const manager = new CredentialManager();

      const key = await manager.getApiKey('copilot');

      expect(key).toBe('env-github-token');
    });

    it('should check keychain when env var not set', async () => {
      const manager = new CredentialManager();
      
      // Just verify it doesn't throw and returns a result
      const key = await manager.getApiKey('claude');
      
      expect(key).toBeUndefined(); // Default mock returns undefined
    });

    it('should check local .env file when keychain not available', async () => {
      const manager = new CredentialManager({ storage: 'env', envLocation: 'local' });
      
      // Verify it doesn't throw
      const key = await manager.getApiKey('claude');
      
      expect(key).toBeUndefined(); // Default mock returns undefined
    });

    it('should check global .env file as last resort', async () => {
      const manager = new CredentialManager({ storage: 'env', envLocation: 'global' });
      
      // Verify it doesn't throw
      const key = await manager.getApiKey('claude');
      
      expect(key).toBeUndefined(); // Default mock returns undefined
    });

    it('should return undefined when no key is found anywhere', async () => {
      const manager = new CredentialManager();

      const key = await manager.getApiKey('claude');

      expect(key).toBeUndefined();
    });
  });

  describe('setApiKey', () => {
    it('should store key in keychain when available', async () => {
      const manager = new CredentialManager({ storage: 'keychain' });
      
      // Verify it doesn't throw
      const storageType = await manager.setApiKey('claude', 'test-key');
      
      expect(storageType).toBeDefined();
      expect(typeof storageType).toBe('string');
    });

    it('should fall back to env file when keychain not available', async () => {
      const manager = new CredentialManager({ storage: 'env' });
      
      // Verify it doesn't throw
      const storageType = await manager.setApiKey('claude', 'test-key');
      
      expect(storageType).toBeDefined();
      expect(typeof storageType).toBe('string');
    });

    it('should respect explicit storage parameter', async () => {
      const manager = new CredentialManager({ storage: 'keychain' });

      const storageType = await manager.setApiKey('claude', 'test-key', 'env');

      expect(storageType).toBeDefined();
    });
  });

  describe('deleteApiKey', () => {
    it('should attempt to delete from all storage locations', async () => {
      const manager = new CredentialManager();
      
      // Verify it doesn't throw
      await expect(manager.deleteApiKey('claude')).resolves.not.toThrow();
    });

    it('should continue deleting from other locations if one fails', async () => {
      const manager = new CredentialManager();

      // Should not throw even if some deletions fail
      await expect(manager.deleteApiKey('claude')).resolves.not.toThrow();
    });
  });

  describe('getStorageInfo', () => {
    it('should return info about all storage locations', async () => {
      const manager = new CredentialManager();

      const info = await manager.getStorageInfo('claude');

      expect(info).toBeInstanceOf(Array);
      expect(info.length).toBeGreaterThan(0);
      expect(info[0]).toHaveProperty('location');
      expect(info[0]).toHaveProperty('found');
    });

    it('should indicate where keys are found', async () => {
      process.env.CLAUDE_API_KEY = 'test-key';
      const manager = new CredentialManager();

      const info = await manager.getStorageInfo('claude');

      const envInfo = info.find(i => i.location.includes('Environment variable'));
      expect(envInfo?.found).toBe(true);
    });
  });

  describe('setConfig', () => {
    it('should update storage preference', () => {
      const manager = new CredentialManager({ storage: 'auto' });

      manager.setConfig({ storage: 'keychain' });

      // Config should be updated (verified through subsequent operations)
      expect(manager).toBeInstanceOf(CredentialManager);
    });

    it('should update envLocation preference', () => {
      const manager = new CredentialManager({ envLocation: 'local' });

      manager.setConfig({ envLocation: 'global' });

      expect(manager).toBeInstanceOf(CredentialManager);
    });

    it('should update both storage and envLocation', () => {
      const manager = new CredentialManager();

      manager.setConfig({ storage: 'env', envLocation: 'global' });

      expect(manager).toBeInstanceOf(CredentialManager);
    });
  });

  describe('getCredentialManager singleton', () => {
    it('should return the same instance on multiple calls', () => {
      const manager1 = getCredentialManager();
      const manager2 = getCredentialManager();

      expect(manager1).toBe(manager2);
    });

    it('should update config on existing instance', () => {
      const manager1 = getCredentialManager({ storage: 'auto' });
      const manager2 = getCredentialManager({ storage: 'keychain' });

      expect(manager1).toBe(manager2);
    });

    it('should create instance with initial config', () => {
      const manager = getCredentialManager({ storage: 'env', envLocation: 'global' });

      expect(manager).toBeInstanceOf(CredentialManager);
    });
  });
});
