import { Command } from 'commander';
import inquirer from 'inquirer';
import { GitService } from '../services/git.service.js';
import { createAIService } from '../services/ai/index.js';
import { loadConfig, validateApiKey } from '../config/loader.js';
import { logger } from '../utils/logger.js';
import { withSpinner } from '../utils/spinner.js';

export interface SummaryResult {
  summary: string;
  commitMessage: string;
  accepted: boolean;
  edited: boolean;
}

export async function generateAndPreviewSummary(options: {
  target?: string;
  skipPreview?: boolean;
}): Promise<SummaryResult | null> {
  const config = await loadConfig();
  const git = new GitService();
  const targetBranch = options.target || config.targetBranch;

  // Validate API key
  validateApiKey(config.provider);

  // Get diff summary
  const diffSummary = await withSpinner(
    'Analyzing changes...',
    () => git.getFullDiffSummary(targetBranch)
  );

  if (diffSummary.stats.filesChanged === 0) {
    logger.warning('No changes to summarize');
    return null;
  }

  // Create AI service and generate summary
  const aiService = createAIService(config);

  const result = await withSpinner(
    `Generating summary with ${aiService.getProviderName()}...`,
    () =>
      aiService.generateSummary({
        diff: diffSummary.diff,
        branchName: diffSummary.branch.current,
        filesChanged: diffSummary.stats.files,
        stats: {
          insertions: diffSummary.stats.insertions,
          deletions: diffSummary.stats.deletions,
        },
      })
  );

  logger.blank();
  logger.info('Preview:');
  logger.box(result.summary);

  logger.blank();
  logger.info('Commit message:');
  console.log(result.commitMessage);
  logger.blank();

  if (options.skipPreview) {
    return {
      summary: result.summary,
      commitMessage: result.commitMessage,
      accepted: true,
      edited: false,
    };
  }

  // Ask for confirmation
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Accept this summary?',
      choices: [
        { name: 'Yes, use this summary', value: 'accept' },
        { name: 'Edit commit message', value: 'edit' },
        { name: 'Regenerate', value: 'regenerate' },
        { name: 'Cancel', value: 'cancel' },
      ],
    },
  ]);

  if (action === 'cancel') {
    logger.info('Cancelled');
    return null;
  }

  if (action === 'regenerate') {
    return generateAndPreviewSummary(options);
  }

  let finalCommitMessage = result.commitMessage;

  if (action === 'edit') {
    const { editedMessage } = await inquirer.prompt([
      {
        type: 'editor',
        name: 'editedMessage',
        message: 'Edit commit message:',
        default: result.commitMessage,
      },
    ]);
    finalCommitMessage = editedMessage.trim();
  }

  return {
    summary: result.summary,
    commitMessage: finalCommitMessage,
    accepted: true,
    edited: action === 'edit',
  };
}

export function createSummarizeCommand(): Command {
  return new Command('summarize')
    .description('Generate AI summary with preview')
    .option('-t, --target <branch>', 'Target branch to compare against')
    .option('-y, --yes', 'Skip preview confirmation')
    .action(async (options) => {
      const git = new GitService();

      // Check if in a git repository
      const isRepo = await git.isGitRepository();
      if (!isRepo) {
        logger.error('Not a git repository. Please run this command from a git repository.');
        process.exit(1);
      }

      const result = await generateAndPreviewSummary({
        target: options.target,
        skipPreview: options.yes,
      });

      if (result?.accepted) {
        logger.success('Summary generated and accepted');
        logger.blank();
        logger.info('Next step: Run `git-summary-ai commit` to commit with this message');
      }
    });
}
