import { describe, it, expect } from 'vitest';
import { parseAIResponse } from '../src/prompts/summary.prompt.js';

describe('AI Response Parser', () => {
  describe('parseAIResponse', () => {
    it('should parse valid JSON response with title and summary', () => {
      const response = JSON.stringify({
        title: 'Add user authentication',
        summary: 'Implemented JWT-based authentication system',
      });

      const result = parseAIResponse(response);

      expect(result.title).toBe('Add user authentication');
      expect(result.summary).toBe('Implemented JWT-based authentication system');
      expect(result.commitMessage).toBe('Add user authentication\n\nImplemented JWT-based authentication system');
    });

    it('should parse JSON with only summary field', () => {
      const response = JSON.stringify({
        summary: 'Fixed bug in login flow',
      });

      const result = parseAIResponse(response);

      expect(result.title).toBe('');
      expect(result.summary).toBe('Fixed bug in login flow');
      expect(result.commitMessage).toBe('Fixed bug in login flow');
    });

    it('should parse JSON with commitMessage field', () => {
      const response = JSON.stringify({
        commitMessage: 'feat: add new feature\n\nDetailed description here',
      });

      const result = parseAIResponse(response);

      expect(result.summary).toBe('Unable to generate summary');
      expect(result.commitMessage).toBe('feat: add new feature\n\nDetailed description here');
    });

    it('should extract JSON from response with surrounding text', () => {
      const response = `Here's the analysis:

{"title": "Update dependencies", "summary": "Updated all npm packages to latest versions"}

Hope this helps!`;

      const result = parseAIResponse(response);

      expect(result.title).toBe('Update dependencies');
      expect(result.summary).toBe('Updated all npm packages to latest versions');
    });

    it('should handle malformed JSON by using raw response', () => {
      const response = '{ "title": "Incomplete JSON...';

      const result = parseAIResponse(response);

      expect(result.summary).toBe(response);
      expect(result.commitMessage).toBe(response);
    });

    it('should handle response with no JSON as fallback', () => {
      const response = 'This is a plain text response without any JSON';

      const result = parseAIResponse(response);

      expect(result.summary).toBe(response);
      expect(result.commitMessage).toBe(response);
      expect(result.title).toBeUndefined();
    });

    it('should handle empty response', () => {
      const result = parseAIResponse('');

      expect(result.summary).toBe('');
      expect(result.commitMessage).toBe('');
    });

    it('should handle response with nested JSON objects', () => {
      const response = JSON.stringify({
        title: 'Complex change',
        summary: 'Multiple updates',
        details: {
          files: ['a.ts', 'b.ts'],
          changes: 42,
        },
      });

      const result = parseAIResponse(response);

      expect(result.title).toBe('Complex change');
      expect(result.summary).toBe('Multiple updates');
    });

    it('should prioritize title+summary over commitMessage field', () => {
      const response = JSON.stringify({
        title: 'Short title',
        summary: 'Detailed summary',
        commitMessage: 'This should be ignored',
      });

      const result = parseAIResponse(response);

      expect(result.commitMessage).toBe('Short title\n\nDetailed summary');
    });

    it('should handle JSON with extra whitespace and newlines', () => {
      const response = `
        {
          "title":   "Update README"  ,
          "summary":    "Fixed typos and improved documentation"
        }
      `;

      const result = parseAIResponse(response);

      expect(result.title).toBe('Update README');
      expect(result.summary).toBe('Fixed typos and improved documentation');
    });
  });
});
