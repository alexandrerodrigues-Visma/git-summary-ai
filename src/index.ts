import { Command } from 'commander';
import { createAnalyzeCommand } from './commands/analyze.js';
import { createSummarizeCommand } from './commands/summarize.js';
import { createCommitCommand } from './commands/commit.js';
import { createPushCommand } from './commands/push.js';
import { createRunCommand } from './commands/run.js';
import { createConfigCommand } from './commands/config.js';
import { logger } from './utils/logger.js';

const program = new Command();

program
  .name('git-summary-ai')
  .description('A CLI tool that pushes code with AI-generated commit summaries to help team code reviews')
  .version('1.0.0');

// Register commands
program.addCommand(createAnalyzeCommand());
program.addCommand(createSummarizeCommand());
program.addCommand(createCommitCommand());
program.addCommand(createPushCommand());
program.addCommand(createRunCommand());
program.addCommand(createConfigCommand());

// Error handling
program.exitOverride((err) => {
  if (err.code === 'commander.help') {
    process.exit(0);
  }
  if (err.code === 'commander.version') {
    process.exit(0);
  }
  process.exit(1);
});

// Global error handler
process.on('unhandledRejection', (error: Error) => {
  logger.error(error.message);
  if (process.env.DEBUG) {
    console.error(error.stack);
  }
  process.exit(1);
});

process.on('uncaughtException', (error: Error) => {
  logger.error(error.message);
  if (process.env.DEBUG) {
    console.error(error.stack);
  }
  process.exit(1);
});

// Parse arguments
program.parse();
