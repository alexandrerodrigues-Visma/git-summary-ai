import { Command } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createAnalyzeCommand } from './commands/analyze.js';
import { createSummarizeCommand } from './commands/summarize.js';
import { createPushCommand } from './commands/push.js';
import { createPrCommand } from './commands/pr.js';
import { createRunCommand } from './commands/run.js';
import { createConfigCommand } from './commands/config.js';
import { createSetupCommand } from './commands/setup.js';
import { createRepoCommand } from './commands/repo.js';
import { createTokensCommand } from './commands/tokens.js';
import { logger } from './utils/logger.js';

// Read version from package.json
let packageVersion = '0.2.6'; // Fallback version
try {
  if (typeof import.meta.url !== 'undefined') {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const packageJson = JSON.parse(
      readFileSync(join(__dirname, '../package.json'), 'utf-8')
    );
    packageVersion = packageJson.version;
  }
} catch {
  // Use fallback version if reading fails
}

const program = new Command();

program
  .name('git-summary-ai')
  .description('A CLI tool that pushes code with AI-generated commit summaries to help team code reviews')
  .version(packageVersion)
  .addHelpText('after', `
Commands:
  setup            Interactive setup wizard for API keys and configuration
  repo             Show git repository information and remote status
  run              Execute workflow: summarize and commit (optionally push and create PR)
  analyze          Analyze branch diff and display statistics
  summarize        Generate AI-powered summary with interactive preview and commit
  push             Push commits to remote with auto upstream config
  pr               Create a GitHub pull request
  config init      Initialize configuration (provider, model, branch, template)
  config show      Display current configuration
  config credentials  Manage stored API key credentials

Examples:
  $ git-summary-ai setup                    # Interactive setup wizard
  $ git-summary-ai repo status              # Show git remote and branch info
  $ git-summary-ai run                      # Summarize and commit
  $ git-summary-ai run --push               # Summarize, commit, and push
  $ git-summary-ai run --push --pr main     # Summarize, commit, push, and create PR to main
  $ git-summary-ai analyze -v               # Analyze with verbose output
  $ git-summary-ai summarize -t develop     # Summarize against develop branch
  $ git-summary-ai pr -b main               # Create PR to main branch

Environment Variables:
  CLAUDE_API_KEY   API key for Anthropic Claude
  OPENAI_API_KEY   API key for OpenAI GPT
  GITHUB_TOKEN     GitHub token for repo access (and GitHub Models)
  DEBUG            Enable debug logging

Documentation:
  See USAGE.md for detailed documentation and configuration options.
`);

// Register commands
program.addCommand(createSetupCommand());
program.addCommand(createRepoCommand());
program.addCommand(createAnalyzeCommand());
program.addCommand(createSummarizeCommand());
program.addCommand(createPushCommand());
program.addCommand(createPrCommand());
program.addCommand(createRunCommand());
program.addCommand(createConfigCommand());
program.addCommand(createTokensCommand());

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
