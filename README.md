# Chronoscape

Chronoscape is an interactive 3D Git repository history visualizer. Commits render as stars, branches form curved galactic arms, contributors are color-coded, and commit change volume controls star brightness.

## Quick start

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Build

```bash
npm run build
```

## Features

- Instanced star field optimized for 5000+ commits
- Timeline slider with smooth chronological scrubbing animation
- Date-labeled timeline checkpoints with chronological star reveal
- Orbit drag/scroll controls for camera navigation
- Idle camera auto-rotation for cinematic flythroughs
- Click-to-inspect commit tooltip
- Neon-glow branch tubes with unique branch hues
- Dark space theme + UnrealBloom post-processing
- Twinkling layered starfield with distant background particles
- Demo dataset bundled at `public/demo-history.json` (460 commits)

## JSON import format

```json
{
  "schemaVersion": "1.0.0",
  "repo": "my-repo",
  "generatedAt": "2026-02-26T00:00:00.000Z",
  "commits": [
    {
      "hash": "a1b2c3d4",
      "author": "Jane Doe",
      "email": "jane@example.com",
      "date": "2026-02-01T10:12:00.000Z",
      "message": "Update timeline interaction",
      "branch": "main",
      "parents": ["9f8e7d6c"],
      "filesChanged": 3,
      "insertions": 48,
      "deletions": 11,
      "changedFiles": [
        { "path": "src/App.tsx", "additions": 22, "deletions": 4 }
      ]
    }
  ]
}
```

## CLI export

Generate JSON from any local Git repository:

```bash
npx chronoscape export --repo ../your-repo --output ./history.json
```

Extra flags:

- `--limit <n>`: cap number of exported commits
