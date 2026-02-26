import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import type { PreparedCommit } from '../types/git';

interface BranchLinesProps {
  commits: PreparedCommit[];
  visibleCount: number;
}

function disposeMaterial(material: THREE.Material | THREE.Material[] | undefined): void {
  if (Array.isArray(material)) {
    material.forEach((entry) => entry.dispose());
  } else {
    material?.dispose();
  }
}

function disposeObject(object: THREE.Object3D): void {
  const object3d = object as THREE.Object3D & {
    geometry?: THREE.BufferGeometry;
    material?: THREE.Material | THREE.Material[];
  };

  object3d.geometry?.dispose();
  disposeMaterial(object3d.material);
}

export function BranchLines({ commits, visibleCount }: BranchLinesProps): null {
  const { scene } = useThree();
  const groupRef = useRef<THREE.Group | null>(null);

  const visibleCommits = useMemo(
    () => commits.slice(0, Math.max(0, Math.min(commits.length, visibleCount))),
    [commits, visibleCount]
  );

  useEffect(() => {
    const group = new THREE.Group();
    group.name = 'branch-lines';
    groupRef.current = group;
    scene.add(group);

    return () => {
      for (const child of group.children) {
        disposeObject(child);
      }
      group.clear();
      scene.remove(group);
      groupRef.current = null;
    };
  }, [scene]);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) {
      return;
    }

    for (const child of group.children) {
      disposeObject(child);
    }
    group.clear();

    if (visibleCommits.length < 2) {
      return;
    }

    const byBranch = new Map<string, PreparedCommit[]>();
    for (const commit of visibleCommits) {
      const list = byBranch.get(commit.branch) ?? [];
      list.push(commit);
      byBranch.set(commit.branch, list);
    }

    byBranch.forEach((branchCommits, branch) => {
      if (branchCommits.length < 2) {
        return;
      }

      const points = branchCommits.map(
        (commit) => new THREE.Vector3(commit.position[0], commit.position[1], commit.position[2])
      );
      const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.15);
      const sampleCount = Math.max(24, Math.min(640, branchCommits.length * 4));
      const sampledPoints = curve.getPoints(sampleCount);
      const neonColor = new THREE.Color(branchCommits[0].branchColor);
      const outerGlowColor = neonColor.clone().offsetHSL(0, 0.1, 0.12);

      const glowGeometry = new THREE.TubeGeometry(curve, sampleCount, 0.2, 10, false);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: outerGlowColor,
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false
      });
      const glowTube = new THREE.Mesh(glowGeometry, glowMaterial);
      glowTube.name = `branch-glow-${branch}`;
      glowTube.renderOrder = 1;

      const coreGeometry = new THREE.TubeGeometry(curve, sampleCount, 0.08, 8, false);
      const coreMaterial = new THREE.MeshBasicMaterial({
        color: neonColor.clone().multiplyScalar(1.3),
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false
      });
      const coreTube = new THREE.Mesh(coreGeometry, coreMaterial);
      coreTube.name = `branch-core-${branch}`;
      coreTube.renderOrder = 2;

      const filamentGeometry = new THREE.BufferGeometry().setFromPoints(sampledPoints);
      const filamentMaterial = new THREE.LineBasicMaterial({
        color: neonColor.clone().lerp(new THREE.Color('#ffffff'), 0.22),
        transparent: true,
        opacity: 0.66,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false
      });
      const filamentLine = new THREE.Line(filamentGeometry, filamentMaterial);
      filamentLine.name = `branch-filament-${branch}`;
      filamentLine.renderOrder = 3;

      group.add(glowTube);
      group.add(coreTube);
      group.add(filamentLine);
    });
  }, [visibleCommits]);

  return null;
}
