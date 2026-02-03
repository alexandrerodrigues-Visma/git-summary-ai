import { Command } from 'commander';
import inquirer from 'inquirer';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { loadConfig, getConfiguredProviders, getApiKeyAsync } from '../config/loader.js';
import { getCredentialManager } from '../services/credentials/index.js';
import { logger } from '../utils/logger.js';
import { AVAILABLE_MODELS, type Provider, getAvailableModels } from '../config/models.js';
import type { Config } from '../config/schema.js';
import { DEFAULT_PROMPT_TEMPLATE } from '../prompts/summary.prompt.js';
import { ModelResolverService } from '../services/models/index.js';
import chalk from 'chalk';
import { spawn } from 'child_process';
import { tmpdir } from 'os';
import { existsSync } from 'fs';

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

  config
    .command('set-provider <provider>')
    .description('Set default AI provider (claude, openai, copilot)')
    .action(setDefaultProvider);

  config
    .command('set-model <provider> <model>')
    .description('Set default model for a specific provider')
    .action(setDefaultModel);

  config
    .command('list-models [provider]')
    .description('List available models for a provider (or all providers)')
    .action(listModels);

  config
    .command('refresh-models')
    .description('Refresh cached model lists from provider APIs')
    .option('-p, --provider <provider>', 'Refresh specific provider (claude, openai, copilot, gemini)')
    .option('-f, --force', 'Force refresh even if cache is not expired')
    .option('--clear', 'Clear cache and use static models')
    .action(refreshModels);

  config
    .command('edit-prompt-template')
    .description('Edit custom AI prompt template in your default editor')
    .action(editPromptTemplate);

  config
    .command('show-prompt-template')
    .description('Display current AI prompt template')
    .action(showPromptTemplate);

  config
    .command('reset-prompt-template')
    .description('Reset AI prompt template to default')
    .action(resetPromptTemplate);

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

async function setDefaultProvider(provider: string): Promise<void> {
  // Validate provider
  const validProviders = ['claude', 'openai', 'copilot', 'gemini'];
  if (!validProviders.includes(provider)) {
    logger.error(`Invalid provider: ${provider}`);
    logger.info(`Valid providers: ${validProviders.join(', ')}`);
    process.exit(1);
  }

  // Check if provider is configured
  const configuredProviders = await getConfiguredProviders();
  if (!configuredProviders.includes(provider as Provider)) {
    logger.error(`Provider '${provider}' is not configured.`);
    if (configuredProviders.length > 0) {
      logger.info(`Configured providers: ${configuredProviders.join(', ')}`);
    }
    logger.info(`Run 'git-summary-ai setup' to configure ${provider}.`);
    process.exit(1);
  }

  // Load current config and update provider
  const globalConfigDir = join(homedir(), '.git-summary-ai');
  const configPath = join(globalConfigDir, 'config.json');

  let config: Partial<Config> = {};
  try {
    const content = await readFile(configPath, 'utf-8');
    config = JSON.parse(content);
  } catch {
    // Config doesn't exist yet, will be created
  }

  config.provider = provider as Provider;

  // Ensure directory exists and save
  await mkdir(globalConfigDir, { recursive: true });
  await writeFile(configPath, JSON.stringify(config, null, 2));

  logger.blank();
  logger.success(`Default AI provider set to: ${provider}`);
  logger.blank();
  logger.info('This provider will be used by default for all commands.');
  logger.info('You can override it per-command with the --provider flag.');
  logger.blank();
}

