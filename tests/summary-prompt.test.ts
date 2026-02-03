import { describe, it, expect } from 'vitest';
import { buildSummaryPrompt, DEFAULT_PROMPT_TEMPLATE } from '../src/prompts/summary.prompt.js';
import type { AISummaryRequest } from '../src/services/ai/ai.interface.js';

describe('Summary Prompt', () => {
  describe('buildSummaryPrompt', () => {
    it('should generate a prompt with default template', () => {
      const request: AISummaryRequest = {
        diff: 'diff --git a/file.ts b/file.ts\n+added line',
        branchName: 'feature/test',
        filesChanged: ['file.ts'],
        stats: { insertions: 1, deletions: 0 },
      };

      const result = buildSummaryPrompt(request);
      
      expect(result).toContain(request.diff);
      expect(result).toContain('Analyze the following git diff and generate a detailed, topic-grouped commit message');
      expect(result).toContain('feature/test');
    });

    it('should use custom prompt template', () => {
      const request: AISummaryRequest = {
        diff: 'diff --git a/file.ts b/file.ts\n+added line',
        branchName: 'fix/bug',
        filesChanged: ['file.ts'],
        stats: { insertions: 1, deletions: 0 },
      };
      const customTemplate = 'Create a commit message for these changes:\n\n{diff}';

      const result = buildSummaryPrompt(request, undefined, customTemplate);
      
      expect(result).toContain('Create a commit message for these changes:');
      expect(result).toContain(request.diff);
      expect(result).not.toContain('{diff}'); // Template variable should be replaced
    });

    it('should include custom instructions when provided', () => {
      const request: AISummaryRequest = {
        diff: 'diff --git a/file.ts b/file.ts\n+added line',
        branchName: 'feature/ticket',
        filesChanged: ['file.ts'],
        stats: { insertions: 1, deletions: 0 },
        customInstructions: 'Please include ticket number',
      };

      const result = buildSummaryPrompt(request, request.customInstructions);
      
      expect(result).toContain('Please include ticket number');
      expect(result).toContain('Additional Instructions from User');
    });

    it('should handle empty diff', () => {
      const request: AISummaryRequest = {
        diff: '',
        branchName: 'main',
        filesChanged: [],
        stats: { insertions: 0, deletions: 0 },
      };

      const result = buildSummaryPrompt(request);
      
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle large diffs', () => {
      const largeDiff = Array(100).fill('diff --git a/file.ts b/file.ts\n+added line\n').join('');
      const request: AISummaryRequest = {
        diff: largeDiff,
        branchName: 'refactor/large',
        filesChanged: ['file1.ts', 'file2.ts'],
        stats: { insertions: 100, deletions: 50 },
      };

      const result = buildSummaryPrompt(request);
      
      expect(result).toContain(largeDiff);
      expect(result).toBeDefined();
    });

    it('should replace placeholders in custom template', () => {
      const request: AISummaryRequest = {
        diff: 'test diff content',
        branchName: 'test',
        filesChanged: ['test.ts'],
        stats: { insertions: 1, deletions: 0 },
      };
      const customTemplate = 'Branch: {branchName}\nChanges:\n{diff}\nPlease summarize.';

      const result = buildSummaryPrompt(request, undefined, customTemplate);
      
      expect(result).toContain('Changes:\ntest diff content');
      expect(result).not.toContain('{diff}');
    });
  });

  describe('DEFAULT_PROMPT_TEMPLATE', () => {
    it('should contain expected instructions', () => {
      expect(DEFAULT_PROMPT_TEMPLATE).toContain('commit');
      expect(DEFAULT_PROMPT_TEMPLATE).toContain('{diff}');
    });

    it('should have required placeholders', () => {
      expect(DEFAULT_PROMPT_TEMPLATE.includes('{diff}')).toBe(true);
      expect(DEFAULT_PROMPT_TEMPLATE.includes('{customInstructions}')).toBe(true);
    });

    it('should specify JSON output format', () => {
      expect(DEFAULT_PROMPT_TEMPLATE).toContain('JSON');
      expect(DEFAULT_PROMPT_TEMPLATE).toContain('title');
      expect(DEFAULT_PROMPT_TEMPLATE).toContain('summary');
    });
  });
});
