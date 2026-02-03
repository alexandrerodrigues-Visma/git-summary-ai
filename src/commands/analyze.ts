import { Command } from 'commander';
import { GitService } from '../services/git.service.js';
import { GitHubApiService } from '../services/github/github-api.service.js';
import { getCredentialManager } from '../services/credentials/index.js';
import { loadConfig } from '../config/loader.js';
import { logger } from '../utils/logger.js';
import { withSpinner } from '../utils/spinner.js';
import { ensureSetupComplete } from '../utils/setup-check.js';
import chalk from 'chalk';
import type { Config } from '../config/schema.js';

export function createAnalyzeCommand(): Command {
  return new Command('analyze')
    .description('Analyze branch diff against target branch')
    .option('-t, --target <branch>', 'Target branch to compare against')
    .option('-v, --verbose', 'Show detailed file list')
    .option('--remote', 'Compare remote repository branches (requires repo connection)')
    .action(async (options) => {
      await ensureSetupComplete('analyze');
      const config = await loadConfig();

      if (options.remote) {
        await analyzeRemote(config, options);
      } else {
        await analyzeLocal(config, options);
      }
    });
}

async function analyzeLocal(config: Config, options: { files?: string[]; verbose?: boolean; target?: string }): Promise<void> {
  const git = new GitService();

  // Check if in a git repository
  const isRepo = await git.isGitRepository();
  if (!isRepo) {
    logger.error('Not a git repository. Please run this command from a git repository.');
    process.exit(1);
  }

  // Smart target branch detection:
  // 1. Use explicit --target flag if provided (compare against different branch)
  // 2. Use tracking branch if available (compare local changes against remote)
  // 3. Fall back to configured targetBranch
  let targetBranch = options.target;
  if (!targetBranch) {
    const trackingBranchName = await git.getTrackingBranchName();
    targetBranch = trackingBranchName || config.targetBranch;
  }

  const diffSummary = await withSpinner(
    'Analyzing branch...',
    () => git.getFullDiffSummary(targetBranch),
    'Analysis complete'
  );

  logger.blank();
  logger.detail('Mode', 'Local repository');
  logger.detail('Branch', diffSummary.branch.current);

  if (diffSummary.branch.tracking) {
    logger.detail('Tracking', diffSummary.branch.tracking);
  }

  logger.detail('Comparing against', targetBranch);
  logger.blank();

  const { stats } = diffSummary;
  const statsLine = [
    `Files changed: ${chalk.yellow(stats.filesChanged)}`,
    `Lines: ${chalk.green(`+${stats.insertions}`)} / ${chalk.red(`-${stats.deletions}`)}`,
  ].join(' | ');

  console.log('      ' + statsLine);

  if (options.verbose && stats.files.length > 0) {
    logger.blank();
    logger.info('Modified files:');
    for (const file of stats.files) {
      console.log(chalk.gray('      - ') + file);
    }
  }

  if (stats.filesChanged === 0) {
    logger.blank();
    logger.warning(`No changes detected compared to ${targetBranch}`);
  }
}

async function analyzeRemote(config: Config, options: { branch?: string; verbose?: boolean; target?: string }): Promise<void> {
  const git = new GitService();

  // Check if in a git repository
  const isRepo = await git.isGitRepository();
  if (!isRepo) {
    logger.error('Not a git repository. Please run this command from a git repository.');
    process.exit(1);
  }

  // Extract GitHub repo info from git remote
  const repoInfo = await git.getGitHubRepoInfo();
  if (!repoInfo) {
    logger.error('No GitHub remote found. Make sure your repository has a GitHub remote (origin).');
    logger.detail('Hint', 'Run: git remote -v');
    process.exit(1);
  }

  const credentialManager = getCredentialManager();
  const githubToken = await credentialManager.getApiKey('github');

  if (!githubToken) {
    logger.error('Not authenticated with GitHub. Please configure your GitHub token.');
    logger.detail('Hint', 'Run: git-summary-ai setup');
    process.exit(1);
  }

  const apiService = new GitHubApiService(githubToken);

  // Get current branch and tracking branch
  const branchInfo = await git.getBranchInfo();
  const headBranch = branchInfo.current;
  
  // Get target branch from tracking branch or use config
  let targetBranch = options.target;
  if (!targetBranch) {
    const trackingBranch = await git.getTrackingBranchName();
    targetBranch = trackingBranch || config.targetBranch;
  }

  logger.info(`Analyzing remote repository: ${chalk.bold(`${repoInfo.owner}/${repoInfo.repo}`)}`);

  const comparison = await withSpinner(
    `Comparing ${headBranch} against ${targetBranch}...`,
    () => apiService.compareBranches(repoInfo.owner, repoInfo.repo, targetBranch, headBranch),
    'Analysis complete'
  );

  logger.blank();
  logger.detail('Mode', 'Remote repository');
  logger.detail('Repository', `${repoInfo.owner}/${repoInfo.repo}`);
  logger.detail('Head branch', headBranch);
  logger.detail('Base branch', targetBranch);
  if (branchInfo.tracking) {
    logger.detail('Tracking', branchInfo.tracking);
  }
  logger.blank();

  const filesChanged = comparison.files.length;
  const insertions = comparison.files.reduce((sum, f) => sum + f.additions, 0);
  const deletions = comparison.files.reduce((sum, f) => sum + f.deletions, 0);

  const statsLine = [
    `Files changed: ${chalk.yellow(filesChanged)}`,
    `Lines: ${chalk.green(`+${insertions}`)} / ${chalk.red(`-${deletions}`)}`,
    `Commits: ${comparison.ahead_by}`,
  ].join(' | ');

  console.log('      ' + statsLine);

  if (options.verbose && comparison.files.length > 0) {
    logger.blank();
    logger.info('Modified files:');
    for (const file of comparison.files) {
      const statusIcon = file.status === 'added' ? '+' : file.status === 'removed' ? '-' : '~';
      console.log(chalk.gray(`      ${statusIcon} `) + file.filename);
    }
  }

  if (filesChanged === 0) {
    logger.blank();
    logger.warning(`No changes detected between ${targetBranch} and ${headBranch}`);
  }
}
