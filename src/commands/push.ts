import { Command } from 'commander';
import inquirer from 'inquirer';
import { GitService } from '../services/git.service.js';
import { logger } from '../utils/logger.js';
import { withSpinner } from '../utils/spinner.js';

export async function pushToRemote(options: {
  setUpstream?: boolean;
  force?: boolean;
}): Promise<{ success: boolean }> {
  const git = new GitService();

  const branch = await git.getBranchInfo();

  // Check if there's a remote
  const remoteUrl = await git.getRemoteUrl();
  if (!remoteUrl) {
    logger.error('No remote repository configured');
    logger.info('Add a remote with: git remote add origin <url>');
    return { success: false };
  }

  // Check if we need to set upstream
  const needsUpstream = !branch.tracking;

  if (needsUpstream && !options.setUpstream) {
    const { confirmUpstream } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmUpstream',
        message: `Branch '${branch.current}' has no upstream. Set upstream to origin/${branch.current}?`,
        default: true,
      },
    ]);

    if (!confirmUpstream) {
      logger.info('Push cancelled');
      return { success: false };
    }

    options.setUpstream = true;
  }

  // Push
  await withSpinner(
    `Pushing to origin/${branch.current}...`,
    () => git.push(options.setUpstream),
    'Pushed successfully'
  );

  logger.blank();
  logger.success('Done! Ready for review.');

  // Try to construct PR URL hint
  if (remoteUrl.includes('github.com')) {
    const match = remoteUrl.match(/github\.com[:/](.+?)(?:\.git)?$/);
    if (match) {
      const repo = match[1].replace('.git', '');
      logger.info(`Create PR: https://github.com/${repo}/compare/${branch.current}`);
    }
  }

  return { success: true };
}

export function createPushCommand(): Command {
  return new Command('push')
    .description('Push to remote')
    .option('-u, --set-upstream', 'Set upstream branch')
    .action(async (options) => {
      const git = new GitService();

      // Check if in a git repository
      const isRepo = await git.isGitRepository();
      if (!isRepo) {
        logger.error('Not a git repository. Please run this command from a git repository.');
        process.exit(1);
      }

      await pushToRemote({
        setUpstream: options.setUpstream,
      });
    });
}
