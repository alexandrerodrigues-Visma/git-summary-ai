import { Command } from 'commander';
import inquirer from 'inquirer';
import { GitService } from '../services/git.service.js';
import { GitHubApiService } from '../services/github/github-api.service.js';
import { getCredentialManager } from '../services/credentials/index.js';
import { logger } from '../utils/logger.js';
import { withSpinner } from '../utils/spinner.js';
import { warnIfSetupIncomplete } from '../utils/setup-check.js';
import chalk from 'chalk';

export async function createPullRequest(options: {
  base?: string;
  title?: string;
  body?: string;
  draft?: boolean;
}): Promise<{ success: boolean; url?: string }> {
  // PR command doesn't strictly need AI setup, but warn if incomplete
  await warnIfSetupIncomplete();
  
  const git = new GitService();

  // Get branch info
  const branchInfo = await git.getBranchInfo();
  const currentBranch = branchInfo.current;

  // Get GitHub repo info
  const repoInfo = await git.getGitHubRepoInfo();
  if (!repoInfo) {
    logger.error('Could not detect GitHub repository from remote URL');
    logger.info('Make sure you have a GitHub remote configured (origin)');
    return { success: false };
  }

  // Get GitHub token
  const credentialManager = getCredentialManager();
  let token = await credentialManager.getApiKey('github');

  // If no token found, try gh CLI as fallback for PR creation only
  if (!token) {
    try {
      const { execSync } = await import('child_process');
      const ghToken = execSync('gh auth token', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
      if (ghToken && ghToken.startsWith('gh')) {
        token = ghToken;
      }
    } catch {
      // gh CLI not available
    }
  }

  if (!token) {
    logger.error('GitHub token not found');
    logger.info('Authenticate using one of these methods:');
    logger.info('  1. Run: gh auth login (for PR creation)');
    logger.info('  2. Set GITHUB_TOKEN environment variable');
    logger.info('  3. Run: git-summary-ai config credentials');
    return { success: false };
  }

  const githubApi = new GitHubApiService(token);

  // Verify repository access
  const hasAccess = await githubApi.verifyRepoAccess(repoInfo.owner, repoInfo.repo);
  if (!hasAccess) {
    logger.error(`Cannot access repository ${repoInfo.owner}/${repoInfo.repo}`);
    logger.info('Make sure:');
    logger.info('  1. The repository exists on GitHub');
    logger.info('  2. Your GitHub token has "repo" scope');
    logger.info('  3. You have write access to the repository');
    return { success: false };
  }

  // Determine base branch
  let baseBranch = options.base;
  if (!baseBranch) {
    const { selectedBase } = await inquirer.prompt([
      {
        type: 'input',
        name: 'selectedBase',
        message: 'Base branch to merge into:',
        default: 'main',
      },
    ]);
    baseBranch = selectedBase;
  }

  // Determine PR title
  let prTitle = options.title;
  if (!prTitle) {
    // Try to get title from last commit
    try {
      prTitle = await git.getLastCommitSubject();
      if (!prTitle) prTitle = currentBranch;
    } catch {
      prTitle = currentBranch;
    }

    const { confirmedTitle } = await inquirer.prompt([
      {
        type: 'input',
        name: 'confirmedTitle',
        message: 'PR title:',
        default: prTitle,
      },
    ]);
    prTitle = confirmedTitle;
  }

  // Determine PR body
  let prBody = options.body;
  if (!prBody) {
    const { bodyChoice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'bodyChoice',
        message: 'PR body content:',
        choices: [
          { name: 'Use last commit message', value: 'last' },
          { name: 'Use all commit messages from this branch', value: 'all' },
          { name: 'Write custom message', value: 'custom' },
        ],
        default: 'last',
      },
    ]);

    if (bodyChoice === 'last') {
      try {
        prBody = await git.getLastCommitBody();
      } catch {
        prBody = '';
      }
    } else if (bodyChoice === 'all') {
      try {
        prBody = await git.formatCommitsForPR(baseBranch!);
      } catch {
        prBody = '';
      }
    } else {
      // Custom message
      try {
        const defaultBody = await git.getLastCommitBody();
        const { customBody } = await inquirer.prompt([
          {
            type: 'editor',
            name: 'customBody',
            message: 'Edit PR body:',
            default: defaultBody,
          },
        ]);
        prBody = customBody;
      } catch {
        const { customBody } = await inquirer.prompt([
          {
            type: 'editor',
            name: 'customBody',
            message: 'Edit PR body:',
            default: '',
          },
        ]);
        prBody = customBody;
      }
    }
  }

  // Create the PR
  logger.blank();
  const prUrl = await withSpinner(
    `Creating PR: ${currentBranch} → ${baseBranch}...`,
    async () => {
      const result = await githubApi.createPullRequest(
        repoInfo.owner,
        repoInfo.repo,
        {
          title: prTitle!,
          body: prBody || '',
          head: currentBranch,
          base: baseBranch!,
          draft: options.draft || false,
        }
      );
      return result.html_url;
    }
  );

  logger.success(`PR created: ${chalk.cyan(prUrl)}`);
  return { success: true, url: prUrl };
}

export function createPrCommand(): Command {
  return new Command('pr')
    .description('Create a GitHub pull request')
    .option('-b, --base <branch>', 'Base branch to merge into (default: main)')
    .option('-t, --title <title>', 'PR title (default: last commit message)')
    .option('--body <body>', 'PR body (default: last commit body)')
    .option('-d, --draft', 'Create as draft PR')
    .action(async (options) => {
      const git = new GitService();

      // Check if in a git repository
      const isRepo = await git.isGitRepository();
      if (!isRepo) {
        logger.error('Not a git repository. Please run this command from a git repository.');
        process.exit(1);
      }

      // Check if there are unpushed commits
      const branchInfo = await git.getBranchInfo();
      if (!branchInfo.tracking) {
        logger.warning('Branch has no upstream tracking. Push your commits first.');
        logger.info('Run: git-summary-ai push -u');
        process.exit(1);
      }

      const result = await createPullRequest(options);

      if (!result.success) {
        process.exit(1);
      }
    });
}
