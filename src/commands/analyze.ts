import { Command } from 'commander';
import { GitService } from '../services/git.service.js';
import { loadConfig } from '../config/loader.js';
import { logger } from '../utils/logger.js';
import { withSpinner } from '../utils/spinner.js';
import chalk from 'chalk';

export function createAnalyzeCommand(): Command {
  return new Command('analyze')
    .description('Analyze branch diff against target branch')
    .option('-t, --target <branch>', 'Target branch to compare against')
    .option('-v, --verbose', 'Show detailed file list')
    .action(async (options) => {
      const config = await loadConfig();
      const git = new GitService();

      // Check if in a git repository
      const isRepo = await git.isGitRepository();
      if (!isRepo) {
        logger.error('Not a git repository. Please run this command from a git repository.');
        process.exit(1);
      }

      const targetBranch = options.target || config.targetBranch;

      const diffSummary = await withSpinner(
        'Analyzing branch...',
        () => git.getFullDiffSummary(targetBranch),
        'Analysis complete'
      );

      logger.blank();
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
    });
}
