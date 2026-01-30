import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { logger } from './logger.js';
import { getCredentialManager } from '../services/credentials/index.js';
import chalk from 'chalk';

export interface SetupStatus {
  isSetupComplete: boolean;
  hasAnyApiKey: boolean;
  hasGlobalConfig: boolean;
  configuredProviders: string[];
}

/**
 * Check if the user has completed the setup wizard
 * Returns detailed status about configuration
 */
export async function checkSetupStatus(): Promise<SetupStatus> {
  const globalConfigPath = join(homedir(), '.git-summary-ai', 'config.json');
  const hasGlobalConfig = existsSync(globalConfigPath);

  // Check for API keys in credential manager
  const credentialManager = getCredentialManager();
  const configuredProviders: string[] = [];

  const claudeKey = await credentialManager.getApiKey('claude');
  const openaiKey = await credentialManager.getApiKey('openai');
  const copilotKey = await credentialManager.getApiKey('copilot');

  if (claudeKey) configuredProviders.push('claude');
  if (openaiKey) configuredProviders.push('openai');
  if (copilotKey) configuredProviders.push('copilot');

  const hasAnyApiKey = configuredProviders.length > 0;

  return {
    isSetupComplete: hasGlobalConfig && hasAnyApiKey,
    hasAnyApiKey,
    hasGlobalConfig,
    configuredProviders,
  };
}

/**
 * Ensure setup is complete, or show helpful guidance
 * Throws an error if setup is not complete (to stop command execution)
 */
export async function ensureSetupComplete(commandName?: string): Promise<void> {
  const status = await checkSetupStatus();

  if (status.isSetupComplete) {
    return; // All good!
  }

  // Setup is not complete - provide helpful guidance
  logger.blank();
  logger.error('Setup Required');
  logger.blank();

  if (!status.hasAnyApiKey) {
    logger.info('No AI provider API keys found.');
    logger.info('You need to configure at least one AI provider to use this tool.');
    logger.blank();
    logger.info('Available providers:');
    logger.detail('•', chalk.bold('Claude (Anthropic)') + ' - Recommended for best results');
    logger.detail('•', chalk.bold('OpenAI (GPT)') + ' - GPT-4o and other OpenAI models');
    logger.detail('•', chalk.bold('GitHub Models') + ' - Free tier available with GitHub account');
    logger.blank();
  }

  if (!status.hasGlobalConfig) {
    logger.info('Global configuration not found.');
    logger.info('The setup wizard will help you configure default settings.');
    logger.blank();
  }

  logger.info(chalk.bold('To get started, run:'));
  logger.detail('', chalk.cyan('git-summary-ai setup'));
  logger.blank();

  if (commandName) {
    logger.info(`Then you can run ${chalk.cyan(`git-summary-ai ${commandName}`)} again.`);
    logger.blank();
  }

  throw new Error('Setup required. Please run: git-summary-ai setup');
}

/**
 * Display a friendly reminder about setup if it's not complete
 * This is a non-blocking version that just warns but doesn't stop execution
 */
export async function warnIfSetupIncomplete(): Promise<void> {
  const status = await checkSetupStatus();

  if (!status.isSetupComplete) {
    logger.blank();
    logger.warning('Configuration may be incomplete');
    logger.info('Run ' + chalk.cyan('git-summary-ai setup') + ' for guided configuration');
    logger.blank();
  }
}
