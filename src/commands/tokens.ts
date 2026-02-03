import { Command } from 'commander';
import inquirer from 'inquirer';
import { getTokenTracker, type TokenSummary } from '../services/token-tracker.service.js';
import { logger } from '../utils/logger.js';
import chalk from 'chalk';

function formatNumber(num: number): string {
  return num.toLocaleString();
}

function formatPercentage(value: number, total: number): string {
  if (total === 0) return '0%';
  return `${((value / total) * 100).toFixed(0)}%`;
}

function createProgressBar(percentage: number, width: number = 20): string {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

function getDateRange(period: 'today' | 'week' | 'month' | 'year'): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  let start: Date;

  switch (period) {
    case 'today':
      start = new Date(now);
      start.setHours(0, 0, 0, 0);
      break;

    case 'week':
      start = new Date(now);
      start.setDate(now.getDate() - now.getDay()); // Sunday
      start.setHours(0, 0, 0, 0);
      break;

    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      break;

    case 'year':
      start = new Date(now.getFullYear(), 0, 1);
      start.setHours(0, 0, 0, 0);
      break;
  }

  return { start, end };
}

function displaySummary(summary: TokenSummary, title: string): void {
  logger.blank();
  console.log(chalk.bold.cyan(`🔢 ${title}`));
  logger.blank();

  // Basic stats
  console.log(`  Requests: ${formatNumber(summary.requestCount)}`);
  console.log(`  Tokens:   ${formatNumber(summary.totalTokens)}`);
  console.log(`    ↑ Input:   ${formatNumber(summary.totalInput)} (${formatPercentage(summary.totalInput, summary.totalTokens)})`);
  console.log(`    ↓ Output:  ${formatNumber(summary.totalOutput)} (${formatPercentage(summary.totalOutput, summary.totalTokens)})`);
  logger.blank();

  // By provider
  const providers = Object.entries(summary.byProvider);
  if (providers.length > 0) {
    console.log(chalk.bold('By Provider:'));
    providers
      .sort((a, b) => b[1].tokens - a[1].tokens)
      .forEach(([provider, stats]) => {
        const percentage = (stats.tokens / summary.totalTokens) * 100;
        const bar = createProgressBar(percentage);
        const displayName = provider.charAt(0).toUpperCase() + provider.slice(1);
        console.log(
          `  ${displayName.padEnd(10)} ${formatNumber(stats.tokens).padStart(8)} (${formatPercentage(stats.tokens, summary.totalTokens).padStart(4)})  ${bar}`
        );
      });
    logger.blank();
  }

  // Top models
  const models = Object.entries(summary.byModel);
  if (models.length > 0) {
    console.log(chalk.bold('Top Models:'));
    models
      .sort((a, b) => b[1].tokens - a[1].tokens)
      .slice(0, 5)
      .forEach(([model, stats], index) => {
        console.log(
          `  ${(index + 1)}.  ${model.padEnd(30)} ${formatNumber(stats.tokens).padStart(8)} tokens  (${formatNumber(stats.requests).padStart(4)} requests)`
        );
      });
    logger.blank();
  }

  // Average
  if (summary.requestCount > 0) {
    const average = Math.round(summary.totalTokens / summary.requestCount);
    console.log(chalk.gray(`Average per request: ${formatNumber(average)} tokens`));
    logger.blank();
  }
}

