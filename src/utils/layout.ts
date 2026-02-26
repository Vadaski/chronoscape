import type {
  BranchPath,
  GitCommit,
  GitHistoryExport,
  PreparedCommit,
  PreparedHistory
} from '../types/git';

const TAU = Math.PI * 2;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hashToUnit(value: string, seed = 0): number {
  let hash = 2166136261 ^ seed;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 10000) / 10000;
}

function colorFromIndex(index: number, total: number, saturation: number, lightness: number): string {
  const hue = Math.round((index / Math.max(1, total)) * 360) % 360;
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
}

function commitVolume(commit: GitCommit): number {
  return Math.max(1, commit.filesChanged + commit.insertions * 0.35 + commit.deletions * 0.3);
}

export function prepareHistory(history: GitHistoryExport): PreparedHistory {
  const commits = history.commits;
  if (!commits.length) {
    return {
      commits: [],
      branches: [],
      branchColors: {},
      contributorColors: {},
      minTimestamp: 0,
      maxTimestamp: 0
    };
  }

  const sortedCommits = [...commits].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const branches = Array.from(new Set(sortedCommits.map((commit) => commit.branch || 'main')));
  const contributors = Array.from(new Set(sortedCommits.map((commit) => commit.author || 'Unknown Author')));

  const branchColors = Object.fromEntries(
    branches.map((branch, index) => [branch, colorFromIndex(index, branches.length, 90, 64)])
  ) as Record<string, string>;

  const contributorColors = Object.fromEntries(
    contributors.map((name, index) => [name, colorFromIndex(index, contributors.length, 88, 70)])
  ) as Record<string, string>;

  const branchLocalCounts = new Map<string, number>();
  const maxVolume = sortedCommits.reduce(
    (acc, commit) => Math.max(acc, commitVolume(commit)),
    1
  );

  const preparedCommits: PreparedCommit[] = sortedCommits.map((commit, globalIndex) => {
    const branch = commit.branch || 'main';
    const branchIndex = Math.max(0, branches.indexOf(branch));
    const localCount = (branchLocalCounts.get(branch) ?? 0) + 1;
    branchLocalCounts.set(branch, localCount);

    const timelineT = globalIndex / Math.max(1, sortedCommits.length - 1);
    const baseAngle = (branchIndex / Math.max(1, branches.length)) * TAU;
    const angle = baseAngle + localCount * 0.055 + timelineT * 0.65;
    const radius = localCount * 0.5 + timelineT * 28;

    const noiseX = hashToUnit(commit.hash, 11) - 0.5;
    const noiseY = hashToUnit(commit.hash, 23) - 0.5;
    const noiseZ = hashToUnit(commit.hash, 37) - 0.5;

    const spiralOffset = Math.sin(localCount * 0.18 + branchIndex * 1.7) * 2.2;

    const x = Math.cos(angle) * (radius + spiralOffset) + noiseX * 1.2;
    const y =
      (branchIndex - (branches.length - 1) / 2) * 1.7 +
      Math.sin(localCount * 0.07 + branchIndex) * 1.2 +
      noiseY * 2.4;
    const z = Math.sin(angle) * (radius + spiralOffset) + noiseZ * 1.2;

    const normalizedBrightness = Math.pow(commitVolume(commit) / maxVolume, 0.36);
    const brightness = clamp(0.18 + normalizedBrightness * 1.15, 0.2, 1.33);
    const scale = 0.075 + brightness * 0.34;

    return {
      commit,
      timestamp: new Date(commit.date).getTime(),
      position: [x, y, z],
      branch,
      branchColor: branchColors[branch],
      contributorColor: contributorColors[commit.author] ?? 'hsl(210 70% 70%)',
      brightness,
      scale
    } satisfies PreparedCommit;
  });

  const branchPointsMap = new Map<string, [number, number, number][]>();
  for (const commit of preparedCommits) {
    const list = branchPointsMap.get(commit.branch) ?? [];
    list.push(commit.position);
    branchPointsMap.set(commit.branch, list);
  }

  const preparedBranches: BranchPath[] = branches.map((branch) => ({
    branch,
    color: branchColors[branch],
    points: branchPointsMap.get(branch) ?? []
  }));

  return {
    commits: preparedCommits,
    branches: preparedBranches,
    branchColors,
    contributorColors,
    minTimestamp: preparedCommits[0].timestamp,
    maxTimestamp: preparedCommits[preparedCommits.length - 1].timestamp
  };
}
