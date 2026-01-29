import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import chalk from 'chalk';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { logger } from '../utils/logger.js';
import { openApiKeyPage, getApiKeyPageUrl } from '../utils/browser.js';
import { validateApiKey } from '../services/api-key-validator.js';
import { getCredentialManager, type StoragePreference } from '../services/credentials/index.js';
import type { Config } from '../config/schema.js';

type Provider = 'claude' | 'openai' | 'copilot';

const MAX_VALIDATION_ATTEMPTS = 3;

export function createSetupCommand(): Command {
  return new Command('setup')
    .description('Interactive setup wizard for API keys and configuration')
    .action(runSetupWizard);
}

async function runSetupWizard(): Promise<void> {
  console.clear();
  logger.box(`Welcome to git-summary-ai Setup

This wizard will help you:
  1. Configure your AI provider API keys
  2. Choose how to store credentials securely
  3. Set default preferences`);
  logger.blank();

  // Check current configuration status
  const credentialManager = getCredentialManager();
  const claudeKey = await credentialManager.getApiKey('claude');
  const openaiKey = await credentialManager.getApiKey('openai');
  const copilotKey = await credentialManager.getApiKey('copilot');

  // Step 1: Provider selection with status
  const providerChoices = [
    {
      name: `Claude (Anthropic)${claudeKey ? ' ✓ Already configured' : ' - Recommended'}`,
      value: 'claude',
    },
    {
      name: `OpenAI (GPT)${openaiKey ? ' ✓ Already configured' : ''}`,
      value: 'openai',
    },
    {
      name: `GitHub Models${copilotKey ? ' ✓ Already configured' : ''}`,
      value: 'copilot',
    },
    {
      name: 'Skip - Configure later',
      value: 'skip',
    },
  ];

  const { provider } = await inquirer.prompt<{ provider: Provider | 'skip' }>([
    {
      type: 'list',
      name: 'provider',
      message: 'Which AI provider would you like to configure?',
      choices: providerChoices,
    },
  ]);

  let skipProviderConfig = false;
  if (provider === 'skip') {
    skipProviderConfig = true;
    logger.info('Skipping API key configuration.');
    logger.blank();
  }

  let defaultProvider: Provider | undefined;
  let selectedModel: string | undefined;

  // Step 2: Storage preference and provider configuration (only if not skipping)
  if (!skipProviderConfig && provider !== 'skip') {
    const keychainAvailable = await credentialManager.isKeychainAvailable();

    let storagePreference: StoragePreference = 'auto';
    let envLocation: 'local' | 'global' = 'global'; // Default to global

    const storageChoices = [];

    if (keychainAvailable) {
      storageChoices.push({
        name: 'OS Keychain (Recommended - Secure system storage)',
        value: 'keychain',
      });
    }

    storageChoices.push({
      name: 'Environment file (Global ~/.git-summary-ai/.env)',
      value: 'env',
    });

    const { storage } = await inquirer.prompt<{ storage: string }>([
      {
        type: 'list',
        name: 'storage',
        message: 'Where would you like to store your API key?',
        choices: storageChoices,
        default: keychainAvailable ? 'keychain' : 'env',
      },
    ]);

    if (storage === 'keychain') {
      storagePreference = 'keychain';
    } else {
      storagePreference = 'env';
      envLocation = 'global';
    }

    credentialManager.setConfig({ storage: storagePreference, envLocation });

    // Step 3: Configure the selected provider (we know it's not 'skip' here)
    const result = await configureProvider(provider as Provider, credentialManager, storagePreference);
    
    if (!result.success) {
      logger.warning(`Failed to configure ${provider}. You can try again by running: git-summary-ai setup`);
      return;
    }

    defaultProvider = provider as Provider;
    selectedModel = result.model;

    // Step 4: Ask if they want to configure another provider
    const { configureAnother } = await inquirer.prompt<{ configureAnother: boolean }>([
      {
        type: 'confirm',
        name: 'configureAnother',
        message: 'Would you like to configure another provider?',
        default: false,
      },
    ]);

    if (configureAnother) {
      logger.blank();
      return runSetupWizard(); // Restart wizard
    }
  }

  // Step 5: Target branch config (optional)
  logger.blank();
  logger.info('Default Target Branch (Optional)');
  logger.info('This is a fallback used only when:');
  logger.detail('•', 'Your branch has no upstream tracking set');
  logger.detail('•', 'AND you don\'t pass the -t flag');
  logger.info('Most of the time, git tracking branches are used automatically.');
  logger.blank();

  const { configureTargetBranch } = await inquirer.prompt<{ configureTargetBranch: boolean }>([
    {
      type: 'confirm',
      name: 'configureTargetBranch',
      message: 'Would you like to set a default target branch?',
      default: false,
    },
  ]);

  let targetBranch: string | undefined;
  
  if (configureTargetBranch) {
    const answer = await inquirer.prompt<{ targetBranch: string }>([
      {
        type: 'input',
        name: 'targetBranch',
        message: 'Default target branch:',
        default: 'main',
      },
    ]);
    targetBranch = answer.targetBranch;
  }

  // Step 6: Save configuration file globally
  const config: Partial<Config> = {
    ...(defaultProvider && { provider: defaultProvider }),
    ...(targetBranch && { targetBranch }),
    ...(selectedModel && { model: selectedModel }),
  };

  // Save to global config directory
  const globalConfigDir = join(homedir(), '.git-summary-ai');
  const configPath = join(globalConfigDir, 'config.json');
  
  // Ensure directory exists
  await mkdir(globalConfigDir, { recursive: true });
  await writeFile(configPath, JSON.stringify(config, null, 2));

  // Step 7: Summary
  logger.blank();
  
  let summaryText = `Setup Complete!

Global configuration saved to:
  ${configPath}`;

  if (defaultProvider) {
    const providerName = defaultProvider === 'claude' ? 'Claude (Anthropic)' : defaultProvider === 'openai' ? 'OpenAI' : 'GitHub Models';
    summaryText += `

Provider configured:
  ✓ ${providerName}`;

    if (selectedModel) {
      summaryText += `
  Model: ${selectedModel}`;
    }

    summaryText += `

Default provider: ${defaultProvider}`;
  }

  if (targetBranch) {
    summaryText += `
Target branch: ${targetBranch}`;
  }

  logger.box(summaryText);

  logger.blank();
  
  // Check GitHub CLI for PR creation
  const hasGhCli = await checkGitHubCLI();
  const hasGitHubToken = await credentialManager.getApiKey('github');
  
  if (!hasGhCli && !hasGitHubToken) {
    logger.warning('PR Creation Not Configured');
    logger.info('To create pull requests from the CLI, you need:');
    logger.detail('Option 1', 'Install GitHub CLI: gh auth login (recommended)');
    logger.detail('Option 2', 'Configure GitHub token: git-summary-ai config credentials');
    logger.blank();
  } else if (hasGhCli) {
    logger.success('GitHub CLI detected - PR creation is ready!');
    logger.blank();
  } else if (hasGitHubToken) {
    logger.success('GitHub token configured - PR creation is ready!');
    logger.blank();
  }

  logger.info('Next steps:');
  logger.detail('1', 'Run `git-summary-ai analyze` to analyze local changes');
  logger.detail('2', 'Run `git-summary-ai analyze --remote` for remote branch comparison');
  logger.detail('3', 'Run `git-summary-ai run` to execute the full workflow');
  logger.blank();
}

