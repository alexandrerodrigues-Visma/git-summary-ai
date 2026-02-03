# Setup Detection Feature

## Overview

The CLI now includes automatic setup detection to prevent commands from failing due to missing configuration. This provides a better user experience by guiding users through the initial setup process.

## How It Works

### Setup Status Check

The utility function `checkSetupStatus()` verifies:
- **Global Config**: Checks if `~/.git-summary-ai/config.json` exists
- **API Keys**: Checks if at least one AI provider (Claude, OpenAI, GitHub Models, or Google Gemini) has been configured
- **Configured Providers**: Returns a list of all configured providers

### Setup Enforcement

Two functions are available for different use cases:

#### 1. `ensureSetupComplete(commandName?: string)`
- **Blocking**: Throws an error if setup is not complete
- **Use case**: Commands that require AI provider configuration (analyze, commit, summarize, run)
- **Behavior**: 
  - Shows a helpful error message
  - Lists available AI providers
  - Instructs user to run `git-summary-ai setup`
  - Prevents command execution

#### 2. `warnIfSetupIncomplete()`
- **Non-blocking**: Shows a warning but allows execution
- **Use case**: Commands that may work without full setup (pr, push)
- **Behavior**: Displays a friendly reminder to run setup wizard

## Implementation

### Commands with Setup Enforcement

The following commands now check for complete setup:
- `analyze` - Requires AI provider for generating analysis
- `commit` - Requires AI provider for generating commit messages
- `summarize` - Requires AI provider for generating summaries
- `run` - Requires AI provider for full workflow

### Commands with Soft Warning

- `pr` - Shows warning but doesn't require AI provider (only needs GitHub token)

### Example Usage in Commands

```typescript
import { ensureSetupComplete } from '../utils/setup-check.js';

export function createAnalyzeCommand(): Command {
  return new Command('analyze')
    .description('Analyze branch diff against target branch')
    .action(async (options) => {
      // Check setup before proceeding
      await ensureSetupComplete('analyze');
      
      // Rest of command logic...
    });
}
```

## User Experience

### Before Setup

When a user tries to run a command without completing setup:

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

ℹ Then you can run git-summary-ai analyze again.
```

### After Setup

Commands execute normally without any setup warnings.

## Configuration Storage

Setup completion is determined by:

1. **Global Config File**: `~/.git-summary-ai/config.json`
   - Contains provider selection, model choice, target branch, etc.
   
2. **API Keys**: Stored via credential manager
   - OS Keychain (recommended on macOS/Windows)
   - Environment file: `~/.git-summary-ai/.env`
   - Environment variables: `CLAUDE_API_KEY`, `OPENAI_API_KEY`, `GITHUB_TOKEN`

## Benefits

1. **Prevents Cryptic Errors**: No more "API key not found" errors mid-execution
2. **Clear Guidance**: Users know exactly what to do to get started
3. **Better Onboarding**: New users are guided to the setup wizard
4. **Graceful Degradation**: Some commands warn but don't block execution

## Future Enhancements

Potential improvements:
- Add `--skip-setup-check` flag for advanced users
- Cache setup status for performance
- Provide command-specific setup guidance
- Add setup validation before command execution starts
