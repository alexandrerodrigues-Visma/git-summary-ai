import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GitHubApiService } from '../src/services/github/github-api.service.js';

// Create mock functions for Octokit methods
const mockListForAuthenticatedUser = vi.fn();
const mockListBranches = vi.fn();
const mockCompareCommitsWithBasehead = vi.fn();
const mockGet = vi.fn();
const mockGetContent = vi.fn();
const mockCreate = vi.fn();

// Mock the Octokit module with a proper constructor
vi.mock('@octokit/rest', () => {
  return {
    Octokit: class {
      repos = {
        listForAuthenticatedUser: mockListForAuthenticatedUser,
        listBranches: mockListBranches,
        compareCommitsWithBasehead: mockCompareCommitsWithBasehead,
        get: mockGet,
        getContent: mockGetContent,
      };
      pulls = {
        create: mockCreate,
      };
    },
  };
});

describe('GitHub API Service', () => {
  let service: GitHubApiService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GitHubApiService('test-token');
  });

  describe('getUserRepos', () => {
    it('should fetch user repositories successfully', async () => {
      mockListForAuthenticatedUser.mockResolvedValue({
        data: [
          {
            owner: { login: 'testuser' },
            name: 'repo1',
            full_name: 'testuser/repo1',
            description: 'Test repo',
            private: false,
            default_branch: 'main',
          },
        ],
      });

      const repos = await service.getUserRepos();

      expect(repos).toHaveLength(1);
      expect(repos[0]).toEqual({
        owner: 'testuser',
        name: 'repo1',
        fullName: 'testuser/repo1',
        description: 'Test repo',
        private: false,
        defaultBranch: 'main',
      });
    });

    it('should handle pagination correctly', async () => {
      mockListForAuthenticatedUser
        .mockResolvedValueOnce({
          data: Array(100).fill({
            owner: { login: 'user' },
            name: 'repo',
            full_name: 'user/repo',
            description: null,
            private: false,
            default_branch: 'main',
          }),
        })
        .mockResolvedValueOnce({
          data: Array(50).fill({
            owner: { login: 'user' },
            name: 'repo2',
            full_name: 'user/repo2',
            description: null,
            private: false,
            default_branch: 'main',
          }),
        })
        .mockResolvedValueOnce({ data: [] });

      const repos = await service.getUserRepos();

      expect(repos).toHaveLength(150);
      expect(mockListForAuthenticatedUser).toHaveBeenCalledTimes(2);
    });

    it('should handle empty repository list', async () => {
      mockListForAuthenticatedUser.mockResolvedValue({ data: [] });

      const repos = await service.getUserRepos();

      expect(repos).toHaveLength(0);
    });
  });

  describe('getRepoBranches', () => {
    it('should fetch branches successfully', async () => {
      mockListBranches.mockResolvedValue({
        data: [
          { name: 'main', commit: { sha: 'abc123' } },
          { name: 'develop', commit: { sha: 'def456' } },
        ],
      });

      const branches = await service.getRepoBranches('owner', 'repo');

      expect(branches).toHaveLength(2);
      expect(branches[0]).toEqual({ name: 'main', sha: 'abc123' });
      expect(branches[1]).toEqual({ name: 'develop', sha: 'def456' });
    });

    it('should handle repository with no branches', async () => {
      mockListBranches.mockResolvedValue({ data: [] });

      const branches = await service.getRepoBranches('owner', 'repo');

      expect(branches).toHaveLength(0);
    });
  });

  describe('compareBranches', () => {
    it('should compare branches successfully', async () => {
      mockCompareCommitsWithBasehead.mockResolvedValue({
        data: {
          ahead_by: 5,
          behind_by: 2,
          commits: [
            {
              sha: 'abc123',
              commit: {
                message: 'Test commit',
                author: { name: 'Test User', date: '2024-01-01T00:00:00Z' },
              },
            },
          ],
          files: [
            {
              filename: 'test.ts',
              status: 'modified',
              additions: 10,
              deletions: 5,
              patch: '@@ -1,5 +1,10 @@',
            },
          ],
        },
      });

      const result = await service.compareBranches('owner', 'repo', 'main', 'feature');

      expect(result.ahead_by).toBe(5);
      expect(result.behind_by).toBe(2);
      expect(result.commits).toHaveLength(1);
      expect(result.files).toHaveLength(1);
    });

    it('should handle comparison with no changes', async () => {
      mockCompareCommitsWithBasehead.mockResolvedValue({
        data: {
          ahead_by: 0,
          behind_by: 0,
          commits: [],
          files: [],
        },
      });

      const result = await service.compareBranches('owner', 'repo', 'main', 'main');

      expect(result.ahead_by).toBe(0);
      expect(result.behind_by).toBe(0);
      expect(result.commits).toHaveLength(0);
    });
  });

  describe('createPullRequest', () => {
    it('should create PR successfully', async () => {
      mockCreate.mockResolvedValue({
        data: {
          number: 123,
          html_url: 'https://github.com/owner/repo/pull/123',
          title: 'Test PR',
          body: 'Test description',
          draft: false,
        },
      });

      const result = await service.createPullRequest('owner', 'repo', {
        title: 'Test PR',
        body: 'Test description',
        head: 'feature',
        base: 'main',
      });

      expect(result.number).toBe(123);
      expect(result.html_url).toContain('/pull/123');
      expect(mockCreate).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        title: 'Test PR',
        body: 'Test description',
        head: 'feature',
        base: 'main',
        draft: false,
      });
    });

    it('should create draft PR when specified', async () => {
      mockCreate.mockResolvedValue({
        data: {
          number: 124,
          html_url: 'https://github.com/owner/repo/pull/124',
          title: 'Draft PR',
          body: '',
          draft: true,
        },
      });

      await service.createPullRequest('owner', 'repo', {
        title: 'Draft PR',
        body: '',
        head: 'feature',
        base: 'main',
        draft: true,
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ draft: true })
      );
    });

    it('should throw error for repository not found (404)', async () => {
      mockCreate.mockRejectedValue({
        status: 404,
        message: 'Not Found',
      });

      await expect(
        service.createPullRequest('owner', 'nonexistent', {
          title: 'Test',
          body: '',
          head: 'feature',
          base: 'main',
        })
      ).rejects.toThrow();
    });

    it('should throw error for validation failures (422)', async () => {
      mockCreate.mockRejectedValue({
        status: 422,
        message: 'Validation Failed',
        response: {
          data: {
            errors: [{ message: 'A pull request already exists for this branch' }],
          },
        },
      });

      await expect(
        service.createPullRequest('owner', 'repo', {
          title: 'Duplicate',
          body: '',
          head: 'feature',
          base: 'main',
        })
      ).rejects.toThrow();
    });

    it('should throw error for branch not found (422)', async () => {
      mockCreate.mockRejectedValue({
        status: 422,
        message: 'Validation Failed',
        response: {
          data: {
            errors: [{ message: 'Head sha cannot be found' }],
          },
        },
      });

      await expect(
        service.createPullRequest('owner', 'repo', {
          title: 'Test',
          body: '',
          head: 'nonexistent',
          base: 'main',
        })
      ).rejects.toThrow();
    });

    it('should handle generic errors', async () => {
      mockCreate.mockRejectedValue(new Error('Network error'));

      await expect(
        service.createPullRequest('owner', 'repo', {
          title: 'Test',
          body: '',
          head: 'feature',
          base: 'main',
        })
      ).rejects.toThrow('Network error');
    });
  });

  describe('verifyRepoAccess', () => {
    it('should return true for accessible repository', async () => {
      mockGet.mockResolvedValue({ data: {} });

      const result = await service.verifyRepoAccess('owner', 'repo');

      expect(result).toBe(true);
    });

    it('should return false for inaccessible repository', async () => {
      mockGet.mockRejectedValue(new Error('Not Found'));

      const result = await service.verifyRepoAccess('owner', 'nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('getDefaultBranch', () => {
    it('should get default branch successfully', async () => {
      mockGet.mockResolvedValue({
        data: {
          default_branch: 'main',
        },
      });

      const branch = await service.getDefaultBranch('owner', 'repo');

      expect(branch).toBe('main');
    });

    it('should handle different default branches', async () => {
      mockGet.mockResolvedValue({
        data: {
          default_branch: 'master',
        },
      });

      const branch = await service.getDefaultBranch('owner', 'repo');

      expect(branch).toBe('master');
    });
  });

  describe('getFileContent', () => {
    it('should get file content successfully', async () => {
      const content = Buffer.from('test content').toString('base64');
      mockGetContent.mockResolvedValue({
        data: {
          type: 'file',
          content,
          encoding: 'base64',
        },
      });

      const result = await service.getFileContent('owner', 'repo', 'test.txt', 'main');

      expect(result).toBe('test content');
    });

    it('should throw error for missing content', async () => {
      mockGetContent.mockResolvedValue({
        data: {
          type: 'file',
          encoding: 'base64',
        },
      });

      await expect(
        service.getFileContent('owner', 'repo', 'missing.txt', 'main')
      ).rejects.toThrow();
    });
  });

  describe('generateDiff', () => {
    it('should generate diff successfully', async () => {
      mockCompareCommitsWithBasehead.mockResolvedValue({
        data: {
          commits: [],
          files: [
            {
              filename: 'src/test.ts',
              status: 'modified',
              additions: 5,
              deletions: 2,
              patch: '@@ -1,3 +1,6 @@\n-old line\n+new line',
            },
          ],
        },
      });

      const diff = await service.generateDiff('owner', 'repo', 'main', 'feature');

      expect(diff).toContain('src/test.ts');
      expect(diff).toContain('diff --git');
      expect(diff).toContain('-old line');
      expect(diff).toContain('+new line');
    });

    it('should handle multiple files in diff', async () => {
      mockCompareCommitsWithBasehead.mockResolvedValue({
        data: {
          commits: [],
          files: [
            {
              filename: 'file1.ts',
              status: 'added',
              additions: 10,
              deletions: 0,
            },
            {
              filename: 'file2.ts',
              status: 'deleted',
              additions: 0,
              deletions: 15,
            },
          ],
        },
      });

      const diff = await service.generateDiff('owner', 'repo', 'main', 'feature');

      expect(diff).toContain('file1.ts');
      expect(diff).toContain('file2.ts');
      expect(diff).toContain('diff --git a/file1.ts');
      expect(diff).toContain('diff --git a/file2.ts');
    });
  });
});
