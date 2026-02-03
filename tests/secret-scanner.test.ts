import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { scanForSecrets, formatSecretWarning } from '../src/services/security/secret-scanner.js';
import { checkSecretsInDiff } from '../src/prompts/summary.prompt.js';

describe('Secret Scanner', () => {
  describe('scanForSecrets', () => {
    it('should detect GitHub personal access tokens (ghp_)', () => {
      const content = 'const token = "ghp_' + '1234567890abcdefghijklmnopqrstuvwxyz";';
      const result = scanForSecrets(content);

      expect(result.hasSecrets).toBe(true);
      expect(result.detectedPatterns).toContain('GitHub Token');
      expect(result.riskLevel).toBe('high');
    });

    it('should detect GitHub OAuth tokens (gho_)', () => {
      const content = 'GITHUB_TOKEN=gho_' + '16C7e42F292c6912E7710c838347Ae178B4a';
      const result = scanForSecrets(content);

      expect(result.hasSecrets).toBe(true);
      expect(result.detectedPatterns).toContain('GitHub Token');
      expect(result.riskLevel).toBe('high');
    });

    it('should detect AWS access keys', () => {
      const content = 'AWS_ACCESS_KEY_ID=AKIA' + 'IOSFODNN7EXAMPLE';
      const result = scanForSecrets(content);

      expect(result.hasSecrets).toBe(true);
      expect(result.detectedPatterns).toContain('AWS Access Key');
      expect(result.riskLevel).toBe('low'); // AWS access key alone is low risk (not high)
    });

    it('should detect AWS secret access keys', () => {
      const content = 'aws_secret_access_key: "wJalrXUtnFEMI/K7MDENG/' + 'bPxRfiCYEXAMPLEKEY"';
      const result = scanForSecrets(content);

      expect(result.hasSecrets).toBe(true);
      expect(result.detectedPatterns).toContain('AWS Secret Key');
      expect(result.riskLevel).toBe('high');
    });

    it('should detect Azure storage account keys', () => {
      const content = 'AZURE_STORAGE_KEY=' + 'dGVzdGtleXdpdGhsb25nYmFzZTY0c3RyaW5naGVyZWZvcnRlc3Rpbmc=';
      const result = scanForSecrets(content);

      expect(result.hasSecrets).toBe(true);
      expect(result.riskLevel).not.toBe('none');
    });

    it('should detect RSA private keys', () => {
      const content = '-----BEGIN RSA ' + 'PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...\n-----END RSA ' + 'PRIVATE KEY-----';
      const result = scanForSecrets(content);

      expect(result.hasSecrets).toBe(true);
      expect(result.detectedPatterns).toContain('Private Key (RSA/PEM)');
      expect(result.riskLevel).toBe('high');
    });

    it('should detect generic private keys', () => {
      const content = '-----BEGIN ' + 'PRIVATE KEY-----\nMIIEvQIBADANBg...\n-----END ' + 'PRIVATE KEY-----';
      const result = scanForSecrets(content);

      expect(result.hasSecrets).toBe(true);
      expect(result.detectedPatterns).toContain('Private Key (RSA/PEM)');
      expect(result.riskLevel).toBe('high');
    });

    it('should detect Slack tokens', () => {
      const content = 'SLACK_' + 'TOKEN=xo' + 'xb-1234567890123-' + '1234567890123-AbCdEfGhIjKlMnOpQrStUvWx';
      const result = scanForSecrets(content);

      expect(result.hasSecrets).toBe(true);
      expect(result.detectedPatterns).toContain('Slack Token');
    });

    it('should detect Stripe API keys', () => {
      const content = 'const stripeKey = "sk_live_' + '51A1234567890abcdefghijk";';
      const result = scanForSecrets(content);

      expect(result.hasSecrets).toBe(true);
      expect(result.detectedPatterns).toContain('Stripe API Key');
    });

    it('should detect database URLs with credentials', () => {
      const content = 'DATABASE_URL=postgresql://user:password@localhost:5432/mydb';
      const result = scanForSecrets(content);

      expect(result.hasSecrets).toBe(true);
      expect(result.detectedPatterns).toContain('Database URL with Credentials');
      expect(result.riskLevel).toBe('high');
    });

    it('should NOT flag common false positives (placeholder values)', () => {
      const content = `
        API_KEY=your_api_key_here
        TOKEN=xxx-yyy-zzz
        SECRET=****
        PASSWORD=********
      `;
      const result = scanForSecrets(content);

      // Should either not detect or have low confidence
      if (result.hasSecrets) {
        expect(result.detectedPatterns).not.toContain('GitHub Token');
        expect(result.detectedPatterns).not.toContain('AWS Access Key');
      }
    });

    it('should NOT flag documentation examples with clear test/example markers', () => {
      const content = `
        // Example: api_key = "test_' + '1234567890abcdefghijklmn"
        // This is just an example, not a real key
      `;
      const result = scanForSecrets(content);

      // May detect generic patterns but should not be high risk
      if (result.hasSecrets) {
        expect(result.riskLevel).not.toBe('high');
      }
    });

    it('should return no secrets for clean code', () => {
      const content = `
        function fetchData() {
          const apiKey = getApiKeyFromEnv();
          return fetch('/api/data', { headers: { 'x-api-key': apiKey } });
        }
      `;
      const result = scanForSecrets(content);

      expect(result.hasSecrets).toBe(false);
      expect(result.detectedPatterns).toHaveLength(0);
      expect(result.riskLevel).toBe('none');
    });

    it('should detect multiple secret types in same content', () => {
      const content = `
        GITHUB_TOKEN=ghp_abcdefghij klmnopqrstuvwxyz123456
        AWS_ACCESS_KEY_ID=AKIA` + `IOSFODNN7EXAMPLE
        DATABASE_URL=mongodb://admin:password123@localhost:27017/db
      `;
      const result = scanForSecrets(content);

      expect(result.hasSecrets).toBe(true);
      expect(result.detectedPatterns.length).toBeGreaterThan(0);
      expect(result.riskLevel).toBe('high'); // Database URL is high risk
    });

    it('should handle empty content', () => {
      const result = scanForSecrets('');

      expect(result.hasSecrets).toBe(false);
      expect(result.detectedPatterns).toHaveLength(0);
      expect(result.riskLevel).toBe('none');
    });
  });

  describe('formatSecretWarning', () => {
    it('should return empty string when no secrets detected', () => {
      const result = { hasSecrets: false, detectedPatterns: [], riskLevel: 'none' as const };
      const warning = formatSecretWarning(result);

      expect(warning).toBe('');
    });

    it('should format warning with high risk emoji for high risk secrets', () => {
      const result = {
        hasSecrets: true,
        detectedPatterns: ['GitHub Token', 'Private Key (RSA/PEM)'],
        riskLevel: 'high' as const,
      };
      const warning = formatSecretWarning(result);

      expect(warning).toContain('🔴');
      expect(warning).toContain('Security Warning');
      expect(warning).toContain('GitHub Token');
      expect(warning).toContain('Private Key (RSA/PEM)');
    });

    it('should format warning with medium risk emoji for medium risk secrets', () => {
      const result = {
        hasSecrets: true,
        detectedPatterns: ['API Key'],
        riskLevel: 'medium' as const,
      };
      const warning = formatSecretWarning(result);

      expect(warning).toContain('⚠️');
      expect(warning).toContain('Security Warning');
      expect(warning).toContain('API Key');
    });

    it('should format warning with low risk emoji for low risk secrets', () => {
      const result = {
        hasSecrets: true,
        detectedPatterns: ['Potentially Encoded Secret'],
        riskLevel: 'low' as const,
      };
      const warning = formatSecretWarning(result);

      expect(warning).toContain('⚠️');
      expect(warning).toContain('Security Warning');
    });
  });

  describe('checkSecretsInDiff', () => {
    let originalEnv: string | undefined;

    beforeEach(() => {
      originalEnv = process.env.SKIP_SECRET_SCAN;
      delete process.env.SKIP_SECRET_SCAN;
    });

    afterEach(() => {
      if (originalEnv !== undefined) {
        process.env.SKIP_SECRET_SCAN = originalEnv;
      } else {
        delete process.env.SKIP_SECRET_SCAN;
      }
    });

    it('should return warning for diff with secrets', () => {
      const diff = `
+++ b/config.ts
+const token = "ghp_` + `1234567890abcdefghijklmnopqrstuvwxyz";
      `;
      const warning = checkSecretsInDiff(diff);

      expect(warning).not.toBe('');
      expect(warning).toContain('Security Warning');
    });

    it('should return empty string for clean diff', () => {
      const diff = `
+++ b/config.ts
+const token = getTokenFromEnv();
      `;
      const warning = checkSecretsInDiff(diff);

      expect(warning).toBe('');
    });

    it('should skip scan when SKIP_SECRET_SCAN is true', () => {
      process.env.SKIP_SECRET_SCAN = 'true';

      const diff = `
+++ b/config.ts
+const token = "ghp_` + `1234567890abcdefghijklmnopqrstuvwxyz";
      `;
      const warning = checkSecretsInDiff(diff);

      expect(warning).toBe('');
    });

    it('should not skip scan when SKIP_SECRET_SCAN is false', () => {
      process.env.SKIP_SECRET_SCAN = 'false';

      const diff = `
+++ b/config.ts
+const token = "ghp_` + `1234567890abcdefghijklmnopqrstuvwxyz";
      `;
      const warning = checkSecretsInDiff(diff);

      expect(warning).not.toBe('');
    });
  });
});
