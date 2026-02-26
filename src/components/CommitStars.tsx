import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import type { PreparedCommit } from '../types/git';

interface CommitStarsProps {
  commits: PreparedCommit[];
  visibleCount: number;
  onSelect: (commit: PreparedCommit, event: PointerEvent) => void;
  selectedHash?: string | null;
}

export function CommitStars({
  commits,
  visibleCount,
  onSelect,
  selectedHash = null
}: CommitStarsProps): null {
  const { scene, registerPointer } = useThree();
  const meshRef = useRef<THREE.InstancedMesh | null>(null);
  const visibleCountRef = useRef(visibleCount);
  const onSelectRef = useRef(onSelect);
  const baseColorsRef = useRef<Float32Array | null>(null);
  const phasesRef = useRef<Float32Array | null>(null);
  const selectedIndexRef = useRef(-1);
  const colorScratchRef = useRef(new THREE.Color());

  const commitIndexByHash = useMemo(() => {
    const indexByHash = new Map<string, number>();
    for (let index = 0; index < commits.length; index += 1) {
      indexByHash.set(commits[index].commit.hash, index);
    }
    return indexByHash;
  }, [commits]);

  useEffect(() => {
    visibleCountRef.current = visibleCount;
  }, [visibleCount]);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    selectedIndexRef.current = selectedHash ? (commitIndexByHash.get(selectedHash) ?? -1) : -1;
  }, [commitIndexByHash, selectedHash]);

  useEffect(() => {
    if (!commits.length) {
      return;
    }

    const geometry = new THREE.IcosahedronGeometry(1, 1);
    const material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false
    });

    const stars = new THREE.InstancedMesh(geometry, material, commits.length);
    stars.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    stars.frustumCulled = false;

    const baseColors = new Float32Array(commits.length * 3);
    const phases = new Float32Array(commits.length);
    const dummy = new THREE.Object3D();

    for (let index = 0; index < commits.length; index += 1) {
      const star = commits[index];
      dummy.position.set(star.position[0], star.position[1], star.position[2]);
      dummy.scale.setScalar(star.scale);
      dummy.updateMatrix();
      stars.setMatrixAt(index, dummy.matrix);

      const color = new THREE.Color(star.contributorColor).multiplyScalar(0.52 + star.brightness * 1.2);
      stars.setColorAt(index, color);
      baseColors[index * 3] = color.r;
      baseColors[index * 3 + 1] = color.g;
      baseColors[index * 3 + 2] = color.b;
      phases[index] = (index + 1) * 0.379 + star.position[0] * 0.09 + star.position[2] * 0.05;
    }

    stars.count = Math.max(0, Math.min(commits.length, visibleCountRef.current));
    stars.instanceMatrix.needsUpdate = true;
    if (stars.instanceColor) {
      stars.instanceColor.needsUpdate = true;
    }

    baseColorsRef.current = baseColors;
    phasesRef.current = phases;
    meshRef.current = stars;
    scene.add(stars);

    return () => {
      scene.remove(stars);
      stars.dispose();
      geometry.dispose();
      material.dispose();
      meshRef.current = null;
      baseColorsRef.current = null;
      phasesRef.current = null;
    };
  }, [commits, scene]);

  useEffect(() => {
    if (!meshRef.current) {
      return;
    }
    meshRef.current.count = Math.max(0, Math.min(commits.length, visibleCount));
  }, [commits.length, visibleCount]);

  useEffect(
    () =>
      registerPointer(({ event, raycaster }) => {
        const mesh = meshRef.current;
        if (!mesh || !visibleCountRef.current) {
          return;
        }

        const intersections = raycaster.intersectObject(mesh, false);
        const hit = intersections[0];
        if (!hit || typeof hit.instanceId !== 'number') {
          return;
        }

        if (hit.instanceId >= visibleCountRef.current) {
          return;
        }

        const commit = commits[hit.instanceId];
        if (commit) {
          onSelectRef.current(commit, event);
        }
      }),
    [commits, registerPointer]
  );

  useFrame(({ clock }) => {
    const stars = meshRef.current;
    const baseColors = baseColorsRef.current;
    const phases = phasesRef.current;
    if (!stars || !stars.instanceColor || !baseColors || !phases) {
      return;
    }

    const visible = Math.max(0, Math.min(commits.length, visibleCountRef.current));
    if (!visible) {
      return;
    }

    const elapsed = clock.getElapsedTime();
    const selectedIndex = selectedIndexRef.current;
    const color = colorScratchRef.current;

    for (let index = 0; index < visible; index += 1) {
      const offset = index * 3;
      const twinkle =
        index === selectedIndex
          ? 1.26 + Math.sin(elapsed * 6.2) * 0.08
          : 0.93 +
            Math.sin(elapsed * 2.4 + phases[index]) * 0.09 +
            Math.sin(elapsed * 0.74 + phases[index] * 1.8) * 0.03;

      color.setRGB(
        baseColors[offset] * twinkle,
        baseColors[offset + 1] * twinkle,
        baseColors[offset + 2] * twinkle
      );
      stars.setColorAt(index, color);
    }

    stars.instanceColor.needsUpdate = true;
  });

  return null;
}
