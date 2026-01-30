# git-summary-ai CLI Usage Guide

A CLI tool that pushes code with AI-generated commit summaries to help team code reviews.

## Installation

### Option 1: Install from Git Repository (Requires Node.js)

```bash
# Install from GitHub (HTTPS)
npm install -g git+https://github.com/YOUR_ORG/git-summary-ai.git

# Install from GitHub (SSH)
npm install -g git+ssh://git@github.com:YOUR_ORG/git-summary-ai.git

# Install from private repo with token
npm install -g git+https://<TOKEN>@github.com/YOUR_ORG/git-summary-ai.git
```

### Option 2: Download Standalone Executable (No Node.js required)

Download the executable for your platform from the [Releases](../../releases) page:

| Platform | File |
|----------|------|
| Windows | `git-summary-ai-win.exe` |
| macOS | `git-summary-ai-macos` |
| Linux | `git-summary-ai-linux` |

**After downloading:**

**Windows:** Move to a folder in your PATH or run directly.

**macOS/Linux:**
```bash
chmod +x git-summary-ai-*
sudo mv git-summary-ai-* /usr/local/bin/git-summary-ai
```

## Quick Start

```bash
# First time: Run the setup wizard
git-summary-ai setup

# Then use the complete workflow
git-summary-ai run
```

## Getting Started

### First-Time Setup

Before using the tool, you **must** run the setup wizard:

```bash
git-summary-ai setup
```

The wizard will:
1. Configure your AI provider (Claude, OpenAI, or GitHub Models)
2. Choose secure credential storage (OS Keychain or environment file)
3. Set default preferences (target branch, etc.)

**Setup Detection:** Commands that require AI providers (`run`, `analyze`, `commit`, `summarize`) will automatically check if setup is complete and guide you if not. You'll see:

```
❌ Setup Required

ℹ No AI provider API keys found.
ℹ You need to configure at least one AI provider to use this tool.

ℹ Available providers:
  • Claude (Anthropic) - Recommended for best results
  • OpenAI (GPT) - GPT-4o and other OpenAI models
  • GitHub Models - Free tier available with GitHub account

ℹ To get started, run:
   git-summary-ai setup
```

### GitHub Authentication (for PR creation)

For creating pull requests, you need GitHub authentication:

**Option 1: GitHub CLI (Recommended)**
```bash
gh auth login
```

**Option 2: Personal Access Token**
```bash
git-summary-ai config credentials
# Select GitHub and enter your token
```

## Commands

### `run` - Full Workflow Automation

Execute the complete workflow: analyze, summarize, commit, and push in one command.

```bash
git-summary-ai run [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `-t, --target <branch>` | Target branch to compare against (overrides config) |
| `--push` | Automatically push to remote after commit |
| `--pr <base-branch>` | Create a pull request after pushing (implies --push) |
| `-y, --yes` | Skip all confirmations and use defaults (useful for CI/CD) |

**Workflow Steps:**
1. Checks if setup wizard has been completed (guides you if not)
2. Analyzes branch diff against target branch
3. Generates AI-powered summary using configured provider
4. Previews commit message with interactive options (accept/edit/regenerate/cancel)
5. Stages all changes and commits with AI-generated message
6. Pushes to remote (sets upstream if needed) - if --push flag used
7. Creates pull request - if --pr flag used

**Examples:**
```bash
# Basic workflow (analyze + summarize + commit)
git-summary-ai run

# Workflow with push
git-summary-ai run --push