async function configureProvider(
  provider: Provider,
  credentialManager: ReturnType<typeof getCredentialManager>,
  storagePreference: StoragePreference
): Promise<{ success: boolean; model?: string }> {
  const providerName = provider === 'claude' ? 'Claude (Anthropic)' : provider === 'openai' ? 'OpenAI' : 'GitHub Models';
  const apiUrl = getApiKeyPageUrl(provider);

  logger.blank();
  logger.info(`Configuring ${providerName}...`);
  logger.blank();

  const { keySource } = await inquirer.prompt<{ keySource: 'browser' | 'existing' }>([
    {
      type: 'list',
      name: 'keySource',
      message: `How would you like to get your ${providerName} API key?`,
      choices: [
        { name: 'Open browser to get a new key', value: 'browser' },
        { name: 'I already have an API key', value: 'existing' },
      ],
    },
  ]);

  if (keySource === 'browser') {
    logger.info(`Opening ${apiUrl} in your browser...`);
    try {
      await openApiKeyPage(provider);
      logger.success('Browser opened successfully');
    } catch {
      logger.warning(`Could not open browser automatically. Please visit:`);
      logger.detail('URL', apiUrl);
    }

    logger.blank();
    logger.info('Instructions:');
    if (provider === 'claude') {
      logger.detail('1', 'Sign in to your Anthropic account');
      logger.detail('2', 'Click "Create Key" to generate a new API key');
      logger.detail('3', 'Copy the key (starts with sk-ant-)');
    } else if (provider === 'openai') {
      logger.detail('1', 'Sign in to your OpenAI account');
      logger.detail('2', 'Click "Create new secret key"');
      logger.detail('3', 'Copy the key (starts with sk-)');
    } else {
      logger.detail('1', 'Sign in to your GitHub account');
      logger.detail('2', 'Go to Settings > Developer settings > Personal access tokens');
      logger.detail('3', 'Generate a new token (classic or fine-grained)');
      logger.detail('4', 'Copy the token (starts with ghu_, ghp_, or github_pat_)');
    }
    logger.blank();
  }

  // API key input and validation with retry
  for (let attempt = 1; attempt <= MAX_VALIDATION_ATTEMPTS; attempt++) {
    const { apiKey } = await inquirer.prompt<{ apiKey: string }>([
      {
        type: 'password',
        name: 'apiKey',
        message: `Enter your ${providerName} API key:`,
        mask: '*',
        validate: (input: string) => {
          if (!input || input.trim() === '') {
            return 'API key cannot be empty';
          }
          return true;
        },
      },
    ]);

    const trimmedKey = apiKey.trim();

    // Validate the key
    const spinner = ora(`Validating ${providerName} API key...`).start();

    const result = await validateApiKey(provider, trimmedKey);

    if (result.valid) {
      spinner.succeed(`${providerName} API key is valid`);

      // Fetch available models dynamically
      logger.blank();
      const modelSpinner = ora('Fetching available models...').start();
      const modelChoices = await getModelChoices(provider, trimmedKey);
      modelSpinner.succeed('Models loaded');
      
      logger.blank();
      const { model } = await inquirer.prompt<{ model: string }>([
        {
          type: 'list',
          name: 'model',
          message: `Select the model to use with ${providerName}:`,
          choices: modelChoices,
        },
      ]);

      // Store model selection for later use
      const selectedModel = model === 'default' ? undefined : model;

      // Store the key
      const storageSpinner = ora('Storing API key securely...').start();
      try {
        const storedIn = await credentialManager.setApiKey(provider, trimmedKey, storagePreference);
        storageSpinner.succeed(`API key stored in ${storedIn}`);
        
        // Return model selection to be saved in config
        return { success: true, model: selectedModel };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        storageSpinner.fail(`Failed to store API key: ${message}`);
        return { success: false };
      }
    } else {
      spinner.fail(`Validation failed: ${result.error}`);

      if (attempt < MAX_VALIDATION_ATTEMPTS) {
        const { retry } = await inquirer.prompt<{ retry: boolean }>([
          {
            type: 'confirm',
            name: 'retry',
            message: `Would you like to try again? (${MAX_VALIDATION_ATTEMPTS - attempt} attempts remaining)`,
            default: true,
          },
        ]);

        if (!retry) {
          logger.warning(`Skipping ${providerName} configuration`);
          return { success: false };
        }
      } else {
        logger.error(`Maximum validation attempts reached for ${providerName}`);
        return { success: false };
      }
    }
  }

  return { success: false };
}

