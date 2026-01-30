import simpleGit, { SimpleGit, DiffResult } from 'simple-git';

export interface BranchInfo {
  current: string;
  tracking?: string;
  isDetached: boolean;
}

export interface DiffStats {
  filesChanged: number;
  insertions: number;
  deletions: number;
  files: string[];
}

export interface DiffSummary {
  branch: BranchInfo;
  stats: DiffStats;
  diff: string;
}

export class GitService {
  private git: SimpleGit;

  constructor(workingDir?: string) {
    this.git = simpleGit(workingDir);
  }

  async isGitRepository(): Promise<boolean> {
    try {
      await this.git.status();
      return true;
    } catch {
      return false;
    }
  }

  async getBranchInfo(): Promise<BranchInfo> {
    const status = await this.git.status();
    return {
      current: status.current || 'HEAD',
      tracking: status.tracking || undefined,
      isDetached: status.detached,
    };
  }

  async getDiffAgainstBranch(targetBranch: string = 'main'): Promise<string> {
    try {
      // Get the merge base between current branch and target
      const mergeBase = await this.git.raw(['merge-base', targetBranch, 'HEAD']);
      const base = mergeBase.trim();
      const headCommit = await this.git.revparse(['HEAD']);

      // If merge base equals HEAD, we're on the same commit - include working directory changes
      if (base === headCommit.trim()) {
        const diff = await this.git.diff(['HEAD']);
        return diff || await this.git.diff();
      }

      // Get diff from merge base to HEAD
      const diff = await this.git.diff([base, 'HEAD']);
      return diff;
    } catch {
      // Fallback: try to diff against the target branch directly
      try {
        const diff = await this.git.diff([targetBranch, 'HEAD']);
        return diff;
      } catch {
        // If target branch doesn't exist, get diff of staged + unstaged changes
        const diff = await this.git.diff(['HEAD']);
        return diff || await this.git.diff();
      }
    }
  }

  async getDiffStats(targetBranch: string = 'main'): Promise<DiffStats> {
    try {
      const mergeBase = await this.git.raw(['merge-base', targetBranch, 'HEAD']);
      const base = mergeBase.trim();
      const headCommit = await this.git.revparse(['HEAD']);

      // If merge base equals HEAD, we're on the same commit - include working directory changes
      if (base === headCommit.trim()) {
        const diffSummary = await this.git.diffSummary(['HEAD']);
        return this.parseDiffSummary(diffSummary);
      }

      const diffSummary = await this.git.diffSummary([base, 'HEAD']);
      return this.parseDiffSummary(diffSummary);
    } catch {
      try {
        const diffSummary = await this.git.diffSummary([targetBranch, 'HEAD']);
        return this.parseDiffSummary(diffSummary);
      } catch {
        const diffSummary = await this.git.diffSummary(['HEAD']);
        return this.parseDiffSummary(diffSummary);
      }
    }
  }

  private parseDiffSummary(diffSummary: DiffResult): DiffStats {
    return {
      filesChanged: diffSummary.changed,
      insertions: diffSummary.insertions,
      deletions: diffSummary.deletions,
      files: diffSummary.files.map(f => f.file),
    };
  }

  async getFullDiffSummary(targetBranch: string = 'main'): Promise<DiffSummary> {
    const [branch, stats, diff] = await Promise.all([
      this.getBranchInfo(),
      this.getDiffStats(targetBranch),
      this.getDiffAgainstBranch(targetBranch),
    ]);

    return { branch, stats, diff };
  }

  async hasUncommittedChanges(): Promise<boolean> {
    const status = await this.git.status();
    return status.files.length > 0;
  }

  async stageAll(): Promise<void> {
    await this.git.add('-A');
  }

  async commit(message: string): Promise<string> {
    const result = await this.git.commit(message);
    return result.commit;
  }

  async push(setUpstream: boolean = false): Promise<void> {
    const branch = await this.getBranchInfo();

    if (setUpstream || !branch.tracking) {
      await this.git.push(['-u', 'origin', branch.current]);
    } else {
      await this.git.push();
    }
  }

  async getRemoteUrl(): Promise<string | null> {
    try {
      const remotes = await this.git.getRemotes(true);
      const origin = remotes.find(r => r.name === 'origin');
      return origin?.refs?.push || origin?.refs?.fetch || null;
    } catch {
      return null;
    }
  }

