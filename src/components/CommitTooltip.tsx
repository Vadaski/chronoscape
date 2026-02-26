import type { ReactElement } from 'react';
import type { PreparedCommit } from '../types/git';

interface CommitTooltipProps {
  selected: PreparedCommit | null;
  position: { x: number; y: number } | null;
}

function shortHash(hash: string): string {
  return hash.slice(0, 8);
}

export function CommitTooltip({ selected, position }: CommitTooltipProps): ReactElement | null {
  if (!selected || !position) {
    return null;
  }

  const changedFilesPreview = selected.commit.changedFiles.slice(0, 8);

  return (
    <div
      className="commit-tooltip"
      style={{
        left: `${Math.max(10, Math.min(window.innerWidth - 340, position.x + 12))}px`,
        top: `${Math.max(10, Math.min(window.innerHeight - 320, position.y + 12))}px`
      }}
    >
      <h3>{shortHash(selected.commit.hash)}</h3>
      <div className="meta-row">
        <span>Author</span>
        <strong>{selected.commit.author}</strong>
      </div>
      <div className="meta-row">
        <span>Branch</span>
        <strong>{selected.commit.branch}</strong>
      </div>
      <div className="meta-row">
        <span>Date</span>
        <strong>{new Date(selected.commit.date).toLocaleString()}</strong>
      </div>
      <p className="message">{selected.commit.message}</p>
      <div className="meta-row">
        <span>Changed files</span>
        <strong>{selected.commit.filesChanged}</strong>
      </div>
      <ul>
        {changedFilesPreview.map((file) => (
          <li key={`${selected.commit.hash}-${file.path}`}>
            <span>{file.path}</span>
            <span>
              +{file.additions} / -{file.deletions}
            </span>
          </li>
        ))}
        {selected.commit.changedFiles.length > changedFilesPreview.length ? (
          <li>
            <span>...</span>
            <span>{selected.commit.changedFiles.length - changedFilesPreview.length} more</span>
          </li>
        ) : null}
      </ul>
    </div>
  );
}