async function getModelChoices(provider: Provider, apiKey: string): Promise<Array<{ name: string; value: string }>> {
  try {
    switch (provider) {
      case 'claude':
        return await fetchClaudeModels(apiKey);
      case 'openai':
        return await fetchOpenAIModels(apiKey);
      case 'copilot':
        return await fetchGitHubModels(apiKey);
      default:
        return getStaticModelChoices(provider);
    }
  } catch (error) {
    // Fall back to static list on error
    logger.warning('Could not fetch models dynamically, using default list');
    return getStaticModelChoices(provider);
  }
}

async function fetchClaudeModels(apiKey: string): Promise<Array<{ name: string; value: string }>> {
  // Anthropic doesn't expose a models endpoint, use static list
  // But we can test the key and provide curated list
  return getStaticModelChoices('claude');
}

async function fetchOpenAIModels(apiKey: string): Promise<Array<{ name: string; value: string }>> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch models');
    }

    const data = await response.json();
    const models = data.data
      .filter((model: any) => model.id.includes('gpt'))
      .map((model: any) => model.id)
      .sort()
      .reverse(); // Newer models first

    // Add recommended labels to known models
    const choices = models.map((modelId: string) => {
      let name = modelId;
      if (modelId === 'gpt-4o') name = `${modelId} ⭐ Recommended`;
      if (modelId.includes('mini')) name = `${modelId} (Faster, cheaper)`;
      return { name, value: modelId };
    });

    choices.push({ name: 'Use provider default', value: 'default' });
    return choices;
  } catch (error) {
    return getStaticModelChoices('openai');
  }
}

