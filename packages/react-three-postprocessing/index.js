import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer as ThreeEffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { useThree } from '@react-three/fiber';

const PostProcessingContext = createContext(null);

export function EffectComposer({ children }) {
  const { camera, renderer, scene, size, registerResize, setRenderCallback } = useThree();
  const composerRef = useRef(null);
  const bloomPassRef = useRef(null);
  const bloomSettingsRef = useRef({
    intensity: 1.35,
    luminanceThreshold: 0.02,
    luminanceSmoothing: 0.82
  });

  const applyBloomSettings = useCallback(() => {
    if (!bloomPassRef.current) {
      return;
    }
    bloomPassRef.current.strength = bloomSettingsRef.current.intensity;
    bloomPassRef.current.threshold = bloomSettingsRef.current.luminanceThreshold;
    bloomPassRef.current.radius = bloomSettingsRef.current.luminanceSmoothing;
  }, []);

  useEffect(() => {
    const composer = new ThreeEffectComposer(renderer);
    composer.setSize(size.width, size.height);

    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(size.width, size.height),
      bloomSettingsRef.current.intensity,
      bloomSettingsRef.current.luminanceSmoothing,
      bloomSettingsRef.current.luminanceThreshold
    );
    composer.addPass(bloomPass);

    composerRef.current = composer;
    bloomPassRef.current = bloomPass;
    applyBloomSettings();

    const unregisterResize = registerResize((width, height) => {
      composer.setSize(width, height);
      if (typeof bloomPass.setSize === 'function') {
        bloomPass.setSize(width, height);
      }
    });

    setRenderCallback(() => composer.render());

    return () => {
      unregisterResize();
      setRenderCallback(null);
      bloomPassRef.current = null;
      composerRef.current = null;
      composer.dispose();
    };
  }, [applyBloomSettings, camera, registerResize, renderer, scene, setRenderCallback, size.height, size.width]);

  const contextValue = useMemo(
    () => ({
      setBloom(settings) {
        bloomSettingsRef.current = {
          ...bloomSettingsRef.current,
          ...settings
        };
        applyBloomSettings();
      }
    }),
    [applyBloomSettings]
  );

  return React.createElement(
    PostProcessingContext.Provider,
    { value: contextValue },
    children
  );
}

export function Bloom({ intensity, luminanceThreshold, luminanceSmoothing }) {
  const contextValue = useContext(PostProcessingContext);

  useEffect(() => {
    if (!contextValue) {
      return;
    }

    contextValue.setBloom({
      intensity,
      luminanceThreshold,
      luminanceSmoothing
    });
  }, [contextValue, intensity, luminanceSmoothing, luminanceThreshold]);

  return null;
}
