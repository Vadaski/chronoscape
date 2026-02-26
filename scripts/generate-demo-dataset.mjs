import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import path from 'node:path';

const outputPath = path.resolve(process.cwd(), 'public/demo-history.json');

const branchStories = [
  { name: 'feature/nebula-ui', start: 18, end: 210, weight: 1.05 },
  { name: 'feature/timeline-engine', start: 36, end: 286, weight: 1.25 },
  { name: 'feature/collision-free-layout', start: 70, end: 332, weight: 0.92 },
  { name: 'refactor/render-pipeline', start: 60, end: 360, weight: 0.84 },
  { name: 'hotfix/perf-regression', start: 120, end: 420, weight: 0.5 },
  { name: 'experiment/bloom-tuning', start: 92, end: 304, weight: 0.72 },
  { name: 'release/v1.0', start: 250, end: 430, weight: 0.58 }
];

const authors = [
  { name: 'Ari Vega', email: 'ari@chronoscape.dev' },
  { name: 'Mina Kapoor', email: 'mina@chronoscape.dev' },
  { name: 'Leo Quinn', email: 'leo@chronoscape.dev' },
  { name: 'Rae Coleman', email: 'rae@chronoscape.dev' },
  { name: 'Noa Chen', email: 'noa@chronoscape.dev' },
  { name: 'Ivy Brooks', email: 'ivy@chronoscape.dev' },
  { name: 'Tao Lin', email: 'tao@chronoscape.dev' }
];

const commonModules = [
  'src/App.tsx',
  'src/components/ChronoscapeScene.tsx',
  'src/components/BackgroundStars.tsx',
  'src/components/CommitStars.tsx',
  'src/components/BranchLines.tsx',
  'src/components/CommitTooltip.tsx',
  'src/components/SceneEnvironment.tsx',
  'src/utils/layout.ts',
  'src/utils/dataLoader.ts',
  'src/types/git.ts',
  'src/styles.css',
  'vite.config.ts',
  'bin/chronoscape.js',
  'README.md'
];

const branchSpecificModules = {
  main: ['docs/todo/human-board.md', '.github/workflows/deploy.yml', 'scripts/generate-demo-dataset.mjs'],
  'feature/nebula-ui': ['src/styles.css', 'src/components/CommitTooltip.tsx', 'src/components/SceneEnvironment.tsx'],
  'feature/timeline-engine': ['src/App.tsx', 'src/utils/layout.ts', 'src/components/CommitStars.tsx'],
  'feature/collision-free-layout': ['src/utils/layout.ts', 'src/components/BranchLines.tsx', 'src/types/git.ts'],
  'refactor/render-pipeline': ['src/components/ChronoscapeScene.tsx', 'src/components/BackgroundStars.tsx', 'src/components/CommitStars.tsx'],
  'hotfix/perf-regression': ['src/components/CommitStars.tsx', 'src/components/BranchLines.tsx', 'src/utils/dataLoader.ts'],
  'experiment/bloom-tuning': ['src/components/ChronoscapeScene.tsx', 'src/components/SceneEnvironment.tsx', 'src/styles.css'],
  'release/v1.0': ['README.md', 'docs/todo/sprint.md', 'docs/operations/va-auto-pilot-protocol.md']
};

const subjects = [
  'bloom falloff',
  'timeline interpolation',
  'branch spline tension',
  'camera drift',
  'tooltip telemetry',
  'export parser',
  'starfield depth',
  'merge lane routing',
  'history hydration',
  'interaction latency',
  'twinkle cadence',
  'render culling',
  'neon branch palette'
];

const contexts = [
  'for dense histories',
  'during merge storms',
  'for release hardening',
  'under heavy branching',
  'for cleaner storytelling',
  'for visual clarity',
  'under CI constraints',
  'for smoother playback'
];

const verbs = ['Calibrate', 'Refine', 'Stabilize', 'Accelerate', 'Tune', 'Polish', 'Streamline', 'Integrate'];

function unit(seed) {
  const raw = Math.sin(seed * 12.9898 + 78.233) * 43758.5453123;
  return raw - Math.floor(raw);
}

function weightedPick(entries, seed) {
  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let cursor = unit(seed) * totalWeight;
  for (const entry of entries) {
    cursor -= entry.weight;
    if (cursor <= 0) {
      return entry.name;
    }
  }
  return entries[entries.length - 1]?.name ?? 'main';
}

function activeBranches(index) {
  const active = branchStories.filter((branch) => index >= branch.start && index <= branch.end);
  return active.length ? active : [];
}

function branchType(branch) {
  if (branch.startsWith('hotfix/')) {
    return 'fix';
  }
  if (branch.startsWith('refactor/')) {
    return 'refactor';
  }
  if (branch.startsWith('release/')) {
    return 'chore';
  }
  if (branch.startsWith('experiment/')) {
    return 'perf';
  }
  if (branch === 'main') {
    return 'chore';
  }
  return 'feat';
}