async function fetchGitHubModels(apiKey: string): Promise<Array<{ name: string; value: string }>> {
  try {
    const response = await fetch('https://models.inference.ai.azure.com/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch models');
    }

    const data = await response.json();
    const models = data.data
      .filter((model: any) => model.id.includes('gpt') || model.id.includes('o1'))
      .map((model: any) => ({
        id: model.id,
        name: model.friendly_name || model.id,
      }))
      .sort((a: any, b: any) => b.id.localeCompare(a.id));

    const choices = models.map((model: any) => {
      let displayName = model.name;
      if (model.id === 'gpt-4o') displayName = `${model.name} ⭐ Recommended`;
      if (model.id.includes('mini')) displayName = `${model.name} (Faster)`;
      return { name: displayName, value: model.id };
    });

    choices.push({ name: 'Use provider default', value: 'default' });
    return choices;
  } catch (error) {
    return getStaticModelChoices('copilot');
  }
}

function getStaticModelChoices(provider: Provider): Array<{ name: string; value: string }> {
  switch (provider) {
    case 'claude':
      return [
        { name: 'claude-sonnet-4 (Recommended - Balanced performance)', value: 'claude-sonnet-4' },
        { name: 'claude-opus-4 (Most capable, slower)', value: 'claude-opus-4' },
        { name: 'claude-3-5-sonnet-20241022', value: 'claude-3-5-sonnet-20241022' },
        { name: 'Use provider default', value: 'default' },
      ];
    case 'openai':
      return [
        { name: 'gpt-4o (Recommended - Latest)', value: 'gpt-4o' },
        { name: 'gpt-4o-mini (Faster, cheaper)', value: 'gpt-4o-mini' },
        { name: 'gpt-4-turbo', value: 'gpt-4-turbo' },
        { name: 'Use provider default', value: 'default' },
      ];
    case 'copilot':
      return [
        { name: 'gpt-4o (Recommended - Most capable)', value: 'gpt-4o' },
        { name: 'gpt-4o-mini (Faster, free tier)', value: 'gpt-4o-mini' },
        { name: 'gpt-4', value: 'gpt-4' },
        { name: 'Use provider default', value: 'default' },
      ];
    default:
      return [{ name: 'Use provider default', value: 'default' }];
  }
}

/**
 * Check if GitHub CLI is installed and authenticated
 * Returns true if available, false otherwise
 */
async function checkGitHubCLI(): Promise<boolean> {
  try {
    const { execSync } = await import('child_process');
    const ghToken = execSync('gh auth token', { 
      encoding: 'utf-8', 
      stdio: ['pipe', 'pipe', 'ignore'] 
    }).trim();
    
    return !!(ghToken && ghToken.startsWith('gh'));
  } catch {
    return false;
  }
}
