import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import * as THREE from 'three';

const ThreeContext = createContext(null);

export function Canvas({ children, className, style, camera: cameraProps, onCreated }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [state, setState] = useState(null);
  const initialCameraRef = useRef(cameraProps);
  const onCreatedRef = useRef(onCreated);

  useEffect(() => {
    onCreatedRef.current = onCreated;
  }, [onCreated]);

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) {
      return;
    }

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    const scene = new THREE.Scene();

    const cameraConfig = initialCameraRef.current;
    const camera = new THREE.PerspectiveCamera(
      cameraConfig?.fov ?? 60,
      1,
      cameraConfig?.near ?? 0.1,
      cameraConfig?.far ?? 5000
    );
    const cameraPosition = cameraConfig?.position ?? [0, 0, 90];
    camera.position.set(cameraPosition[0], cameraPosition[1], cameraPosition[2]);

    const clock = new THREE.Clock();
    const frameCallbacks = new Set();
    const pointerCallbacks = new Set();
    const resizeCallbacks = new Set();
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const renderOverrideRef = { current: null };

    const threeState = {
      scene,
      camera,
      renderer,
      canvas: canvasRef.current,
      size: {
        width: 1,
        height: 1
      },
      clock,
      registerFrame(callback) {
        frameCallbacks.add(callback);
        return () => frameCallbacks.delete(callback);
      },
      registerPointer(callback) {
        pointerCallbacks.add(callback);
        return () => pointerCallbacks.delete(callback);
      },
      registerResize(callback) {
        resizeCallbacks.add(callback);
        return () => resizeCallbacks.delete(callback);
      },
      setRenderCallback(callback) {
        renderOverrideRef.current = callback;
      },
      invalidate() {
        renderer.render(scene, camera);
      }
    };

    const resize = () => {
      if (!containerRef.current) {
        return;
      }
      const width = Math.max(1, containerRef.current.clientWidth);
      const height = Math.max(1, containerRef.current.clientHeight);
      threeState.size.width = width;
      threeState.size.height = height;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height, false);
      resizeCallbacks.forEach((callback) => callback(width, height));
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(containerRef.current);
    resize();

    const handlePointerEvent = (event) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      pointerCallbacks.forEach((callback) => {
        callback({
          event,
          state: threeState,
          raycaster,
          pointer
        });
      });
    };

    const canvas = canvasRef.current;
    canvas.addEventListener('pointerdown', handlePointerEvent);

    let frameId = 0;
    let disposed = false;
    const renderLoop = () => {
      if (disposed) {
        return;
      }
      const delta = clock.getDelta();
      frameCallbacks.forEach((callback) => callback(threeState, delta));
      if (typeof renderOverrideRef.current === 'function') {
        renderOverrideRef.current(delta);
      } else {
        renderer.render(scene, camera);
      }
      frameId = window.requestAnimationFrame(renderLoop);
    };

    setState(threeState);
    if (typeof onCreatedRef.current === 'function') {
      onCreatedRef.current(threeState);
    }
    frameId = window.requestAnimationFrame(renderLoop);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      canvas.removeEventListener('pointerdown', handlePointerEvent);
      resizeObserver.disconnect();
      frameCallbacks.clear();
      pointerCallbacks.clear();
      resizeCallbacks.clear();
      renderer.dispose();
      setState(null);
    };
  }, []);

  const containerStyle = useMemo(
    () => ({
      position: 'relative',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      ...style
    }),
    [style]
  );

  return React.createElement(
    'div',
    {
      ref: containerRef,
      className,
      style: containerStyle
    },
    React.createElement('canvas', {
      ref: canvasRef,
      style: { width: '100%', height: '100%', display: 'block' }
    }),
    state
      ? React.createElement(
          ThreeContext.Provider,
          { value: state },
          children
        )
      : null
  );
}

export function useThree(selector) {
  const state = useContext(ThreeContext);
  if (!state) {
    throw new Error('useThree must be used inside <Canvas>.');
  }
  return typeof selector === 'function' ? selector(state) : state;
}

export function useFrame(callback) {
  const state = useThree();
  useEffect(() => state.registerFrame(callback), [state, callback]);
}
