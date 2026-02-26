import { useEffect } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';

export function SceneEnvironment(): null {
  const { scene, camera } = useThree();

  useEffect(() => {
    const previousBackground = scene.background;
    const previousFog = scene.fog;

    scene.background = new THREE.Color('#03040a');
    scene.fog = new THREE.FogExp2('#040511', 0.0034);
    camera.lookAt(0, 0, 0);

    return () => {
      scene.background = previousBackground;
      scene.fog = previousFog;
    };
  }, [camera, scene]);

  return null;
}
