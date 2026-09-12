import { Component, Suspense, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";

// ─── Silent error boundary: if WebGL fails, the hero still renders ───────────
class SceneErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    /* hero degrades to its designed CSS background */
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

// Small shapes, pushed to the edges and behind the copy — accents, not obstacles.
const SHAPES: Array<{
  kind: "torus" | "icosa" | "octa" | "dodec";
  color: string;
  position: [number, number, number];
  scale: number;
  speed: number;
}> = [
  { kind: "torus", color: "#f07b67", position: [-4.4, 1.3, -3.5], scale: 0.55, speed: 1.0 },
  { kind: "icosa", color: "#96bfa7", position: [4.4, -1.2, -4.0], scale: 0.5, speed: 1.2 },
  { kind: "octa", color: "#c4b2de", position: [-3.8, -1.5, -4.5], scale: 0.45, speed: 0.9 },
  { kind: "dodec", color: "#f6c8b5", position: [3.9, 1.4, -5.0], scale: 0.5, speed: 1.1 },
];

function ShapeMesh({ kind, color, position, scale, speed }: (typeof SHAPES)[number]) {
  const ref = useRef<THREE.Mesh>(null);
  const geo = useMemo(() => {
    switch (kind) {
      case "torus":
        return new THREE.TorusGeometry(0.7, 0.22, 14, 28);
      case "icosa":
        return new THREE.IcosahedronGeometry(0.65, 0);
      case "octa":
        return new THREE.OctahedronGeometry(0.7, 0);
      case "dodec":
        return new THREE.DodecahedronGeometry(0.65, 0);
    }
  }, [kind]);
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.x += delta * 0.25 * speed;
      ref.current.rotation.y += delta * 0.35 * speed;
    }
  });
  return (
    <Float speed={1.4 * speed} rotationIntensity={0.25} floatIntensity={0.5}>
      <mesh ref={ref} geometry={geo} position={position} scale={scale}>
        {/* No env map — high roughness so it looks right with plain lights */}
        <meshStandardMaterial color={color} roughness={0.85} metalness={0} />
      </mesh>
    </Float>
  );
}

// Fine, dim dust — visible texture, never blocks text.
function ParticleField({ count = 220 }: { count?: number }) {
  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const palette = ["#f6f4ee", "#f6c8b5", "#dbece1", "#e8e0f4"].map((c) => new THREE.Color(c));
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 16;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 9;
      positions[i * 3 + 2] = -2 - Math.random() * 6;
      const c = palette[i % palette.length];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    return { positions, colors };
  }, [count]);
  const ref = useRef<THREE.Points>(null);
  useFrame((state) => {
    if (ref.current) ref.current.rotation.y = state.clock.elapsedTime * 0.015;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.045} vertexColors transparent opacity={0.55} sizeAttenuation depthWrite={false} />
    </points>
  );
}

function SceneContent() {
  return (
    <>
      <ambientLight intensity={0.75} />
      <directionalLight position={[5, 6, 4]} intensity={1.2} color="#fff4e6" />
      <directionalLight position={[-5, -2, 2]} intensity={0.35} color="#bcd3ff" />
      {SHAPES.map((s) => (
        <ShapeMesh key={s.kind} {...s} />
      ))}
      <ParticleField />
    </>
  );
}

export interface Scene3DProps {
  disabled?: boolean;
}

export default function Scene3D({ disabled = false }: Scene3DProps) {
  const [webglFailed, setWebglFailed] = useState(false);
  if (disabled || webglFailed || typeof window === "undefined") return null;
  return (
    <SceneErrorBoundary>
      <div className="pointer-events-none absolute inset-0" style={{ zIndex: 0 }} aria-hidden="true">
        <Canvas
          camera={{ position: [0, 0, 7.5], fov: 45 }}
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
          style={{ background: "transparent" }}
          onCreated={({ gl }) => {
            // If the context is already lost, bail before first frame.
            if (gl.getContext().isContextLost()) setWebglFailed(true);
          }}
        >
          <Suspense fallback={null}>
            <SceneContent />
          </Suspense>
        </Canvas>
      </div>
    </SceneErrorBoundary>
  );
}
