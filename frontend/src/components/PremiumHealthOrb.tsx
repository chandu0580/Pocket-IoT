import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial, Float, Environment, ContactShadows, MeshWobbleMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { HDEffects, DataParticles } from './HDEffects';

const ScanningBeam = ({ color }: { color: string }) => {
    const beamRef = useRef<THREE.Mesh>(null);
    const elapsedTimeRef = useRef(0);

    useFrame((_state, delta) => {
        if (beamRef.current) {
            elapsedTimeRef.current += delta;
            beamRef.current.position.y = Math.sin(elapsedTimeRef.current * 2) * 1.5;
        }
    });
    return (
        <mesh ref={beamRef} rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[1.5, 1.5, 0.02, 64]} />
            <meshBasicMaterial color={color} transparent opacity={0.3} />
        </mesh>
    );
};

const AnimatedOrb = ({ color, speed = 1.5, distort = 0.4 }: { color: string, speed?: number, distort?: number }) => {
    const orbRef = useRef<THREE.Mesh>(null);
    const innerRef = useRef<THREE.Mesh>(null);
    const elapsedTimeRef = useRef(0);

    useFrame((_state, delta) => {
        elapsedTimeRef.current += delta;
        const t = elapsedTimeRef.current;

        if (orbRef.current) {
            const s = 1 + Math.sin(t * 1.5) * 0.05;
            orbRef.current.scale.set(s, s, s);
            orbRef.current.rotation.y += 0.005;
        }
        if (innerRef.current) {
            innerRef.current.rotation.z -= 0.01;
            innerRef.current.rotation.x += 0.005;
        }
    });

    return (
        <group>
            <DataParticles color={color} count={200} />
            <ScanningBeam color={color} />
            <Float speed={2} rotationIntensity={1.5} floatIntensity={1.5}>
                {/* Main Glassy Orb */}
                <Sphere ref={orbRef} args={[1, 128, 128]}>
                    <MeshDistortMaterial
                        color={color}
                        speed={speed}
                        distort={distort}
                        radius={1}
                        emissive={color}
                        emissiveIntensity={0.2}
                        roughness={0}
                        metalness={1}
                        transparent
                        opacity={0.8}
                    />
                </Sphere>

                {/* Inner Core */}
                <Sphere ref={innerRef} args={[0.4, 32, 32]}>
                    <MeshWobbleMaterial
                        color={color}
                        speed={speed * 2}
                        factor={0.5}
                        emissive={color}
                        emissiveIntensity={2}
                    />
                </Sphere>
            </Float>

            {/* Ground Glow Shadow */}
            <ContactShadows
                position={[0, -1.8, 0]}
                opacity={0.4}
                scale={5}
                blur={2}
                far={4}
                color={color}
            />
        </group>
    );
};

interface PremiumHealthOrbProps {
    status: 'healthy' | 'warning' | 'anomaly';
    height?: string;
    showText?: boolean;
}

const PremiumHealthOrb: React.FC<PremiumHealthOrbProps> = ({ status, height = "300px", showText = true }) => {
    const theme = useMemo(() => ({
        healthy: { color: '#10b981', speed: 1.2, distort: 0.2, label: 'Nominal' },
        warning: { color: '#f59e0b', speed: 2.5, distort: 0.5, label: 'Warning' },
        anomaly: { color: '#ef4444', speed: 4.0, distort: 0.8, label: 'Critical' }
    }[status]), [status]);

    return (
        <div className="relative w-full overflow-hidden flex flex-col items-center justify-center p-0 m-0" style={{ height }}>
            <div className="absolute inset-0 pointer-events-none">
                <Canvas
                    camera={{ position: [0, 0, 4], fov: 40 }}
                    dpr={[1, 1.5]}
                    shadows={{ type: THREE.PCFShadowMap }}
                    onCreated={({ gl }) => {
                        gl.shadowMap.type = THREE.PCFShadowMap;
                    }}
                    gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
                >
                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} intensity={2} color={theme.color} />
                    <spotLight position={[-10, 10, 10]} angle={0.2} penumbra={1} intensity={2} />

                    <AnimatedOrb color={theme.color} speed={theme.speed} distort={theme.distort} />

                    <Environment preset="night" />
                    {/* <HDEffects /> - Temporarily disabled to prevent crash */}
                </Canvas>
            </div>

            {showText && (
                <div className="relative z-10 mt-24 text-center pointer-events-none">
                    <div className="flex flex-col items-center gap-1">
                        <div className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.3em] border shadow-2xl transition-all duration-500 ${status === 'healthy' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                            status === 'warning' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                                'bg-rose-500/10 border-rose-500/30 text-rose-400'
                            }`}>
                            System {theme.label}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PremiumHealthOrb;
