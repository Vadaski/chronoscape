import type { ChangedFileStat, GitCommit, GitHistoryExport } from '../types/git';

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function normalizeChangedFiles(raw: unknown): ChangedFileStat[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }
      const file = entry as Record<string, unknown>;
      const path = asString(file.path, asString(file.file, 'unknown'));
      if (!path) {
        return null;
      }

      return {
        path,
        additions: asNumber(file.additions),
        deletions: asNumber(file.deletions)
      } satisfies ChangedFileStat;
    })
    .filter((entry): entry is ChangedFileStat => Boolean(entry));
}

function normalizeCommit(raw: unknown, index: number): GitCommit | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const commit = raw as Record<string, unknown>;
  const hash = asString(commit.hash, `commit-${index.toString(16).padStart(8, '0')}`);
  const author = asString(commit.author, 'Unknown Author');
  const date = asString(commit.date, new Date(0).toISOString());
  const message = asString(commit.message, '(no commit message)');
  const parents = Array.isArray(commit.parents)
    ? commit.parents.map((value) => asString(value)).filter(Boolean)
    : [];

  const changedFiles = normalizeChangedFiles(commit.changedFiles ?? commit.files);
  const insertions = asNumber(
    commit.insertions,
    changedFiles.reduce((acc, item) => acc + item.additions, 0)
  );
  const deletions = asNumber(
    commit.deletions,
    changedFiles.reduce((acc, item) => acc + item.deletions, 0)
  );
  const filesChanged = asNumber(commit.filesChanged, changedFiles.length);

  return {
    hash,
    author,
    email: asString(commit.email, ''),
    date,
    message,
    branch: asString(commit.branch, 'main') || 'main',
    parents,
    filesChanged,
    insertions,
    deletions,
    changedFiles
  } satisfies GitCommit;
}

export function normalizeHistory(raw: unknown): GitHistoryExport {
  const root =
    Array.isArray(raw)
      ? ({ commits: raw } as Record<string, unknown>)
      : (raw as Record<string, unknown> | null);

  const commitSource = Array.isArray(root?.commits) ? root?.commits : [];
  const commits = commitSource
    .map((entry, index) => normalizeCommit(entry, index))
    .filter((entry): entry is GitCommit => Boolean(entry))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return {
    schemaVersion: asString(root?.schemaVersion, '1.0.0'),
    repo: asString(root?.repo, 'demo/chronoscape'),
    generatedAt: asString(root?.generatedAt, new Date().toISOString()),
    commits
  };
}

export async function loadDemoHistory(): Promise<GitHistoryExport> {
  const response = await fetch(`${import.meta.env.BASE_URL}demo-history.json`);
  if (!response.ok) {
    throw new Error(`Failed to load demo history: ${response.status}`);
  }
  const data = (await response.json()) as unknown;
  return normalizeHistory(data);
}

export async function parseHistoryFile(file: File): Promise<GitHistoryExport> {
  const text = await file.text();
  const data = JSON.parse(text) as unknown;
  return normalizeHistory(data);
}
