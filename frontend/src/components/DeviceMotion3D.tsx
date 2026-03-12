import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { RoundedBox, Environment, OrbitControls, ContactShadows, Float } from '@react-three/drei';
import * as THREE from 'three';
import { useAppContext } from '../App';
import { RotateCw } from 'lucide-react';

interface Props {
    deviceId: number;
}

interface RotationState {
    pitch: number;
    roll: number;
    yaw: number;
}

// ── Phone 3D Model ───────────────────────────────────────────────────────────
const PhoneModel: React.FC<{ rotationState: RotationState }> = ({ rotationState }) => {
    const groupRef = useRef<THREE.Group>(null);
    const targetQuat = useRef(new THREE.Quaternion());
    const euler = useRef(new THREE.Euler());

    // react-three-fiber's useFrame already provides frame delta — no THREE.Clock needed
    useFrame((_state, _delta) => {
        const group = groupRef.current;
        if (!group) return;

        const pitchRad = THREE.MathUtils.degToRad(rotationState.pitch);
        const yawRad   = THREE.MathUtils.degToRad(rotationState.yaw);
        const rollRad  = THREE.MathUtils.degToRad(rotationState.roll);

        euler.current.set(pitchRad, yawRad, -rollRad, 'YXZ');
        targetQuat.current.setFromEuler(euler.current);
        group.quaternion.slerp(targetQuat.current, 0.15);
    });

    return (
        <group ref={groupRef}>
            <axesHelper args={[2]} />

            <Float speed={1.2} rotationIntensity={0} floatIntensity={0}>
                {/* Main Phone Body */}
                <RoundedBox args={[1.2, 0.1, 2.4]} radius={0.08} smoothness={10} castShadow receiveShadow>
                    <meshStandardMaterial color="#111827" roughness={0.1} metalness={0.9} />
                </RoundedBox>

                {/* Front Screen */}
                <mesh position={[0, 0.051, 0]}>
                    <boxGeometry args={[1.12, 0.01, 2.3]} />
                    <meshStandardMaterial color="#000000" roughness={0} metalness={1} emissive="#111827" emissiveIntensity={0.2} />
                </mesh>

                {/* Glossy Screen Glass */}
                <mesh position={[0, 0.058, 0]}>
                    <boxGeometry args={[1.12, 0.005, 2.3]} />
                    <meshPhysicalMaterial transparent opacity={0.15} roughness={0} transmission={0.95} thickness={0.02} ior={1.5} color="#fff" />
                </mesh>

                {/* Screen Glow */}
                <pointLight position={[0, 0.1, 0]} intensity={0.5} color="#4f46e5" distance={2} />

                {/* Notch */}
                <mesh position={[0, 0.06, -1.05]} rotation={[Math.PI / 2, 0, 0]}>
                    <capsuleGeometry args={[0.03, 0.12, 8, 16]} />
                    <meshStandardMaterial color="#000" />
                </mesh>

                {/* Back Camera Island */}
                <mesh position={[-0.3, -0.055, -0.85]}>
                    <RoundedBox args={[0.5, 0.04, 0.5]} radius={0.05} smoothness={8}>
                        <meshStandardMaterial color="#030712" roughness={0.1} metalness={1} />
                    </RoundedBox>
                    {[[-0.12, 0.12] as [number, number], [0.12, 0.12] as [number, number], [0, -0.12] as [number, number]].map(([px, pz], i) => (
                        <mesh key={i} position={[px, -0.01, pz]} rotation={[Math.PI / 2, 0, 0]}>
                            <cylinderGeometry args={[0.08, 0.08, 0.02, 32]} />
                            <meshStandardMaterial color="#000" metalness={1} roughness={0} />
                        </mesh>
                    ))}
                </mesh>
            </Float>
        </group>
    );
};

