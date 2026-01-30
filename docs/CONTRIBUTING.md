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

## Testing

### Manual Smoke Test Checklist

Since the tool doesn't yet have automated tests, please run through these scenarios before releasing:

#### Setup Flow
- [ ] Run `git-summary-ai setup` with Claude provider
  - [ ] Verify API key validation works
  - [ ] Confirm config saved to `~/.git-summary-ai/config.json`
  - [ ] Check that credentials are stored securely
- [ ] Run `git-summary-ai setup` with OpenAI provider
  - [ ] Verify provider switching works
- [ ] Run `git-summary-ai setup` with GitHub Models provider
  - [ ] Verify all three providers are supported

#### Commit Workflow (Basic)
- [ ] Create test branch with 1-3 small file changes (< 1KB)
- [ ] Run `git-summary-ai summarize`
  - [ ] Verify diff analysis shows correct file counts
  - [ ] Verify AI generates appropriate commit message
  - [ ] Accept the generated summary
- [ ] Verify commit was created with `git log`

#### Commit Workflow (Regenerate & Edit)
- [ ] Create test branch with multiple files changed
- [ ] Run `git-summary-ai summarize`
  - [ ] Choose "Edit title only" - verify it works and doesn't affect summary
  - [ ] Cancel and regenerate - verify new summary is different
  - [ ] Choose "Edit summary only" - verify editor opens and changes persist

#### Secret Scanning
- [ ] Create branch with hardcoded API key in a file (e.g., `const apiKey = "sk-..."`)
- [ ] Run `git-summary-ai summarize`
  - [ ] Verify warning appears about potential secrets
  - [ ] Verify confirmation prompt appears
  - [ ] Cancel - verify it exits gracefully
  - [ ] Accept - verify it continues and commits
- [ ] Set `SKIP_SECRET_SCAN=true` and verify warning is suppressed

#### Large Diffs
- [ ] Create branch with changes > 15,000 characters
- [ ] Run `git-summary-ai summarize`
  - [ ] Verify diff is truncated with "[... diff truncated ...]" message
  - [ ] Verify commit still completes successfully

#### Push Workflow
- [ ] Create test branch and make a commit with `git-summary-ai summarize`
- [ ] Run `git-summary-ai push`
  - [ ] Verify branch is pushed to origin
  - [ ] Verify tracking is set up correctly
- [ ] Run `git-summary-ai push -u` on detached HEAD
  - [ ] Verify it sets upstream correctly

#### PR Creation
- [ ] Create and push a test branch
- [ ] Run `git-summary-ai pr main`
  - [ ] Verify GitHub auth works (tries gh CLI, then stored token)
  - [ ] Verify PR is created with correct title and body
  - [ ] Verify PR is created against correct base branch
- [ ] Test `gitai pr main --all` with multiple commits
  - [ ] Verify all commit messages are included
- [ ] Test `gitai pr main --first`
  - [ ] Verify only last commit is used
- [ ] Test `gitai pr main --draft`
  - [ ] Verify PR is created as draft

#### Combined Workflow
- [ ] Run `git-summary-ai run --push --pr main`
  - [ ] Verify full workflow works: summarize → commit → push → PR create

#### Edge Cases
- [ ] Try running commands with no changes
  - [ ] Verify appropriate "no changes" message appears
- [ ] Try running on detached HEAD
  - [ ] Verify helpful error message
- [ ] Run with expired/invalid API key
  - [ ] Verify clear error message
- [ ] Run without internet connection
  - [ ] Verify reasonable error handling
- [ ] Try PR creation without GitHub access
  - [ ] Verify clear error message about permissions

#### Error Scenarios
- [ ] Invalid branch names
  - [ ] Verify git operations fail gracefully
- [ ] GitHub token without `repo` scope
  - [ ] Verify PR creation fails with helpful message
- [ ] Uncommitted changes in wrong state
  - [ ] Verify tool detects and reports correctly
- [ ] Missing tracking branch
  - [ ] Verify auto-detection works or requires flag

#### Configuration
- [ ] Run `git-summary-ai config show`
  - [ ] Verify all settings display correctly
  - [ ] Verify no secrets are logged
- [ ] Run `git-summary-ai config credentials`
  - [ ] Verify you can add/update/delete credentials
  - [ ] Verify credentials are stored securely

### Quick Test Script
```bash
#!/bin/bash
# Quick test of main workflow
cd /tmp
mkdir -p test-git-summary
cd test-git-summary
git init
git config user.email "test@example.com"
git config user.name "Test User"
echo "test content" > file.txt
git add .
git commit -m "Initial commit"
git branch feature/test
git checkout feature/test
echo "new content" >> file.txt
git add .

# This would normally test the tool
# git-summary-ai summarize
```

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
