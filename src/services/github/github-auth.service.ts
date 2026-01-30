import { Octokit } from '@octokit/rest';
import open from 'open';
import ora from 'ora';
import { logger } from '../../utils/logger.js';

export interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

export interface GitHubAuthResult {
  token: string;
  user: {
    login: string;
    name: string | null;
    email: string | null;
  };
}

export class GitHubAuthService {
  private clientId: string;
  private octokit: Octokit;

  constructor() {
    // Using GitHub CLI's client ID for device flow (public, safe to use)
    this.clientId = '178c6fc778ccc68e1d6a';
    this.octokit = new Octokit();
  }

  /**
   * Authenticate user via GitHub OAuth Device Flow
   */
  async authenticateDeviceFlow(): Promise<GitHubAuthResult> {
    logger.info('Starting GitHub authentication...');
    logger.blank();

    // Step 1: Request device code
    const deviceCodeResponse = await this.requestDeviceCode();

    // Step 2: Show user code and open browser
    logger.box(`GitHub Authentication

Please visit: ${deviceCodeResponse.verification_uri}
And enter code: ${deviceCodeResponse.user_code}

Opening browser automatically...`);

    try {
      await open(deviceCodeResponse.verification_uri);
    } catch {
      logger.warning('Could not open browser automatically');
    }

    logger.blank();

    // Step 3: Poll for token
    const token = await this.pollForToken(deviceCodeResponse);

    // Step 4: Get user info
    const userOctokit = new Octokit({ auth: token });
    const { data: user } = await userOctokit.users.getAuthenticated();

    return {
      token,
      user: {
        login: user.login,
        name: user.name,
        email: user.email,
      },
    };
  }

  private async requestDeviceCode(): Promise<DeviceCodeResponse> {
    const response = await fetch('https://github.com/login/device/code', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.clientId,
        scope: 'repo read:user',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to request device code from GitHub');
    }

    return response.json();
  }

  private async pollForToken(deviceCode: DeviceCodeResponse): Promise<string> {
    const spinner = ora('Waiting for authentication...').start();
    const startTime = Date.now();
    const expiresAt = startTime + deviceCode.expires_in * 1000;

    while (Date.now() < expiresAt) {
      await this.sleep(deviceCode.interval * 1000);

      try {
        const response = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            client_id: this.clientId,
            device_code: deviceCode.device_code,
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
          }),
        });

        const data = await response.json();

        if (data.access_token) {
          spinner.succeed('Successfully authenticated with GitHub!');
          return data.access_token;
        }

        if (data.error === 'authorization_pending') {
          // Still waiting, continue polling
          continue;
        }

        if (data.error === 'slow_down') {
          // Increase polling interval
          await this.sleep(5000);
          continue;
        }

        if (data.error === 'expired_token') {
          spinner.fail('Authentication expired');
          throw new Error('Device code expired. Please try again.');
        }

        if (data.error === 'access_denied') {
          spinner.fail('Authentication denied');
          throw new Error('User denied authorization');
        }

        spinner.fail('Authentication failed');
        throw new Error(`Authentication error: ${data.error}`);
      } catch (error) {
        if (error instanceof Error && error.message.includes('expired')) {
          throw error;
        }
        // Continue polling on network errors
      }
    }

    spinner.fail('Authentication timed out');
    throw new Error('Authentication timed out. Please try again.');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate a GitHub token
   */
  async validateToken(token: string): Promise<boolean> {
    try {
      const octokit = new Octokit({ auth: token });
      await octokit.users.getAuthenticated();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get user info from token
   */
  async getUserInfo(token: string): Promise<GitHubAuthResult['user']> {
    const octokit = new Octokit({ auth: token });
    const { data: user } = await octokit.users.getAuthenticated();
    return {
      login: user.login,
      name: user.name,
      email: user.email,
    };
  }
}
