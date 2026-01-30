# Release Process

This document describes how to create a new release of git-summary-ai.

## Automated Release Workflow

The project uses GitHub Actions to automatically build and publish releases when the version in `package.json` changes on the `master` branch.

### How It Works

1. **Version Change Detection**: When you push to `master`, GitHub Actions checks if the version in `package.json` has changed
2. **Automatic Build**: If changed, it builds the project and creates executables for Windows, macOS, and Linux
3. **Release Creation**: Automatically creates a Git tag and GitHub release with the built executables
4. **Release Notes**: Automatically generates release notes from commits

## Creating a New Release

### Step 1: Bump the Version

Use the provided npm scripts to bump the version:

```bash
# For bug fixes and small changes
npm run version:patch  # 0.2.0 → 0.2.1

# For new features
npm run version:minor  # 0.2.0 → 0.3.0

# For breaking changes
npm run version:major  # 0.2.0 → 1.0.0
```

This will:
- Update `package.json` with the new version
- Show you the next steps

### Step 2: Update CHANGELOG.md

Update `docs/CHANGELOG.md` with the changes for this release:

```markdown
## [0.2.1] - 2026-01-30

### Fixed
- Bug fix description

### Added
- New feature description
```

### Step 3: Commit and Push

```bash
# Stage changes
git add package.json docs/CHANGELOG.md

# Commit
git commit -m "chore: bump version to 0.2.1"

# Push to master
git push origin master
```

### Step 4: Wait for GitHub Actions

GitHub Actions will automatically:
1. ✅ Detect the version change
2. ✅ Run type checking
3. ✅ Build the project
4. ✅ Create executables for all platforms
5. ✅ Create a Git tag (e.g., `v0.2.1`)
6. ✅ Publish a GitHub release with:
   - Built executables
   - Auto-generated release notes
   - Changelog information

You can monitor the progress at: `https://github.com/YOUR_ORG/git-summary-ai/actions`

## Manual Release (Alternative)

If you prefer manual control or the automated workflow fails:

### Build Executables Locally

```bash
# Build all platforms
npm run package:all

# Or build individually
npm run package:win    # Windows only
npm run package:mac    # macOS only
npm run package:linux  # Linux only
```

### Create and Push Tag

```bash
# Create tag
git tag -a v0.2.1 -m "Release v0.2.1"

# Push tag (triggers original release.yml workflow)
git push origin v0.2.1
```

### Create GitHub Release

Go to GitHub and create a release:
1. Navigate to `https://github.com/YOUR_ORG/git-summary-ai/releases/new`
2. Select the tag you just created
3. Upload the executables from `./releases/` folder
4. Write release notes
5. Publish release

## Release Checklist

Before releasing, ensure:

- [ ] All tests pass (`npm run typecheck`)
- [ ] CHANGELOG.md is updated
- [ ] Version in package.json is updated
- [ ] All changes are committed to master
- [ ] Documentation is up to date

## Versioning Guidelines

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.0.0): Breaking changes that require users to modify their usage
- **MINOR** (0.1.0): New features that are backward compatible
- **PATCH** (0.0.1): Bug fixes and minor improvements

## Workflow Files

- **`.github/workflows/publish-release.yml`**: Automatic release on master push (version change)
- **`.github/workflows/release.yml`**: Manual release when pushing tags
- **`scripts/bump-version.js`**: Version bumping utility

## Troubleshooting

### Release Workflow Didn't Trigger

Check:
1. Did you actually change the version in `package.json`?
2. Is your push to the `master` branch?
3. Check GitHub Actions tab for errors

### Build Failures

Common issues:
- TypeScript errors: Run `npm run typecheck` locally first
- Missing dependencies: Ensure `npm ci` works locally
- Node version mismatch: We use Node 18

### Permission Errors

The workflow needs:
- `contents: write` permission (already configured)
- Valid `GITHUB_TOKEN` (automatically provided by GitHub)

If publishing to npm, you need:
- `NPM_TOKEN` secret configured in repository settings
