# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.4] - 2026-02-02

### Added
- **Google Gemini Provider Support**: Full integration with Google's Gemini models
  - Gemini 2.0 Flash (Experimental) - Latest model, fastest performance (default)
  - Gemini 1.5 Pro - Most capable, best for complex tasks
  - Gemini 1.5 Flash - Fast and efficient, good balance
  - Gemini 1.5 Flash 8B - Smallest model, fastest responses
  - Configure with: `gitai setup` and select Gemini as provider
  - Use with: `gitai summarize --provider gemini --model gemini-1.5-pro`
- **Dynamic Model Discovery**: Automatic detection of available models from provider APIs
  - Fetches live model lists from Claude, OpenAI, GitHub Models, and Gemini APIs
  - 24-hour cache system for optimal performance
  - Three-layer fallback: Cache → API Fetch → Static Fallback
  - Models stored in `~/.git-summary-ai/models-cache.json`
  - New models automatically available without code updates
  - Provider-specific API endpoints:
    - Claude: `api.anthropic.com/v1/models`
    - OpenAI: `api.openai.com/v1/models`
    - GitHub Models: `models.inference.ai.azure.com/models`
    - Gemini: `generativelanguage.googleapis.com/v1beta/models`
- **Model Cache Management**: Smart caching with graceful degradation
  - Persistent cache across restarts in user home directory
  - Automatic refresh when cache expires (24h TTL)
  - Falls back to static models if API unavailable
  - Per-provider timestamps and validation
- **GitHub Packages Distribution**: Package now published to GitHub Packages
  - Install from GitHub: `npm install -g @alexandrerodrigues-visma/git-summary-ai`
  - Automatic publishing on version changes via GitHub Actions
  - Free for public repositories with unlimited downloads
  - Alternative to npm registry for organizational use

### Changed
- Model listing now shows dynamically fetched models when available
- Model validation uses live data from provider APIs when possible
- Static model catalog serves as reliable fallback for offline use
- Improved error handling for API fetch failures
- Package name scoped to `@alexandrerodrigues-visma/git-summary-ai` for GitHub Packages
- Installation documentation updated with multiple distribution options

## [0.2.3] - 2026-02-02

### Added
- **AI Provider Selection**: New `--provider` flag for `summarize`, `commit`, and `run` commands
  - Switch between configured AI providers on a per-command basis
  - Override default provider from config without changing settings
  - Supported providers: `claude`, `openai`, `copilot`
  - Example: `gitai summarize --provider copilot`
- **AI Model Selection**: New `--model` flag and model management commands
  - Override default model per-command: `gitai summarize --model gpt-4o`
  - Set default model per provider: `gitai config set-model copilot gpt-4o`
  - List available models: `gitai config list-models` or `gitai config list-models <provider>`
  - Per-provider model configuration stored in `~/.git-summary-ai/config.json`
  - Comprehensive model catalog for all providers (Claude, OpenAI, GitHub Models)
- **Smart Regenerate Options**: Enhanced regeneration with two modes
  - **Same prompt**: Regenerate with original instructions (existing behavior)
  - **Refine prompt**: Add custom instructions to refine the output
  - Interactive prompt during regeneration to choose mode
  - Examples of refinements: "Focus more on security", "Be more concise", "Add technical details"
  - Custom instructions appended to base prompt for targeted improvements
- **Custom Prompt Templates**: Full control over AI prompt structure
  - Edit custom template: `gitai config edit-prompt-template`
  - View current template: `gitai config show-prompt-template`
  - Reset to default: `gitai config reset-prompt-template`
  - **Template variables** for dynamic content:
    - `{diff}` - The git diff content
    - `{context}` - Branch name, files changed, line stats
    - `{customInstructions}` - Custom refinement instructions
  - Use cases: Company-specific formats, Jira ticket structure, multi-language support
  - Stored in `~/.git-summary-ai/config.json` under `promptTemplate`
- **Default Provider Management**: New `config set-provider` command
  - Set default AI provider globally: `gitai config set-provider copilot`
  - Validates provider is configured before allowing it to be set as default
  - Shows helpful errors with available providers if requested one isn't configured
  - Updates `~/.git-summary-ai/config.json` immediately
- **Provider Configuration Validation**: Smart error handling for unconfigured providers
  - Lists available configured providers when requested provider is missing
  - Clear guidance to run setup wizard for configuring new providers
  - Helpful error messages instead of cryptic API key errors

