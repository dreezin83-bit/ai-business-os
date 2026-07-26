"use client";

import { useRef, useMemo, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Float,
  useProgress,
  Html,
  AdaptiveDpr,
  Environment,
} from "@react-three/drei";
import * as THREE from "three";

// ─── Sub-components ────────────────────────────────────────

/** Floating particles around the robot using instanced mesh for performance */
function Particles({ count = 60 }: { count?: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    const arr: { pos: [number, number, number]; speed: number; offset: number }[] = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        pos: [
          (Math.random() - 0.5) * 6,
          (Math.random() - 0.5) * 5 + 0.5,
          (Math.random() - 0.5) * 5,
        ],
        speed: 0.3 + Math.random() * 0.7,
        offset: Math.random() * Math.PI * 2,
      });
    }
    return arr;
  }, [count]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    particles.forEach((p, i) => {
      dummy.position.set(
        p.pos[0] + Math.sin(t * p.speed + p.offset) * 0.15,
        p.pos[1] + Math.cos(t * p.speed * 0.7 + p.offset) * 0.2,
        p.pos[2] + Math.cos(t * p.speed + p.offset) * 0.15
      );
      dummy.scale.setScalar(0.03 + Math.sin(t * p.speed + p.offset) * 0.015);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color="#60a5fa" transparent opacity={0.7} />
    </instancedMesh>
  );
}

/** Glowing eye — sphere + point light */
function Eye({
  position,
  color,
}: {
  position: [number, number, number];
  color: string;
}) {
  return (
    <group position={position}>
      {/* Outer glow */}
      <mesh>
        <sphereGeometry args={[0.2, 32, 32]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {/* Inner core */}
      <mesh scale={0.6}>
        <sphereGeometry args={[0.2, 32, 32]} />
        <meshBasicMaterial color="white" />
      </mesh>
      <pointLight color={color} intensity={1.5} distance={2} />
    </group>
  );
}

/** Circuit lines on the head — semi-circle arcs */
function HeadCircuits() {
  return (
    <group>
      {/* Top arc */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 1.05, 0]}>
        <torusGeometry args={[0.55, 0.015, 8, 24, Math.PI]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.6} />
      </mesh>
      {/* Bottom arc */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.3, 0]}>
        <torusGeometry args={[0.65, 0.015, 8, 24, Math.PI]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.4} />
      </mesh>
    </group>
  );
}

