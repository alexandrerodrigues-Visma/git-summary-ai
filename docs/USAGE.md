# git-summary-ai CLI Usage Guide

A CLI tool that pushes code with AI-generated commit summaries to help team code reviews.

## Installation

### Option 1: Install from npm (Recommended)

```bash
# From public npm registry
npm install -g git-summary-ai
```

### Option 2: Install from GitHub Packages

```bash
# Configure npm to use GitHub Packages for scoped packages
echo "@alexandrerodrigues-visma:registry=https://npm.pkg.github.com" >> ~/.npmrc

# Install
npm install -g @alexandrerodrigues-visma/git-summary-ai
```

### Option 3: Install from Git Repository

```bash
# Install from GitHub (HTTPS)
npm install -g git+https://github.com/alexandrerodrigues-Visma/git-summary-ai.git

# Install from GitHub (SSH)
npm install -g git+ssh://git@github.com:alexandrerodrigues-Visma/git-summary-ai.git
```

### Option 4: Download Standalone Executable (No Node.js required)

Download the executable for your platform from the [Releases](https://github.com/alexandrerodrigues-Visma/git-summary-ai/releases) page:

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
1. Configure your AI provider (Claude, OpenAI, GitHub Models, or Google Gemini)
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
  • Google Gemini - Fast responses with multimodal capabilities

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
| `-p, --provider <provider>` | AI provider to use: `claude`, `openai`, `copilot`, or `gemini` (overrides config) |
| `--model <model>` | AI model to use (overrides default for provider) |
| `--push` | Automatically push to remote after commit |
| `--pr <base-branch>` | Create a pull request after pushing (implies --push) |
| `-y, --yes` | Skip all confirmations and use defaults (useful for CI/CD) |

**Workflow Steps:**
1. Checks if setup wizard has been completed (guides you if not)
2. Analyzes branch diff against target branch
3. Generates AI-powered summary using configured provider
4. Previews commit message with interactive options:
   - **Accept**: Commit with the generated message
   - **Edit**: Modify title or description
   - **Regenerate**: Create a new version (with or without custom instructions)
   - **Cancel**: Abort the workflow
5. Stages all changes and commits with AI-generated message
6. Pushes to remote (sets upstream if needed) - if --push flag used
7. Creates pull request - if --pr flag used

**Examples:**
```bash
# Basic workflow (analyze + summarize + commit)
git-summary-ai run

# Use specific AI provider
git-summary-ai run --provider copilot

# Use specific model
git-summary-ai run --provider copilot --model gpt-4o

# Workflow with push
git-summary-ai run --push

# Complete workflow with PR creation using custom model
git-summary-ai run --push --pr main --provider copilot --model gpt-4o
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
| `-p, --provider <provider>` | AI provider to use: `claude`, `openai`, `copilot`, or `gemini` (overrides config) |
| `--model <model>` | AI model to use (overrides default for provider) |
| `-y, --yes` | Skip preview confirmation and commit immediately |

**Features:**
- Interactive review loop (accept/edit title/edit summary/regenerate/cancel)
- **Smart Regenerate Options:**
  - **Same prompt**: Generate a new version with the same instructions
  - **Refine prompt**: Add custom instructions to improve specific aspects
    - Examples: "Focus more on security", "Be more concise", "Add technical details"
- In-terminal title editing
- External editor for detailed summary editing
- Automatic commit after acceptance

**Examples:**
```bash
# Generate summary with default provider
git-summary-ai summarize

# Use GitHub Copilot
git-summary-ai summarize --provider copilot

# Use specific model
git-summary-ai summarize --provider copilot --model gpt-4o

# Quick commit with OpenAI, no preview
git-summary-ai summarize --provider openai --yes
```

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
| `--force` | Force push to remote |

---

### `tokens` - Token Usage Tracking

View and manage AI token usage statistics.

```bash
git-summary-ai tokens [subcommand] [options]
```

**Subcommands:**
| Subcommand | Description |
|------------|-------------|
| *(default)* | Show summary (today, week, month) |
| `today` | Show today's usage |
| `week` | Show this week's usage |
| `month` | Show this month's usage |
| `year` | Show this year's usage |
| `all` | Show all-time usage |
| `export [file]` | Export usage data to JSON (default: token-usage-export.json) |
| `clear` | Clear usage history (with confirmation) |

**Features:**
- Token counts by provider (Claude, OpenAI, GitHub Models, Gemini)
- Token counts by model (e.g., gpt-4o, claude-3-5-sonnet)
- Input/output token breakdown
- Request counts and averages
- Visual progress bars and percentages
- Time-based filtering (day, week, month, year)
- JSON export for custom analysis

**Examples:**
```bash
# View summary dashboard
git-summary-ai tokens

# View today's usage
git-summary-ai tokens today

# View this month's detailed breakdown
git-summary-ai tokens month

# Export all usage data
git-summary-ai tokens export my-usage-report.json

# Clear history (requires confirmation)
git-summary-ai tokens clear
```

**Sample Output:**
```
🔢 Token Usage Summary

Today (Feb 3, 2026):
  Requests: 5
  Tokens:   25,430
    ↑ Input:   21,250 (84%)
    ↓ Output:  4,180 (16%)

This Week:
  Requests: 23
  Tokens:   118,902

By Provider:
  Copilot       78,500 (66%)  ████████████████░░░░
  Claude        40,402 (34%)  ████████░░░░░░░░░░░░

Top Models:
  1.  gpt-4o                            78,500 tokens  (  18 requests)
  2.  claude-3-5-sonnet-20241022        40,402 tokens  (   5 requests)

Average per request: 5,170 tokens
```

**Configuration:**
Token tracking can be configured in your config file:
```json
{
  "showTokens": true,              // Display tokens after each operation
  "tokenTracking": {
    "enabled": true,                // Enable tracking (default: true)
    "retentionDays": 365            // Keep data for 365 days (default)
  }
}
```

**Storage:**
Usage data is stored in `~/.git-summary-ai/token-usage.json`.

---

### `push` (continued)

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
- Provider selection (Claude, OpenAI, GitHub Models, Google Gemini)
- Secure storage options (OS Keychain or global .env)
- Model selection with recommendations
- Default target branch configuration
- PR readiness check (verifies GitHub CLI or token)
- Skip option to configure only preferences

**Storage Options:**
1. **OS Keychain** (Recommended) - Secure system storage
2. **Global .env file** - `~/.git-summary-ai/.env`

---

## AI Provider Selection

### Choosing a Provider

You can configure multiple AI providers during setup and switch between them:

**Default Provider (in config):**
The setup wizard automatically sets your first configured provider as the default. You can change it later:

```bash
# Set your default AI provider
gitai config set-provider copilot
gitai config set-provider openai
gitai config set-provider claude
```

This saves to `~/.git-summary-ai/config.json`:
```json
{
  "provider": "copilot"
}
```

**Per-Command Override:**
Use the `--provider` flag to temporarily use a different provider:
```bash
# Use GitHub Copilot for this summary
gitai summarize --provider copilot

# Use OpenAI for this run
gitai run --provider openai --push

# Use Claude for this commit
gitai commit --provider claude
```

**Available Providers:**
- `claude` - Anthropic Claude (recommended for quality)
- `openai` - OpenAI GPT models
- `copilot` - GitHub Models (requires GitHub token)

**Automatic Detection:**
If you specify a provider that isn't configured, you'll get a helpful message:
```
❌ Provider 'openai' is not configured. Available providers: claude, copilot.
Run 'git-summary-ai setup' to configure openai.
```

If no providers are configured at all:
```
❌ No AI providers configured. Please run 'git-summary-ai setup' to configure an AI provider.
```

---

## AI Model Selection

### Choosing a Model

Each AI provider offers multiple models with different capabilities. You can set default models per provider and override them per-command.

**Default Model Per Provider:**
Set a default model for each configured provider:

```bash
# View available models
gitai config list-models copilot

# Set default for a provider
gitai config set-model copilot gpt-4o
gitai config set-model claude claude-sonnet-4-20250514
gitai config set-model openai gpt-4o-mini
```

This saves to `~/.git-summary-ai/config.json`:
```json
{
  "provider": "copilot",
  "models": {
    "copilot": "gpt-4o",
    "claude": "claude-sonnet-4-20250514"
  }
}
```

**Per-Command Model Override:**
Use the `--model` flag to temporarily use a different model:

```bash
# Use gpt-4o for this summary
gitai summarize --provider copilot --model gpt-4o

# Use Claude Haiku for faster response
gitai commit --provider claude --model claude-3-5-haiku-20241022

# Use GPT-4 Turbo for this run
gitai run --provider openai --model gpt-4-turbo
```

**Model Selection Priority:**
1. Explicit `--model` flag (highest priority)
2. Provider-specific model in `config.models[provider]`
3. Legacy `config.model` (deprecated, for backwards compatibility)
4. Provider default (e.g., `gpt-4o-mini` for GitHub Copilot)

**Available Models:**

**Claude (Anthropic):**
- `claude-sonnet-4-20250514` - Latest, most capable (recommended)
- `claude-3-7-sonnet-20250219` - Balanced performance
- `claude-3-5-sonnet-20241022` - Previous generation
- `claude-3-5-haiku-20241022` - Faster, lower cost

**OpenAI:**
- `gpt-4o` - Most capable multimodal (recommended)
- `gpt-4o-mini` - Faster and more affordable
- `gpt-4-turbo` - Previous generation flagship
- `gpt-3.5-turbo` - Fast and cost-effective

**GitHub Models:**
- `gpt-4o-mini` - Default, good availability (recommended)
- `gpt-4o` - More capable, may have rate limits
- `o1-preview` - Advanced reasoning model
- `o1-mini` - Smaller reasoning model

Run `gitai config list-models` for the complete list with descriptions.

---

## Custom Prompt Templates

Customize the AI prompt structure to match your team's needs, company formats, or specific requirements.

### Managing Templates

```bash
# Edit custom template in your default editor
gitai config edit-prompt-template

# View current template
gitai config show-prompt-template

# Reset to default template
gitai config reset-prompt-template
```

### Template Variables

Your custom template can use these variables that will be replaced dynamically:

- **`{diff}`** - The git diff content (automatically truncated if too long)
- **`{context}`** - Branch name, files changed, line statistics
- **`{customInstructions}`** - Custom refinement instructions from regeneration

### Example Custom Template

Here's an example template for Jira-style commit messages:

```
Analyze this code change and provide a summary for Jira ticket integration.

{customInstructions}

## Context
{context}

## Code Changes
```diff
{diff}
```

## Output Format
Provide the response in JSON format:
{
  "title": "PROJ-123: Brief title following Jira convention",
  "summary": "## What Changed\\n- Bullet points\\n\\n## Why\\n- Business reasons",
  "commitMessage": "Combined title and summary"
}

Guidelines:
- Start title with Jira ticket ID
- Focus on business impact in summary
- Keep technical details concise
```

### Use Cases

**Company-Specific Formats:**
```
Our team uses this commit format:
[TYPE] TICKET-ID: Description

Types: FEATURE, BUGFIX, REFACTOR, DOCS
```

**Security-Focused:**
```
Analyze for security implications:
- Authentication changes
- Authorization changes
- Data exposure risks
- Dependency updates
{customInstructions}
```

**Multi-Language:**
```
Générez un résumé en français pour ce changement de code.

{customInstructions}

Contexte:
{context}

Différences:
{diff}
```

---

### `config` - Configuration Management

Manage CLI configuration.

#### `config init`

Initialize configuration interactively.

```bash
git-summary-ai config init

# Skip template prompt and force default/custom template mode
git-summary-ai config init --template default
git-summary-ai config init --template custom

# Skip model prompt and force model for selected provider
git-summary-ai config init --model gpt-4o
```

**Prompts:**
- AI provider selection (Claude, OpenAI, Copilot, or Gemini)
- Default model selection for chosen provider
- Default target branch
- Prompt template choice (use default or create custom from default base)

**Creates:**
- `.git-summary-airc.json` - Configuration file (includes custom `promptTemplate` when selected)

#### `config show`

Display current configuration.

```bash
git-summary-ai config show
```

**Output:**
- Provider (Claude/OpenAI/Copilot)
- Model (or default)
- Max tokens
- Target branch
- Language
- Exclude patterns (if any)
- API key status for all providers

#### `config set-provider <provider>`

Set the default AI provider globally.

```bash
# Set GitHub Copilot as default
git-summary-ai config set-provider copilot

# Set Claude as default
git-summary-ai config set-provider claude

# Set OpenAI as default
git-summary-ai config set-provider openai
```

**Features:**
- Only allows setting providers that are already configured (have API keys)
- Shows list of configured providers if requested one is not available
- Updates `~/.git-summary-ai/config.json`
- Takes effect immediately for all subsequent commands

**Example:**
```bash
$ gitai config set-provider copilot
✔ Default AI provider set to: copilot

ℹ This provider will be used by default for all commands.
ℹ You can override it per-command with the --provider flag.
```

#### `config credentials`

Manage stored API credentials interactively.

```bash
git-summary-ai config credentials
```

#### `config set-model <provider> <model>`

Set the default model for a specific AI provider.

```bash
# Set default model for GitHub Copilot
git-summary-ai config set-model copilot gpt-4o

# Set default model for Claude
git-summary-ai config set-model claude claude-sonnet-4-20250514

# Set default model for OpenAI
git-summary-ai config set-model openai gpt-4o-mini
```

**Features:**
- Validates provider is configured (has API key) before allowing model to be set
- Validates model is available for the provider
- Shows available models if invalid model specified
- Updates `~/.git-summary-ai/config.json` in `models` object
- Takes effect immediately for all subsequent commands

**Example:**
```bash
$ gitai config set-model copilot gpt-4o
✔ Default model for copilot set to: gpt-4o

ℹ This model will be used when running commands with this provider.
ℹ You can override it per-command with the --model flag.
```

#### `config list-models [provider]`

List available AI models for a provider or all providers.

```bash
# List all models for all providers
git-summary-ai config list-models

# List models for specific provider
git-summary-ai config list-models copilot
git-summary-ai config list-models claude
git-summary-ai config list-models openai
```

**Features:**
- Shows model ID, name, and description
- Marks recommended default models
- Highlights your configured default model per provider
- Indicates which providers are configured (have API keys)
- Detailed view when specifying a provider

**Example Output:**
```bash
$ gitai config list-models copilot

┌──────────────────────────────────────────┐
│ Available Models for GitHub Models       │
└──────────────────────────────────────────┘

ℹ gpt-4o-mini (recommended)
      Name: GPT-4o Mini
      Description: Default GitHub Models endpoint

ℹ gpt-4o ✓ Your default
      Name: GPT-4o
      Description: More capable, may have rate limits

ℹ Set default: gitai config set-model copilot <model-id>
```

---

#### `config edit-prompt-template`

Edit the custom AI prompt template in your default editor.

```bash
git-summary-ai config edit-prompt-template
```

Opens your default editor with template variables explained. Customize how the AI analyzes your code changes.

---

#### `config show-prompt-template`

Display the current AI prompt template.

```bash
git-summary-ai config show-prompt-template
```

Shows whether you're using a custom or default template.

---

#### `config reset-prompt-template`

Reset the AI prompt template to the default.

```bash
git-summary-ai config reset-prompt-template
```

Removes your custom template and restores the built-in default.

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
