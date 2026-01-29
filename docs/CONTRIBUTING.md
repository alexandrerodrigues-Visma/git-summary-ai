# Contributing to git-summary-ai

Thank you for using git-summary-ai! This guide will help you get started with the tool and contribute effectively.

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Git configured with a GitHub remote
- API key from one of the supported providers:
  - **Claude (Anthropic)** - Recommended for quality
  - **OpenAI** - GPT-4 for detailed summaries
  - **GitHub Models** - Free with GitHub account

### Initial Setup

1. **Install the tool globally:**
   ```bash
   npm install -g git-summary-ai
   ```

2. **Run the setup wizard:**
   ```bash
   git-summary-ai setup
   ```
   
   This will guide you through:
   - Selecting an AI provider
   - Configuring your API key (stored securely in OS Keychain or .env)
   - Setting default preferences

3. **Verify your configuration:**
   ```bash
   git-summary-ai config show
   ```

## Team Recommended Workflow

### Basic Usage

```bash
# 1. Make your code changes
git add .

# 2. Generate AI summary and commit
git-summary-ai summarize

# 3. Review the generated message, edit if needed, then accept

# 4. Push to remote
git-summary-ai push

# 5. (Optional) Create PR
git-summary-ai pr -b main
```

### Quick Workflow

For faster iterations, use the combined command:

```bash
# Commit and push in one step
git-summary-ai run --push

# Or create PR directly
git-summary-ai run --push --pr main
```

## Configuration

### Global Configuration

Located at `~/.git-summary-ai/config.json`:

```json
{
  "provider": "claude",
  "model": "claude-3-5-sonnet-20241022",
  "targetBranch": "main",
  "maxTokens": 4000
}
```

### Project-Level Overrides

Create `.git-summary-airc.json` in your project root:

```json
{
  "targetBranch": "develop",
  "commitPrefix": "feat"
}
```

### Environment Variables

```bash
# API Keys (checked first, override all other sources)
export CLAUDE_API_KEY="sk-ant-..."
export OPENAI_API_KEY="sk-..."
export GITHUB_TOKEN="ghp_..."
```

## Commands Reference

### Core Commands

- `git-summary-ai setup` - Interactive setup wizard
- `git-summary-ai summarize` - Generate AI summary and commit
- `git-summary-ai push` - Push commits to remote
- `git-summary-ai pr -b <branch>` - Create pull request
- `git-summary-ai run --push --pr <branch>` - Full workflow

### Utility Commands

- `git-summary-ai analyze` - Analyze branch diff
- `git-summary-ai repo status` - Show git remote info
- `git-summary-ai config show` - Display current config
- `git-summary-ai config credentials` - Manage API keys

## Troubleshooting

### API Key Not Found

```bash
# Check configuration
git-summary-ai config show

# Re-run setup
git-summary-ai setup

# Or set environment variable
export CLAUDE_API_KEY="your-key"
```

### No Changes Detected

```bash
# Make sure you have uncommitted changes
git status

# Check what branch you're comparing against
git-summary-ai analyze
```

### GitHub Token Issues

For PR creation, you need a GitHub token with `repo` scope:

1. Go to https://github.com/settings/tokens
2. Generate new token (classic)
3. Select `repo` scope
4. Store it: `git-summary-ai config credentials`

## Best Practices

### Commit Messages

The tool generates conventional commit format:
- `feat:` - New features
- `fix:` - Bug fixes
- `refactor:` - Code restructuring
- `docs:` - Documentation changes
- `test:` - Test additions/changes
- `chore:` - Maintenance tasks

### Editing Summaries

You can edit generated summaries:
- **Edit title only** - Quick title tweaks (stays in terminal)
- **Edit summary only** - Opens editor for detailed changes
- **Regenerate** - Get a new AI-generated summary

### Branch Workflow

The tool auto-detects your tracking branch:
```bash
# Compares against origin/feature-branch automatically
git-summary-ai summarize

# Or specify a different target
git-summary-ai summarize -t develop
```

## Reporting Issues

If you encounter issues:

1. **Check the logs** - The tool provides detailed error messages
2. **Verify setup** - Run `git-summary-ai config show`
3. **Report to the team** - [Add your team's issue reporting channel here]

### Common Issues

- **"Not a git repository"** - Run from inside a git project
- **"No changes detected"** - Commit or stage your changes first
- **"API key not found"** - Run `git-summary-ai setup`
- **"GitHub token required"** - For PR creation, set GITHUB_TOKEN

## Development

### Building Locally

```bash
# Clone the repository
git clone [your-repo-url]
cd git-summary-ai

# Install dependencies
npm install

# Build
npm run build

# Test locally
npm link
git-summary-ai --help
```

### Project Structure

```
src/
  commands/      - CLI command implementations
  services/      - Core services (git, AI, GitHub API)
  config/        - Configuration loading and validation
  utils/         - Utility functions
  prompts/       - AI prompt templates
```

## Questions?

- Check the README: [Link to your internal docs]
- Ask in [your team's chat channel]
- Create an issue in [your internal repo]

---

**Happy coding! 🚀**
