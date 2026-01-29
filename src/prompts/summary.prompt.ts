import type { AISummaryRequest } from '../services/ai/ai.interface.js';

export function buildSummaryPrompt(request: AISummaryRequest): string {
  return `You are a helpful assistant that generates clear, concise commit summaries for code reviews.

Analyze the following git diff and generate:
1. A detailed summary for reviewers
2. A concise commit message (max 72 characters for the first line)

## Context
- Branch: ${request.branchName}
- Files changed: ${request.filesChanged.length}
- Lines added: +${request.stats.insertions}
- Lines removed: -${request.stats.deletions}

## Files Modified
${request.filesChanged.map(f => `- ${f}`).join('\n')}

## Git Diff
\`\`\`diff
${truncateDiff(request.diff, 15000)}
\`\`\`

## Output Format
Respond in the following JSON format only, with no additional text:
{
  "summary": "## What Changed\\n- Point 1\\n- Point 2\\n\\n## Why It Matters for Reviewers\\n- Review focus 1\\n- Review focus 2\\n\\n## Breaking Changes\\n- None (or list them)",
  "commitMessage": "feat: short description\\n\\nLonger description if needed"
}

Guidelines:
- Focus on WHAT changed and WHY it matters for reviewers
- Highlight areas that need careful review (security, performance, breaking changes)
- Use conventional commit format (feat:, fix:, refactor:, docs:, etc.)
- Keep the summary concise but informative
- Mention specific files/functions if they're critical to review`;
}

function truncateDiff(diff: string, maxLength: number): string {
  if (diff.length <= maxLength) {
    return diff;
  }

  const truncated = diff.slice(0, maxLength);
  const lastNewline = truncated.lastIndexOf('\n');

  return truncated.slice(0, lastNewline) + '\n\n[... diff truncated for length ...]';
}

export function parseAIResponse(response: string): { summary: string; commitMessage: string } {
  // Try to extract JSON from the response
  const jsonMatch = response.match(/\{[\s\S]*\}/);

  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: parsed.summary || 'Unable to generate summary',
        commitMessage: parsed.commitMessage || 'chore: update code',
      };
    } catch {
      // Fall through to fallback
    }
  }

  // Fallback: use the whole response as summary
  return {
    summary: response,
    commitMessage: 'chore: update code',
  };
}
