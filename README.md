# git-summary-ai

> AI-powered commit summaries and pull request automation for better code reviews

## Overview

A CLI tool that generates intelligent commit messages and automates your Git workflow using AI. Perfect for teams who want meaningful commit history without the manual effort.

## Features

- 🤖 **AI-Powered Summaries** - Claude, OpenAI, or GitHub Models
- 🔄 **Full Workflow Automation** - Analyze → Summarize → Commit → Push → PR
- 🎯 **Smart Branch Analysis** - Automatic remote detection and tracking
- ✏️ **Interactive Editing** - Review and refine before committing
- 🔐 **Secure Credentials** - OS Keychain or encrypted storage
- 🚀 **PR Creation** - Create pull requests directly from CLI
- ⚡ **Zero Config** - Works with your existing Git setup

## Quick Start

### Installation

```bash
npm install -g git-summary-ai
```

### Setup

```bash
git-summary-ai setup
```

Follow the interactive wizard to configure your AI provider and preferences.

### Basic Usage

```bash
# Complete workflow
git-summary-ai run

# With automatic push and PR
git-summary-ai run --push --pr main
```

That's it! The tool will analyze your changes, generate a summary, and guide you through the rest.

## Supported AI Providers

| Provider | Cost | Best For |
|----------|------|----------|
| **Claude** (Anthropic) | Free tier available | High-quality summaries |
| **OpenAI** (GPT-4) | Pay-as-you-go | Detailed analysis |
| **GitHub Models** | Free | Teams already on GitHub |

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

# Generate and commit
git-summary-ai summarize

# Push changes
git-summary-ai push
```

### Pull Request Creation
```bash
# Complete workflow with PR
git-summary-ai run --push --pr main
```

### Team Collaboration
```bash
# Compare against remote branch
git-summary-ai run --remote
```

## Requirements

- Node.js 18+ or use standalone executables
- Git repository
- API key for chosen AI provider
- (Optional) GitHub CLI for PR creation

## Support

- **Issues**: [GitHub Issues](https://github.com/alexandrerodrigues-Visma/git-summary-ai/issues)
- **Documentation**: See [docs/USAGE.md](docs/USAGE.md) for detailed information

## License

MIT

---

**Command Alias**: You can also use `gitai` as a shorthand for `git-summary-ai`

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
