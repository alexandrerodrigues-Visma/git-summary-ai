# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.2.x   | :white_check_mark: |
| < 0.2.0 | :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue in git-summary-ai, please report it by:

1. **Email**: alexandre.rodrigues2@visma.com
2. **GitHub Security Advisories**: https://github.com/alexandrerodrigues-Visma/git-summary-ai/security/advisories/new

### What to Include

- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact
- Suggested fix (if any)

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Depends on severity
  - Critical: Within 7 days
  - High: Within 14 days
  - Medium: Within 30 days
  - Low: Next minor release

### Security Best Practices

When using git-summary-ai:

1. **API Keys**: Never commit API keys to version control
2. **Sensitive Data**: Review diffs before sending to AI providers
3. **Environment Variables**: Use secure credential storage (OS keychain recommended)
4. **Dependencies**: Keep the tool updated to receive security patches
5. **Secret Scanning**: The tool includes built-in secret detection - don't disable it unless necessary

### Disclosure Policy

- Security vulnerabilities will be disclosed after a fix is available
- Credit will be given to reporters (unless anonymity is requested)
- A security advisory will be published on GitHub

## Known Security Considerations

### Data Privacy

git-summary-ai sends your code diffs to third-party AI providers:
- Claude (Anthropic)
- OpenAI
- GitHub Models
- Google Gemini

**Important**: Review your organization's data policies before using on proprietary code.

### Secret Detection

The tool includes basic secret pattern detection but is not comprehensive. For production use:
- Use dedicated secret scanning tools (Aikido, GitGuardian, etc.)
- Review git-summary-ai's secret warnings carefully
- Set `SKIP_SECRET_SCAN=true` only when you understand the risks

### Credential Storage

The tool stores API keys using:
1. **OS Keychain** (recommended) - Uses `keytar` for secure system-level storage
2. **Environment Files** - `.env` files in `~/.git-summary-ai/`
3. **Environment Variables** - Standard env vars

Ensure your system keychain/credential manager is properly secured.
