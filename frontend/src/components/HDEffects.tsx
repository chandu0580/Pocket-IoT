import React, { useRef, useMemo, Suspense } from 'react';
import { Bloom, Noise, Vignette, EffectComposer } from '@react-three/postprocessing';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

// ── Particles for "High Performance Data" Atmosphere ─────────────────────────
export const DataParticles = ({ count = 250, color = "#6366f1" }) => {
    const pointsRef = useRef<THREE.Points>(null);
    const positions = useMemo(() => {
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 10;
            pos[i * 3 + 1] = (Math.random() - 0.5) * 10;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
        }
        return pos;
    }, [count]);

    const elapsedTimeRef = useRef(0);
    useFrame((_state, delta) => {
        if (pointsRef.current) {
            elapsedTimeRef.current += delta;
            const t = elapsedTimeRef.current;
            pointsRef.current.rotation.y += 0.001;
            pointsRef.current.rotation.x += 0.0005;
            pointsRef.current.position.y = Math.sin(t * 0.2) * 0.2;
        }
    });

    return (
        <Points ref={pointsRef} positions={positions} stride={3} frustumCulled={false}>
            <PointMaterial
                transparent
                color={color}
                size={0.015}
                sizeAttenuation={true}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
            />
        </Points>
    );
};

export const HDEffects = () => {
    return (
        <Suspense fallback={null}>
            <EffectComposer multisampling={0}>
                <Bloom
                    luminanceThreshold={1.0}
                    intensity={0.5}
                />
                <Noise opacity={0.02} />
                <Vignette offset={0.3} darkness={0.5} />
            </EffectComposer>
        </Suspense>
    );
};
