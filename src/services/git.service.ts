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

  async getCurrentCommitHash(): Promise<string> {
    const hash = await this.git.revparse(['HEAD']);
    return hash.trim();
  }

  async getCommitLog(count: number = 5): Promise<string[]> {
    const log = await this.git.log({ maxCount: count });
    return log.all.map(commit => commit.message);
  }
}
