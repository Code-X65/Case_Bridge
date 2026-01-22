import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, PerspectiveCamera, Environment } from '@react-three/drei';
import * as THREE from 'three';

function FloatingShape({ position, color, speed, rotationSpeed, scale, shape }: any) {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (!meshRef.current) return;
        const time = state.clock.getElapsedTime();
        meshRef.current.rotation.x = time * rotationSpeed;
        meshRef.current.rotation.y = time * rotationSpeed * 0.5;
        meshRef.current.position.y = position[1] + Math.sin(time * speed) * 0.2;
    });

    return (
        <Float speed={speed} rotationIntensity={0.5} floatIntensity={0.5}>
            <mesh ref={meshRef} position={position} scale={scale}>
                {shape === 'icosahedron' && <icosahedronGeometry args={[1, 0]} />}
                {shape === 'box' && <boxGeometry args={[1, 1, 1]} />}
                {shape === 'octahedron' && <octahedronGeometry args={[1, 0]} />}
                <meshPhysicalMaterial
                    color={color}
                    transparent
                    opacity={0.8}
                    roughness={0.1}
                    metalness={0.1}
                    transmission={0.5}
                    thickness={1}
                    clearcoat={1}
                    clearcoatRoughness={0.1}
                />
            </mesh>
        </Float>
    );
}

export default function HeroScene() {
    return (
        <div className="absolute inset-0 z-0 opacity-40 mix-blend-multiply pointer-events-none">
            <Canvas gl={{ antialias: true, alpha: true }}>
                <PerspectiveCamera makeDefault position={[0, 0, 10]} fov={40} />
                <ambientLight intensity={1.5} />
                <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} color="#1E40AF" />
                <pointLight position={[-10, -10, -10]} intensity={1.5} color="#0F172A" />

                <group position={[2, 0, 0]}>
                    <FloatingShape
                        position={[1, 1, 0]}
                        color="#1E40AF"
                        speed={0.5}
                        rotationSpeed={0.2}
                        scale={1.5}
                        shape="icosahedron"
                    />
                    <FloatingShape
                        position={[-2, -1, -2]}
                        color="#475569"
                        speed={0.4}
                        rotationSpeed={0.1}
                        scale={1}
                        shape="box"
                    />
                    <FloatingShape
                        position={[2, -2, -1]}
                        color="#94a3b8"
                        speed={0.3}
                        rotationSpeed={0.15}
                        scale={0.8}
                        shape="octahedron"
                    />
                </group>

            </Canvas>
        </div>
    );
}
