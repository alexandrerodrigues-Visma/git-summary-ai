import { Octokit } from '@octokit/rest';

export interface GitHubRepo {
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  private: boolean;
  defaultBranch: string;
}

export interface GitHubBranch {
  name: string;
  sha: string;
}

export interface GitHubCompareResult {
  ahead_by: number;
  behind_by: number;
  commits: Array<{
    sha: string;
    message: string;
    author: string;
    date: string;
  }>;
  files: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    patch?: string;
  }>;
}

export class GitHubApiService {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  /**
   * Get all repositories the user has access to
   */
  async getUserRepos(): Promise<GitHubRepo[]> {
    const repos: GitHubRepo[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const { data } = await this.octokit.repos.listForAuthenticatedUser({
        per_page: perPage,
        page,
        sort: 'updated',
        affiliation: 'owner,collaborator,organization_member',
      });

      if (data.length === 0) break;

      repos.push(
        ...data.map((repo) => ({
          owner: repo.owner.login,
          name: repo.name,
          fullName: repo.full_name,
          description: repo.description,
          private: repo.private,
          defaultBranch: repo.default_branch,
        }))
      );

      if (data.length < perPage) break;
      page++;
    }

    return repos;
  }

  /**
   * Get branches for a repository
   */
  async getRepoBranches(owner: string, repo: string): Promise<GitHubBranch[]> {
    const { data } = await this.octokit.repos.listBranches({
      owner,
      repo,
      per_page: 100,
    });

    return data.map((branch) => ({
      name: branch.name,
      sha: branch.commit.sha,
    }));
  }

  /**
   * Compare two branches/commits
   */
  async compareBranches(
    owner: string,
    repo: string,
    base: string,
    head: string
  ): Promise<GitHubCompareResult> {
    const { data } = await this.octokit.repos.compareCommitsWithBasehead({
      owner,
      repo,
      basehead: `${base}...${head}`,
    });

    return {
      ahead_by: data.ahead_by,
      behind_by: data.behind_by,
      commits: data.commits.map((commit) => ({
        sha: commit.sha,
        message: commit.commit.message,
        author: commit.commit.author?.name || 'Unknown',
        date: commit.commit.author?.date || '',
      })),
      files: data.files?.map((file) => ({
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        patch: file.patch,
      })) || [],
    };
  }

  /**
   * Get the default branch for a repository
   */
  async getDefaultBranch(owner: string, repo: string): Promise<string> {
    const { data } = await this.octokit.repos.get({
      owner,
      repo,
    });
    return data.default_branch;
  }

  /**
   * Get file content from repository
   */
  async getFileContent(
    owner: string,
    repo: string,
    path: string,
    ref?: string
  ): Promise<string> {
    const { data } = await this.octokit.repos.getContent({
      owner,
      repo,
      path,
      ref,
    });

    if ('content' in data && typeof data.content === 'string') {
      return Buffer.from(data.content, 'base64').toString('utf-8');
    }

    throw new Error('File content not found');
  }

  /**
   * Generate a full diff between two branches
   */
  async generateDiff(
    owner: string,
    repo: string,
    base: string,
    head: string
  ): Promise<string> {
    const comparison = await this.compareBranches(owner, repo, base, head);

    let diff = '';
    for (const file of comparison.files) {
      diff += `diff --git a/${file.filename} b/${file.filename}\n`;
      diff += `--- a/${file.filename}\n`;
      diff += `+++ b/${file.filename}\n`;
      if (file.patch) {
        diff += file.patch + '\n';
      }
    }

    return diff;
  }

  /**
   * Create a pull request
   */
  async createPullRequest(
    owner: string,
    repo: string,
    options: {
      title: string;
      body: string;
      head: string;
      base: string;
      draft?: boolean;
    }
  ): Promise<{ html_url: string; number: number }> {
    try {
      const { data } = await this.octokit.pulls.create({
        owner,
        repo,
        title: options.title,
        body: options.body,
        head: options.head,
        base: options.base,
        draft: options.draft || false,
      });

      return {
        html_url: data.html_url,
        number: data.number,
      };
    } catch (error: unknown) {
      // Provide more helpful error messages
      const err = error as { status?: number; message?: string; response?: { data?: { errors?: Array<{ message: string }> } } };
      if (err.status === 404) {
        throw new Error(
          `Repository not found or insufficient permissions.\n` +
          `Make sure:\n` +
          `  1. Repository ${owner}/${repo} exists\n` +
          `  2. Your GitHub token has 'repo' scope\n` +
          `  3. You have write access to the repository`
        );
      } else if (err.status === 422) {
        // Validation error - could be branch doesn't exist, PR already exists, etc.
        const message = err.response?.data?.errors?.[0]?.message || err.message;
        throw new Error(`Cannot create PR: ${message}`);
      }
      throw error;
    }
  }

  /**
   * Verify repository access
   */
  async verifyRepoAccess(owner: string, repo: string): Promise<boolean> {
    try {
      await this.octokit.repos.get({ owner, repo });
      return true;
    } catch {
      return false;
    }
  }
}
