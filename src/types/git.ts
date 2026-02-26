export interface ChangedFileStat {
  path: string;
  additions: number;
  deletions: number;
}

export interface GitCommit {
  hash: string;
  author: string;
  email?: string;
  date: string;
  message: string;
  branch: string;
  parents: string[];
  filesChanged: number;
  insertions: number;
  deletions: number;
  changedFiles: ChangedFileStat[];
}

export interface GitHistoryExport {
  schemaVersion?: string;
  repo?: string;
  generatedAt?: string;
  commits: GitCommit[];
}

export interface PreparedCommit {
  commit: GitCommit;
  timestamp: number;
  position: [number, number, number];
  branch: string;
  branchColor: string;
  contributorColor: string;
  brightness: number;
  scale: number;
}

export interface BranchPath {
  branch: string;
  color: string;
  points: [number, number, number][];
}

export interface PreparedHistory {
  commits: PreparedCommit[];
  branches: BranchPath[];
  branchColors: Record<string, string>;
  contributorColors: Record<string, string>;
  minTimestamp: number;
  maxTimestamp: number;
}