async function showTokenSummary(): Promise<void> {
  const tracker = getTokenTracker();

  // Get summaries for different periods
  const today = getDateRange('today');
  const week = getDateRange('week');
  const month = getDateRange('month');

  const [todaySummary, weekSummary, monthSummary] = await Promise.all([
    tracker.getSummary(today.start, today.end),
    tracker.getSummary(week.start, week.end),
    tracker.getSummary(month.start, month.end),
  ]);

  logger.blank();
  console.log(chalk.bold.cyan('🔢 Token Usage Summary'));
  logger.blank();

  // Today
  const todayDate = today.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  console.log(chalk.bold(`Today (${todayDate}):`));
  console.log(`  Requests: ${formatNumber(todaySummary.requestCount)}`);
  console.log(`  Tokens:   ${formatNumber(todaySummary.totalTokens)}`);
  if (todaySummary.totalTokens > 0) {
    console.log(
      `    ↑ Input:   ${formatNumber(todaySummary.totalInput)} (${formatPercentage(todaySummary.totalInput, todaySummary.totalTokens)})`
    );
    console.log(
      `    ↓ Output:  ${formatNumber(todaySummary.totalOutput)} (${formatPercentage(todaySummary.totalOutput, todaySummary.totalTokens)})`
    );
  }
  logger.blank();

  // This Week
  console.log(chalk.bold('This Week:'));
  console.log(`  Requests: ${formatNumber(weekSummary.requestCount)}`);
  console.log(`  Tokens:   ${formatNumber(weekSummary.totalTokens)}`);
  if (weekSummary.totalTokens > 0) {
    console.log(
      `    ↑ Input:   ${formatNumber(weekSummary.totalInput)} (${formatPercentage(weekSummary.totalInput, weekSummary.totalTokens)})`
    );
    console.log(
      `    ↓ Output:  ${formatNumber(weekSummary.totalOutput)} (${formatPercentage(weekSummary.totalOutput, weekSummary.totalTokens)})`
    );
  }
  logger.blank();

  // This Month
  console.log(chalk.bold('This Month:'));
  console.log(`  Requests: ${formatNumber(monthSummary.requestCount)}`);
  console.log(`  Tokens:   ${formatNumber(monthSummary.totalTokens)}`);
  if (monthSummary.totalTokens > 0) {
    console.log(
      `    ↑ Input:   ${formatNumber(monthSummary.totalInput)} (${formatPercentage(monthSummary.totalInput, monthSummary.totalTokens)})`
    );
    console.log(
      `    ↓ Output:  ${formatNumber(monthSummary.totalOutput)} (${formatPercentage(monthSummary.totalOutput, monthSummary.totalTokens)})`
    );
  }
  logger.blank();

  // By Provider
  const providers = Object.entries(monthSummary.byProvider);
  if (providers.length > 0) {
    console.log(chalk.bold('By Provider:'));
    providers
      .sort((a, b) => b[1].tokens - a[1].tokens)
      .forEach(([provider, stats]) => {
        const percentage = (stats.tokens / monthSummary.totalTokens) * 100;
        const bar = createProgressBar(percentage);
        const displayName = provider.charAt(0).toUpperCase() + provider.slice(1);
        console.log(
          `  ${displayName}:  ${formatNumber(stats.tokens).padStart(8)} (${formatPercentage(stats.tokens, monthSummary.totalTokens).padStart(3)})  ${bar}`
        );
      });
    logger.blank();
  }

  // Most Used Models
  const models = Object.entries(monthSummary.byModel);
  if (models.length > 0) {
    console.log(chalk.bold('Most Used Models:'));
    models
      .sort((a, b) => b[1].tokens - a[1].tokens)
      .slice(0, 3)
      .forEach(([model, stats], index) => {
        console.log(
          `  ${index + 1}. ${model.padEnd(30)} ${formatNumber(stats.tokens).padStart(8)} tokens  (${formatNumber(stats.requests)} requests)`
        );
      });
    logger.blank();
  }

  // Tip
  console.log(chalk.gray("💡 Tip: Run 'gitai tokens export' to analyze your usage in detail"));
  logger.blank();
}

async function showTokensForPeriod(period: 'today' | 'week' | 'month' | 'year' | 'all'): Promise<void> {
  const tracker = getTokenTracker();

  if (period === 'all') {
    const summary = await tracker.getSummary();
    displaySummary(summary, 'All Time Token Usage');
    return;
  }

  const dateRange = getDateRange(period);
  const summary = await tracker.getSummary(dateRange.start, dateRange.end);

  const periodNames = {
    today: 'Today',
    week: 'This Week',
    month: 'This Month',
    year: 'This Year',
  };

  const startStr = dateRange.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const endStr = dateRange.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  displaySummary(summary, `${periodNames[period]} (${startStr} - ${endStr})`);
}

async function exportTokenUsage(file: string): Promise<void> {
  try {
    const tracker = getTokenTracker();
    await tracker.exportToJSON(file);
    logger.success(`Exported token usage to ${file}`);

    const records = await tracker.getAllRecords();
    logger.info(`Total records: ${formatNumber(records.length)}`);
  } catch (error) {
    logger.error(`Failed to export: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

async function clearTokenHistory(): Promise<void> {
  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: chalk.yellow('Are you sure you want to clear all token usage history? This cannot be undone.'),
      default: false,
    },
  ]);

  if (!confirmed) {
    logger.info('Cancelled');
    return;
  }

  try {
    const tracker = getTokenTracker();
    await tracker.clearHistory();
    logger.success('Token usage history cleared');
  } catch (error) {
    logger.error(`Failed to clear history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

export function createTokensCommand(): Command {
  const command = new Command('tokens').description('View token usage statistics').action(showTokenSummary);

  command
    .command('today')
    .description("Show today's token usage")
    .action(() => showTokensForPeriod('today'));

  command
    .command('week')
    .description("Show this week's token usage")
    .action(() => showTokensForPeriod('week'));

  command
    .command('month')
    .description("Show this month's token usage")
    .action(() => showTokensForPeriod('month'));

  command
    .command('year')
    .description("Show this year's token usage")
    .action(() => showTokensForPeriod('year'));

  command
    .command('all')
    .description('Show all-time token usage')
    .action(() => showTokensForPeriod('all'));

  command
    .command('export')
    .description('Export token usage to JSON')
    .argument('[file]', 'Output file path', 'token-usage-export.json')
    .action(exportTokenUsage);

  command.command('clear').description('Clear token usage history').action(clearTokenHistory);

  return command;
}
