import type { AISummaryRequest } from '../services/ai/ai.interface.js';

export function buildSummaryPrompt(request: AISummaryRequest): string {
  return `You are a helpful assistant that generates clear, concise commit summaries for code reviews.

Analyze the following git diff and generate a detailed, topic-grouped commit message.

## Context
- Branch: ${request.branchName}
- Files changed: ${request.filesChanged.length}
- Lines added: +${request.stats.insertions}
- Lines removed: -${request.stats.deletions}

## Git Diff
\`\`\`diff
${truncateDiff(request.diff, 15000)}
\`\`\`

## Output Format
Respond in the following JSON format only, with no additional text:
{
  "title": "feat: short conventional commit title (max 72 chars)",
  "summary": "## Primary changes\\n- Key change 1\\n- Key change 2\\n\\n## Security\\n- Security-related changes",
  "commitMessage": "Combined title + summary for backward compatibility"
}

Guidelines for the title:
- Use conventional commit format: type(scope): description
- Types: feat, fix, refactor, docs, test, perf, chore, style, ci, build
- Keep under 72 characters
- Be specific but concise
- Examples: "feat: add E2E testing infrastructure", "fix: resolve encryption vulnerability"

Guidelines for the detailed summary:
- Start with a brief title line (e.g., "## Primary changes")
- Group changes by topic area (e.g., ## Security, ## Testing, ## UI, ## API, ## Performance, ## Bug Fixes)
- Use concise bullet points with specific details
- Mention file names when relevant (e.g., "Files: config.tsx, route.ts")
- Quantify when possible (e.g., "~800 lines reduced", "55 new tests", "7s vs 2.4min")
- Highlight critical changes like security fixes, breaking changes, or performance improvements
- Keep it scannable and action-oriented
- This will be used as the actual git commit message, so make it informative

Example:
## Primary changes
- Optimize E2E tests with navigation helpers (~800 lines reduced)
- Add smoke tests for fast validation (7s vs 2.4min full suite)

## Security
- Fix critical encryption vulnerability: replace fixed IV with random IV
- Files: encryption.ts, migration-utils.ts`;
}

function truncateDiff(diff: string, maxLength: number): string {
  if (diff.length <= maxLength) {
    return diff;
  }

  const truncated = diff.slice(0, maxLength);
  const lastNewline = truncated.lastIndexOf('\n');

  return truncated.slice(0, lastNewline) + '\n\n[... diff truncated for length ...]';
}

export function parseAIResponse(response: string): { title?: string; summary: string; commitMessage: string } {
  // Try to extract JSON from the response
  const jsonMatch = response.match(/\{[\s\S]*\}/);

  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      const title = parsed.title || '';
      const summary = parsed.summary || 'Unable to generate summary';
      const commitMessage = title && summary ? `${title}\n\n${summary}` : (parsed.commitMessage || summary);
      
      return {
        title,
        summary,
        commitMessage,
      };
    } catch {
      // Fall through to fallback
    }
  }

  // Fallback: use the whole response as summary
  return {
    summary: response,
    commitMessage: response,
  };
}