// ── Main Component ───────────────────────────────────────────────────────────
const DeviceMotion3D: React.FC<Props> = ({ deviceId }) => {
    const { streamReadings } = useAppContext();

    const rotationState = useRef<RotationState>({ pitch: 0, roll: 0, yaw: 0 });
    const [uiData, setUiData] = useState({ pitch: 0, roll: 0, yaw: 0 });
    const [isLive, setIsLive] = useState(false);
    const [canvasKey, setCanvasKey] = useState(0); // remount on WebGL context lost
    const lastUpdate = useRef<number>(0);

    useEffect(() => {
        const latest = [...streamReadings].reverse().find((r) => r.device_id === deviceId);
        if (latest && (latest.pitch !== undefined || latest.roll !== undefined)) {
            rotationState.current.pitch = latest.pitch ?? 0;
            rotationState.current.roll  = latest.roll  ?? 0;
            rotationState.current.yaw   = latest.yaw   ?? 0;
            setIsLive(true);
            lastUpdate.current = Date.now();
        }
    }, [streamReadings, deviceId]);

    // Liveness timeout
    useEffect(() => {
        const id = setInterval(() => {
            if (Date.now() - lastUpdate.current > 3000) setIsLive(false);
        }, 1000);
        return () => clearInterval(id);
    }, []);

    // HUD text update at 10fps
    useEffect(() => {
        const interval = setInterval(() => {
            setUiData({ ...rotationState.current });
        }, 100);
        return () => clearInterval(interval);
    }, []);

    // Remount Canvas when WebGL context is lost
    const handleContextLost = useCallback(() => {
        console.warn('[DeviceMotion3D] WebGL context lost — rebuilding renderer...');
        setTimeout(() => setCanvasKey(k => k + 1), 600);
    }, []);

    const hudMetrics = [
        { label: 'Pitch (β)', val: uiData.pitch, color: 'text-rose-400',    border: 'border-rose-500/20',    bg: 'bg-rose-500/5' },
        { label: 'Yaw (α)',   val: uiData.yaw,   color: 'text-indigo-400',  border: 'border-indigo-500/20',  bg: 'bg-indigo-500/5' },
        { label: 'Roll (γ)',  val: uiData.roll,  color: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/5' },
    ];

    return (
        <div
            className="card bg-[#020617]/80 backdrop-blur-2xl border-white/5 p-0 rounded-[2rem] overflow-hidden relative shadow-[0_32px_64px_rgba(0,0,0,0.5)] border-indigo-500/10 group"
            style={{ height: '440px' }}
        >
            {/* Header HUD */}
            <div className="absolute top-6 left-8 right-8 z-30 flex items-center justify-between pointer-events-none">
                <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-700'}`} />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-100/90 italic">Orientation Matrix</h3>
                    </div>
                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest pl-4">Real-time Telemetry Stream</span>
                </div>
                <div className={`flex items-center gap-3 px-4 py-2 rounded-2xl border backdrop-blur-md transition-all duration-700 ${
                    isLive ? 'bg-indigo-500/10 border-indigo-500/30 ring-1 ring-indigo-500/20' : 'bg-slate-900/50 border-white/5 opacity-50'
                }`}>
                    <div className="flex flex-col items-end">
                        <span className="text-[7px] font-black text-indigo-300/60 uppercase">Sync Status</span>
                        <span className="text-[9px] font-black text-white uppercase tracking-tighter">
                            {isLive ? 'Link Active' : 'Waiting...'}
                        </span>
                    </div>
                    <RotateCw
                        className={`w-4 h-4 ${isLive ? 'text-indigo-400 animate-spin-slow' : 'text-slate-600'}`}
                        style={{ animationDuration: '3s' }}
                    />
                </div>
            </div>

            {/* Noise background overlay */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] blend-overlay" />

            {/* 3D Canvas — key remounts when WebGL context is lost */}
            <Canvas
                key={canvasKey}
                shadows
                dpr={[1, 1.5]}
                gl={{ antialias: true, alpha: true, stencil: false, depth: true }}
                camera={{ fov: 35, position: [4, 4, 4] }}
                onCreated={({ gl }) => {
                    gl.domElement.addEventListener('webglcontextlost', (e) => {
                        e.preventDefault();
                        handleContextLost();
                    }, false);
                }}
            >
                <OrbitControls
                    enableZoom={false}
                    enablePan={false}
                    makeDefault
                    minPolarAngle={Math.PI / 4}
                    maxPolarAngle={Math.PI / 1.5}
                />
                <ambientLight intensity={0.5} />
                <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} castShadow />
                <pointLight position={[-5, 5, -5]} color="#6366f1" intensity={1} />
                <directionalLight position={[0, 5, 0]} intensity={0.5} />

                <PhoneModel rotationState={rotationState.current} />

                <gridHelper args={[20, 20, '#1e1b4b', '#0f172a']} position={[0, -0.7, 0]} />
                <ContactShadows position={[0, -0.69, 0]} opacity={0.6} scale={10} blur={2} far={4} color="#000" />
                <Environment preset="night" />
            </Canvas>

            {/* Telemetry HUD */}
            <div className="absolute bottom-8 left-8 right-8 z-30 pointer-events-none">
                <div className="grid grid-cols-3 gap-3">
                    {hudMetrics.map((m) => (
                        <div key={m.label} className={`backdrop-blur-xl px-4 py-4 rounded-2xl border ${m.border} ${m.bg} shadow-2xl relative overflow-hidden`}>
                            <div className={`absolute top-0 right-0 w-8 h-8 opacity-20 border-t-2 border-r-2 ${m.border}`} />
                            <div className="flex flex-col gap-1">
                                <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">{m.label}</span>
                                <div className="flex items-baseline gap-1">
                                    <span className={`text-xl font-black italic tracking-tighter ${m.color}`}>
                                        {m.val.toFixed(1)}
                                    </span>
                                    <span className="text-[10px] font-bold text-white/20">DEG</span>
                                </div>
                            </div>
                            <div className="mt-3 flex gap-0.5 h-3 items-end opacity-30">
                                {[...Array(8)].map((_, i) => (
                                    <div key={i} className={`w-1 rounded-full ${m.color}`} style={{ height: `${Math.random() * 100}%` }} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Scanline overlay */}
            <div className="absolute inset-0 pointer-events-none z-40 opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
        </div>
    );
};

export default DeviceMotion3D;
