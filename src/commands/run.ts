import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { GitService } from '../services/git.service.js';
import { createAIService } from '../services/ai/index.js';
import { loadConfig, validateApiKey } from '../config/loader.js';
import { logger } from '../utils/logger.js';
import { withSpinner } from '../utils/spinner.js';

export function createRunCommand(): Command {
  return new Command('run')
    .description('Full workflow: analyze, summarize, commit, and push')
    .option('-t, --target <branch>', 'Target branch to compare against')
    .option('-y, --yes', 'Skip confirmations (use defaults)')
    .action(async (options) => {
      const config = await loadConfig();
      const git = new GitService();
      const targetBranch = options.target || config.targetBranch;
      const totalSteps = 4;

      // Check if in a git repository
      const isRepo = await git.isGitRepository();
      if (!isRepo) {
        logger.error('Not a git repository. Please run this command from a git repository.');
        process.exit(1);
      }

      // Validate API key upfront
      try {
        validateApiKey(config.provider);
      } catch (error) {
        logger.error((error as Error).message);
        process.exit(1);
      }

      // Step 1: Analyze
      logger.step(1, totalSteps, 'Analyzing branch...');

      const diffSummary = await withSpinner(
        'Getting diff...',
        () => git.getFullDiffSummary(targetBranch)
      );

      logger.detail('Branch', diffSummary.branch.current);

      const statsLine = [
        `Files changed: ${chalk.yellow(diffSummary.stats.filesChanged)}`,
        `Lines: ${chalk.green(`+${diffSummary.stats.insertions}`)} / ${chalk.red(`-${diffSummary.stats.deletions}`)}`,
      ].join(' | ');
      console.log('      ' + statsLine);

      if (diffSummary.stats.filesChanged === 0) {
        logger.blank();
        logger.warning('No changes detected. Nothing to commit.');
        return;
      }

      logger.blank();

      // Step 2: Generate AI Summary
      logger.step(2, totalSteps, 'Generating AI summary...');

      const aiService = createAIService(config);

      const aiResult = await withSpinner(
        `Using ${aiService.getProviderName()}...`,
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

      // Step 3: Preview and Confirm
      logger.step(3, totalSteps, 'Preview:');
      logger.box(aiResult.summary);

      logger.blank();
      logger.info('Commit message:');
      console.log(aiResult.commitMessage);
      logger.blank();

      let commitMessage = aiResult.commitMessage;

      if (!options.yes) {
        const { action } = await inquirer.prompt([
          {
            type: 'list',
            name: 'action',
            message: 'Accept this summary?',
            choices: [
              { name: 'Yes, commit and push', value: 'accept' },
              { name: 'Edit commit message', value: 'edit' },
              { name: 'Regenerate summary', value: 'regenerate' },
              { name: 'Cancel', value: 'cancel' },
            ],
          },
        ]);

        if (action === 'cancel') {
          logger.info('Cancelled');
          return;
        }

        if (action === 'regenerate') {
          // Re-run the command
          const runCommand = createRunCommand();
          await runCommand.parseAsync(['node', 'run', ...(options.target ? ['-t', options.target] : [])]);
          return;
        }

        if (action === 'edit') {
          const { editedMessage } = await inquirer.prompt([
            {
              type: 'editor',
              name: 'editedMessage',
              message: 'Edit commit message:',
              default: commitMessage,
            },
          ]);
          commitMessage = editedMessage.trim();
        }
      }

      // Step 4: Commit and Push
      logger.step(4, totalSteps, 'Committing and pushing...');

      // Check for uncommitted changes and stage them
      const hasChanges = await git.hasUncommittedChanges();

      if (hasChanges) {
        await withSpinner('Staging changes...', () => git.stageAll());
      }

      const commitHash = await withSpinner('Creating commit...', () =>
        git.commit(commitMessage)
      );

      logger.detail('Commit', commitHash.slice(0, 7));

      // Push
      const branch = await git.getBranchInfo();
      const needsUpstream = !branch.tracking;

      await withSpinner(
        `Pushing to origin/${branch.current}...`,
        () => git.push(needsUpstream)
      );

      logger.blank();
      logger.success('Done! Ready for review.');

      // Try to construct PR URL hint
      const remoteUrl = await git.getRemoteUrl();
      if (remoteUrl?.includes('github.com')) {
        const match = remoteUrl.match(/github\.com[:/](.+?)(?:\.git)?$/);
        if (match) {
          const repo = match[1].replace('.git', '');
          logger.info(`Create PR: https://github.com/${repo}/compare/${branch.current}`);
        }
      }
    });
}
