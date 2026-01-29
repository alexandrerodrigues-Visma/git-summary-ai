import ora, { type Ora } from 'ora';

export function createSpinner(text: string): Ora {
  return ora({
    text,
    color: 'cyan',
  });
}

export async function withSpinner<T>(
  text: string,
  fn: () => Promise<T>,
  successText?: string
): Promise<T> {
  const spinner = createSpinner(text);
  spinner.start();

  try {
    const result = await fn();
    spinner.succeed(successText || text);
    return result;
  } catch (error) {
    spinner.fail();
    throw error;
  }
}
