import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GitService } from '../src/services/git.service.js';
import { simpleGit } from 'simple-git';

vi.mock('simple-git');

describe('GitService', () => {
  let gitService: GitService;
  let mockGit: any;

  beforeEach(() => {
    mockGit = {
      revparse: vi.fn(),
      status: vi.fn(),
      diff: vi.fn(),
      diffSummary: vi.fn(),
      log: vi.fn(),
      add: vi.fn(),
      commit: vi.fn(),
      push: vi.fn(),
      branch: vi.fn(),
      raw: vi.fn(),
      getRemotes: vi.fn(),
    };

    vi.mocked(simpleGit).mockReturnValue(mockGit as any);
    gitService = new GitService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('isGitRepository', () => {
    it('should return true when in a git repository', async () => {
      mockGit.status.mockResolvedValue({
        current: 'main',
        tracking: null,
        detached: false,
      });

      const result = await gitService.isGitRepository();
      expect(result).toBe(true);
      expect(mockGit.status).toHaveBeenCalled();
    });

    it('should return false when not in a git repository', async () => {
      mockGit.status.mockRejectedValue(new Error('Not a git repository'));

      const result = await gitService.isGitRepository();
      expect(result).toBe(false);
    });
  });

  describe('getBranchInfo', () => {
    it('should return branch information', async () => {
      mockGit.status.mockResolvedValue({
        current: 'feature/test',
        tracking: 'origin/feature/test',
        detached: false,
      });

      const result = await gitService.getBranchInfo();
      expect(result.current).toBe('feature/test');
      expect(result.tracking).toBe('origin/feature/test');
      expect(result.isDetached).toBe(false);
    });

    it('should handle detached HEAD', async () => {
      mockGit.status.mockResolvedValue({
        current: null,
        tracking: null,
        detached: true,
      });

      const result = await gitService.getBranchInfo();
      expect(result.current).toBe('HEAD');
      expect(result.isDetached).toBe(true);
    });
  });

  describe('getDiffAgainstBranch', () => {
    it('should return diff against target branch', async () => {
      const mockDiff = 'diff --git a/file.ts b/file.ts\n+added line';
      mockGit.raw.mockResolvedValueOnce('abc123\n'); // merge-base
      mockGit.revparse.mockResolvedValueOnce('def456\n'); // HEAD
      mockGit.diff.mockResolvedValue(mockDiff);

      const result = await gitService.getDiffAgainstBranch('main');
      expect(result).toBe(mockDiff);
    });

    it('should handle same commit as merge base', async () => {
      const mockDiff = 'working directory changes';
      mockGit.raw.mockResolvedValueOnce('abc123\n'); // merge-base
      mockGit.revparse.mockResolvedValueOnce('abc123\n'); // HEAD (same as merge-base)
      mockGit.diff.mockResolvedValue(mockDiff);

      const result = await gitService.getDiffAgainstBranch('main');
      expect(result).toBe(mockDiff);
    });
  });

  describe('stageAll', () => {
    it('should stage all changes', async () => {
      mockGit.add.mockResolvedValue(undefined);

      await gitService.stageAll();
      expect(mockGit.add).toHaveBeenCalledWith('-A');
    });
  });

  describe('commit', () => {
    it('should create a commit with the given message', async () => {
      const commitMessage = 'feat: add new feature';
      const mockCommitResult = { commit: 'abc123' };
      mockGit.commit.mockResolvedValue(mockCommitResult);

      const result = await gitService.commit(commitMessage);
      expect(result).toBe('abc123');
      expect(mockGit.commit).toHaveBeenCalledWith(commitMessage);
    });

    it('should handle commit errors', async () => {
      mockGit.commit.mockRejectedValue(new Error('Commit failed'));

      await expect(gitService.commit('test')).rejects.toThrow('Commit failed');
    });
  });

  describe('push', () => {
    it('should push to remote', async () => {
      mockGit.status.mockResolvedValue({
        current: 'main',
        tracking: 'origin/main',
        detached: false,
      });
      mockGit.push.mockResolvedValue(undefined);

      await gitService.push();
      expect(mockGit.push).toHaveBeenCalled();
    });

    it('should push with upstream when flag is set', async () => {
      mockGit.status.mockResolvedValue({
        current: 'feature/test',
        tracking: null,
        detached: false,
      });
      mockGit.push.mockResolvedValue(undefined);

      await gitService.push(true);
      expect(mockGit.push).toHaveBeenCalledWith(['-u', 'origin', 'feature/test']);
    });

    it('should handle push errors', async () => {
      mockGit.status.mockResolvedValue({
        current: 'main',
        tracking: 'origin/main',
        detached: false,
      });
      mockGit.push.mockRejectedValue(new Error('Push failed'));

      await expect(gitService.push()).rejects.toThrow('Push failed');
    });
  });

  describe('getRemoteUrl', () => {
    it('should return the remote URL', async () => {
      mockGit.getRemotes.mockResolvedValue([
        {
          name: 'origin',
          refs: {
            fetch: 'https://github.com/user/repo.git',
            push: 'https://github.com/user/repo.git',
          },
        },
      ]);

      const result = await gitService.getRemoteUrl();
      expect(result).toBe('https://github.com/user/repo.git');
    });

    it('should return null when no remotes exist', async () => {
      mockGit.getRemotes.mockResolvedValue([]);

      const result = await gitService.getRemoteUrl();
      expect(result).toBeNull();
    });
  });

  describe('getGitHubRepoInfo', () => {
    it('should parse SSH format remote URL', async () => {
      mockGit.getRemotes.mockResolvedValue([
        {
          name: 'origin',
          refs: {
            fetch: 'git@github.com:user/repo.git',
            push: 'git@github.com:user/repo.git',
          },
        },
      ]);

      const result = await gitService.getGitHubRepoInfo();
      expect(result).toEqual({ owner: 'user', repo: 'repo' });
    });

    it('should parse HTTPS format remote URL', async () => {
      mockGit.getRemotes.mockResolvedValue([
        {
          name: 'origin',
          refs: {
            fetch: 'https://github.com/user/repo.git',
            push: 'https://github.com/user/repo.git',
          },
        },
      ]);

      const result = await gitService.getGitHubRepoInfo();
      expect(result).toEqual({ owner: 'user', repo: 'repo' });
    });

    it('should return null for non-GitHub URLs', async () => {
      mockGit.getRemotes.mockResolvedValue([
        {
          name: 'origin',
          refs: {
            fetch: 'https://gitlab.com/user/repo.git',
            push: 'https://gitlab.com/user/repo.git',
          },
        },
      ]);

      const result = await gitService.getGitHubRepoInfo();
      expect(result).toBeNull();
    });
  });

  describe('getLastCommitSubject', () => {
    it('should return the last commit subject', async () => {
      mockGit.log.mockResolvedValue({
        latest: { message: 'feat: add new feature' },
        total: 1,
        all: [{ message: 'feat: add new feature' }],
      });

      const result = await gitService.getLastCommitSubject();
      expect(result).toBe('feat: add new feature');
    });
  });

  describe('hasUncommittedChanges', () => {
    it('should return true when there are uncommitted changes', async () => {
      mockGit.status.mockResolvedValue({
        files: [{ path: 'file.ts', index: 'M', working_dir: ' ' }],
      });

      const result = await gitService.hasUncommittedChanges();
      expect(result).toBe(true);
    });

    it('should return false when there are no uncommitted changes', async () => {
      mockGit.status.mockResolvedValue({
        files: [],
      });

      const result = await gitService.hasUncommittedChanges();
      expect(result).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    describe('Empty Repository', () => {
      it('should handle repository with no commits', async () => {
        mockGit.status.mockResolvedValue({
          current: 'main',
          tracking: null,
          detached: false,
        });
        mockGit.revparse.mockRejectedValue(new Error('fatal: ambiguous argument \'HEAD\''));

        const result = await gitService.isGitRepository();
        expect(result).toBe(true);
      });

      it('should handle getDiffAgainstBranch with no commits', async () => {
        mockGit.raw.mockRejectedValue(new Error('fatal: ambiguous argument'));
        mockGit.diff.mockResolvedValue('');

        const result = await gitService.getDiffAgainstBranch('main');
        expect(result).toBe('');
      });
    });

    describe('Multiple Remotes', () => {
      it('should prefer origin remote when multiple remotes exist', async () => {
        mockGit.getRemotes.mockResolvedValue([
          {
            name: 'upstream',
            refs: {
              fetch: 'https://github.com/upstream/repo.git',
              push: 'https://github.com/upstream/repo.git',
            },
          },
          {
            name: 'origin',
            refs: {
              fetch: 'https://github.com/user/repo.git',
              push: 'https://github.com/user/repo.git',
            },
          },
        ]);

        const result = await gitService.getGitHubRepoInfo();
        expect(result).toEqual({ owner: 'user', repo: 'repo' });
      });

      it('should handle no origin remote', async () => {
        mockGit.getRemotes.mockResolvedValue([
          {
            name: 'upstream',
            refs: {
              fetch: 'https://github.com/upstream/repo.git',
              push: 'https://github.com/upstream/repo.git',
            },
          },
        ]);

        const result = await gitService.getRemoteUrl();
        expect(result).toBeNull();
      });
    });

    describe('Large Diffs', () => {
      it('should handle very large diff output', async () => {
        const largeDiff = 'diff --git a/file.ts b/file.ts\\n' + '+line\\n'.repeat(10000);
        mockGit.raw.mockResolvedValue('abc123');
        mockGit.revparse.mockResolvedValue('def456');
        mockGit.diff.mockResolvedValue(largeDiff);

        const result = await gitService.getDiffAgainstBranch('main');
        expect(result).toBe(largeDiff);
        expect(result.length).toBeGreaterThan(50000);
      });
    });

    describe('Remote URL Variations', () => {
      it('should parse SSH URL without .git extension', async () => {
        mockGit.getRemotes.mockResolvedValue([
          {
            name: 'origin',
            refs: {
              fetch: 'git@github.com:user/repo',
              push: 'git@github.com:user/repo',
            },
          },
        ]);

        const result = await gitService.getGitHubRepoInfo();
        expect(result).toEqual({ owner: 'user', repo: 'repo' });
      });

      it('should parse HTTPS URL without .git extension', async () => {
        mockGit.getRemotes.mockResolvedValue([
          {
            name: 'origin',
            refs: {
              fetch: 'https://github.com/user/repo',
              push: 'https://github.com/user/repo',
            },
          },
        ]);

        const result = await gitService.getGitHubRepoInfo();
        expect(result).toEqual({ owner: 'user', repo: 'repo' });
      });

      it('should handle remote URL with special characters in repo name', async () => {
        mockGit.getRemotes.mockResolvedValue([
          {
            name: 'origin',
            refs: {
              fetch: 'https://github.com/user/repo-with-dashes.git',
              push: 'https://github.com/user/repo-with-dashes.git',
            },
          },
        ]);

        const result = await gitService.getGitHubRepoInfo();
        expect(result).toEqual({ owner: 'user', repo: 'repo-with-dashes' });
      });
    });

    describe('Branch Operations', () => {
      it('should handle branch with no tracking branch', async () => {
        mockGit.branch.mockResolvedValue({
          current: 'feature-branch',
          all: ['feature-branch', 'main'],
          branches: {},
        });
        mockGit.raw.mockRejectedValue(new Error('no such config'));

        const result = await gitService.getTrackingBranch();
        expect(result).toBeNull();
      });

      it('should handle detached HEAD state in getDiffStats', async () => {
        mockGit.status.mockResolvedValue({
          current: null,
          tracking: null,
          detached: true,
        });
        mockGit.raw.mockResolvedValue('abc123');
        mockGit.revparse.mockResolvedValue('abc123');
        mockGit.diffSummary.mockResolvedValue({
          changed: 1,
          insertions: 10,
          deletions: 5,
          files: [{ file: 'test.ts', changes: 15, insertions: 10, deletions: 5, binary: false }],
        });

        const result = await gitService.getDiffStats('main');
        expect(result.filesChanged).toBe(1);
      });
    });

    describe('Error Handling', () => {
      it('should handle network timeout in getRemotes', async () => {
        mockGit.getRemotes.mockRejectedValue(new Error('ETIMEDOUT'));

        const result = await gitService.getRemoteUrl();
        expect(result).toBeNull();
      });

      it('should handle permission errors gracefully', async () => {
        mockGit.status.mockRejectedValue(new Error('EACCES: permission denied'));

        const result = await gitService.isGitRepository();
        expect(result).toBe(false);
      });

      it('should handle corrupted git repository', async () => {
        mockGit.status.mockRejectedValue(new Error('fatal: not a git repository'));

        const result = await gitService.isGitRepository();
        expect(result).toBe(false);
      });
    });

    describe('Merge Conflicts', () => {
      it('should detect files with merge conflicts in status', async () => {
        mockGit.status.mockResolvedValue({
          files: [
            { path: 'file1.ts', index: 'U', working_dir: 'U' },
            { path: 'file2.ts', index: 'A', working_dir: 'A' },
          ],
          conflicted: ['file1.ts'],
        });

        const result = await gitService.hasUncommittedChanges();
        expect(result).toBe(true);
      });
    });

    describe('Diff Edge Cases', () => {
      it('should handle diff with binary files', async () => {
        mockGit.raw.mockResolvedValue('abc123');
        mockGit.revparse.mockResolvedValue('def456');
        mockGit.diff.mockResolvedValue('Binary files a/image.png and b/image.png differ\\n');

        const result = await gitService.getDiffAgainstBranch('main');
        expect(result).toContain('Binary files');
      });

      it('should handle empty diff', async () => {
        mockGit.raw.mockResolvedValue('abc123');
        mockGit.revparse.mockResolvedValue('abc123');
        mockGit.diff.mockResolvedValue('');

        const result = await gitService.getDiffAgainstBranch('main');
        expect(result).toBe('');
      });

      it('should handle diff with renamed files', async () => {
        mockGit.diffSummary.mockResolvedValue({
          changed: 1,
          insertions: 0,
          deletions: 0,
          files: [
            { 
              file: 'old-name.ts => new-name.ts', 
              changes: 0, 
              insertions: 0, 
              deletions: 0, 
              binary: false 
            }
          ],
        });

        const result = await gitService.getDiffStats('main');
        expect(result.files[0]).toBe('old-name.ts => new-name.ts');
      });
    });

    describe('Commit Operations', () => {
      it('should handle commit with empty message', async () => {
        mockGit.commit.mockResolvedValue({
          commit: 'abc123',
          branch: 'main',
          summary: { changes: 1, insertions: 1, deletions: 0 },
        });

        const result = await gitService.commit('');
        expect(result).toBe('abc123');
      });

      it('should handle commit with multiline message', async () => {
        const message = 'feat: add feature\\n\\nDetailed description\\nwith multiple lines';
        mockGit.commit.mockResolvedValue({
          commit: 'abc123',
          branch: 'main',
          summary: { changes: 1, insertions: 1, deletions: 0 },
        });

        const result = await gitService.commit(message);
        expect(result).toBe('abc123');
        expect(mockGit.commit).toHaveBeenCalledWith(message);
      });
    });

    describe('Push Operations', () => {
      it('should set upstream when branch has no tracking branch', async () => {
        mockGit.status.mockResolvedValue({
          current: 'new-feature',
          tracking: null,
          detached: false,
        });

        await gitService.push();
        expect(mockGit.push).toHaveBeenCalledWith(['-u', 'origin', 'new-feature']);
      });

      it('should force set upstream when setUpstream is true', async () => {
        mockGit.status.mockResolvedValue({
          current: 'feature',
          tracking: 'origin/feature',
          detached: false,
        });

        await gitService.push(true);
        expect(mockGit.push).toHaveBeenCalledWith(['-u', 'origin', 'feature']);
      });
    });

    describe('getTrackingBranchName', () => {
      it('should extract branch name from tracking branch', async () => {
        mockGit.branch.mockResolvedValue({
          current: 'feature',
          all: ['feature', 'main'],
          branches: {},
        });
        mockGit.raw
          .mockResolvedValueOnce('refs/heads/main')
          .mockResolvedValueOnce('origin');

        const result = await gitService.getTrackingBranchName();
        expect(result).toBe('main');
      });

      it('should handle multi-level branch names', async () => {
        mockGit.branch.mockResolvedValue({
          current: 'feature',
          all: ['feature', 'main'],
          branches: {},
        });
        mockGit.raw
          .mockResolvedValueOnce('refs/heads/feature/sub-feature')
          .mockResolvedValueOnce('origin');

        const result = await gitService.getTrackingBranchName();
        expect(result).toBe('feature/sub-feature');
      });

      it('should return null when no tracking branch exists', async () => {
        mockGit.branch.mockResolvedValue({
          current: 'feature',
          all: ['feature'],
          branches: {},
        });
        mockGit.raw.mockRejectedValue(new Error('no upstream'));

        const result = await gitService.getTrackingBranchName();
        expect(result).toBeNull();
      });
    });

    describe('getCurrentCommitHash', () => {
      it('should return current HEAD commit hash', async () => {
        mockGit.revparse.mockResolvedValue('abc123def456\n');

        const result = await gitService.getCurrentCommitHash();
        expect(result).toBe('abc123def456');
        expect(mockGit.revparse).toHaveBeenCalledWith(['HEAD']);
      });

      it('should trim whitespace from hash', async () => {
        mockGit.revparse.mockResolvedValue('  abc123  \n');

        const result = await gitService.getCurrentCommitHash();
        expect(result).toBe('abc123');
      });
    });

    describe('getCommitLog', () => {
      it('should return recent commit messages with default count', async () => {
        mockGit.log.mockResolvedValue({
          all: [
            { message: 'feat: add feature' },
            { message: 'fix: bug fix' },
            { message: 'docs: update readme' },
            { message: 'test: add tests' },
            { message: 'chore: update deps' },
          ],
          total: 5,
          latest: { message: 'feat: add feature' },
        });

        const result = await gitService.getCommitLog();
        expect(result).toEqual([
          'feat: add feature',
          'fix: bug fix',
          'docs: update readme',
          'test: add tests',
          'chore: update deps',
        ]);
        expect(mockGit.log).toHaveBeenCalledWith({ maxCount: 5 });
      });

      it('should return custom count of commits', async () => {
        mockGit.log.mockResolvedValue({
          all: [
            { message: 'feat: add feature' },
            { message: 'fix: bug fix' },
          ],
          total: 2,
          latest: { message: 'feat: add feature' },
        });

        const result = await gitService.getCommitLog(2);
        expect(result).toHaveLength(2);
        expect(mockGit.log).toHaveBeenCalledWith({ maxCount: 2 });
      });
    });

    describe('getLastCommitBody', () => {
      it('should return commit body without subject line', async () => {
        mockGit.log.mockResolvedValue({
          latest: {
            message: 'feat: add feature\n\nThis is the detailed body\nwith multiple lines',
          },
          total: 1,
          all: [],
        });

        const result = await gitService.getLastCommitBody();
        expect(result).toBe('This is the detailed body\nwith multiple lines');
      });

      it('should handle commits with no body', async () => {
        mockGit.log.mockResolvedValue({
          latest: { message: 'feat: add feature' },
          total: 1,
          all: [],
        });

        const result = await gitService.getLastCommitBody();
        expect(result).toBe('');
      });

      it('should skip blank lines after subject', async () => {
        mockGit.log.mockResolvedValue({
          latest: {
            message: 'feat: add feature\n\n\n\nBody starts here',
          },
          total: 1,
          all: [],
        });

        const result = await gitService.getLastCommitBody();
        expect(result).toBe('Body starts here');
      });

      it('should return empty string when no commits exist', async () => {
        mockGit.log.mockResolvedValue({
          latest: null,
          total: 0,
          all: [],
        });

        const result = await gitService.getLastCommitBody();
        expect(result).toBe('');
      });
    });

    describe('getCommitsBetweenBranches', () => {
      it('should return commits between current and target branch', async () => {
        mockGit.raw.mockResolvedValue('abc123');
        mockGit.log.mockResolvedValue({
          all: [
            {
              hash: 'def456789',
              message: 'feat: add feature\n\nDetailed description',
            },
            {
              hash: 'ghi789012',
              message: 'fix: bug fix',
            },
          ],
          total: 2,
          latest: null,
        });

        const result = await gitService.getCommitsBetweenBranches('main');
        expect(result).toEqual([
          {
            hash: 'def4567',
            subject: 'feat: add feature',
            body: 'Detailed description',
            fullMessage: 'feat: add feature\n\nDetailed description',
          },
          {
            hash: 'ghi7890',
            subject: 'fix: bug fix',
            body: '',
            fullMessage: 'fix: bug fix',
          },
        ]);
      });

      it('should handle merge-base failure', async () => {
        mockGit.raw.mockRejectedValue(new Error('no merge base'));

        const result = await gitService.getCommitsBetweenBranches('main');
        expect(result).toEqual([]);
      });

      it('should handle empty commit list', async () => {
        mockGit.raw.mockResolvedValue('abc123');
        mockGit.log.mockResolvedValue({
          all: [],
          total: 0,
          latest: null,
        });

        const result = await gitService.getCommitsBetweenBranches('main');
        expect(result).toEqual([]);
      });
    });

    describe('formatCommitsForPR', () => {
      it('should format single commit as just the body', async () => {
        mockGit.raw.mockResolvedValue('abc123');
        mockGit.log.mockResolvedValue({
          all: [
            {
              hash: 'def456789',
              message: 'feat: add feature\n\nThis is the detailed body',
            },
          ],
          total: 1,
          latest: null,
        });

        const result = await gitService.formatCommitsForPR('main');
        expect(result).toBe('This is the detailed body');
      });

      it('should format multiple commits as markdown list', async () => {
        mockGit.raw.mockResolvedValue('abc123');
        mockGit.log.mockResolvedValue({
          all: [
            {
              hash: 'def456789',
              message: 'feat: add feature\n\nFeature description',
            },
            {
              hash: 'ghi789012',
              message: 'fix: bug fix\n\nBug fix details',
            },
          ],
          total: 2,
          latest: null,
        });

        const result = await gitService.formatCommitsForPR('main');
        expect(result).toContain('## Commits');
        expect(result).toContain('### feat: add feature (def4567)');
        expect(result).toContain('Feature description');
        expect(result).toContain('### fix: bug fix (ghi7890)');
        expect(result).toContain('Bug fix details');
      });

      it('should handle commits without body', async () => {
        mockGit.raw.mockResolvedValue('abc123');
        mockGit.log.mockResolvedValue({
          all: [
            { hash: 'def456789', message: 'feat: add feature' },
            { hash: 'ghi789012', message: 'fix: bug fix' },
          ],
          total: 2,
          latest: null,
        });

        const result = await gitService.formatCommitsForPR('main');
        expect(result).toContain('### feat: add feature (def4567)');
        expect(result).toContain('### fix: bug fix (ghi7890)');
      });

      it('should return empty string when no commits', async () => {
        mockGit.raw.mockResolvedValue('abc123');
        mockGit.log.mockResolvedValue({
          all: [],
          total: 0,
          latest: null,
        });

        const result = await gitService.formatCommitsForPR('main');
        expect(result).toBe('');
      });
    });

    describe('getFullDiffSummary', () => {
      it('should return combined branch info, stats, and diff', async () => {
        mockGit.status.mockResolvedValue({
          current: 'feature',
          tracking: 'origin/feature',
          detached: false,
        });
        mockGit.raw.mockResolvedValue('abc123');
        mockGit.revparse.mockResolvedValue('def456');
        mockGit.diffSummary.mockResolvedValue({
          changed: 2,
          insertions: 10,
          deletions: 5,
          files: [
            { file: 'file1.ts', changes: 7, insertions: 5, deletions: 2, binary: false },
            { file: 'file2.ts', changes: 8, insertions: 5, deletions: 3, binary: false },
          ],
        });
        mockGit.diff.mockResolvedValue('diff content here');

        const result = await gitService.getFullDiffSummary('main');
        expect(result.branch.current).toBe('feature');
        expect(result.branch.tracking).toBe('origin/feature');
        expect(result.branch.isDetached).toBe(false);
        expect(result.stats.filesChanged).toBe(2);
        expect(result.stats.insertions).toBe(10);
        expect(result.stats.deletions).toBe(5);
        expect(result.diff).toBe('diff content here');
      });

      it('should handle detached HEAD state', async () => {
        mockGit.status.mockResolvedValue({
          current: null,
          tracking: null,
          detached: true,
        });
        mockGit.raw.mockResolvedValue('abc123');
        mockGit.revparse.mockResolvedValue('abc123');
        mockGit.diffSummary.mockResolvedValue({
          changed: 0,
          insertions: 0,
          deletions: 0,
          files: [],
        });
        mockGit.diff.mockResolvedValue('');

        const result = await gitService.getFullDiffSummary('main');
        expect(result.branch.current).toBe('HEAD');
        expect(result.branch.isDetached).toBe(true);
      });
    });
  });
});

