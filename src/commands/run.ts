import { Command } from 'commander';
import { GitService } from '../services/git.service.js';
import { generateAndPreviewSummary } from './summarize.js';
import { createPullRequest } from './pr.js';
import { loadConfig } from '../config/loader.js';
import { logger } from '../utils/logger.js';
import { withSpinner } from '../utils/spinner.js';
import { ensureSetupComplete } from '../utils/setup-check.js';

export function createRunCommand(): Command {
  return new Command('run')
    .description('Full workflow: summarize, commit, and optionally push/create PR')
    .option('-t, --target <branch>', 'Target branch to compare against')
    .option('-y, --yes', 'Skip confirmations (use defaults)')
    .option('--push', 'Push commits after committing')
    .option('--pr <base>', 'Create pull request to specified base branch after pushing')
    .action(async (options) => {
      await ensureSetupComplete('run');
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

      // Step 1: Generate summary
      const result = await generateAndPreviewSummary({
        target: options.target,
        skipPreview: options.yes,
      });

      if (!result?.accepted) {
        logger.info('Cancelled');
        return;
      }

      // Step 2: Stage and commit
      const hasChanges = await git.hasUncommittedChanges();
      
      if (!hasChanges) {
        logger.warning('No uncommitted changes to commit');
        return;
      }

      await withSpinner('Staging changes...', () => git.stageAll());
      
      const commitHash = await withSpinner('Creating commit...', () =>
        git.commit(result.commitMessage)
      );

      logger.success(`Committed: ${commitHash.slice(0, 7)}`);
      logger.blank();

      // Step 3: Push if requested
      if (options.push || options.pr) {
        const branch = await git.getBranchInfo();
        const needsUpstream = !branch.tracking;

        await withSpinner(
          `Pushing to origin/${branch.current}...`,
          () => git.push(needsUpstream)
        );

        logger.success('Pushed to remote');
        logger.blank();
      }

      // Step 3: Create PR if requested
      if (options.pr) {
        const prResult = await createPullRequest({
          base: options.pr,
          title: undefined, // Will use last commit
          body: undefined,  // Will use last commit body
          draft: false,
        });

        if (!prResult.success) {
          process.exit(1);
        }
      } else if (!options.push) {
        logger.info('Next step: Run `git-summary-ai push` to push to remote');
      }
    });
}