  /**
   * Parse GitHub repository info from remote URL
   * Supports: git@github.com:owner/repo.git, https://github.com/owner/repo.git
   */
  async getGitHubRepoInfo(): Promise<{ owner: string; repo: string } | null> {
    const remoteUrl = await this.getRemoteUrl();
    if (!remoteUrl) return null;

    // Match SSH format: git@github.com:owner/repo.git
    const sshMatch = remoteUrl.match(/git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/);
    if (sshMatch) {
      return { owner: sshMatch[1], repo: sshMatch[2] };
    }

    // Match HTTPS format: https://github.com/owner/repo.git
    const httpsMatch = remoteUrl.match(/https:\/\/github\.com\/([^/]+)\/(.+?)(?:\.git)?$/);
    if (httpsMatch) {
      return { owner: httpsMatch[1], repo: httpsMatch[2] };
    }

    return null;
  }

  /**
   * Get the remote tracking branch for the current branch
   * Returns format: "origin/main"
   */
  async getTrackingBranch(): Promise<string | null> {
    try {
      const branchInfo = await this.git.branch();
      const currentBranch = branchInfo.current;
      
      // Get tracking branch using git config
      const trackingBranch = await this.git.raw([
        'config',
        `branch.${currentBranch}.merge`
      ]);
      
      if (!trackingBranch) return null;
      
      // tracking branch is in format: refs/heads/main
      // Extract just the branch name
      const branchName = trackingBranch.trim().replace('refs/heads/', '');
      
      // Get the remote
      const remote = await this.git.raw([
        'config',
        `branch.${currentBranch}.remote`
      ]);
      
      const remoteName = remote.trim() || 'origin';
      return `${remoteName}/${branchName}`;
    } catch {
      return null;
    }
  }

  /**
   * Get just the branch name from the tracking branch (e.g., "main" from "origin/main")
   */
  async getTrackingBranchName(): Promise<string | null> {
    const tracking = await this.getTrackingBranch();
    if (!tracking) return null;
    
    // Remove remote prefix (e.g., "origin/main" -> "main")
    return tracking.split('/').slice(1).join('/');
  }

  async getCurrentCommitHash(): Promise<string> {
    const hash = await this.git.revparse(['HEAD']);
    return hash.trim();
  }

  async getCommitLog(count: number = 5): Promise<string[]> {
    const log = await this.git.log({ maxCount: count });
    return log.all.map(commit => commit.message);
  }

  /**
   * Get last commit message (subject line only)
   */
  async getLastCommitSubject(): Promise<string> {
    const log = await this.git.log({ maxCount: 1 });
    return log.latest?.message || '';
  }

  /**
   * Get last commit body (everything after the subject line)
   */
  async getLastCommitBody(): Promise<string> {
    const log = await this.git.log({ maxCount: 1 });
    if (!log.latest) return '';
    
    const fullMessage = log.latest.message;
    const lines = fullMessage.split('\n');
    
    // Remove first line (subject) and any blank lines immediately after
    let startIndex = 1;
    while (startIndex < lines.length && lines[startIndex].trim() === '') {
      startIndex++;
    }
    
    return lines.slice(startIndex).join('\n').trim();
  }

  /**
   * Get all commits between current branch and target branch
   * Returns array of commit messages (full messages including body)
   */
  async getCommitsBetweenBranches(targetBranch: string): Promise<Array<{ hash: string; subject: string; body: string; fullMessage: string }>> {
    try {
      // Get the merge base
      const mergeBase = await this.git.raw(['merge-base', 'HEAD', targetBranch]);
      const base = mergeBase.trim();

      // Get all commits from base to HEAD
      const log = await this.git.log({ from: base, to: 'HEAD' });
      
      return log.all.map(commit => {
        const lines = commit.message.split('\n');
        const subject = lines[0];
        
        // Get body (everything after first line, excluding empty lines immediately after subject)
        let startIndex = 1;
        while (startIndex < lines.length && lines[startIndex].trim() === '') {
          startIndex++;
        }
        const body = lines.slice(startIndex).join('\n').trim();

        return {
          hash: commit.hash.substring(0, 7),
          subject,
          body,
          fullMessage: commit.message,
        };
      });
    } catch (error) {
      return [];
    }
  }

  /**
   * Format all commits between branches as a PR body
   */
  async formatCommitsForPR(targetBranch: string): Promise<string> {
    const commits = await this.getCommitsBetweenBranches(targetBranch);
    
    if (commits.length === 0) {
      return '';
    }

    if (commits.length === 1) {
      // Single commit - just return its body
      return commits[0].body;
    }

    // Multiple commits - format as a list
    let body = '## Commits\n\n';
    for (const commit of commits) {
      body += `### ${commit.subject} (${commit.hash})\n`;
      if (commit.body) {
        body += `${commit.body}\n\n`;
      } else {
        body += '\n';
      }
    }

    return body.trim();
  }
}
