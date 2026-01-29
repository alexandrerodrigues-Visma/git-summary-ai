import { Command } from 'commander';
import inquirer from 'inquirer';
import { GitService } from '../services/git.service.js';
import { generateAndPreviewSummary } from './summarize.js';
import { loadConfig } from '../config/loader.js';
import { logger } from '../utils/logger.js';
import { withSpinner } from '../utils/spinner.js';

export async function commitWithSummary(options: {
  target?: string;
  message?: string;
  stageAll?: boolean;
}): Promise<{ success: boolean; commitHash?: string }> {
  const config = await loadConfig();
  const git = new GitService();
  const targetBranch = options.target || config.targetBranch;

  // Check for uncommitted changes
  const hasChanges = await git.hasUncommittedChanges();

  if (!hasChanges && !options.message) {
    logger.warning('No uncommitted changes to commit');
    logger.info('Make sure you have staged or unstaged changes');
    return { success: false };
  }

  let commitMessage = options.message;

  // If no message provided, generate one
  if (!commitMessage) {
    const result = await generateAndPreviewSummary({ target: targetBranch });

    if (!result?.accepted) {
      return { success: false };
    }

    commitMessage = result.commitMessage;
  }

  // Optionally stage all changes
  if (options.stageAll || !options.message) {
    const { shouldStage } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldStage',
        message: 'Stage all changes before committing?',
        default: true,
      },
    ]);

    if (shouldStage) {
      await withSpinner('Staging changes...', () => git.stageAll());
    }
  }

  // Commit
  const commitHash = await withSpinner('Creating commit...', () =>
    git.commit(commitMessage!)
  );

  logger.success(`Committed: ${commitHash.slice(0, 7)}`);

  return { success: true, commitHash };
}

export function createCommitCommand(): Command {
  return new Command('commit')
    .description('Commit with AI-generated summary')
    .option('-t, --target <branch>', 'Target branch to compare against')
    .option('-m, --message <message>', 'Use custom commit message instead of generating')
    .option('-a, --all', 'Stage all changes before committing')
    .action(async (options) => {
      const git = new GitService();

      // Check if in a git repository
      const isRepo = await git.isGitRepository();
      if (!isRepo) {
        logger.error('Not a git repository. Please run this command from a git repository.');
        process.exit(1);
      }

      const result = await commitWithSummary({
        target: options.target,
        message: options.message,
        stageAll: options.all,
      });

      if (result.success) {
        logger.blank();
        logger.info('Next step: Run `git-summary-ai push` to push to remote');
      }
    });
}
