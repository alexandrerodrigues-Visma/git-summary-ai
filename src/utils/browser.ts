import open from 'open';

export const API_URLS = {
  claude: 'https://console.anthropic.com/settings/keys',
  openai: 'https://platform.openai.com/api-keys',
  copilot: 'https://github.com/settings/tokens',
} as const;

export type ApiProvider = keyof typeof API_URLS;

export async function openApiKeyPage(provider: ApiProvider): Promise<void> {
  const url = API_URLS[provider];
  
  // Validate URL is HTTPS before opening (security check)
  if (!url.startsWith('https://')) {
    throw new Error('Invalid URL: Only HTTPS URLs are allowed');
  }
  
  // eslint-disable-next-line @aikido/no-unsafe-file-inclusion
  // Safe: Opening browser to predefined HTTPS URLs only
  await open(url);
}

export function getApiKeyPageUrl(provider: ApiProvider): string {
  return API_URLS[provider];
}
