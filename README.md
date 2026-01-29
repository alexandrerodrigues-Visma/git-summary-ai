# git-summary-ai

A CLI tool that pushes code with AI-generated commit summaries to help team code reviews.

## Features

- Analyze branch diffs against target branches
- Generate AI-powered commit summaries using Claude or OpenAI
- Interactive preview and editing of commit messages
- Full workflow automation (analyze → summarize → commit → push)
- Flexible configuration via config files or environment variables

## Installation

```bash
npm install -g git-summary-ai
```

Or install locally in your project:

```bash
npm install git-summary-ai
```

## Setup

### 1. Initialize Configuration

```bash
git-summary-ai config init
```

This will create a `.git-summary-airc.json` config file and optionally a `.env` file for API keys.

### 2. Set API Keys

Set your API key as an environment variable:

```bash
# For Claude (Anthropic)
export CLAUDE_API_KEY=your-api-key

# For OpenAI
export OPENAI_API_KEY=your-api-key
```

Or add them to your `.env` file:

```env
CLAUDE_API_KEY=your-api-key
OPENAI_API_KEY=your-api-key
```

## Usage

### Full Workflow (Recommended)

```bash
git-summary-ai run
```

This runs the complete workflow:
1. Analyze your branch diff
2. Generate an AI summary
3. Preview and confirm the commit message
4. Commit and push to remote

### Individual Commands

```bash
# Analyze branch diff
git-summary-ai analyze

# Generate AI summary with preview
git-summary-ai summarize

# Commit with AI-generated message
git-summary-ai commit

# Push to remote
git-summary-ai push

# Show current configuration
git-summary-ai config show
```

### Options

```bash
# Compare against a specific branch
git-summary-ai run -t develop

# Skip confirmations (CI/CD mode)
git-summary-ai run -y

# Verbose output for analyze
git-summary-ai analyze -v
```

## Configuration

Configuration can be set via:

- `.git-summary-airc.json`
- `.git-summary-airc.yaml`
- `git-summary-ai.config.js`
- `package.json` (`git-summary-ai` field)

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `provider` | `'claude'` \| `'openai'` | `'claude'` | AI provider to use |
| `model` | `string` | Provider default | Specific model to use |
| `maxTokens` | `number` | `1024` | Max tokens for AI response |
| `targetBranch` | `string` | `'main'` | Default branch to compare against |
| `excludePatterns` | `string[]` | `[]` | File patterns to exclude |
| `language` | `string` | `'en'` | Summary language |

### Example Configuration

```json
{
  "provider": "claude",
  "targetBranch": "main",
  "maxTokens": 1500,
  "excludePatterns": ["*.lock", "*.min.js"]
}
```

## Example Output

```
$ git-summary-ai run

[1/4] Analyzing branch...
      Branch: feature/auth
      Files changed: 8 | Lines: +342 / -56

[2/4] Generating AI summary...

[3/4] Preview:
┌────────────────────────────────────────────┐
│ ## What Changed                            │
│ - Implemented JWT authentication service   │
│ - Added login/logout API endpoints         │
│                                            │
│ ## Why It Matters for Reviewers            │
│ - Security: Review token handling          │
│ - Check password hashing (line 45-67)      │
│                                            │
│ ## Breaking Changes                        │
│ - /api/user now requires auth              │
└────────────────────────────────────────────┘

? Accept this summary? (Y/n/edit)

[4/4] Committing and pushing...
      Done! Ready for review.
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run in development (watch mode)
npm run dev

# Type check
npm run typecheck

# Link for local testing
npm link
```

## License

MIT