/** The robot bust — all primitive geometries */
function RobotBust() {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const leftEyeRef = useRef<THREE.Group>(null);
  const rightEyeRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;

    // Breathing — subtle scale pulse on the whole robot
    const breathe = 1 + Math.sin(t * 1.2) * 0.015;
    groupRef.current.scale.setScalar(breathe);

    // Head subtle floating and tilt
    if (headRef.current) {
      headRef.current.position.y = Math.sin(t * 0.8) * 0.08;
      headRef.current.rotation.z = Math.sin(t * 0.6) * 0.06;
      headRef.current.rotation.x = Math.sin(t * 0.7 + 1) * 0.04;
    }
  });

  return (
    <group ref={groupRef}>
      {/* ─── Head group ─── */}
      <group ref={headRef}>
        {/* Main head sphere */}
        <mesh castShadow>
          <sphereGeometry args={[1, 64, 64]} />
          <meshStandardMaterial
            color="#1e1e2e"
            metalness={0.8}
            roughness={0.25}
            envMapIntensity={0.6}
          />
        </mesh>

        {/* Face plate — slightly forward box embossment */}
        <mesh position={[0, 0, 0.78]}>
          <boxGeometry args={[1.2, 0.9, 0.15]} />
          <meshStandardMaterial
            color="#2a2a3e"
            metalness={0.9}
            roughness={0.2}
            envMapIntensity={0.4}
          />
        </mesh>

        {/* Visor bar */}
        <mesh position={[0, 0.1, 0.88]}>
          <boxGeometry args={[1.4, 0.12, 0.06]} />
          <meshBasicMaterial color="#3b82f6" />
        </mesh>

        {/* Eyes — positioned on the face plate */}
        <group ref={leftEyeRef}>
          <Eye position={[-0.35, 0.2, 0.9]} color="#60a5fa" />
        </group>
        <group ref={rightEyeRef}>
          <Eye position={[0.35, 0.2, 0.9]} color="#60a5fa" />
        </group>

        {/* Mouth grille */}
        <mesh position={[0, -0.25, 0.9]}>
          <boxGeometry args={[0.5, 0.04, 0.04]} />
          <meshBasicMaterial color="#3b82f6" />
        </mesh>
        <mesh position={[0, -0.35, 0.9]}>
          <boxGeometry args={[0.35, 0.04, 0.04]} />
          <meshBasicMaterial color="#3b82f6" />
        </mesh>

        {/* Antenna */}
        <mesh position={[0, 1.05, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.5, 16]} />
          <meshStandardMaterial
            color="#3b3b5e"
            metalness={0.8}
            roughness={0.3}
          />
        </mesh>
        {/* Antenna ball */}
        <mesh position={[0, 1.32, 0]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial color="#f472b6" />
        </mesh>
        <pointLight color="#f472b6" intensity={0.6} distance={1} position={[0, 1.32, 0]} />

        {/* Ear pieces — side domes */}
        <mesh position={[0.95, 0.1, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.25, 0.3, 0.35, 32]} />
          <meshStandardMaterial
            color="#2a2a3e"
            metalness={0.85}
            roughness={0.2}
          />
        </mesh>
        <mesh position={[-0.95, 0.1, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.25, 0.3, 0.35, 32]} />
          <meshStandardMaterial
            color="#2a2a3e"
            metalness={0.85}
            roughness={0.2}
          />
        </mesh>

        {/* Ear accent rings */}
        <mesh position={[1.1, 0.1, 0]}>
          <torusGeometry args={[0.2, 0.03, 16, 24]} />
          <meshBasicMaterial color="#3b82f6" />
        </mesh>
        <mesh position={[-1.1, 0.1, 0]}>
          <torusGeometry args={[0.2, 0.03, 16, 24]} />
          <meshBasicMaterial color="#3b82f6" />
        </mesh>

        {/* Head circuits */}
        <HeadCircuits />
      </group>

      {/* ─── Neck ─── */}
      <mesh position={[0, -1.25, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.35, 0.5, 32]} />
        <meshStandardMaterial
          color="#1a1a2e"
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>
      {/* Neck rings */}
      <mesh position={[0, -1.0, 0]}>
        <torusGeometry args={[0.35, 0.04, 16, 32]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.5} />
      </mesh>
      <mesh position={[0, -1.25, 0]}>
        <torusGeometry args={[0.37, 0.04, 16, 32]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.4} />
      </mesh>
      <mesh position={[0, -1.5, 0]}>
        <torusGeometry args={[0.35, 0.04, 16, 32]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.3} />
      </mesh>

      {/* ─── Shoulder bust ─── */}
      {/* Main shoulder block */}
      <mesh position={[0, -1.9, 0]} castShadow>
        <boxGeometry args={[2.2, 0.8, 1.2]} />
        <meshStandardMaterial
          color="#1e1e2e"
          metalness={0.8}
          roughness={0.25}
        />
      </mesh>

      {/* Shoulder angled plates */}
      <mesh position={[1.2, -1.9, 0]} rotation={[0, 0, -0.3]}>
        <boxGeometry args={[0.55, 0.7, 1.0]} />
        <meshStandardMaterial
          color="#2a2a3e"
          metalness={0.85}
          roughness={0.2}
        />
      </mesh>
      <mesh position={[-1.2, -1.9, 0]} rotation={[0, 0, 0.3]}>
        <boxGeometry args={[0.55, 0.7, 1.0]} />
        <meshStandardMaterial
          color="#2a2a3e"
          metalness={0.85}
          roughness={0.2}
        />
      </mesh>

      {/* Shoulder accent lights */}
      <mesh position={[1.15, -1.9, -0.52]}>
        <boxGeometry args={[0.35, 0.06, 0.05]} />
        <meshBasicMaterial color="#3b82f6" />
      </mesh>
      <mesh position={[-1.15, -1.9, -0.52]}>
        <boxGeometry args={[0.35, 0.06, 0.05]} />
        <meshBasicMaterial color="#3b82f6" />
      </mesh>

      {/* Core glow in chest */}
      <mesh position={[0, -1.6, 0.62]}>
        <boxGeometry args={[0.35, 0.12, 0.05]} />
        <meshBasicMaterial color="#60a5fa" />
      </mesh>
      <pointLight color="#60a5fa" intensity={0.5} distance={1.5} position={[0, -1.6, 0.8]} />

      {/* Shoulder round pads */}
      <mesh position={[1.35, -1.6, 0]}>
        <sphereGeometry args={[0.2, 24, 24]} />
        <meshStandardMaterial
          color="#2a2a3e"
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>
      <mesh position={[-1.35, -1.6, 0]}>
        <sphereGeometry args={[0.2, 24, 24]} />
        <meshStandardMaterial
          color="#2a2a3e"
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>
    </group>
  );
}

/** Camera controller with gentle auto-orbit */
function CameraController() {
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    state.camera.position.x = Math.sin(t * 0.3) * 1.2;
    state.camera.position.y = 0.15 + Math.sin(t * 0.25) * 0.3;
    state.camera.position.z = 5.5 + Math.sin(t * 0.2) * 0.5;
    state.camera.lookAt(0, -0.3, 0);
  });
  return null;
}

/** Loading screen */
function LoadingScreen() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2">
        <div className="w-12 h-12 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        <p className="text-sm text-gray-400">{Math.round(progress)}%</p>
      </div>
    </Html>
  );
}

/** Scene content */
function Scene() {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} color="#334" />
      <pointLight position={[3, 2, 3]} intensity={1.8} color="#f0e0d0" />
      <pointLight position={[-3, -1, 2]} intensity={1.2} color="#6080c0" />
      <pointLight position={[0, 3, -2]} intensity={0.8} color="#c0a0f0" />

      {/* Robot */}
      <Float speed={1.5} rotationIntensity={0.15} floatIntensity={0.3}>
        <RobotBust />
      </Float>

      {/* Particles */}
      <Particles count={50} />

      {/* Camera */}
      <CameraController />
    </>
  );
}

// ─── Main Export ────────────────────────────────────────────

export default function HeroRobot() {
  return (
    <div className="relative w-full h-[500px] sm:h-[600px] md:h-[700px] lg:h-[800px] -mt-4">
      <Canvas
        camera={{ position: [0, 0, 5.5], fov: 45, near: 0.1, far: 20 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}
        style={{ background: "transparent" }}
      >
        <AdaptiveDpr pixelated />
        <Suspense fallback={<LoadingScreen />}>
          <Scene />
        </Suspense>
      </Canvas>

      {/* Gradient overlays for seamless blend */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-background via-transparent to-background" />
    </div>
  );
}
