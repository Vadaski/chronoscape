import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import { Canvas } from '@react-three/fiber';
import type { GitHistoryExport, PreparedCommit } from './types/git';
import { CommitTooltip } from './components/CommitTooltip';
import { ChronoscapeScene } from './components/ChronoscapeScene';
import { loadDemoHistory, parseHistoryFile } from './utils/dataLoader';
import { prepareHistory } from './utils/layout';

function shortHash(hash: string): string {
  return hash.slice(0, 8);
}

function formatTimelineDate(dateValue: string | number): string {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export default function App(): ReactElement {
  const [history, setHistory] = useState<GitHistoryExport | null>(null);
  const [targetProgress, setTargetProgress] = useState(1);
  const [animatedProgress, setAnimatedProgress] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCommit, setSelectedCommit] = useState<PreparedCommit | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const [fps, setFps] = useState(0);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    loadDemoHistory()
      .then((demo) => {
        if (!mounted) {
          return;
        }
        setHistory(demo);
        setLoading(false);
      })
      .catch((loadError) => {
        if (!mounted) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : 'Failed to load demo dataset.');
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const prepared = useMemo(() => (history ? prepareHistory(history) : prepareHistory({ commits: [] })), [history]);

  const timelineTimestamp = useMemo(() => {
    if (!prepared.commits.length) {
      return 0;
    }
    if (prepared.minTimestamp === prepared.maxTimestamp) {
      return prepared.maxTimestamp;
    }
    return prepared.minTimestamp + (prepared.maxTimestamp - prepared.minTimestamp) * animatedProgress;
  }, [animatedProgress, prepared.commits.length, prepared.maxTimestamp, prepared.minTimestamp]);

  const visibleCount = useMemo(() => {
    if (!prepared.commits.length) {
      return 0;
    }

    let low = 0;
    let high = prepared.commits.length;

    while (low < high) {
      const mid = (low + high) >> 1;
      if (prepared.commits[mid].timestamp <= timelineTimestamp) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }

    return Math.max(1, low);
  }, [prepared.commits, timelineTimestamp]);

  const timelineLabels = useMemo(() => {
    if (!prepared.commits.length) {
      return [];
    }

    const checkpoints = [0, 0.25, 0.5, 0.75, 1];
    return checkpoints.map((progress) => {
      const index = Math.min(
        prepared.commits.length - 1,
        Math.max(0, Math.round((prepared.commits.length - 1) * progress))
      );
      const commit = prepared.commits[index];
      return {
        progress,
        timestamp: commit.timestamp,
        label: formatTimelineDate(commit.commit.date)
      };
    });
  }, [prepared.commits]);

  useEffect(() => {
    let frameId = 0;

    const animateProgress = () => {
      setAnimatedProgress((previous) => {
        const delta = targetProgress - previous;
        if (Math.abs(delta) < 0.0007) {
          return targetProgress;
        }
        return previous + delta * 0.17;
      });
      frameId = window.requestAnimationFrame(animateProgress);
    };

    frameId = window.requestAnimationFrame(animateProgress);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [targetProgress]);

  useEffect(() => {
    if (!playing) {
      return;
    }

    let frameId = 0;
    let previousTime = performance.now();

    const tick = (now: number) => {
      const delta = (now - previousTime) / 1000;
      previousTime = now;
      setTargetProgress((progress) => {
        const next = progress + delta * 0.075;
        if (next >= 1) {
          setPlaying(false);
          return 1;
        }
        return next;
      });
      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [playing]);

  useEffect(() => {
    let frameId = 0;
    let frames = 0;
    let previousTime = performance.now();

    const update = (now: number) => {
      frames += 1;
      const elapsed = now - previousTime;
      if (elapsed >= 500) {
        setFps(Math.round((frames * 1000) / elapsed));
        frames = 0;
        previousTime = now;
      }
      frameId = window.requestAnimationFrame(update);
    };

    frameId = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  const handleCommitSelect = useCallback((commit: PreparedCommit, event: PointerEvent) => {
    setSelectedCommit(commit);
    setTooltipPosition({ x: event.clientX, y: event.clientY });
  }, []);

  const handleFileLoad = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setError(null);
    try {
      const loadedHistory = await parseHistoryFile(file);
      setHistory(loadedHistory);
      setTargetProgress(1);
      setAnimatedProgress(1);
      setSelectedCommit(null);
      setTooltipPosition(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Invalid JSON history file.');
    } finally {
      event.target.value = '';
    }
  }, []);

  const reloadDemo = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const demo = await loadDemoHistory();
      setHistory(demo);
      setTargetProgress(1);
      setAnimatedProgress(1);
      setSelectedCommit(null);
      setTooltipPosition(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to reload demo history.');
    } finally {
      setLoading(false);
    }
  }, []);

  const visibleCommit = visibleCount ? prepared.commits[visibleCount - 1] : null;

  return (
    <div className="app-shell">
      <header className="hud-panel">
        <div className="title-wrap">
          <h1>Chronoscape</h1>
          <p>Interactive 3D Git history as a navigable galaxy.</p>
        </div>

        <div className="hud-controls">
          <button type="button" onClick={reloadDemo}>
            Load Demo ({prepared.commits.length || 460} commits)
          </button>
          <label className="file-upload" htmlFor="history-upload">
            Load JSON Export
          </label>
          <input id="history-upload" type="file" accept="application/json" onChange={handleFileLoad} />
          <button
            type="button"
            onClick={() => setPlaying((value) => !value)}
            disabled={!prepared.commits.length}
          >
            {playing ? 'Pause' : 'Play Timeline'}
          </button>
        </div>

        <div className="stats-grid">
          <div>
            <span>Repo</span>
            <strong>{history?.repo ?? 'demo/chronoscape'}</strong>
          </div>
          <div>
            <span>Visible / Total</span>
            <strong>
              {visibleCount} / {prepared.commits.length}
            </strong>
          </div>
          <div>
            <span>Branches</span>
            <strong>{Object.keys(prepared.branchColors).length}</strong>
          </div>
          <div>
            <span>Contributors</span>
            <strong>{Object.keys(prepared.contributorColors).length}</strong>
          </div>
          <div>
            <span>FPS</span>
            <strong>{fps}</strong>
          </div>
          <div>
            <span>Latest Visible</span>
            <strong>{visibleCommit ? shortHash(visibleCommit.commit.hash) : '-'}</strong>
          </div>
        </div>

        {error ? <p className="error-text">{error}</p> : null}
      </header>

      <main className="scene-stage">
        <Canvas camera={{ position: [0, 10, 115], fov: 56, near: 0.1, far: 6000 }}>
          <ChronoscapeScene
            commits={prepared.commits}
            visibleCount={visibleCount}
            onSelectCommit={handleCommitSelect}
            selectedCommitHash={selectedCommit?.commit.hash ?? null}
          />
        </Canvas>

        <CommitTooltip selected={selectedCommit} position={tooltipPosition} />

        <section className="timeline-panel">
          <div className="timeline-top">
            <span>{prepared.commits[0] ? formatTimelineDate(prepared.commits[0].commit.date) : '-'}</span>
            <span>
              {visibleCommit ? formatTimelineDate(visibleCommit.commit.date) : '-'}
            </span>
            <span>
              {prepared.commits.length
                ? formatTimelineDate(prepared.commits[prepared.commits.length - 1].commit.date)
                : '-'}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={1000}
            step={1}
            value={Math.round(targetProgress * 1000)}
            onChange={(event) => {
              setPlaying(false);
              setTargetProgress(Number(event.target.value) / 1000);
            }}
          />
          <div className="timeline-labels" aria-hidden="true">
            {timelineLabels.map((entry) => (
              <span key={`${entry.progress.toFixed(2)}-${entry.timestamp}`} style={{ left: `${entry.progress * 100}%` }}>
                {entry.label}
              </span>
            ))}
          </div>
        </section>

        {loading ? <div className="loading-overlay">Rendering commit galaxy...</div> : null}
      </main>
    </div>
  );
}