function makeMessage(branch, index) {
  const type = branchType(branch);
  const verb = verbs[index % verbs.length];
  const subject = subjects[(index * 3 + branch.length) % subjects.length];
  const context = contexts[(index * 5 + branch.length) % contexts.length];
  return `${type}: ${verb.toLowerCase()} ${subject} ${context}`;
}

function collectModules(branch) {
  return [...commonModules, ...(branchSpecificModules[branch] ?? [])];
}

function changedFilesForCommit(index, branch) {
  const pool = collectModules(branch);
  const files = [];
  const usedPaths = new Set();
  const branchVolumeBoost = branch.startsWith('hotfix/') ? 0 : 2;
  const fileCount = 2 + (index % 6) + branchVolumeBoost;

  for (let fileIndex = 0; fileIndex < fileCount; fileIndex += 1) {
    let cursor = (index * 11 + fileIndex * 7 + branch.length * 3) % pool.length;
    while (usedPaths.has(pool[cursor])) {
      cursor = (cursor + 1) % pool.length;
    }
    const pathValue = pool[cursor];
    usedPaths.add(pathValue);

    const additionsBase = 6 + ((index + fileIndex * 5 + branch.length) % 58);
    const deletionsBase = 1 + ((index * 3 + fileIndex * 7 + branch.length) % 24);
    const additions = branch.startsWith('hotfix/') ? Math.max(3, Math.round(additionsBase * 0.56)) : additionsBase;
    const deletions = branch.startsWith('release/') ? Math.round(deletionsBase * 0.8) : deletionsBase;

    files.push({
      path: pathValue,
      additions,
      deletions
    });
  }

  return files;
}

const commits = [];
const branchHeads = new Map();
let mainHead = '';
const totalCommits = 460;

let currentTimestamp = Date.UTC(2021, 8, 1, 9, 0, 0);

for (let index = 0; index < totalCommits; index += 1) {
  const active = activeBranches(index);
  let branch = 'main';

  if (index > 10 && active.length) {
    const weighted = [
      { name: 'main', weight: 2.1 },
      ...active.map((entry) => ({ name: entry.name, weight: entry.weight }))
    ];
    branch = weightedPick(weighted, index + branch.length);
  }

  if (index % 23 === 0 || index % 41 === 0) {
    branch = 'main';
  }

  const author = authors[index % authors.length];
  const message = makeMessage(branch, index);
  const changedFiles = changedFilesForCommit(index, branch);

  const baseMinutes = 140 + (index % 5) * 32 + Math.round(unit(index * 19.7) * 70);
  const branchPenalty = branch.startsWith('release/') ? 120 : 0;
  const branchBonus = branch.startsWith('hotfix/') ? -35 : 0;
  const extraGap = index % 59 === 0 ? 980 : 0;
  currentTimestamp += (baseMinutes + branchPenalty + branchBonus + extraGap) * 60 * 1000;
  const date = new Date(currentTimestamp).toISOString();

  const digest = createHash('sha1')
    .update(`${index}:${branch}:${message}:${date}`)
    .digest('hex');

  const primaryParent = branchHeads.get(branch) ?? mainHead;
  const parents = primaryParent ? [primaryParent] : [];

  if (branch === 'main' && index > 32 && index % 17 === 0) {
    const mergeCandidates = active
      .map((entry) => branchHeads.get(entry.name))
      .filter((head) => Boolean(head) && head !== primaryParent);
    if (mergeCandidates.length) {
      const mergeParent = mergeCandidates[index % mergeCandidates.length];
      if (mergeParent) {
        parents.push(mergeParent);
      }
    }
  } else if (branch !== 'main' && index % 43 === 0 && mainHead && mainHead !== primaryParent) {
    parents.push(mainHead);
  }

  const uniqueParents = Array.from(new Set(parents.filter(Boolean)));
  const insertions = changedFiles.reduce((acc, file) => acc + file.additions, 0);
  const deletions = changedFiles.reduce((acc, file) => acc + file.deletions, 0);

  commits.push({
    hash: digest,
    author: author.name,
    email: author.email,
    date,
    message,
    branch,
    parents: uniqueParents,
    filesChanged: changedFiles.length,
    insertions,
    deletions,
    changedFiles
  });

  branchHeads.set(branch, digest);
  if (branch === 'main') {
    mainHead = digest;
  }
}

const history = {
  schemaVersion: '1.0.0',
  repo: 'demo/chronoscape',
  generatedAt: new Date().toISOString(),
  commits
};

writeFileSync(outputPath, `${JSON.stringify(history, null, 2)}\n`, 'utf8');
console.log(`Generated ${commits.length} commits at ${outputPath}`);
