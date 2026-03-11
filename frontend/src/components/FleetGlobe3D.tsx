import React, { useEffect, useRef, useMemo } from 'react';
import ThreeGlobe from 'three-globe';
import * as THREE from 'three';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { PerspectiveCamera, OrbitControls, Environment, Float } from '@react-three/drei';
import { GlobeIcon, Map as MapIcon, Wifi, Minimize2 } from 'lucide-react';

interface DeviceLocation {
    device_id: number;
    name: string;
    latitude: number;
    longitude: number;
    status: string;
}

interface Props {
    locations: DeviceLocation[];
}

const Globe = ({ locations }: Props) => {
    const { scene } = useThree();
    const globeRef = useRef<ThreeGlobe>(null);

    // Initialize Globe once
    useEffect(() => {
        const globe = new ThreeGlobe()
            .globeImageUrl('//unpkg.com/three-globe/example/img/earth-night.jpg')
            .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
            .pointAltitude(0.05)
            .pointColor(() => '#6366f1')
            .pointRadius(0.2)
            .pointsTransitionDuration(1000)
            .showAtmosphere(true)
            .atmosphereColor('#4f46e5')
            .atmosphereAltitude(0.15);

        // Update markers when locations change
        const pointsData = locations
            .filter(l => l.latitude != null && l.longitude != null)
            .map(l => ({
                lat: l.latitude,
                lng: l.longitude,
                size: 0.1,
                color: l.status === 'online' ? '#10b981' : '#ef4444'
            }));

        globe.pointsData(pointsData);
        scene.add(globe);
        (globeRef as any).current = globe;

        return () => {
            scene.remove(globe);
        };
    }, [locations, scene]);

    // Constant rotation logic
    useFrame(() => {
        if (globeRef.current) {
            globeRef.current.rotation.y += 0.001;
        }
    });

    return null;
};

const FleetGlobe3D: React.FC<Props> = ({ locations }) => {
    return (
        <div className="card h-[400px] p-0 overflow-hidden relative border-white/5 bg-slate-900 shadow-2xl group transition-all duration-500 border-indigo-500/10">
            {/* Overlay UI */}
            <div className="absolute top-6 left-6 z-20 pointer-events-none">
                <div className="bg-slate-950/80 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10 shadow-2xl flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                        <GlobeIcon className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-0.5">Global Presence</span>
                        <div className="flex items-center gap-2">
                            <span className="text-xl font-black text-white italic">Active Assets Globe</span>
                            <div className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold text-emerald-400 uppercase tracking-widest mt-1">
                                实时跟踪
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="absolute top-6 right-6 z-20 flex gap-2">
                <div className="bg-slate-950/80 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10 shadow-2xl flex items-center gap-4">
                    <div className="flex flex-col items-end">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Fleet Sync</span>
                        <div className="flex items-center gap-1.5 font-black text-white text-xs">
                            <Wifi className="w-3 h-3 text-indigo-400" />
                            {locations.length} NODES
                        </div>
                    </div>
                </div>
            </div>

            {/* Canvas Container */}
            <div className="w-full h-full bg-slate-950">
                <Canvas shadows={{ type: THREE.PCFShadowMap }} dpr={[1, 1.5]} gl={{ antialias: true, powerPreference: 'high-performance' }}>
                    <PerspectiveCamera makeDefault position={[0, 0, 250]} fov={45} />
                    <OrbitControls
                        enablePan={false}
                        enableZoom={false}
                        rotateSpeed={0.5}
                        autoRotate={true}
                        autoRotateSpeed={0.5}
                    />

                    <ambientLight intensity={0.5} />
                    <directionalLight position={[10, 10, 10]} intensity={1.5} />
                    <pointLight position={[-100, -100, 100]} intensity={0.5} />

                    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
                        <Globe locations={locations} />
                    </Float>

                    <Environment preset="night" />
                </Canvas>
            </div>

            {/* Bottom Legend */}
            <div className="absolute bottom-6 left-6 z-20 flex items-center gap-3">
                <div className="bg-slate-950/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/5 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Fixed Position</span>
                </div>
                <div className="bg-slate-950/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/5 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Signal Warning</span>
                </div>
            </div>

            <div className="absolute bottom-6 right-6 z-20">
                <div className="flex flex-col items-end opacity-40">
                    <MapIcon className="w-4 h-4 text-slate-500 mb-1" />
                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.3em]">Geo-Spatial Engine</span>
                </div>
            </div>

            {/* Ambient vignette */}
            <div className="absolute inset-0 bg-radial-gradient from-transparent to-slate-950/80 pointer-events-none" />
        </div>
    );
};

export default FleetGlobe3D;
