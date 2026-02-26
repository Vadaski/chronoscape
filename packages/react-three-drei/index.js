import { useEffect, useRef } from 'react';
import { OrbitControls as ThreeOrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useFrame, useThree } from '@react-three/fiber';

export function OrbitControls({
  enableDamping = true,
  dampingFactor = 0.06,
  enablePan = false,
  minDistance = 2,
  maxDistance = 1200,
  rotateSpeed = 0.65,
  zoomSpeed = 0.9
}) {
  const { camera, renderer } = useThree();
  const controlsRef = useRef(null);

  useEffect(() => {
    if (!camera || !renderer?.domElement) {
      return;
    }

    const controls = new ThreeOrbitControls(camera, renderer.domElement);
    controls.enableDamping = enableDamping;
    controls.dampingFactor = dampingFactor;
    controls.enablePan = enablePan;
    controls.minDistance = minDistance;
    controls.maxDistance = maxDistance;
    controls.rotateSpeed = rotateSpeed;
    controls.zoomSpeed = zoomSpeed;
    controlsRef.current = controls;

    return () => {
      controls.dispose();
      controlsRef.current = null;
    };
  }, [camera, dampingFactor, enableDamping, enablePan, maxDistance, minDistance, renderer, rotateSpeed, zoomSpeed]);

  useFrame(() => {
    controlsRef.current?.update();
  });

  return null;
}
