import { useRef, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import {
  Environment,
  Float,
  OrbitControls,
  Points,
  PointsMaterial,
} from "@react-three/drei";
import * as THREE from "three";

// Memoized geometries for performance
const torusGeo = new THREE.TorusGeometry(0.7, 0.25, 16, 32);
const icosaGeo = new THREE.IcosahedronGeometry(0.6, 0);
const octGeo = new THREE.OctahedronGeometry(0.65, 0);
const dodecGeo = new THREE.DodecahedronGeometry(0.6, 0);

const shapes = [
  { geo: torusGeo, color: "#f97e6b", position: [-3.5, 0.2, -2] },
  { geo: icosaGeo, color: "#6ba8f9", position: [3.5, -0.1, -3] },
  { geo: octGeo, color: "#6bf9a8", position: [-2.5, 1.0, -4] },
  { geo: dodecGeo, color: "#f9a86b", position: [2.5, 1.2, -4] },
];

function Shape({ geo, color, position }: { geo: THREE.BufferGeometry; color: string; position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  return (
    <Float speed={1.2} rotationIntensity={0.3} floatIntensity={0.25}>
      <mesh ref={meshRef} geometry={geo} position={position} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.15} />
      </mesh>
    </Float>
  );
}

function ParticleField() {
  const count = 600;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 6 + Math.random() * 4;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi) * 0.6;
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta) - 1;
    const c = new THREE.Color().setHSL(0.55 + Math.random() * 0.15, 0.5, 0.6 + Math.random() * 0.3);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  return (
    <Points>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
          <bufferAttribute attach="attributes-color" count={count} array={colors} itemSize={3} />
        </bufferGeometry>
      </points>
      <pointsMaterial size={0.06} vertexColors transparent opacity={0.8} sizeAttenuation />
    </Points>
  );
}

function SceneContent() {
  return (
    <>
      <ambientLight intensity={0.35} />
      <pointLight position={[4, 6, 4]} intensity={1.1} color="#ffe4c4" />
      <pointLight position={[-4, 3, -3]} intensity={0.6} color="#8ec5fc" />
      <Shape {...shapes[0]} />
      <Shape {...shapes[1]} />
      <Shape {...shapes[2]} />
      <Shape {...shapes[3]} />
      <ParticleField />
      <OrbitControls enabled={false} />
      <Environment preset="night" />
    </>
  );
}

export interface Scene3DProps {
  disabled?: boolean;
}

export default function Scene3D({ disabled = false }: Scene3DProps) {
  if (disabled) return null;
  return (
    <div className="absolute inset-0" style={{ zIndex: 0 }}>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 50 }}
        style={{ background: "transparent" }}
        className="w-full h-full"
      >
        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>
      </Canvas>
    </div>
  );
}
