import type * as React from 'react';

export interface OrbitControlsProps {
  enableDamping?: boolean;
  dampingFactor?: number;
  enablePan?: boolean;
  minDistance?: number;
  maxDistance?: number;
  rotateSpeed?: number;
  zoomSpeed?: number;
}

export function OrbitControls(props: OrbitControlsProps): React.ReactElement | null;