# Complete workflow with PR creation
git-summary-ai run --push --pr main
```

---

### `analyze` - Branch Diff Analysis

Analyze branch diff against target branch and display statistics.

```bash
git-summary-ai analyze [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `-t, --target <branch>` | Target branch to compare against |
| `-v, --verbose` | Show detailed file list with all modified files |

**Output:**
- Current branch name
- Tracking branch info (if applicable)
- File change statistics (files changed, insertions, deletions)
- Optional: List of all modified files

---

### `summarize` - AI Summary Generation

Generate AI-powered summary with interactive preview and confirmation.

```bash
git-summary-ai summarize [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `-t, --target <branch>` | Target branch to compare against |

**Features:**
- Interactive review loop (accept/edit title/edit summary/regenerate/cancel)
- In-terminal title editing
- External editor for detailed summary editing
- Automatic commit after acceptance

---

### `pr` - Create Pull Request

Create a GitHub pull request from your current branch with flexible message options.

```bash
git-summary-ai pr [base-branch] [options]
```

**Arguments:**
| Argument | Description |
|----------|-------------|
| `base-branch` | Base branch to merge into (e.g., main, master) - optional, will prompt if not provided |

**Options:**
| Option | Description |
|--------|-------------|
| `-t, --title <title>` | PR title (default: last commit message) |
| `--body <body>` | Custom PR body message |
| `--first` | Use only the last commit message for PR body (no prompt) |
| `--all` | Use all commits being merged (commits not in target branch) |
| `-d, --draft` | Create as draft PR |

**Authentication:**
- Automatically uses GitHub CLI token (`gh auth token`) if available
- Falls back to credential manager or GITHUB_TOKEN environment variable
- Prioritizes GitHub CLI for better permissions

**Examples:**
```bash
# Quick PR with all commits being merged (no prompts)
gitai pr main --all

# Quick PR with last commit only
gitai pr master --first

# Interactive (choose message source)
gitai pr main

# Custom message
gitai pr main --body "My custom PR description"

# Draft PR with all commits
gitai pr main --all --draft
```
- Falls back to configured GitHub token
- Configure with: `git-summary-ai config credentials` or `gh auth login`

**PR Body Options:**
When creating a PR, you'll be prompted to choose:
1. **Use last commit message** - Use the most recent commit's body
2. **Use all commit messages** - Combine all commits from your branch
3. **Write custom message** - Open editor to write custom description

**Examples:**
```bash
# Interactive PR creation
git-summary-ai pr

# Create PR with specific base branch
git-summary-ai pr --base develop

# Create draft PR
git-summary-ai pr --base main --draft
```

---

### `push` - Push to Remote

Push current branch to remote repository.

```bash
git-summary-ai push [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `-u, --set-upstream` | Set upstream tracking branch |

---

### `setup` - Interactive Setup Wizard

Configure API keys and preferences interactively.

```bash
git-summary-ai setup
```

**Features:**
- Provider selection (Claude, OpenAI, GitHub Models)
- Secure storage options (OS Keychain or global .env)
- Model selection with recommendations
- Default target branch configuration
- PR readiness check (verifies GitHub CLI or token)
- Skip option to configure only preferences

**Storage Options:**
1. **OS Keychain** (Recommended) - Secure system storage
2. **Global .env file** - `~/.git-summary-ai/.env`

---

### `config` - Configuration Management

Manage CLI configuration.

#### `config init`

Initialize configuration interactively.

```bash
git-summary-ai config init
```

**Prompts:**
- AI provider selection (Claude or OpenAI)
- Default target branch
- Create .env file option

**Creates:**
- `.git-summary-airc.json` - Configuration file
- `.env` (optional) - API keys template

#### `config show`

Display current configuration.

```bash
git-summary-ai config show
```

**Output:**
- Provider (Claude/OpenAI)
- Model (or default)
- Max tokens
- Target branch
- Language
- Exclude patterns (if any)
- API key status for both providers

---

## Global Options

| Option | Description |
|--------|-------------|
| `--help` | Display help information |
| `--version` | Show CLI version |

---

## Configuration

The CLI supports configuration via multiple formats:
- `.git-summary-airc.json`
- `.git-summary-airc.yaml`
- `git-summary-ai.config.js`
- `package.json` (under `git-summary-ai` field)

### Configuration Parameters

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `provider` | `'claude'` \| `'openai'` | `'claude'` | AI provider to use |
| `model` | `string` | Provider default | Specific model to use |
| `maxTokens` | `number` | `1024` | Max tokens for AI response |
| `targetBranch` | `string` | `'main'` | Default branch to compare against |
| `excludePatterns` | `string[]` | `[]` | File patterns to exclude from analysis |
| `language` | `string` | `'en'` | Summary language |

### Example Configuration

```json
{
  "provider": "claude",
  "targetBranch": "main",
  "maxTokens": 1024,
  "language": "en",
  "excludePatterns": ["*.lock", "dist/*"]
}
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `CLAUDE_API_KEY` | API key for Anthropic Claude |
| `OPENAI_API_KEY` | API key for OpenAI GPT |
| `DEBUG` | Enable debug logging (shows stack traces on errors) |

---

## Examples

```bash
# Analyze changes against main branch with verbose output
git-summary-ai analyze -t main -v

# Generate summary and skip confirmation
git-summary-ai summarize -y

# Commit with a custom message
git-summary-ai commit -m "feat: add user authentication"

# Commit all changes with AI-generated message
git-summary-ai commit -a

# Push and automatically set upstream
git-summary-ai push -u

# Run full workflow against develop branch
git-summary-ai run -t develop

# Run full workflow in CI/CD (no prompts)
git-summary-ai run -y
```
