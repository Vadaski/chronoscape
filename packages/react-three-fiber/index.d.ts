import type * as React from 'react';
import type * as THREE from 'three';

export interface ThreeRenderState {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  canvas: HTMLCanvasElement;
  size: {
    width: number;
    height: number;
  };
  clock: THREE.Clock;
  registerFrame(callback: (state: ThreeRenderState, delta: number) => void): () => void;
  registerPointer(callback: (payload: {
    event: PointerEvent;
    state: ThreeRenderState;
    raycaster: THREE.Raycaster;
    pointer: THREE.Vector2;
  }) => void): () => void;
  registerResize(callback: (width: number, height: number) => void): () => void;
  setRenderCallback(callback: ((delta: number) => void) | null): void;
  invalidate(): void;
}

export interface CanvasProps {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  camera?: {
    fov?: number;
    near?: number;
    far?: number;
    position?: [number, number, number];
  };
  onCreated?: (state: ThreeRenderState) => void;
}

export function Canvas(props: CanvasProps): React.ReactElement;
export function useThree<T = ThreeRenderState>(selector?: (state: ThreeRenderState) => T): T;
export function useFrame(callback: (state: ThreeRenderState, delta: number) => void): void;