### Changed
- Setup wizard now sets the first configured provider as the default automatically
- Provider resolution logic now validates API key availability before command execution
- Error messages now show which providers are configured and available
- Configuration file loading improved to preserve existing settings during setup
- Model selection priority: explicit --model flag > config.models[provider] > config.model (legacy) > provider default
- Regenerate action now provides interactive menu instead of immediately regenerating
- AI summary prompt builder now accepts optional custom instructions for refinement
- Documentation updated with provider selection, model management, regeneration, and configuration examples

## [0.2.0] - 2026-01-29

### Added
- **Setup Detection**: Commands now automatically verify if setup wizard has been completed
  - Provides helpful guidance if configuration is missing
  - Shows available AI providers and setup instructions
  - Prevents cryptic errors during command execution
- **Enhanced PR Command**: Major UX improvements for pull request creation
  - `--first` flag: Use only the last commit message (no prompts)
  - `--all` flag: Use all commits being merged to target branch (no prompts)
  - Accept base branch as argument: `gitai pr main` instead of being prompted
  - Interactive mode still available when no flags provided
  - Clarified wording: "commits being merged" instead of ambiguous "all commits"
- **Smart Token Management**: Improved GitHub authentication
  - GitHub CLI token now prioritized over credential manager
  - Better error messages for token issues
  - Automatic fallback to credential manager if GitHub CLI unavailable

### Fixed
- **Run Command**: Now properly commits changes after generating summary (was missing commit step)
- **GitHub Token Validation**: Fixed token detection to accept `gho_`, `ghp_`, and `github_pat_` prefixes
- **Setup Wizard**: Corrected GitHub CLI detection to work with actual token formats

### Changed
- **Node.js Requirement**: Now requires Node.js 20+ (updated from 18+)
- GitHub CLI token now preferred over credential manager for PR creation (better permissions)
- Setup wizard detection improved for more reliable PR readiness checks
- Documentation updated with new command syntax and setup requirements

## [0.1.0] - 2026-01-29

### Added
- Initial beta release for internal team use
- AI-powered commit message generation with Claude, OpenAI, and GitHub Models
- Git-native architecture with automatic remote detection
- Interactive commit message editing with review loops
- Full workflow support: analyze → summarize → commit → push → create PR
- **Pull request creation** from CLI with multiple body options:
  - Use last commit message
  - Use all commit messages from branch
  - Write custom message in editor
- **GitHub CLI integration** for PR creation (automatic fallback to `gh auth token`)
- Secure credential management (OS Keychain or global .env)
- Simplified storage options (OS Keychain or global ~/.git-summary-ai/.env)
- Global configuration with project-level overrides
- Smart branch tracking and comparison
- Uncommitted changes detection
- Setup wizard with PR readiness check
- Command alias: `gitai` (shorthand for `git-summary-ai`)

### Core Commands
- `setup` - Interactive configuration wizard with PR readiness check
- `summarize` - Generate and commit with AI summary (with review loop)
- `push` - Push to remote with upstream config
- `pr` - Create GitHub pull request with flexible body options
- `run` - Combined workflow with optional `--push` and `--pr <base>` flags
- `analyze` - Branch diff analysis
- `repo` - Show git repository information
- `config` - Manage configuration and credentials

### Pull Request Features
- Create PRs directly from CLI
- Auto-detect repository from git remote
- Three PR body options: last commit, all commits, or custom
- GitHub CLI integration (uses `gh auth token` if available)
- Draft PR support
- Repository access verification before PR creation

### Supported AI Providers
- Claude (Anthropic) - Recommended for quality
- OpenAI GPT-4 - Detailed summaries
- GitHub Models - Free with GitHub account

### Configuration
- Global config stored in `~/.git-summary-ai/config.json`
- Optional project overrides via `.git-summary-airc.json`
- Environment variable support for API keys
- Secure OS Keychain integration

### Known Limitations
- No automated tests yet (manual testing only)
- Limited error recovery for API failures
- No rate limiting implementation
- Editor integration uses external editor for multi-line edits

### Security
- API keys stored securely in OS Keychain or local .env
- HTTPS validation for external URLs
- No credential exposure in git history
- Proper .gitignore and .npmignore configuration

---

## Future Releases

### [0.2.0] - Planned
- Add comprehensive test suite
- Implement rate limiting for API calls
- Add retry logic with exponential backoff
- Improve error messages and recovery

### [0.3.0] - Planned
- Add telemetry/analytics (opt-in)
- Support for additional AI providers
- Custom prompt templates
- Git hooks integration

### [1.0.0] - Stable Release
- Full test coverage
- Production-ready error handling
- Performance optimizations
- Complete documentation

---

**Note:** This is a beta release intended for internal team use. Please report any issues to the team channel or repository issues page.
