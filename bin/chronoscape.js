#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

function printUsage() {
  console.log(`Chronoscape CLI

Usage:
  chronoscape export [--repo <path>] [--output <file>] [--limit <n>]

Examples:
  npx chronoscape export
  npx chronoscape export --repo ../my-repo --output ./history.json --limit 5000
`);
}

function parseOptions(argv) {
  const options = {
    repo: process.cwd(),
    output: path.resolve(process.cwd(), 'git-history.json'),
    limit: null
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--repo' && argv[i + 1]) {
      options.repo = path.resolve(argv[i + 1]);
      i += 1;
      continue;
    }
    if (arg === '--output' && argv[i + 1]) {
      options.output = path.resolve(argv[i + 1]);
      i += 1;
      continue;
    }
    if (arg === '--limit' && argv[i + 1]) {
      const parsed = Number(argv[i + 1]);
      if (Number.isFinite(parsed) && parsed > 0) {
        options.limit = Math.floor(parsed);
      }
      i += 1;
      continue;
    }
  }

  return options;
}

function parseBranchName(decoration) {
  if (!decoration) {
    return 'main';
  }

  const segments = decoration
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  for (const segment of segments) {
    if (segment.includes('HEAD ->')) {
      return segment.split('HEAD ->')[1].trim();
    }
  }

  for (const segment of segments) {
    if (segment.startsWith('origin/')) {
      continue;
    }
    if (segment.startsWith('tag:')) {
      continue;
    }
    if (segment.includes('HEAD')) {
      continue;
    }
    return segment;
  }

  return 'main';
}

function normalizeStat(value) {
  if (value === '-' || value === '') {
    return 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function exportHistory(options) {
  const pretty = '__CHRONOSCAPE_COMMIT__%n%H%n%P%n%an%n%ae%n%aI%n%D%n%s';
  const limitArg = options.limit ? ` -n ${options.limit}` : '';
  const command = `git -C "${options.repo}" log --all --date-order --reverse${limitArg} --pretty=format:${pretty} --numstat`;

  const output = execSync(command, {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 1024
  });

  const lines = output.split(/\r?\n/);
  const commits = [];
  let current = null;
  let metaIndex = 0;

  const pushCurrent = () => {
    if (!current) {
      return;
    }

    const changedFiles = current.changedFiles;
    const filesChanged = changedFiles.length;
    const insertions = changedFiles.reduce((acc, file) => acc + file.additions, 0);
    const deletions = changedFiles.reduce((acc, file) => acc + file.deletions, 0);

    commits.push({
      hash: current.hash,
      parents: current.parents,
      author: current.author,
      email: current.email,
      date: current.date,
      message: current.message,
      branch: current.branch,
      filesChanged,
      insertions,
      deletions,
      changedFiles
    });
  };

  for (const line of lines) {
    if (line === '__CHRONOSCAPE_COMMIT__') {
      pushCurrent();
      current = {
        hash: '',
        parents: [],
        author: '',
        email: '',
        date: '',
        branch: 'main',
        message: '',
        changedFiles: []
      };
      metaIndex = 0;
      continue;
    }

    if (!current) {
      continue;
    }

    if (metaIndex < 7) {
      if (metaIndex === 0) {
        current.hash = line.trim();
      } else if (metaIndex === 1) {
        current.parents = line.trim() ? line.trim().split(/\s+/) : [];
      } else if (metaIndex === 2) {
        current.author = line;
      } else if (metaIndex === 3) {
        current.email = line;
      } else if (metaIndex === 4) {
        current.date = line;
      } else if (metaIndex === 5) {
        current.branch = parseBranchName(line);
      } else if (metaIndex === 6) {
        current.message = line;
      }
      metaIndex += 1;
      continue;
    }

    if (!line.trim()) {
      continue;
    }

    const stat = line.split('\t');
    if (stat.length < 3) {
      continue;
    }

    current.changedFiles.push({
      path: stat.slice(2).join('\t'),
      additions: normalizeStat(stat[0]),
      deletions: normalizeStat(stat[1])
    });
  }

  pushCurrent();

  const result = {
    schemaVersion: '1.0.0',
    repo: path.basename(options.repo),
    generatedAt: new Date().toISOString(),
    commits
  };

  const outputDir = path.dirname(options.output);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  writeFileSync(options.output, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  console.log(`Exported ${commits.length} commits to ${options.output}`);
}

function main() {
  const [command, ...argv] = process.argv.slice(2);

  if (!command || command === '--help' || command === '-h') {
    printUsage();
    process.exit(0);
  }

  if (command !== 'export') {
    console.error(`Unknown command: ${command}`);
    printUsage();
    process.exit(1);
  }

  const options = parseOptions(argv);
  try {
    exportHistory(options);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Export failed: ${message}`);
    process.exit(1);
  }
}

main();
