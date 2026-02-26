import type { ReactElement } from 'react';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import type { PreparedCommit } from '../types/git';
import { BackgroundStars } from './BackgroundStars';
import { BranchLines } from './BranchLines';
import { CommitStars } from './CommitStars';
import { IdleOrbitControls } from './IdleOrbitControls';
import { SceneEnvironment } from './SceneEnvironment';

interface ChronoscapeSceneProps {
  commits: PreparedCommit[];
  visibleCount: number;
  onSelectCommit: (commit: PreparedCommit, event: PointerEvent) => void;
  selectedCommitHash?: string | null;
}

export function ChronoscapeScene({
  commits,
  visibleCount,
  onSelectCommit,
  selectedCommitHash = null
}: ChronoscapeSceneProps): ReactElement {
  return (
    <>
      <SceneEnvironment />
      <BackgroundStars count={4200} radius={1180} />
      <BranchLines commits={commits} visibleCount={visibleCount} />
      <CommitStars
        commits={commits}
        visibleCount={visibleCount}
        onSelect={onSelectCommit}
        selectedHash={selectedCommitHash}
      />
      <IdleOrbitControls minDistance={8} maxDistance={1300} />
      <EffectComposer>
        <Bloom intensity={2.1} luminanceThreshold={0.016} luminanceSmoothing={0.9} />
      </EffectComposer>
    </>
  );
}
