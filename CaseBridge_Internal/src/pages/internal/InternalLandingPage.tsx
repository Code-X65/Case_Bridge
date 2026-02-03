import { Link } from 'react-router-dom';
import { useInternalSession } from '@/hooks/useInternalSession';
import {
    ShieldCheck,
    ArrowRight,
    Building2,
    Users,
    Lock,
    Zap,
    Scale,
    Gavel,
    LayoutDashboard,
    Globe,
    Server,
    Activity,
    Layers
} from 'lucide-react';
import LiquidCanvas from '@/components/effects/LiquidCanvas';

export default function InternalLandingPage() {
    const { session } = useInternalSession();

    const formatRole = (role: string) => {
        return role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    return (
        <div className="min-h-screen bg-[#0A0F1E] text-white overflow-hidden relative font-sans selection:bg-cyan-500/30">
            {/* 1. Liquid Fluid Background */}
            <LiquidCanvas />

            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                {/* Noise Texture */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
            </div>

            {/* 2. Liquid Glass Navigation */}
            <nav className="sticky top-4 z-50 w-[95%] max-w-7xl mx-auto rounded-full border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] supports-[backdrop-filter]:bg-white/5">
                <div className="px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="absolute inset-0 bg-cyan-500 blur-lg opacity-40 animate-pulse" />
                            <div className="relative p-2 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20">
                                <Scale className="w-5 h-5 text-cyan-300" />
                            </div>
                        </div>
                        <span className="text-xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">
                            CASEBRIDGE
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        {session ? (
                            <Link
                                to="/internal/dashboard"
                                className="group relative px-6 py-2 rounded-full bg-gradient-to-r from-indigo-500/20 to-cyan-500/20 border border-white/10 hover:border-white/30 transition-all hover:shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                            >
                                <span className="flex items-center gap-2 text-sm font-bold text-cyan-100">
                                    Continue <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </span>
                            </Link>
                        ) : (
                            <>
                                <Link to="/internal/login" className="text-sm font-bold text-slate-400 hover:text-white transition-colors">
                                    Sign In
                                </Link>
                                <Link
                                    to="/internal/register-firm"
                                    className="px-6 py-2.5 rounded-full bg-gradient-to-r from-indigo-600 to-cyan-600 font-bold text-sm shadow-lg shadow-cyan-900/20 hover:shadow-cyan-500/30 hover:scale-105 transition-all text-white border border-white/10"
                                >
                                    Initialize Firm
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            {/* 3. Hero Section */}
            <main className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32">
                <div className="grid lg:grid-cols-2 gap-20 items-center">

                    {/* Hero Text */}
                    <div className="space-y-10">
                        <div className="space-y-6">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-white/10 to-white/5 border border-white/10 backdrop-blur-md shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                                </span>
                                <span className="text-xs font-bold uppercase tracking-widest text-cyan-100">System V2.4.0 Live</span>
                            </div>

                            <h1 className="text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight text-white drop-shadow-2xl">
                                Fluid Legal <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 animate-gradient-x">Infrastructure.</span>
                            </h1>

                            <p className="text-lg text-slate-300/80 max-w-xl leading-relaxed backdrop-blur-sm">
                                The high-velocity command center for modern litigation.
                                Secure, isolated, and responsive.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-5">
                            {session ? (
                                <Link
                                    to="/internal/dashboard"
                                    className="group relative px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600/80 to-blue-600/80 backdrop-blur-md border border-white/10 hover:border-white/30 shadow-[0_0_30px_rgba(79,70,229,0.3)] hover:shadow-[0_0_50px_rgba(79,70,229,0.5)] transition-all duration-300"
                                >
                                    <span className="flex items-center justify-center gap-3 font-black uppercase text-sm tracking-widest text-white">
                                        <LayoutDashboard className="w-5 h-5" />
                                        Enter Console
                                    </span>
                                </Link>
                            ) : (
                                <div className="flex gap-4">
                                    <Link
                                        to="/internal/register-firm"
                                        className="relative group px-8 py-4 bg-white text-slate-900 rounded-2xl shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_40px_rgba(255,255,255,0.5)] overflow-hidden transition-all hover:-translate-y-1"
                                    >
                                        <span className="relative z-10 flex items-center justify-center gap-3 font-black uppercase text-sm tracking-widest">
                                            Start Workspace
                                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                        </span>
                                    </Link>
                                    <Link
                                        to="/internal/login"
                                        className="px-8 py-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md text-white hover:bg-white/10 hover:border-white/20 transition-all font-black uppercase text-sm tracking-widest"
                                    >
                                        Staff Login
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* Liquid Stats Bar */}
                        <div className="flex gap-4 p-2 bg-gradient-to-b from-white/10 to-white/5 rounded-3xl border border-white/10 backdrop-blur-xl w-fit">
                            {[
                                { val: '99.9%', label: 'Uptime', icon: Server, color: 'text-emerald-400' },
                                { val: 'AES-256', label: 'Secure', icon: ShieldCheck, color: 'text-cyan-400' },
                                { val: 'RBAC', label: 'Access', icon: Lock, color: 'text-indigo-400' },
                            ].map((stat, i) => (
                                <div key={i} className="px-6 py-3 rounded-2xl bg-[#0F172A]/40 text-center hover:bg-[#0F172A]/60 transition-colors">
                                    <div className={`text-xl font-black ${stat.color} drop-shadow-glow`}>{stat.val}</div>
                                    <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{stat.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Hero Visual (Liquid Glass Card) */}
                    <div className="relative lg:h-[600px] flex items-center justify-center perspective-1000">
                        {/* 3D Floating Animation wrapper */}
                        <div className="relative animate-float-slow">
                            {/* Glass Reflection Highlight */}
                            <div className="absolute -top-20 -left-20 w-40 h-40 bg-white/20 rounded-full blur-[50px] pointer-events-none" />

                            {/* Main Liquid Card */}
                            <div className="w-[400px] h-[520px] rounded-[3rem] bg-gradient-to-br from-white/10 to-transparent border border-white/20 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] p-8 flex flex-col justify-between relative overflow-hidden group">

                                {/* Inner texture/shine */}
                                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-50 pointer-events-none" />

                                {/* Card Content */}
                                <div className="relative z-10">
                                    {/* Header */}
                                    <div className="flex items-center justify-between mb-8">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/30 to-purple-500/30 border border-white/20 flex items-center justify-center backdrop-blur-md">
                                                <Building2 className="w-6 h-6 text-indigo-300" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-white">Pearson Specter</div>
                                                <div className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full inline-block font-bold">ACTIVE</div>
                                            </div>
                                        </div>
                                        <Globe className="text-white/20 w-8 h-8 rotate-12" />
                                    </div>

                                    {/* Abstract Data Viz */}
                                    <div className="space-y-6">
                                        <div className="glass-panel p-4 rounded-2xl bg-black/20 border border-white/5 space-y-2">
                                            <div className="flex justify-between text-xs font-medium text-slate-300">
                                                <span>Workload</span>
                                                <span className="text-cyan-400">High</span>
                                            </div>
                                            <div className="h-3 bg-black/30 rounded-full overflow-hidden p-0.5">
                                                <div className="h-full w-[84%] bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.5)] animate-pulse-slow" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            {[1, 2].map((i) => (
                                                <div key={i} className="h-24 rounded-2xl bg-white/5 border border-white/10 p-3 hover:bg-white/10 transition-colors flex flex-col justify-end">
                                                    <div className="h-1.5 w-1/2 bg-white/20 rounded-full mb-2" />
                                                    <div className="h-1.5 w-3/4 bg-white/10 rounded-full" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Footer User */}
                                <div className="relative z-10 p-4 rounded-[2rem] bg-gradient-to-r from-white/10 to-transparent border border-white/10 flex items-center gap-4 backdrop-blur-md">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-500 shadow-lg flex items-center justify-center text-xs font-black">
                                        JD
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-white">Harvey Specter</div>
                                        <div className="text-[10px] text-cyan-200">Managing Partner</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 4. Liquid Bubbles Features */}
                <div className="mt-32">
                    <div className="text-center mb-16">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400 bg-cyan-900/20 px-4 py-2 rounded-full border border-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.1)]">
                            Core Architecture
                        </span>
                        <h2 className="text-4xl md:text-5xl font-black mt-6 tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40">
                            Transparent Security.
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: Server,
                                title: "Strict Isolation",
                                desc: "Absolute logical separation. Data never crosses firm boundaries.",
                                gradient: "from-cyan-500/20 to-blue-500/20"
                            },
                            {
                                icon: ShieldCheck,
                                title: "Zero Trust RBAC",
                                desc: "Granular permission scopes for Admins, Managers, and Associates.",
                                gradient: "from-purple-500/20 to-indigo-500/20"
                            },
                            {
                                icon: Zap,
                                title: "Instant Access",
                                desc: "Invite-based provisioning with automated role assignment.",
                                gradient: "from-emerald-500/20 to-teal-500/20"
                            }
                        ].map((feature, idx) => (
                            <div key={idx} className="group relative p-8 rounded-[2.5rem] bg-gradient-to-br from-white/5 to-white/0 border border-white/10 hover:border-white/30 backdrop-blur-xl transition-all hover:-translate-y-2 hover:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] overflow-hidden">
                                {/* Liquid Hover BG */}
                                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl`} />

                                <div className="relative z-10">
                                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-inner group-hover:scale-110 transition-transform duration-300">
                                        <feature.icon className="w-7 h-7 text-white" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-3 text-white">{feature.title}</h3>
                                    <p className="text-sm text-slate-400 group-hover:text-slate-200 transition-colors leading-relaxed">
                                        {feature.desc}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {/* 5. Footer */}
            <footer className="relative z-10 border-t border-white/5 py-12 bg-black/40 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2 grayscale brightness-75 hover:grayscale-0 transition-all opacity-70 hover:opacity-100">
                        <Scale className="w-5 h-5 text-cyan-400" />
                        <span className="text-lg font-black italic tracking-tighter text-white">CASEBRIDGE</span>
                    </div>
                    <div className="flex gap-8 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200/50">
                        <a href="#" className="hover:text-cyan-200 transition-colors">Docs</a>
                        <a href="#" className="hover:text-cyan-200 transition-colors">Legal</a>
                        <a href="#" className="hover:text-cyan-200 transition-colors">Status</a>
                    </div>
                </div>
            </footer>

            <style>{`
                .animate-float-slow {
                    animation: float 6s ease-in-out infinite;
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-20px); }
                }
            `}</style>
        </div>
    );
}
