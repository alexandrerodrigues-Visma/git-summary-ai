# GitHub Packages Setup

This document explains how to use and publish this package via GitHub Packages.

## For Users: Installing from GitHub Packages

### Prerequisites
- Node.js 20+ installed
- GitHub account

### Installation Steps

1. **Configure npm to use GitHub Packages:**
   ```bash
   echo "@alexandrerodrigues-visma:registry=https://npm.pkg.github.com" >> ~/.npmrc
   ```

2. **Install the package:**
   ```bash
   npm install -g @alexandrerodrigues-visma/git-summary-ai
   ```

3. **Verify installation:**
   ```bash
   gitai --version
   ```

### Authentication (if package becomes private)

If the package is private, you'll need a GitHub Personal Access Token:

1. **Generate token:**
   - Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Click "Generate new token (classic)"
   - Select scope: `read:packages`
   - Copy the token

2. **Configure npm:**
   ```bash
   echo "//npm.pkg.github.com/:_authToken=YOUR_TOKEN_HERE" >> ~/.npmrc
   ```

## For Maintainers: Publishing to GitHub Packages

### Automatic Publishing (Recommended)

The package automatically publishes to GitHub Packages when:
1. You push to `master` branch
2. The version in `package.json` has changed

**Workflow:**
```bash
# 1. Update version
npm version patch  # or minor, major

# 2. Update CHANGELOG.md with changes

# 3. Commit and push
git add .
git commit -m "chore: release v0.2.5"
git push origin master

# GitHub Actions will automatically:
# - Build executables
# - Create GitHub Release
# - Publish to GitHub Packages
```

### Manual Publishing

If needed, you can publish manually:

```bash
# 1. Build the project
npm run build

# 2. Login to GitHub Packages
npm login --registry=https://npm.pkg.github.com

# 3. Publish
npm publish
```

## Package Details

- **Package name:** `@alexandrerodrigues-visma/git-summary-ai`
- **Registry:** `https://npm.pkg.github.com`
- **Scope:** `@alexandrerodrigues-visma`
- **Repository:** https://github.com/alexandrerodrigues-Visma/git-summary-ai

## Troubleshooting

### "Unable to authenticate"

Make sure your `.npmrc` contains:
```
@alexandrerodrigues-visma:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_TOKEN
```

### "Package not found"

1. Verify the package exists: https://github.com/alexandrerodrigues-Visma/git-summary-ai/packages
2. Check you're using the correct scoped name: `@alexandrerodrigues-visma/git-summary-ai`

### Publishing fails in GitHub Actions

1. Check that `GITHUB_TOKEN` has `packages:write` permission
2. Verify workflow has `permissions: packages: write` (already configured)

## Comparison: GitHub Packages vs npm Registry

| Feature | GitHub Packages | npm Registry |
|---------|----------------|--------------|
| **Cost** | Free for public repos | Free for public packages |
| **Private packages** | Free (with limits) | Requires paid plan |
| **Integration** | Built into GitHub | Separate service |
| **Authentication** | GitHub token | npm token |
| **Use case** | Org-specific tools | Public distribution |

## Current Status

✅ GitHub Packages configured and enabled
✅ Auto-publishing on version changes
✅ Works alongside standalone executables
🔄 npm registry publishing: Disabled (can be enabled by changing `if: false` to `if: true` in workflow)
