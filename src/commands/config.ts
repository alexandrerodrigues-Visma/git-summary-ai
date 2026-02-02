import { Command } from 'commander';
import inquirer from 'inquirer';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { loadConfig, getConfiguredProviders } from '../config/loader.js';
import { getCredentialManager } from '../services/credentials/index.js';
import { logger } from '../utils/logger.js';
import { AVAILABLE_MODELS, getDefaultModel, isValidModel, type Provider } from '../config/models.js';
import { DEFAULT_PROMPT_TEMPLATE } from '../prompts/summary.prompt.js';
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
  const validProviders = ['claude', 'openai', 'copilot'];
  if (!validProviders.includes(provider)) {
    logger.error(`Invalid provider: ${provider}`);
    logger.info(`Valid providers: ${validProviders.join(', ')}`);
    process.exit(1);
  }

  // Check if provider is configured
  const configuredProviders = await getConfiguredProviders();
  if (!configuredProviders.includes(provider as 'claude' | 'openai' | 'copilot')) {
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
  
  let config: any = {};
  try {
    const content = await readFile(configPath, 'utf-8');
    config = JSON.parse(content);
  } catch {
    // Config doesn't exist yet, will be created
  }

  config.provider = provider;

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
  const validProviders = ['claude', 'openai', 'copilot'];
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

  // Validate model for provider
  if (!isValidModel(provider as Provider, model)) {
    logger.error(`Invalid model '${model}' for provider '${provider}'.`);
    logger.blank();
    logger.info(`Available models for ${provider}:`);
    const models = AVAILABLE_MODELS[provider as Provider];
    models.forEach(m => {
      const tag = m.default ? chalk.green(' (default)') : '';
      logger.detail(m.id, `${m.name}${tag}`);
    });
    logger.blank();
    logger.info(`Run 'gitai config list-models ${provider}' to see all available models.`);
    process.exit(1);
  }

  // Load current config and update model for provider
  const globalConfigDir = join(homedir(), '.git-summary-ai');
  const configPath = join(globalConfigDir, 'config.json');
  
  let config: any = {};
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

  config.models[provider] = model;

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
    const validProviders = ['claude', 'openai', 'copilot'];
    if (!validProviders.includes(provider)) {
      logger.error(`Invalid provider: ${provider}`);
      logger.info(`Valid providers: ${validProviders.join(', ')}`);
      process.exit(1);
    }

    // Show models for specific provider
    const providerName = provider === 'claude' ? 'Claude (Anthropic)' : provider === 'openai' ? 'OpenAI' : 'GitHub Models';
    logger.box(`Available Models for ${providerName}`);
    logger.blank();

    const models = AVAILABLE_MODELS[provider as Provider];
    const config = await loadConfig();
    const configuredModel = config.models?.[provider as Provider];

    models.forEach(m => {
      const isDefault = m.default;
      const isConfigured = configuredModel === m.id;
      
      let status = '';
      if (isConfigured) {
        status = chalk.green(' ✓ Your default');
      } else if (isDefault) {
        status = chalk.yellow(' (recommended)');
      }

      logger.info(chalk.bold(m.id) + status);
      logger.detail('Name', m.name);
      logger.detail('Description', m.description);
      logger.blank();
    });

    logger.info(`Set default: ${chalk.cyan(`gitai config set-model ${provider} <model-id>`)}`);
  } else {
    // Show all providers
    logger.box('Available Models for All Providers');
    logger.blank();

    const config = await loadConfig();
    const configuredProviders = await getConfiguredProviders();

    for (const [providerKey, models] of Object.entries(AVAILABLE_MODELS)) {
      const isConfigured = configuredProviders.includes(providerKey as Provider);
      const providerName = providerKey === 'claude' ? 'Claude (Anthropic)' : providerKey === 'openai' ? 'OpenAI' : 'GitHub Models';
      const configStatus = isConfigured ? chalk.green(' ✓') : chalk.gray(' (not configured)');
      
      logger.info(chalk.bold.cyan(`${providerName}${configStatus}`));
      
      const configuredModel = config.models?.[providerKey as Provider];
      
      models.forEach(m => {
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
  
  let existingConfig: any = {};
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
      await credentialManager.deleteApiKey(provider as any);
      logger.success(`Removed ${provider} credentials`);
    }
  }
}
