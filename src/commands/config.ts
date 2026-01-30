import { Command } from 'commander';
import inquirer from 'inquirer';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { loadConfig } from '../config/loader.js';
import { getCredentialManager } from '../services/credentials/index.js';
import { logger } from '../utils/logger.js';
import chalk from 'chalk';

export function createConfigCommand(): Command {
  const config = new Command('config').description('Manage configuration');

  config
    .command('init')
    .description('Initialize configuration file')
    .action(initConfig);

  config
    .command('show')
    .description('Show current configuration')
    .action(showConfig);

  config
    .command('credentials')
    .description('Manage stored API credentials')
    .action(manageCredentials);

  return config;
}

async function initConfig(): Promise<void> {
  logger.info('Initialize Configuration');
  logger.blank();

  const { provider, targetBranch } = await inquirer.prompt([
    {
      type: 'list',
      name: 'provider',
      message: 'Select AI provider:',
      choices: ['claude', 'openai', 'copilot'],
      default: 'claude',
    },
    {
      type: 'input',
      name: 'targetBranch',
      message: 'Default target branch:',
      default: 'main',
    },
  ]);

  const configPath = join(process.cwd(), '.git-summary-airc.json');
  await writeFile(
    configPath,
    JSON.stringify({ provider, targetBranch }, null, 2),
  );

  logger.success(`Configuration saved to ${configPath}`);
  logger.blank();
  logger.info('Next step: Run `git-summary-ai setup` to configure API keys');
}

async function showConfig(): Promise<void> {
  const config = await loadConfig();

  logger.blank();
  logger.box('Current Configuration');
  logger.blank();

  logger.detail('Provider', config.provider);
  if (config.model) {
    logger.detail('Model', config.model);
  }
  logger.detail('Max Tokens', config.maxTokens.toString());
  logger.detail('Target Branch', config.targetBranch);
  logger.detail('Language', config.language);

  if (config.excludePatterns && config.excludePatterns.length > 0) {
    logger.detail('Exclude Patterns', config.excludePatterns.join(', '));
  }

  if (config.commitPrefix) {
    logger.detail('Commit Prefix', config.commitPrefix);
  }

  logger.blank();

  // Check API key status
  const credentialManager = getCredentialManager();
  const hasKey = !!(await credentialManager.getApiKey(config.provider));

  logger.info('API Key Status:');
  if (hasKey) {
    logger.detail(config.provider, chalk.green('✓ Configured'));
  } else {
    logger.detail(config.provider, chalk.red('✗ Not configured'));
    logger.blank();
    logger.info('Run: git-summary-ai setup');
  }

  logger.blank();
}

async function manageCredentials(): Promise<void> {
  const credentialManager = getCredentialManager();

  const { action } = await inquirer.prompt<{ action: string }>([
    {
      type: 'list',
      name: 'action',
      message: 'Credential management:',
      choices: [
        { name: 'View stored credentials', value: 'view' },
        { name: 'Remove credentials', value: 'remove' },
        { name: 'Back', value: 'back' },
      ],
    },
  ]);

  if (action === 'back') return;

  if (action === 'view') {
    logger.blank();
    logger.info('Stored API Keys:');

    for (const provider of ['claude', 'openai', 'copilot', 'github'] as const) {
      const key = await credentialManager.getApiKey(provider);
      if (key) {
        const masked = key.substring(0, 8) + '...' + key.substring(key.length - 4);
        logger.detail(provider, masked);
      } else {
        logger.detail(provider, chalk.gray('(not set)'));
      }
    }
    logger.blank();
  } else if (action === 'remove') {
    const { provider } = await inquirer.prompt<{ provider: string }>([
      {
        type: 'list',
        name: 'provider',
        message: 'Remove credentials for:',
        choices: ['claude', 'openai', 'copilot', 'github', 'Cancel'],
      },
    ]);

    if (provider !== 'Cancel') {
      await credentialManager.deleteApiKey(provider as any);
      logger.success(`Removed ${provider} credentials`);
    }
  }
}
