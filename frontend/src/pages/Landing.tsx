import React, { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
    Activity, Cpu, Map as MapIcon, BarChart3, Github, BookOpen,
    Bell, Shield, Zap, Database, Globe, ArrowRight, ChevronRight,
    Server, Wifi, AlertTriangle, Users, Settings, TrendingUp, ExternalLink
} from 'lucide-react';
import ContactSection from '../components/landing/ContactSection';

const GITHUB_URL = 'https://github.com/chandu0580';

// ─── Intersection observer hook ───────────────────────────────────────────────
function useInView(threshold = 0.15) {
    const ref = useRef<HTMLDivElement>(null);
    const [inView, setInView] = useState(false);
    useEffect(() => {
        const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
        if (ref.current) obs.observe(ref.current);
        return () => obs.disconnect();
    }, [threshold]);
    return { ref, inView };
}

// ─── Animated counter hook ────────────────────────────────────────────────────
function useCountUp(target: number, duration = 2000, start = false) {
    const [value, setValue] = useState(0);
    useEffect(() => {
        if (!start) return;
        let startTime: number | null = null;
        const step = (ts: number) => {
            if (!startTime) startTime = ts;
            const progress = Math.min((ts - startTime) / duration, 1);
            setValue(Math.floor(progress * target));
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }, [target, duration, start]);
    return value;
}

// ─── Tech stack ────────────────────────────────────────────────────────────────
const TECH = [
    { label: 'React', icon: '⚛️', color: 'from-cyan-500/20 to-cyan-600/5', border: 'border-cyan-500/30', text: 'text-cyan-400' },
    { label: 'Flask', icon: '🐍', color: 'from-green-500/20 to-green-600/5', border: 'border-green-500/30', text: 'text-green-400' },
    { label: 'PostgreSQL', icon: '🐘', color: 'from-blue-500/20 to-blue-600/5', border: 'border-blue-500/30', text: 'text-blue-400' },
    { label: 'Redis', icon: '⚡', color: 'from-red-500/20 to-red-600/5', border: 'border-red-500/30', text: 'text-red-400' },
    { label: 'Tailwind', icon: '🎨', color: 'from-sky-500/20 to-sky-600/5', border: 'border-sky-500/30', text: 'text-sky-400' },
    { label: 'Recharts', icon: '📊', color: 'from-purple-500/20 to-purple-600/5', border: 'border-purple-500/30', text: 'text-purple-400' },
    { label: 'Leaflet', icon: '🗺️', color: 'from-emerald-500/20 to-emerald-600/5', border: 'border-emerald-500/30', text: 'text-emerald-400' },
    { label: 'Scikit-learn', icon: '🤖', color: 'from-orange-500/20 to-orange-600/5', border: 'border-orange-500/30', text: 'text-orange-400' },
];

// ─── Features ─────────────────────────────────────────────────────────────────
const FEATURES = [
    { icon: <Activity className="w-6 h-6" />, color: '#6366f1', glow: 'hover:border-indigo-500/60  hover:shadow-[0_0_30px_rgba(99,102,241,0.15)]', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', text: 'text-indigo-400', badge: 'SSE Streaming', title: 'Real-Time Device Monitoring', desc: 'Stream live sensor data from mobile devices including motion, location, and environmental signals over Server-Sent Events.' },
    { icon: <Cpu className="w-6 h-6" />, color: '#06b6d4', glow: 'hover:border-cyan-500/60    hover:shadow-[0_0_30px_rgba(6,182,212,0.15)]', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400', badge: 'ML Powered', title: 'AI Anomaly Detection', desc: 'Detect abnormal device behaviour using Isolation Forest machine learning and rule-based alert pipelines.' },
    { icon: <MapIcon className="w-6 h-6" />, color: '#10b981', glow: 'hover:border-emerald-500/60 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', badge: 'Live GPS', title: 'Fleet Map Monitoring', desc: 'Visualise device locations and movement trails across an interactive Leaflet map with clustering and alert coloring.' },
    { icon: <Bell className="w-6 h-6" />, color: '#f59e0b', glow: 'hover:border-amber-500/60   hover:shadow-[0_0_30px_rgba(245,158,11,0.15)]', bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', badge: 'Email + Webhook', title: 'Multi-Channel Alerts', desc: 'Receive alerts via in-app dashboard, email, and webhook integrations. Full notification history and unread counters.' },
    { icon: <Shield className="w-6 h-6" />, color: '#f43f5e', glow: 'hover:border-rose-500/60    hover:shadow-[0_0_30px_rgba(244,63,94,0.15)]', bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-400', badge: 'Production Ready', title: 'Enterprise Security', desc: 'JWT authentication, bcrypt hashing, API key device auth, rate limiting, and scoped multi-tenant CORS restriction.' },
    { icon: <Database className="w-6 h-6" />, color: '#a855f7', glow: 'hover:border-purple-500/60  hover:shadow-[0_0_30px_rgba(168,85,247,0.15)]', bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400', badge: 'RBAC', title: 'Multi-Tenant SaaS', desc: 'Full organisations, teams, and role-based access control. Each tenant is completely isolated with scoped data access.' },
    { icon: <BarChart3 className="w-6 h-6" />, color: '#14b8a6', glow: 'hover:border-teal-500/60    hover:shadow-[0_0_30px_rgba(20,184,166,0.15)]', bg: 'bg-teal-500/10', border: 'border-teal-500/20', text: 'text-teal-400', badge: 'Interactive Charts', title: 'Analytics Dashboard', desc: 'Visualise historical trends, battery drainage, motion spikes, and statistical outliers with rich Recharts panels.' },
    { icon: <Zap className="w-6 h-6" />, color: '#eab308', glow: 'hover:border-yellow-500/60  hover:shadow-[0_0_30px_rgba(234,179,8,0.15)]', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', text: 'text-yellow-400', badge: 'High Performance', title: 'Redis Caching & Workers', desc: 'Dashboard metrics cached in Redis for instant loads. Heavy tasks (email, webhooks) offloaded asynchronously.' },
];

// ─── Pipeline ─────────────────────────────────────────────────────────────────
const PIPELINE = [
    { icon: '📱', label: 'Mobile Sensors', border: 'border-slate-700' },
    { icon: '☁️', label: 'Flask API', border: 'border-indigo-500/40' },
    { icon: '🗄️', label: 'PostgreSQL', border: 'border-blue-500/40' },
    { icon: '🧠', label: 'AI Engine', border: 'border-cyan-500/40' },
    { icon: '🔔', label: 'Alerts & SSE', border: 'border-amber-500/40' },
    { icon: '💻', label: 'Dashboard', border: 'border-emerald-500/40' },
];

// ─── Mock dashboard preview ───────────────────────────────────────────────────
const DashboardPreview: React.FC = () => (
    <div className="relative w-full max-w-4xl mx-auto rounded-2xl overflow-hidden
    border border-indigo-500/30
    shadow-[0_0_60px_rgba(99,102,241,0.25),0_0_120px_rgba(168,85,247,0.1)]
    bg-slate-900">

        {/* Window chrome */}
        <div className="flex items-center gap-2 px-4 py-3 bg-slate-800/80 border-b border-white/5">
            <span className="w-3 h-3 rounded-full bg-red-500/80" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
            <span className="ml-4 text-xs text-slate-500 font-mono">pocketiot.app/dashboard</span>
            <span className="ml-auto flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-emerald-400 font-bold">LIVE</span>
            </span>
        </div>

        <div className="flex h-[340px]">
            {/* Sidebar mock */}
            <div className="w-14 bg-slate-950 border-r border-white/5 flex flex-col items-center py-4 gap-4">
                {[Activity, BarChart3, MapIcon, Bell, Shield, Users, Settings].map((Icon, i) => (
                    <div key={i} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors
            ${i === 0 ? 'bg-indigo-500/30 text-indigo-400' : 'text-slate-600 hover:text-slate-400'}`}>
                        <Icon className="w-4 h-4" />
                    </div>
                ))}
            </div>

            {/* Main content mock */}
            <div className="flex-1 p-4 overflow-hidden">
                <div className="grid grid-cols-4 gap-3 mb-3">
                    {[
                        { label: 'Devices', value: '12', icon: Wifi, c: 'text-indigo-300' },
                        { label: 'Online', value: '9', icon: Activity, c: 'text-emerald-300' },
                        { label: 'Alerts', value: '3', icon: AlertTriangle, c: 'text-amber-300' },
                        { label: 'Events', value: '24.8k', icon: TrendingUp, c: 'text-cyan-300' },
                    ].map((s, i) => (
                        <div key={i} className="rounded-xl bg-slate-800/80 border border-white/5 p-3">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] text-slate-500 uppercase tracking-widest">{s.label}</span>
                                <s.icon className="w-3.5 h-3.5 text-slate-600" />
                            </div>
                            <div className={`text-xl font-black ${s.c}`}>{s.value}</div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2 rounded-xl bg-slate-800/80 border border-white/5 p-3 h-44">
                        <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">Motion Magnitude</div>
                        <svg className="w-full h-[100px]" viewBox="0 0 300 80" preserveAspectRatio="none">
                            <defs>
                                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                            <path d="M0,60 C20,50 40,30 60,40 C80,50 100,20 120,25 C140,30 160,55 180,45 C200,35 220,15 240,20 C260,25 280,50 300,40" stroke="#6366f1" strokeWidth="2" fill="none" />
                            <path d="M0,60 C20,50 40,30 60,40 C80,50 100,20 120,25 C140,30 160,55 180,45 C200,35 220,15 240,20 C260,25 280,50 300,40 L300,80 L0,80 Z" fill="url(#chartGrad)" />
                            <circle cx="120" cy="25" r="4" fill="#f59e0b" />
                            <circle cx="120" cy="25" r="8" fill="#f59e0b" fillOpacity="0.3" className="animate-ping" />
                        </svg>
                        <div className="flex items-center gap-3 mt-1">
                            <span className="flex items-center gap-1 text-[9px] text-slate-500"><span className="w-2 h-0.5 bg-indigo-500 inline-block rounded" /> Live Signal</span>
                            <span className="flex items-center gap-1 text-[9px] text-amber-400"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Anomaly</span>
                        </div>
                    </div>

                    <div className="rounded-xl bg-slate-800/80 border border-white/5 p-3 h-44 overflow-hidden">
                        <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">Devices</div>
                        {['Alpha-01', 'Beta-07', 'Gamma-12', 'Delta-03', 'Echo-05'].map((d, i) => (
                            <div key={i} className="flex items-center gap-2 py-1.5 border-b border-white/[0.03] last:border-0">
                                <span className={`w-1.5 h-1.5 rounded-full ${i < 4 ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                                <span className="text-[10px] text-slate-300 font-mono">{d}</span>
                                <span className="ml-auto text-[9px] text-slate-600">{70 + i * 5}%🔋</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none" />
    </div>
);

// ─── Main Landing Page ────────────────────────────────────────────────────────
const Landing: React.FC = () => {
    const navigate = useNavigate();
    const isAuthenticated = !!localStorage.getItem('token');

    const { ref: statsRef, inView: statsInView } = useInView();
    const { ref: featRef, inView: featInView } = useInView(0.05);
    const { ref: techRef, inView: techInView } = useInView();

    const cnt1 = useCountUp(24800, 1800, statsInView);
    const cnt2 = useCountUp(99, 1500, statsInView);
    const cnt3 = useCountUp(12, 1200, statsInView);
    const cnt4 = useCountUp(8, 1000, statsInView);

    const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

    return (
        <div className="min-h-screen bg-gray-900 text-slate-100 font-sans selection:bg-indigo-500/30 overflow-x-hidden">

            {/* ── Global float animation ─────────────────────────────────────────── */}
            <style>{`
@keyframes float {
    0% { transform: translateY(0px) scale(1); }
    50% { transform: translateY(-24px) scale(1.04); }
    100% { transform: translateY(0px) scale(1); }
}
@keyframes float2 {
    0% { transform: translateY(0px) scale(1); }
    50% { transform: translateY(20px) scale(0.97); }
    100% { transform: translateY(0px) scale(1); }
}
        .animate-float  { animation: float  7s ease-in-out infinite; }
        .animate-float2 { animation: float2 9s ease-in-out infinite; }
@keyframes fadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
}
        .fade-up { animation: fadeUp 0.7s ease forwards; }
`}</style>

            {/* ────────────────────────────── NAVBAR ─────────────────────────────── */}
            <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-gray-900/80 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    {/* Logo */}
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 shadow-[0_0_14px_rgba(99,102,241,0.35)]">
                            <Activity className="w-4 h-4 text-indigo-400" />
                        </div>
                        <span className="font-black text-lg tracking-tight">
                            Pocket<span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">IoT</span>
                        </span>
                    </div>

                    {/* Desktop nav links */}
                    <div className="hidden md:flex items-center gap-7">
                        <button onClick={() => scrollTo('features')} className="text-sm text-slate-400 hover:text-white transition-colors">Features</button>
                        <button onClick={() => scrollTo('tech')} className="text-sm text-slate-400 hover:text-white transition-colors">Stack</button>
                        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer"
                            className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1.5">
                            <Github className="w-3.5 h-3.5" /> GitHub
                        </a>
                    </div>

                    {/* Right buttons */}
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/login')}
                            className="hidden sm:flex text-sm font-semibold text-slate-300 hover:text-white transition-all px-4 py-2 rounded-lg border border-white/10 hover:border-white/20 hover:bg-white/5">
                            Log in
                        </button>
                        <button onClick={() => navigate('/dashboard')}
                            className="hidden sm:flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-slate-200 transition-all">
                            Dashboard
                        </button>
                        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-full
                bg-gradient-to-r from-indigo-600 to-purple-600
                hover:from-indigo-500 hover:to-purple-500 text-white transition-all
                shadow-[0_0_18px_rgba(99,102,241,0.35)] hover:shadow-[0_0_28px_rgba(99,102,241,0.55)]">
                            <Github className="w-4 h-4" />
                            <span className="hidden sm:inline">GitHub</span>
                        </a>
                    </div>
                </div>
            </nav>

            {/* ────────────────────────────── HERO ───────────────────────────────── */}
            <section className="relative pt-36 pb-16 px-6 overflow-hidden bg-gradient-to-b from-gray-900 via-black to-gray-900">

                {/* Subtle grid */}
                <div className="absolute inset-0 pointer-events-none" style={{
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                    opacity: 0.6,
                }} />

                {/* Floating glow orbs */}
                <div className="absolute top-24 left-1/4 w-[480px] h-[480px] rounded-full
          bg-indigo-500/30 blur-3xl opacity-30 animate-float pointer-events-none" />
                <div className="absolute top-32 right-1/4 w-[380px] h-[380px] rounded-full
          bg-purple-500/30 blur-3xl opacity-30 animate-float2 pointer-events-none" />

                <div className="max-w-5xl mx-auto text-center relative z-10">
                    {/* Pill badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full
            border border-indigo-500/40 bg-indigo-500/10 text-indigo-300 text-xs font-bold uppercase tracking-widest mb-8">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
                        </span>
                        Production Ready · v2.0 · Live Platform
                    </div>

                    {/* Headline */}
                    <h1 className="text-5xl sm:text-6xl md:text-8xl font-black tracking-tight mb-6 leading-none fade-up">
                        <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-300 bg-clip-text text-transparent">
                            PocketIoT
                        </span>
                        <br />
                        <span className="text-2xl sm:text-3xl md:text-4xl font-bold
              bg-gradient-to-r from-slate-300 via-slate-200 to-slate-400 bg-clip-text text-transparent mt-2 block">
                            Real-Time AI Powered IoT Monitoring Platform
                        </span>
                    </h1>

                    <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed fade-up" style={{ animationDelay: '0.1s' }}>
                        Monitor mobile devices, detect anomalies, and manage IoT fleets in real-time
                        using advanced analytics and AI-driven insights. Multi-tenant SaaS. Cloud-ready.
                    </p>

                    {/* Hero buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6 fade-up" style={{ animationDelay: '0.2s' }}>
                        {/* Login */}
                        <button onClick={() => navigate('/login')}
                            className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-lg text-white transition-all flex items-center justify-center gap-2
                bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500
                shadow-[0_0_30px_rgba(99,102,241,0.4)] hover:shadow-[0_0_20px_rgba(99,102,241,0.6)]">
                            Login <ChevronRight className="w-5 h-5" />
                        </button>

                        {/* Dashboard */}
                        <button onClick={() => navigate('/dashboard')}
                            className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-lg text-slate-200 transition-all flex items-center justify-center gap-2
                bg-white/5 backdrop-blur-lg border border-white/10
                hover:bg-white/10 hover:border-white/20 hover:scale-[1.02]">
                            View Dashboard
                        </button>

                        {/* GitHub */}
                        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer"
                            className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-lg text-slate-300 transition-all flex items-center justify-center gap-2
                bg-white/5 backdrop-blur-lg border border-gray-600/60
                hover:bg-gray-800 hover:border-gray-500 hover:text-white hover:scale-[1.02]">
                            <Github className="w-5 h-5" /> GitHub
                        </a>
                    </div>

                    <p className="text-sm text-slate-600 fade-up" style={{ animationDelay: '0.3s' }}>
                        No credit card required · Open source · Deploy in minutes
                    </p>
                </div>
            </section>

            {/* ── Dashboard Preview ─────────────────────────────────────────────── */}
            <section className="py-12 px-6 relative z-10 bg-gradient-to-b from-black to-gray-900">
                <div className="max-w-5xl mx-auto">
                    <DashboardPreview />
                    <p className="text-center text-sm text-slate-600 mt-4">
                        ↑ Live dashboard preview — real-time SSE streaming, AI anomaly detection, fleet map
                    </p>
                </div>
            </section>

            {/* ── Stats ──────────────────────────────────────────────────────────── */}
            <section className="py-20 px-6 border-t border-white/5 relative z-10 bg-gray-900" ref={statsRef}>
                <div className="max-w-5xl mx-auto">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {[
                            { value: cnt1.toLocaleString() + '+', label: 'Events Processed' },
                            { value: cnt2 + '%', label: 'Uptime SLA' },
                            { value: '<' + cnt3 + 'ms', label: 'SSE Latency' },
                            { value: cnt4 + ' Channels', label: 'Alert Channels' },
                        ].map((s, i) => (
                            <div key={i} className="text-center p-6 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur hover:scale-105 transition-transform">
                                <div className="text-3xl md:text-4xl font-black text-white mb-2 tabular-nums
                  bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent">{s.value}</div>
                                <div className="text-sm text-slate-500 font-medium">{s.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Features ───────────────────────────────────────────────────────── */}
            <section id="features" className="py-24 px-6 border-t border-white/5 bg-gradient-to-b from-gray-900 to-black relative z-10">
                <div className="max-w-7xl mx-auto" ref={featRef}>
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">
                            Core Platform Features
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black mb-4
              bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                            Everything IoT Teams Need
                        </h2>
                        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                            From sensor ingestion to AI-powered anomaly detection — the entire stack, production-ready.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {FEATURES.map((f, i) => (
                            <div key={i}
                                className={`group p-6 rounded-2xl border border-white/10
bg-white/5 backdrop-blur-lg
                  ${f.glow} transition-all duration-300
hover:scale-105 hover:-translate-y-1`}
                                style={{
                                    opacity: featInView ? 1 : 0,
                                    transform: featInView ? undefined : 'translateY(24px)',
                                    transition: `opacity 0.5s ease ${i * 50}ms, transform 0.5s ease ${i * 50}ms, scale 0.3s, border-color 0.3s, box-shadow 0.3s`,
                                }}>
                                <div className={`w-11 h-11 rounded-xl ${f.bg} border ${f.border} flex items-center justify-center mb-5 ${f.text} group-hover:scale-110 transition-transform duration-300`}>
                                    {f.icon}
                                </div>
                                <div className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${f.bg} ${f.text} mb-3`}>
                                    {f.badge}
                                </div>
                                <h3 className="text-base font-bold mb-2 text-slate-100">{f.title}</h3>
                                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Pipeline ───────────────────────────────────────────────────────── */}
            <section className="py-24 px-6 border-t border-white/5 bg-black relative z-10 overflow-hidden">
                <div className="absolute inset-0 pointer-events-none" style={{
                    backgroundImage: 'linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                }} />
                <div className="max-w-5xl mx-auto text-center relative">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">
                        System Architecture
                    </div>
                    <h2 className="text-4xl font-black mb-4
            bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                        Real-Time Data Pipeline
                    </h2>
                    <p className="text-slate-400 mb-14 max-w-xl mx-auto">Every sensor event flows through a hardened multi-stage pipeline from mobile device to live dashboard in milliseconds.</p>
                    <div className="flex flex-col md:flex-row items-center justify-center gap-3 md:gap-2">
                        {PIPELINE.map((step, i) => (
                            <React.Fragment key={i}>
                                <div className={`flex flex-col items-center p-5 rounded-2xl
bg-white/5 backdrop-blur-lg border ${step.border}
hover:scale-105 transition-all duration-300 w-32 shrink-0`}>
                                    <div className="text-3xl mb-2">{step.icon}</div>
                                    <div className="text-xs font-bold text-center text-slate-300 leading-tight">{step.label}</div>
                                </div>
                                {i < PIPELINE.length - 1 && (
                                    <span className="text-slate-700 font-bold text-xl rotate-90 md:rotate-0">→</span>
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Tech Stack ─────────────────────────────────────────────────────── */}
            <section id="tech" className="py-24 px-6 border-t border-white/5 bg-gray-900 relative z-10">
                <div className="max-w-4xl mx-auto text-center" ref={techRef}>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">
                        Technology Stack
                    </div>
                    <h2 className="text-4xl font-black mb-4 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                        Built on Modern Open Source
                    </h2>
                    <p className="text-slate-400 mb-12 max-w-xl mx-auto">A battle-tested stack chosen for performance, reliability, and developer experience.</p>
                    <div className="flex flex-wrap items-center justify-center gap-4">
                        {TECH.map((t, i) => (
                            <div key={i}
                                className={`flex items-center gap-2.5 px-5 py-3 rounded-xl border ${t.border}
bg-gradient-to-br ${t.color} backdrop-blur-lg
hover:scale-110 hover:-translate-y-0.5 transition-all duration-300 cursor-default`}
                                style={{
                                    opacity: techInView ? 1 : 0,
                                    transform: techInView ? undefined : 'scale(0.85)',
                                    transition: `opacity 0.4s ease ${i * 60}ms, transform 0.4s ease ${i * 60}ms, scale 0.3s`,
                                }}>
                                <span className="text-lg">{t.icon}</span>
                                <span className={`font-bold text-sm ${t.text}`}>{t.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Security ───────────────────────────────────────────────────────── */}
            <section className="py-24 px-6 border-t border-white/5 bg-black relative z-10">
                <div className="max-w-5xl mx-auto">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs font-bold uppercase tracking-widest mb-4">
                                Enterprise Security
                            </div>
                            <h2 className="text-4xl font-black mb-6 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                                Security Hardened<br />from Day One
                            </h2>
                            <div className="space-y-4">
                                {[
                                    { label: 'JWT Authentication', desc: 'All API routes protected with signed tokens containing org + role claims.' },
                                    { label: 'Device API Keys', desc: 'Sensor ingestion authenticated via secure API keys independent of user tokens.' },
                                    { label: 'Rate Limiting', desc: '60 req/min on data ingestion, 10 req/min on login endpoints.' },
                                    { label: 'bcrypt Password Hashing', desc: 'Passwords stored with cost factor 12, never in plaintext.' },
                                    { label: 'CORS Restriction', desc: 'Cross-origin requests limited to configured tenant domains.' },
                                    { label: 'Multi-Tenant Isolation', desc: 'All DB queries scoped to organization_id — zero cross-tenant data leakage.' },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-start gap-3">
                                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mt-0.5 shrink-0">
                                            <span className="text-emerald-400 text-[10px] font-black">✓</span>
                                        </div>
                                        <div>
                                            <span className="font-bold text-slate-200 text-sm">{item.label} — </span>
                                            <span className="text-slate-500 text-sm">{item.desc}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4">
                            {[
                                { icon: <Shield className="w-5 h-5 text-rose-400" />, border: 'border-rose-500/20', bg: 'bg-rose-500/5', label: 'Auth Layer', val: 'JWT + API Keys' },
                                { icon: <Database className="w-5 h-5 text-blue-400" />, border: 'border-blue-500/20', bg: 'bg-blue-500/5', label: 'Database', val: 'PostgreSQL + Indexes' },
                                { icon: <Zap className="w-5 h-5 text-amber-400" />, border: 'border-amber-500/20', bg: 'bg-amber-500/5', label: 'Cache', val: 'Redis (60s TTL)' },
                                { icon: <Globe className="w-5 h-5 text-emerald-400" />, border: 'border-emerald-500/20', bg: 'bg-emerald-500/5', label: 'CORS', val: 'Origin Allowlist' },
                                { icon: <Server className="w-5 h-5 text-purple-400" />, border: 'border-purple-500/20', bg: 'bg-purple-500/5', label: 'WSGI', val: 'Gunicorn + WAL mode' },
                                { icon: <Activity className="w-5 h-5 text-cyan-400" />, border: 'border-cyan-500/20', bg: 'bg-cyan-500/5', label: 'Logging', val: 'Structured JSON logs' },
                            ].map((item, i) => (
                                <div key={i} className={`flex items-center gap-4 p-4 rounded-xl border ${item.border} ${item.bg} backdrop-blur-lg hover:scale-[1.02] transition-transform`}>
                                    <div className="w-10 h-10 rounded-xl bg-slate-900/50 flex items-center justify-center border border-white/5">
                                        {item.icon}
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-500 uppercase tracking-widest font-bold">{item.label}</div>
                                        <div className="text-sm font-bold text-slate-200">{item.val}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── CTA ────────────────────────────────────────────────────────────── */}
            <section className="py-32 px-6 border-t border-indigo-500/10 relative z-10 text-center overflow-hidden
        bg-gradient-to-b from-black via-indigo-950/20 to-gray-900">
                {/* Glowing orb */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-indigo-700/20 blur-[100px] rounded-full pointer-events-none animate-float" />
                <div className="max-w-3xl mx-auto relative">
                    <div className="text-6xl mb-6">🚀</div>
                    <h2 className="text-4xl md:text-5xl font-black mb-6
            bg-gradient-to-r from-indigo-300 via-purple-300 to-indigo-200 bg-clip-text text-transparent">
                        Start Monitoring Your<br />IoT Devices Today
                    </h2>
                    <p className="text-slate-400 text-lg mb-10 max-w-xl mx-auto">
                        Deploy PocketIoT in minutes. Connect your mobile devices, stream real-time data, and get AI-powered anomaly alerts instantly.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button onClick={() => navigate('/login')}
                            className="px-10 py-4 rounded-xl font-bold text-lg text-white transition-all flex items-center gap-2
                bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500
                shadow-[0_0_40px_rgba(99,102,241,0.4)] hover:shadow-[0_0_20px_rgba(99,102,241,0.6)]">
                            Login to Platform <ArrowRight className="w-5 h-5" />
                        </button>
                        <button onClick={() => navigate('/dashboard')}
                            className="px-10 py-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-lg hover:bg-white/10 text-slate-300 hover:text-white font-bold text-lg transition-all">
                            View Dashboard
                        </button>
                        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer"
                            className="px-10 py-4 rounded-xl border border-gray-600/60 bg-white/5 backdrop-blur-lg hover:bg-gray-800 text-slate-400 hover:text-white font-bold text-lg transition-all flex items-center gap-2">
                            <Github className="w-5 h-5" /> GitHub
                        </a>
                    </div>
                </div>
            </section>

            <ContactSection />

            <footer className="py-10 px-6 border-t border-white/5 bg-gray-900">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                            <Activity className="w-3.5 h-3.5 text-indigo-400" />
                        </div>
                        <span className="font-black text-sm">
                            Pocket<span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">IoT</span>
                        </span>
                        <span className="text-slate-600 text-sm ml-2">© {new Date().getFullYear()} · Real-Time AI IoT Platform</span>
                    </div>
                    <div className="flex items-center gap-6">
                        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer"
                            className="text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1.5 text-sm">
                            <Github className="w-4 h-4" /> GitHub
                        </a>
                        <a href="#" className="text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1.5 text-sm">
                            <BookOpen className="w-4 h-4" /> Documentation
                        </a>
                        <a href={`${GITHUB_URL}?tab=repositories`} target="_blank" rel="noopener noreferrer"
                            className="text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1.5 text-sm">
                            <ExternalLink className="w-4 h-4" /> Contact
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Landing;