async function setDefaultModel(provider: string, model: string): Promise<void> {
  // Validate provider
  const validProviders = ['claude', 'openai', 'copilot', 'gemini'];
  if (!validProviders.includes(provider)) {
    logger.error(`Invalid provider: ${provider}`);
    logger.info(`Valid providers: ${validProviders.join(', ')}`);
    process.exit(1);
  }

  // Check if provider is configured
  const configuredProviders = await getConfiguredProviders();
  if (!configuredProviders.includes(provider as Provider)) {
    logger.error(`Provider '${provider}' is not configured.`);
    if (configuredProviders.length > 0) {
      logger.info(`Configured providers: ${configuredProviders.join(', ')}`);
    }
    logger.info(`Run 'git-summary-ai setup' to configure ${provider}.`);
    process.exit(1);
  }

  // Validate model for provider (check dynamic first, then static)
  const apiKey = await getApiKeyAsync(provider as Provider);
  const isValid = await ModelResolverService.isValidModel(
    provider as Provider,
    model,
    apiKey || undefined
  );

  if (!isValid) {
    logger.error(`Invalid model '${model}' for provider '${provider}'.`);
    logger.blank();
    logger.info(`Available models for ${provider}:`);
    const dynamicModels = await getAvailableModels(provider as Provider, { apiKey: apiKey || undefined });
    dynamicModels.forEach((m) => {
      const staticModel = AVAILABLE_MODELS[provider as Provider].find((sm) => sm.id === m.id);
      const tag = staticModel?.default ? chalk.green(' (default)') : '';
      logger.detail(m.id, `${m.displayName}${tag}`);
    });
    logger.blank();
    logger.info(`Run 'gitai config list-models ${provider}' to see all available models.`);
    process.exit(1);
  }

  // Load current config and update model for provider
  const globalConfigDir = join(homedir(), '.git-summary-ai');
  const configPath = join(globalConfigDir, 'config.json');

  let config: Partial<Config> = {};
  try {
    const content = await readFile(configPath, 'utf-8');
    config = JSON.parse(content);
  } catch {
    // Config doesn't exist yet, will be created
  }

  // Initialize models object if it doesn't exist
  if (!config.models) {
    config.models = {};
  }

  config.models[provider as Provider] = model;

  // Ensure directory exists and save
  await mkdir(globalConfigDir, { recursive: true });
  await writeFile(configPath, JSON.stringify(config, null, 2));

  logger.blank();
  logger.success(`Default model for ${provider} set to: ${model}`);
  logger.blank();
  logger.info('This model will be used when running commands with this provider.');
  logger.info('You can override it per-command with the --model flag.');
  logger.blank();
}

async function listModels(provider?: string): Promise<void> {
  logger.blank();

  if (provider) {
    // Validate provider
    const validProviders = ['claude', 'openai', 'copilot', 'gemini'];
    if (!validProviders.includes(provider)) {
      logger.error(`Invalid provider: ${provider}`);
      logger.info(`Valid providers: ${validProviders.join(', ')}`);
      process.exit(1);
    }

    // Show models for specific provider
    const providerName =
      provider === 'claude'
        ? 'Claude (Anthropic)'
        : provider === 'openai'
          ? 'OpenAI'
          : provider === 'copilot'
            ? 'GitHub Models'
            : 'Google Gemini';
    logger.box(`Available Models for ${providerName}`);
    logger.blank();

    // Get dynamic models (with fallback to static)
    const models = await getAvailableModels(provider as Provider);
    const staticModels = AVAILABLE_MODELS[provider as Provider];
    const config = await loadConfig();
    const configuredModel = config.models?.[provider as Provider];

    // Show cache status
    const cacheStatus = ModelResolverService.getCacheStatus(provider as Provider);
    if (cacheStatus.isCached && !cacheStatus.isExpired) {
      logger.success(`Source: Cached (refreshed ${cacheStatus.age}) ✓`);
    } else {
      logger.warning(`Source: Static models (cache not available)`);
      logger.info(`To refresh: ${chalk.cyan(`gitai config refresh-models --provider ${provider}`)}`);
    }
    logger.blank();

    models.forEach((m) => {
      const staticModel = staticModels.find((sm) => sm.id === m.id);
      const isDefault = staticModel?.default || false;
      const isConfigured = configuredModel === m.id;

      let status = '';
      if (isConfigured) {
        status = chalk.green(' ✓ Your default');
      } else if (isDefault) {
        status = chalk.yellow(' (recommended)');
      }

      logger.info(chalk.bold(m.id) + status);
      if (staticModel) {
        logger.detail('Name', staticModel.name);
        logger.detail('Description', staticModel.description);
      }
      logger.blank();
    });

    logger.info(`Set default: ${chalk.cyan(`gitai config set-model ${provider} <model-id>`)}`);
  } else {
    // Show all providers
    logger.box('Available Models for All Providers');
    logger.blank();

    const config = await loadConfig();
    const configuredProviders = await getConfiguredProviders();
    const allProviders: Provider[] = ['claude', 'openai', 'copilot', 'gemini'];

    for (const providerKey of allProviders) {
      const staticModels = AVAILABLE_MODELS[providerKey];
      const isConfigured = configuredProviders.includes(providerKey);
      const providerName =
        providerKey === 'claude'
          ? 'Claude (Anthropic)'
          : providerKey === 'openai'
            ? 'OpenAI'
            : providerKey === 'copilot'
              ? 'GitHub Models'
              : 'Google Gemini';
      const configStatus = isConfigured ? chalk.green(' ✓') : chalk.gray(' (not configured)');

      logger.info(chalk.bold.cyan(`${providerName}${configStatus}`));

      const configuredModel = config.models?.[providerKey];
      const cacheStatus = ModelResolverService.getCacheStatus(providerKey);
      if (cacheStatus.isCached && !cacheStatus.isExpired) {
        logger.detail('Cache', `Updated ${cacheStatus.age}`);
      }

      staticModels.forEach((m) => {
        const isDefault = m.default;
        const isUserDefault = configuredModel === m.id;

        let status = '';
        if (isUserDefault) {
          status = chalk.green(' ✓ your default');
        } else if (isDefault) {
          status = chalk.yellow(' (recommended)');
        }

        logger.detail(m.id, `${m.name}${status}`);
      });

      logger.blank();
    }

    logger.info('To see details: ' + chalk.cyan('gitai config list-models <provider>'));
    logger.info('To set default: ' + chalk.cyan('gitai config set-model <provider> <model-id>'));
    logger.info('To refresh cache: ' + chalk.cyan('gitai config refresh-models'));
  }

  logger.blank();
}

