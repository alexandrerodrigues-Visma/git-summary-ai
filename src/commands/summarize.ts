import { Command } from 'commander';
import inquirer from 'inquirer';
import { GitService } from '../services/git.service.js';
import { createAIService } from '../services/ai/index.js';
import { loadConfig, validateApiKeyAsync } from '../config/loader.js';
import { logger } from '../utils/logger.js';
import { withSpinner } from '../utils/spinner.js';
import { ensureSetupComplete } from '../utils/setup-check.js';
import chalk from 'chalk';

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
  await ensureSetupComplete('summarize');
  const config = await loadConfig();
  const git = new GitService();
  
  // Smart target branch detection:
  // 1. Use explicit --target flag if provided (compare against different branch)
  // 2. Use tracking branch if available (compare local changes against remote)
  // 3. Fall back to configured targetBranch
  let targetBranch = options.target;
  if (!targetBranch) {
    const trackingBranchName = await git.getTrackingBranchName();
    targetBranch = trackingBranchName || config.targetBranch;
  }

  // Validate API key
  await validateApiKeyAsync(config.provider);

  // Get diff summary
  const diffSummary = await withSpinner(
    `Analyzing changes against ${targetBranch}...`,
    () => git.getFullDiffSummary(targetBranch)
  );

  if (diffSummary.stats.filesChanged === 0) {
    logger.warning('No changes to summarize');
    return null;
  }

  // Create AI service and generate summary
  const aiService = await createAIService(config);

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

  if (options.skipPreview) {
    const finalMessage = result.title ? `${result.title}\n\n${result.summary}` : result.summary;
    return {
      summary: result.summary,
      commitMessage: finalMessage,
      accepted: true,
      edited: false,
    };
  }

  let finalTitle = result.title || '';
  let finalSummary = result.summary;
  let wasEdited = false;

  // Interactive loop: show summary and ask for action
  while (true) {
    // Display current title and summary
    if (finalTitle) {
      logger.info('Title:');
      console.log(chalk.bold(finalTitle));
      logger.blank();
    }
    
    logger.info('Detailed summary:');
    logger.box(finalSummary);
    logger.blank();

    // Ask for confirmation
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: 'Accept and commit', value: 'accept' },
          { name: 'Edit title only', value: 'edit-title' },
          { name: 'Edit summary only', value: 'edit-summary' },
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

    if (action === 'accept') {
      break;
    }

    // Handle editing
    if (action === 'edit-title') {
      const { editedTitle } = await inquirer.prompt([
        {
          type: 'input',
          name: 'editedTitle',
          message: 'Edit commit title:',
          default: finalTitle,
          validate: (input: string) => {
            if (!input || input.trim() === '') {
              return 'Title cannot be empty';
            }
            if (input.length > 72) {
              return 'Title should be under 72 characters';
            }
            return true;
          },
        },
      ]);
      finalTitle = editedTitle.trim();
      wasEdited = true;
      logger.blank();
    } else if (action === 'edit-summary') {
      const { editedSummary } = await inquirer.prompt([
        {
          type: 'editor',
          name: 'editedSummary',
          message: 'Edit summary:',
          default: finalSummary,
        },
      ]);
      
      finalSummary = editedSummary.trim();
      wasEdited = true;
      logger.blank();
    }
  }

  const finalCommitMessage = finalTitle ? `${finalTitle}\n\n${finalSummary}` : finalSummary;

  return {
    summary: finalSummary,
    commitMessage: finalCommitMessage,
    accepted: true,
    edited: wasEdited,
  };
}

export function createSummarizeCommand(): Command {
  return new Command('summarize')
    .description('Generate AI summary with preview (auto-detects comparison branch)')
    .option('-t, --target <branch>', 'Target branch to compare against (default: tracking branch or main)')
    .option('-y, --yes', 'Skip preview confirmation')
    .action(async (options) => {
      const git = new GitService();

      // Check if in a git repository
      const isRepo = await git.isGitRepository();
      if (!isRepo) {
        logger.error('Not a git repository. Please run this command from a git repository.');
        process.exit(1);
      }

      // Show info about auto-detection if no target specified
      if (!options.target) {
        const trackingBranch = await git.getTrackingBranchName();
        if (trackingBranch) {
          logger.info(`Auto-detected comparison target: ${trackingBranch} (from tracking branch)`);
          logger.blank();
        }
      }

      const result = await generateAndPreviewSummary({
        target: options.target,
        skipPreview: options.yes,
      });

      if (result?.accepted) {
        // Stage and commit
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

        const commitHash = await withSpinner('Creating commit...', () =>
          git.commit(result.commitMessage)
        );

        logger.success(`Committed: ${commitHash.slice(0, 7)}`);
        logger.blank();
        logger.info('Next step: Run `git-summary-ai push` to push to remote');
      }
    });
}
