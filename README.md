# git-summary-ai

> AI-powered commit summaries and pull request automation for better code reviews

## Overview

A CLI tool that generates intelligent commit messages and automates your Git workflow using AI. Perfect for teams who want meaningful commit history without the manual effort.

## Features

- 🤖 **AI-Powered Summaries** - Claude, OpenAI, GitHub Models, or Google Gemini
- 🎨 **Custom Prompt Templates** - Tailor AI output to your team's format
- 🔄 **Full Workflow Automation** - Analyze → Summarize → Commit → Push → PR
- 🎯 **Smart Branch Analysis** - Automatic remote detection and tracking
- ✏️ **Interactive Editing** - Review and refine before committing
- 🔐 **Secure Credentials** - OS Keychain or encrypted storage
- 🚀 **PR Creation** - Create pull requests directly from CLI with flexible options
- ⚡ **Setup Detection** - Automatic validation ensures you're configured before running commands
- 🔑 **Smart Token Management** - Automatically uses GitHub CLI token when available
- 📊 **Token Usage Tracking** - Monitor AI token consumption with detailed analytics

## Quick Start

### Installation

**From npm (public registry):**
```bash
npm install -g git-summary-ai
```

**From GitHub Packages:**
```bash
# Configure npm to use GitHub Packages
echo "@alexandrerodrigues-visma:registry=https://npm.pkg.github.com" >> ~/.npmrc

# Install
npm install -g @alexandrerodrigues-visma/git-summary-ai
```

**Download Standalone Executable:**
- Download from [Releases](https://github.com/alexandrerodrigues-Visma/git-summary-ai/releases)
- Windows: `git-summary-ai-win.exe`
- macOS: `git-summary-ai-macos`
- Linux: `git-summary-ai-linux`

### Setup

```bash
git-summary-ai setup
```

Follow the interactive wizard to configure your AI provider and preferences.

### Basic Usage

```bash
# Complete workflow (requires setup first)
git-summary-ai run

# With automatic push and PR
git-summary-ai run --push --pr main

# Quick PR with all commit messages
gitai pr main --all
```

That's it! The tool will analyze your changes, generate a summary, and guide you through the rest.

**Note:** Run `git-summary-ai setup` first to configure your AI provider. Commands will guide you if setup is incomplete.

## Security & Privacy

⚠️ **Important**: When you run git-summary-ai, your code changes (diffs) are sent to your configured AI provider for analysis. Here's what you need to know:

### What Gets Sent
- Git diffs of your changes (up to 15,000 characters)
- File counts and line statistics
- Branch name
- **NOT sent**: your actual files, git history, or any code outside the diff

### Privacy Considerations
- **Review before using**: Run this tool on public/non-sensitive projects
- **Credentials**: git-summary-ai includes secret scanning to warn about common sensitive patterns (API keys, passwords, private keys, etc.)
- **Trust your provider**: Ensure you trust the AI provider with your code
- **Proprietary code**: Be cautious with proprietary or confidential codebases

### Disabling Secret Scanning
If you want to skip the secret warning prompt:
```bash
export SKIP_SECRET_SCAN=true
git-summary-ai run
```

## Supported AI Providers

| Provider | Cost | Best For | Privacy |
|----------|------|----------|---------|
| **Claude** (Anthropic) | Free tier available | High-quality summaries | [Anthropic Privacy Policy](https://www.anthropic.com/privacy) |
| **OpenAI** (GPT-4) | Pay-as-you-go | Detailed analysis | [OpenAI Privacy Policy](https://openai.com/privacy/) |
| **GitHub Models** | Free | Teams already on GitHub | GitHub internal (check GitHub privacy terms) |
| **Google Gemini** | Free tier available | Fast responses, multimodal capabilities | [Google Privacy Policy](https://policies.google.com/privacy) |

## Documentation

- 📖 [Usage Guide](docs/USAGE.md) - Complete command reference
- 🔧 [Configuration](docs/USAGE.md#configuration) - Customization options
- 🤝 [Contributing](docs/CONTRIBUTING.md) - Development guide
- 📝 [Changelog](docs/CHANGELOG.md) - Version history

## Common Workflows

### Daily Development
```bash
# Analyze what changed
git-summary-ai analyze

# Generate and commit with default AI provider
git-summary-ai summarize

# Change default provider globally
git-summary-ai config set-provider copilot

# Set default model for a provider
git-summary-ai config set-model copilot gpt-4o

# Use specific AI provider for one command
git-summary-ai summarize --provider copilot

# Use specific model
git-summary-ai summarize --provider copilot --model gpt-4o

# Push changes
git-summary-ai push
```

### Pull Request Creation
```bash
# Complete workflow with PR using default provider
git-summary-ai run --push --pr main

# Complete workflow with specific provider
git-summary-ai run --push --pr main --provider copilot

# Quick PR with all commits being merged
gitai pr main --all

# Quick PR using last commit only
gitai pr main --first

# Interactive PR (choose message source)
gitai pr main
```

### Customization
```bash
# Edit AI prompt template for custom output format
gitai config edit-prompt-template

# Set default model per provider
gitai config set-model claude claude-sonnet-4-20250514
gitai config set-model openai gpt-4o

# List available models
gitai config list-models
```

### Team Collaboration
```bash
# Compare against remote branch
git-summary-ai run --remote
```

### Token Usage Tracking
```bash
# View token usage summary
git-summary-ai tokens

# View today's usage
git-summary-ai tokens today

# View this week's usage
git-summary-ai tokens week

# View this month's usage
git-summary-ai tokens month

# View all-time usage
git-summary-ai tokens all

# Export usage data to JSON
git-summary-ai tokens export usage-report.json

# Clear usage history
git-summary-ai tokens clear

# Show tokens inline during operations (add to config)
git-summary-ai config show  # Check current showTokens setting
```

**Inline Token Display:**
When `showTokens` is enabled in your config, token usage appears after each AI operation:
```
ℹ 🔢 Tokens: 5,443 (↑4,505 ↓938)
```

**Configuration:**
```json
{
  "showTokens": true,
  "tokenTracking": {
    "enabled": true,
    "retentionDays": 365
  }
}
```

## Requirements

- Node.js 20+ or use standalone executables
- Git repository
- API key for chosen AI provider
- (Optional) GitHub CLI for PR creation

## Support

- **Issues**: [GitHub Issues](https://github.com/alexandrerodrigues-Visma/git-summary-ai/issues)
- **Documentation**: See [docs/USAGE.md](docs/USAGE.md) for detailed information

## Documentation

- 📖 **[USAGE.md](docs/USAGE.md)** - Comprehensive command reference and examples
- 🧪 **[TESTING.md](TESTING.md)** - How to run and write tests
- 🤝 **[CONTRIBUTING.md](docs/CONTRIBUTING.md)** - Contribution guidelines
- 📦 **[GITHUB_PACKAGES.md](docs/GITHUB_PACKAGES.md)** - Publishing to GitHub Packages
- 🔍 **[SETUP_DETECTION.md](docs/SETUP_DETECTION.md)** - How setup validation works
- 📝 **[CHANGELOG.md](docs/CHANGELOG.md)** - Version history and release notes

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run in development (watch mode)
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Type check
npm run typecheck

# Lint code
npm run lint

# Full validation (typecheck + lint + test)
npm run validate

# Link for local testing
npm link
```

## License

MIT

---

<div align="center">
  <sub>Built with ✨ vibe coding using Claude Code and GitHub Copilot</sub>
</div>
