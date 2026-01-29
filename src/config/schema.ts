import { z } from 'zod';

export const configSchema = z.object({
  provider: z.enum(['claude', 'openai']).default('claude'),
  model: z.string().optional(),
  maxTokens: z.number().positive().default(1024),
  targetBranch: z.string().default('main'),
  excludePatterns: z.array(z.string()).default([]),
  commitPrefix: z.string().optional(),
  language: z.string().default('en'),
});

export type Config = z.infer<typeof configSchema>;

export const defaultConfig: Config = {
  provider: 'claude',
  maxTokens: 1024,
  targetBranch: 'main',
  excludePatterns: [],
  language: 'en',
};