async function editPromptTemplate(): Promise<void> {
  const configPath = join(homedir(), '.git-summary-ai', 'config.json');
  const config = await loadConfig();
  
  // Get current template or default
  const currentTemplate = config.promptTemplate || DEFAULT_PROMPT_TEMPLATE;
  
  // Create a temporary file
  const tempFile = join(tmpdir(), `git-summary-ai-template-${Date.now()}.txt`);
  await writeFile(tempFile, currentTemplate);

  logger.blank();
  logger.info(chalk.bold('Editing AI Prompt Template'));
  logger.blank();
  logger.info('Template variables you can use:');
  logger.detail('{diff}', 'The git diff content');
  logger.detail('{context}', 'Branch name, files changed, line stats');
  logger.detail('{customInstructions}', 'Custom refinement instructions');
  logger.blank();
  logger.info('Opening editor...');
  logger.blank();

  // Determine editor to use
  const editor = process.env.EDITOR || process.env.VISUAL || (process.platform === 'win32' ? 'notepad' : 'nano');

  // Open editor
  await new Promise<void>((resolve, reject) => {
    const editorProcess = spawn(editor, [tempFile], { 
      stdio: 'inherit',
      shell: true
    });

    editorProcess.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Editor exited with code ${code}`));
      }
    });

    editorProcess.on('error', reject);
  });

  // Read edited template
  const editedTemplate = await readFile(tempFile, 'utf-8');
  
  // Confirm save
  const { shouldSave } = await inquirer.prompt([{
    type: 'confirm',
    name: 'shouldSave',
    message: 'Save template changes?',
    default: true,
  }]);

  if (!shouldSave) {
    logger.info('Template changes discarded');
    return;
  }

  // Update config
  await mkdir(join(homedir(), '.git-summary-ai'), { recursive: true });
  
  let existingConfig: Partial<Config> = {};
  if (existsSync(configPath)) {
    const content = await readFile(configPath, 'utf-8');
    existingConfig = JSON.parse(content);
  }

  existingConfig.promptTemplate = editedTemplate;
  await writeFile(configPath, JSON.stringify(existingConfig, null, 2));

  logger.blank();
  logger.success('Custom prompt template saved!');
  logger.info('To see your template: ' + chalk.cyan('gitai config show-prompt-template'));
  logger.info('To reset to default: ' + chalk.cyan('gitai config reset-prompt-template'));
  logger.blank();
}

async function showPromptTemplate(): Promise<void> {
  const config = await loadConfig();
  const template = config.promptTemplate || DEFAULT_PROMPT_TEMPLATE;
  const isDefault = !config.promptTemplate;

  logger.blank();
  logger.box(isDefault ? 'Default AI Prompt Template' : 'Custom AI Prompt Template');
  logger.blank();
  
  console.log(template);
  
  logger.blank();
  if (isDefault) {
    logger.info('Using default template. To customize: ' + chalk.cyan('gitai config edit-prompt-template'));
  } else {
    logger.info('To edit: ' + chalk.cyan('gitai config edit-prompt-template'));
    logger.info('To reset to default: ' + chalk.cyan('gitai config reset-prompt-template'));
  }
  logger.blank();
}

async function resetPromptTemplate(): Promise<void> {
  const config = await loadConfig();
  
  if (!config.promptTemplate) {
    logger.info('Already using default template');
    return;
  }

  const { confirm } = await inquirer.prompt([{
    type: 'confirm',
    name: 'confirm',
    message: 'Reset to default prompt template? Your custom template will be removed.',
    default: false,
  }]);

  if (!confirm) {
    logger.info('Operation cancelled');
    return;
  }

  // Update config
  const configPath = join(homedir(), '.git-summary-ai', 'config.json');
  const content = await readFile(configPath, 'utf-8');
  const existingConfig = JSON.parse(content);
  
  delete existingConfig.promptTemplate;
  await writeFile(configPath, JSON.stringify(existingConfig, null, 2));

  logger.blank();
  logger.success('Reset to default prompt template');
  logger.info('To customize again: ' + chalk.cyan('gitai config edit-prompt-template'));
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
      await credentialManager.deleteApiKey(provider as Provider);
      logger.success(`Removed ${provider} credentials`);
    }
  }
}

async function refreshModels(options: { clear?: boolean; provider?: string }): Promise<void> {
  logger.blank();

  // Handle --clear option
  if (options.clear) {
    ModelResolverService.clearAllCaches();
    logger.success('Cleared all model caches');
    logger.info('Models will be fetched fresh on next use');
    logger.blank();
    return;
  }

  // Get providers to refresh
  const allProviders: Provider[] = ['claude', 'openai', 'copilot', 'gemini'];
  let providersToRefresh = allProviders;

  if (options.provider) {
    const validProviders = ['claude', 'openai', 'copilot', 'gemini'];
    if (!validProviders.includes(options.provider)) {
      logger.error(`Invalid provider: ${options.provider}`);
      logger.info(`Valid providers: ${validProviders.join(', ')}`);
      process.exit(1);
    }
    providersToRefresh = [options.provider as Provider];
  }

  logger.info('Refreshing model lists...');
  logger.blank();

  const credentialManager = getCredentialManager();
  let successCount = 0;
  let failureCount = 0;

  for (const provider of providersToRefresh) {
    const apiKey = await credentialManager.getApiKey(provider);

    if (!apiKey) {
      logger.detail(provider, chalk.yellow('⚠ No API key configured'));
      failureCount++;
      continue;
    }

    // Show spinner for refresh
    const spinner = process.stderr.isTTY
      ? require('ora')(`Refreshing ${provider}...`).start()
      : null;

    try {
      const result = await ModelResolverService.refreshModels(provider, apiKey);

      if (result.success) {
        if (spinner) spinner.succeed(`${provider}: ✓ ${result.count} models fetched`);
        else logger.success(`${provider}: ✓ ${result.count} models fetched`);
        successCount++;
      } else {
        if (spinner) spinner.fail(`${provider}: ⚠ ${result.error}`);
        else logger.warning(`${provider}: ⚠ ${result.error}`);
        failureCount++;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (spinner) spinner.fail(`${provider}: ✗ ${errorMessage}`);
      else logger.error(`${provider}: ✗ ${errorMessage}`);
      failureCount++;
    }
  }

  logger.blank();
  const total = successCount + failureCount;
  if (successCount === total) {
    logger.success(`✓ Refreshed all ${total} provider${total > 1 ? 's' : ''}`);
  } else if (successCount > 0) {
    logger.warning(`Refreshed ${successCount} of ${total} providers`);
  } else {
    logger.error(`Failed to refresh any providers`);
  }
  logger.blank();
}
