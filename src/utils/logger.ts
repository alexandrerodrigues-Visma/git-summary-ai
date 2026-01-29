import chalk from 'chalk';

export const logger = {
  info: (message: string) => console.log(chalk.blue('ℹ'), message),
  success: (message: string) => console.log(chalk.green('✔'), message),
  warning: (message: string) => console.log(chalk.yellow('⚠'), message),
  error: (message: string) => console.log(chalk.red('✖'), message),

  step: (stepNumber: number, totalSteps: number, message: string) => {
    console.log(chalk.cyan(`[${stepNumber}/${totalSteps}]`), message);
  },

  detail: (label: string, value: string) => {
    console.log(chalk.gray('      ' + label + ':'), value);
  },

  box: (content: string) => {
    const lines = content.split('\n');
    const maxLength = Math.max(...lines.map(l => l.length), 40);
    const border = '─'.repeat(maxLength + 2);

    console.log(chalk.gray('┌' + border + '┐'));
    for (const line of lines) {
      const padding = ' '.repeat(maxLength - line.length);
      console.log(chalk.gray('│ ') + line + padding + chalk.gray(' │'));
    }
    console.log(chalk.gray('└' + border + '┘'));
  },

  blank: () => console.log(),
};
