#!/usr/bin/env node

/**
 * Version bumping script for git-summary-ai
 * Usage: node scripts/bump-version.js [major|minor|patch]
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const bumpType = process.argv[2] || 'patch';

if (!['major', 'minor', 'patch'].includes(bumpType)) {
  console.error('Usage: node scripts/bump-version.js [major|minor|patch]');
  process.exit(1);
}

// Read package.json
const packagePath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));

// Parse current version
const [major, minor, patch] = packageJson.version.split('.').map(Number);

// Bump version
let newVersion;
switch (bumpType) {
  case 'major':
    newVersion = `${major + 1}.0.0`;
    break;
  case 'minor':
    newVersion = `${major}.${minor + 1}.0`;
    break;
  case 'patch':
    newVersion = `${major}.${minor}.${patch + 1}`;
    break;
}

// Update package.json
packageJson.version = newVersion;
writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');

console.log(`✅ Version bumped: ${packageJson.version} → ${newVersion}`);
console.log(`\nNext steps:`);
console.log(`1. Update CHANGELOG.md with release notes for v${newVersion}`);
console.log(`2. Commit: git add package.json CHANGELOG.md`);
console.log(`3. Commit: git commit -m "chore: bump version to ${newVersion}"`);
console.log(`4. Push to master: git push origin master`);
console.log(`\n📦 GitHub Actions will automatically create a release!`);
