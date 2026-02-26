import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';

interface BackgroundStarsProps {
  count?: number;
  radius?: number;
}

interface StarLayer {
  points: THREE.Points;
  geometry: THREE.BufferGeometry;
  material: THREE.PointsMaterial;
  colors: THREE.BufferAttribute;
  baseColors: Float32Array;
  phases: Float32Array;
  amplitudes: Float32Array;
  speed: number;
  driftY: number;
}

interface BuildLayerOptions {
  count: number;
  innerRadius: number;
  outerRadius: number;
  pointSize: number;
  opacity: number;
  speed: number;
  driftY: number;
}

function randomSphericalPoint(distance: number): [number, number, number] {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const x = distance * Math.sin(phi) * Math.cos(theta);
  const y = distance * Math.cos(phi);
  const z = distance * Math.sin(phi) * Math.sin(theta);
  return [x, y, z];
}

function buildStarLayer(options: BuildLayerOptions): StarLayer {
  const { count, innerRadius, outerRadius, pointSize, opacity, speed, driftY } = options;

  const positions = new Float32Array(count * 3);
  const colorsRaw = new Float32Array(count * 3);
  const baseColors = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  const amplitudes = new Float32Array(count);

  for (let index = 0; index < count; index += 1) {
    const distance = innerRadius + Math.pow(Math.random(), 0.8) * (outerRadius - innerRadius);
    const [x, y, z] = randomSphericalPoint(distance);

    positions[index * 3] = x;
    positions[index * 3 + 1] = y;
    positions[index * 3 + 2] = z;

    const hueShift = (Math.random() - 0.5) * 0.08;
    const color = new THREE.Color().setHSL(0.6 + hueShift, 0.36 + Math.random() * 0.32, 0.72 + Math.random() * 0.24);

    baseColors[index * 3] = color.r;
    baseColors[index * 3 + 1] = color.g;
    baseColors[index * 3 + 2] = color.b;
    colorsRaw[index * 3] = color.r;
    colorsRaw[index * 3 + 1] = color.g;
    colorsRaw[index * 3 + 2] = color.b;

    phases[index] = Math.random() * Math.PI * 2;
    amplitudes[index] = 0.04 + Math.random() * 0.12;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const colors = new THREE.BufferAttribute(colorsRaw, 3);
  geometry.setAttribute('color', colors);

  const material = new THREE.PointsMaterial({
    size: pointSize,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;

  return {
    points,
    geometry,
    material,
    colors,
    baseColors,
    phases,
    amplitudes,
    speed,
    driftY
  };
}

export function BackgroundStars({ count = 2500, radius = 900 }: BackgroundStarsProps): null {
  const { scene } = useThree();
  const layersRef = useRef<StarLayer[]>([]);
  const farLayerOffsetRef = useRef(Math.random() * Math.PI * 2);

  useEffect(() => {
    const nearCount = Math.max(500, Math.floor(count * 0.55));
    const distantCount = Math.max(600, Math.floor(count * 0.9));

    const nearLayer = buildStarLayer({
      count: nearCount,
      innerRadius: radius * 0.4,
      outerRadius: radius * 1.15,
      pointSize: 1.15,
      opacity: 0.62,
      speed: 0.88,
      driftY: 0.004
    });
    nearLayer.points.name = 'background-stars-near';

    const distantLayer = buildStarLayer({
      count: distantCount,
      innerRadius: radius * 1.4,
      outerRadius: radius * 3.4,
      pointSize: 0.85,
      opacity: 0.45,
      speed: 0.54,
      driftY: -0.0022
    });
    distantLayer.points.name = 'background-stars-distant';

    layersRef.current = [nearLayer, distantLayer];
    scene.add(nearLayer.points);
    scene.add(distantLayer.points);

    return () => {
      for (const layer of layersRef.current) {
        scene.remove(layer.points);
        layer.geometry.dispose();
        layer.material.dispose();
      }
      layersRef.current = [];
    };
  }, [count, radius, scene]);

  useFrame(({ clock }) => {
    const layers = layersRef.current;
    if (!layers.length) {
      return;
    }

    const elapsed = clock.getElapsedTime();

    for (let layerIndex = 0; layerIndex < layers.length; layerIndex += 1) {
      const layer = layers[layerIndex];
      const colorArray = layer.colors.array as Float32Array;
      const base = layer.baseColors;
      const phases = layer.phases;
      const amplitudes = layer.amplitudes;

      for (let starIndex = 0; starIndex < phases.length; starIndex += 1) {
        const twinkle =
          0.92 +
          Math.sin(elapsed * layer.speed + phases[starIndex]) * amplitudes[starIndex] +
          Math.sin(elapsed * layer.speed * 0.31 + phases[starIndex] * 1.9) * 0.05;

        const colorOffset = starIndex * 3;
        colorArray[colorOffset] = base[colorOffset] * twinkle;
        colorArray[colorOffset + 1] = base[colorOffset + 1] * twinkle;
        colorArray[colorOffset + 2] = base[colorOffset + 2] * twinkle;
      }

      layer.colors.needsUpdate = true;
      layer.points.rotation.y =
        (layerIndex === 0 ? 1 : -1) * elapsed * layer.driftY + farLayerOffsetRef.current * layerIndex;
    }
  });

  return null;
}
