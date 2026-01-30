/**
 * Secret scanner to detect common sensitive patterns in code diffs
 * Helps prevent accidental exposure of secrets to external AI providers
 */

interface SecretDetectionResult {
  hasSecrets: boolean;
  detectedPatterns: string[];
  riskLevel: 'none' | 'low' | 'medium' | 'high';
}

// Patterns for common secret types - ordered by confidence/specificity
const SECRET_PATTERNS = {
  // API Keys and tokens
  apiKeys: {
    pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*['"]?([a-zA-Z0-9_-]{20,})/gi,
    name: 'API Key',
  },
  awsAccessKey: {
    pattern: /AKIA[0-9A-Z]{16}/g,
    name: 'AWS Access Key',
  },
  awsSecretKey: {
    pattern: /(?:aws_secret_access_key|awsSecretAccessKey)\s*[:=]\s*['"]([a-zA-Z0-9/+=]{40})/gi,
    name: 'AWS Secret Key',
  },
  // Private keys
  privateKey: {
    pattern: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/gi,
    name: 'Private Key (RSA/PEM)',
  },
  // GitHub tokens
  githubToken: {
    pattern: /(?:gh[pousr]{1,2}_[a-zA-Z0-9_]{36,255})/g,
    name: 'GitHub Token',
  },
  // OAuth tokens
  oauthToken: {
    pattern: /(?:oauth|access_token|refresh_token)\s*[:=]\s*['"]?([a-zA-Z0-9._\-]{20,})/gi,
    name: 'OAuth Token',
  },
  // Database URLs and credentials
  databaseUrl: {
    pattern: /(?:mongodb|mysql|postgresql|postgres|redis)(?:\+\w+)?:\/\/[^\s]+/gi,
    name: 'Database URL with Credentials',
  },
  // Passwords in URLs or configs
  passwordPattern: {
    pattern: /(?:password|passwd|pwd)\s*[:=]\s*['"]([^'"]+)['"]/gi,
    name: 'Password in Configuration',
  },
  // Slack tokens
  slackToken: {
    pattern: /xox[baprs]-[0-9A-Za-z\-]{10,}/g,
    name: 'Slack Token',
  },
  // Stripe keys
  stripeKey: {
    pattern: /(?:sk_live|pk_live|sk_test|pk_test)_[a-zA-Z0-9]{20,}/g,
    name: 'Stripe API Key',
  },
  // Generic base64 encoded secrets (longer patterns)
  encodedSecrets: {
    pattern: /(?:secret|key|token|password|credential)\s*[:=]\s*['"]?([a-zA-Z0-9+/]{40,}={0,2})/gi,
    name: 'Potentially Encoded Secret',
  },
};

export function scanForSecrets(content: string): SecretDetectionResult {
  const detectedPatterns: string[] = [];
  let riskLevel: 'none' | 'low' | 'medium' | 'high' = 'none';

  for (const [key, { pattern, name }] of Object.entries(SECRET_PATTERNS)) {
    // Reset lastIndex for global regex
    if (pattern.global) {
      pattern.lastIndex = 0;
    }

    if (pattern.test(content)) {
      // Reset again for multiple tests
      pattern.lastIndex = 0;

      detectedPatterns.push(name);

      // Determine risk level based on pattern type
      if (
        key.includes('privateKey') ||
        key.includes('awsSecret') ||
        key.includes('databaseUrl')
      ) {
        riskLevel = 'high';
      } else if (riskLevel !== 'high' && key.includes('githubToken')) {
        riskLevel = 'high';
      } else if (riskLevel !== 'high' && key.includes('apiKeys')) {
        riskLevel = 'medium';
      } else if (riskLevel === 'none') {
        riskLevel = 'low';
      }
    }
  }

  return {
    hasSecrets: detectedPatterns.length > 0,
    detectedPatterns,
    riskLevel,
  };
}

export function formatSecretWarning(result: SecretDetectionResult): string {
  if (!result.hasSecrets) {
    return '';
  }

  const riskEmoji: Record<SecretDetectionResult['riskLevel'], string> = {
    none: '',
    low: '⚠️',
    medium: '⚠️',
    high: '🔴',
  };

  return `${riskEmoji[result.riskLevel]} Security Warning: Potential secrets detected in diff

Detected patterns: ${result.detectedPatterns.join(', ')}

The following potentially sensitive data patterns were found in your code changes:
- ${result.detectedPatterns.join('\n- ')}

This data will be sent to the AI provider for analysis. Please review:
1. Are these real secrets or false positives?
2. Should these changes be excluded from the summary?
3. Do you trust the AI provider with this data?

To skip secret scanning, set SKIP_SECRET_SCAN=true environment variable.`;
}
