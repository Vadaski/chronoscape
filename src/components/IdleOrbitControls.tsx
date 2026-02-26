import { useEffect, useRef } from 'react';
import { OrbitControls as ThreeOrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useFrame, useThree } from '@react-three/fiber';

interface IdleOrbitControlsProps {
  minDistance?: number;
  maxDistance?: number;
  idleDelayMs?: number;
  autoRotateSpeed?: number;
}

export function IdleOrbitControls({
  minDistance = 8,
  maxDistance = 1300,
  idleDelayMs = 3200,
  autoRotateSpeed = 0.18
}: IdleOrbitControlsProps): null {
  const { camera, renderer } = useThree();
  const controlsRef = useRef<ThreeOrbitControls | null>(null);
  const isInteractingRef = useRef(false);
  const lastInteractionAtRef = useRef(typeof performance === 'undefined' ? 0 : performance.now());

  useEffect(() => {
    if (!renderer?.domElement) {
      return;
    }

    const controls = new ThreeOrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.minDistance = minDistance;
    controls.maxDistance = maxDistance;
    controls.rotateSpeed = 0.65;
    controls.zoomSpeed = 0.9;
    controls.autoRotate = false;
    controls.autoRotateSpeed = autoRotateSpeed;
    controls.target.set(0, 0, 0);
    controls.update();

    const markInteraction = () => {
      lastInteractionAtRef.current = performance.now();
      controls.autoRotate = false;
    };

    const handleStart = () => {
      isInteractingRef.current = true;
      markInteraction();
    };

    const handleEnd = () => {
      isInteractingRef.current = false;
      markInteraction();
    };

    controls.addEventListener('start', handleStart);
    controls.addEventListener('end', handleEnd);

    const domElement = renderer.domElement;
    domElement.addEventListener('pointerdown', markInteraction, { passive: true });
    domElement.addEventListener('wheel', markInteraction, { passive: true });
    domElement.addEventListener('touchstart', markInteraction, { passive: true });
    window.addEventListener('keydown', markInteraction);

    controlsRef.current = controls;

    return () => {
      controls.removeEventListener('start', handleStart);
      controls.removeEventListener('end', handleEnd);
      domElement.removeEventListener('pointerdown', markInteraction);
      domElement.removeEventListener('wheel', markInteraction);
      domElement.removeEventListener('touchstart', markInteraction);
      window.removeEventListener('keydown', markInteraction);
      controls.dispose();
      controlsRef.current = null;
    };
  }, [autoRotateSpeed, camera, maxDistance, minDistance, renderer]);

  useFrame(() => {
    const controls = controlsRef.current;
    if (!controls) {
      return;
    }

    const idleForMs = performance.now() - lastInteractionAtRef.current;
    controls.autoRotate = !isInteractingRef.current && idleForMs > idleDelayMs;
    controls.update();
  });

  return null;
}
