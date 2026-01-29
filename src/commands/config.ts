import { Command } from 'commander';
import inquirer from 'inquirer';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { logger } from '../utils/logger.js';
import { loadConfig, getApiKey } from '../config/loader.js';
import type { Config } from '../config/schema.js';

export function createConfigCommand(): Command {
  const configCommand = new Command('config')
    .description('Configuration management');

  configCommand
    .command('init')
    .description('Initialize configuration interactively')
    .action(async () => {
      logger.info('Setting up git-summary-ai configuration...');
      logger.blank();

      const answers = await inquirer.prompt([
        {
          type: 'list',
          name: 'provider',
          message: 'Which AI provider would you like to use?',
          choices: [
            { name: 'Claude (Anthropic)', value: 'claude' },
            { name: 'OpenAI (GPT)', value: 'openai' },
          ],
          default: 'claude',
        },
        {
          type: 'input',
          name: 'targetBranch',
          message: 'What is your default target branch for comparisons?',
          default: 'main',
        },
        {
          type: 'confirm',
          name: 'createEnvFile',
          message: 'Would you like to create a .env file for API keys?',
          default: true,
        },
      ]);

      // Create config file
      const config: Partial<Config> = {
        provider: answers.provider,
        targetBranch: answers.targetBranch,
      };

      const configPath = join(process.cwd(), '.git-summary-airc.json');
      await writeFile(configPath, JSON.stringify(config, null, 2));
      logger.success(`Created configuration file: ${configPath}`);

      // Create .env file if requested
      if (answers.createEnvFile) {
        const envContent = `# git-summary-ai API Keys
CLAUDE_API_KEY=your-claude-api-key-here
OPENAI_API_KEY=your-openai-api-key-here
`;
        const envPath = join(process.cwd(), '.env');
        await writeFile(envPath, envContent);
        logger.success(`Created .env file: ${envPath}`);
        logger.warning('Remember to add .env to your .gitignore!');
      }

      logger.blank();
      logger.info('Configuration complete! Next steps:');
      logger.detail('1', `Set your ${answers.provider === 'claude' ? 'CLAUDE_API_KEY' : 'OPENAI_API_KEY'} in .env`);
      logger.detail('2', 'Run `git-summary-ai analyze` to test');
    });

  configCommand
    .command('show')
    .description('Show current configuration')
    .action(async () => {
      const config = await loadConfig();

      logger.info('Current configuration:');
      logger.blank();
      logger.detail('Provider', config.provider);
      logger.detail('Model', config.model || '(default)');
      logger.detail('Max Tokens', String(config.maxTokens));
      logger.detail('Target Branch', config.targetBranch);
      logger.detail('Language', config.language);

      if (config.excludePatterns.length > 0) {
        logger.detail('Exclude Patterns', config.excludePatterns.join(', '));
      }

      logger.blank();
      logger.info('API Key Status:');
      logger.detail('Claude', getApiKey('claude') ? 'Set' : 'Not set');
      logger.detail('OpenAI', getApiKey('openai') ? 'Set' : 'Not set');
    });

  return configCommand;
}
