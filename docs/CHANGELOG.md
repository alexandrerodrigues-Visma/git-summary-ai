# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-01-29

### Added
- **Setup Detection**: Commands now automatically verify if setup wizard has been completed
  - Provides helpful guidance if configuration is missing
  - Shows available AI providers and setup instructions
  - Prevents cryptic errors during command execution
- **Enhanced PR Command**: Major UX improvements for pull request creation
  - `--first` flag: Use only the last commit message (no prompts)
  - `--all` flag: Use all commit messages from branch (no prompts)
  - Accept base branch as argument: `gitai pr main` instead of being prompted
  - Interactive mode still available when no flags provided
- **Smart Token Management**: Improved GitHub authentication
  - GitHub CLI token now prioritized over credential manager
  - Better error messages for token issues
  - Automatic fallback to credential manager if GitHub CLI unavailable

### Fixed
- **Run Command**: Now properly commits changes after generating summary (was missing commit step)
- **GitHub Token Validation**: Fixed token detection to accept `gho_`, `ghp_`, and `github_pat_` prefixes
- **Setup Wizard**: Corrected GitHub CLI detection to work with actual token formats

### Changed
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
