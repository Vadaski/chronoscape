import type * as React from 'react';

export interface EffectComposerProps {
  children?: React.ReactNode;
}

export interface BloomProps {
  intensity?: number;
  luminanceThreshold?: number;
  luminanceSmoothing?: number;
}

export function EffectComposer(props: EffectComposerProps): React.ReactElement;
export function Bloom(props: BloomProps): React.ReactElement | null;
