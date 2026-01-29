import { Command } from 'commander';
import { GitService } from '../services/git.service.js';
import { logger } from '../utils/logger.js';
import chalk from 'chalk';

export function createRepoCommand(): Command {
  const repo = new Command('repo').description('Show git repository information');

  repo
    .command('status')
    .description('Show current git remote and branch information')
    .action(showRepoStatus);

  // Default to status if no subcommand
  repo.action(showRepoStatus);

  return repo;
}

async function showRepoStatus(): Promise<void> {
  const git = new GitService();

  // Check if in a git repository
  const isRepo = await git.isGitRepository();
  if (!isRepo) {
    logger.error('Not a git repository');
    process.exit(1);
  }

  logger.blank();
  logger.box('Git Repository Status');
  logger.blank();

  // Get branch info
  const branchInfo = await git.getBranchInfo();
  logger.info('Branch Information:');
  logger.detail('Current branch', branchInfo.current);
  
  if (branchInfo.tracking) {
    logger.detail('Tracking', branchInfo.tracking);
    const trackingBranchName = await git.getTrackingBranchName();
    if (trackingBranchName) {
      logger.detail('Remote branch', trackingBranchName);
    }
  } else {
    logger.detail('Tracking', chalk.gray('(not set)'));
  }

  logger.blank();

  // Get remote info
  const remoteUrl = await git.getRemoteUrl();
  logger.info('Remote Information:');
  
  if (remoteUrl) {
    logger.detail('Remote URL', remoteUrl);
    
    const repoInfo = await git.getGitHubRepoInfo();
    if (repoInfo) {
      logger.detail('GitHub repo', `${repoInfo.owner}/${repoInfo.repo}`);
      logger.detail('Remote comparison', chalk.green('✓ Available with --remote flag'));
    } else {
      logger.detail('GitHub repo', chalk.gray('(not a GitHub repository)'));
      logger.detail('Remote comparison', chalk.gray('✗ Only GitHub remotes supported'));
    }
  } else {
    logger.detail('Remote URL', chalk.gray('(not set)'));
    logger.detail('Remote comparison', chalk.gray('✗ No remote configured'));
  }

  logger.blank();
  logger.info('Usage:');
  logger.detail('Local analysis', 'git-summary-ai analyze');
  logger.detail('Remote analysis', 'git-summary-ai analyze --remote');
  logger.blank();
}
