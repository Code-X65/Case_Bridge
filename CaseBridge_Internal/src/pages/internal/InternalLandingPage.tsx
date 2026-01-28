import { Link } from 'react-router-dom';
import {
    ShieldCheck,
    ArrowRight,
    Building2,
    Users,
    Lock,
    Zap,
    Scale,
    Gavel
} from 'lucide-react';

export default function InternalLandingPage() {
    return (
        <div className="min-h-screen bg-[#0F172A] text-white overflow-hidden relative font-sans">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none" />
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px]" />
            <div className="absolute top-1/2 -left-24 w-72 h-72 bg-blue-600/10 rounded-full blur-[100px]" />

            {/* Navigation */}
            <nav className="relative z-50 max-w-7xl mx-auto px-6 py-8 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="bg-indigo-600 p-2 rounded-lg">
                        <Scale className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-2xl font-black italic tracking-tighter">CASEBRIDGE</span>
                </div>
                <div className="flex items-center gap-6">
                    <Link to="/internal/login" className="text-sm font-bold text-slate-400 hover:text-white transition-colors">
                        Sign In
                    </Link>
                    <Link to="/internal/register-firm" className="px-5 py-2.5 bg-white text-slate-900 text-sm font-bold rounded-xl hover:bg-slate-200 transition-all active:scale-95">
                        Get Started
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    <div className="space-y-8">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-6">
                                <Zap className="w-3 h-3" />
                                Internal Operations Workspace
                            </div>
                            <h1 className="text-6xl lg:text-7xl font-black leading-[1.1] tracking-tight mb-6">
                                Secure Infrastructure for <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-500">Modern Law Firms.</span>
                            </h1>
                            <p className="text-lg text-slate-400 max-w-xl leading-relaxed">
                                A specialized environment designed exclusively for law firm staff.
                                Manage cases, assign roles, and scale your firm with enterprise-grade security
                                and strict isolation.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4">
                            <Link
                                to="/internal/register-firm"
                                className="px-8 py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-sm tracking-widest rounded-2xl transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-3 group active:scale-[0.98]"
                            >
                                Register Your Firm
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <Link
                                to="/internal/login"
                                className="px-8 py-5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black uppercase text-sm tracking-widest rounded-2xl transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                            >
                                <Lock className="w-5 h-5" />
                                Staff Login
                            </Link>
                        </div>

                        <div className="flex items-center gap-8 pt-4">
                            <div className="flex flex-col">
                                <span className="text-2xl font-black">99.9%</span>
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Uptime</span>
                            </div>
                            <div className="w-px h-8 bg-white/10" />
                            <div className="flex flex-col">
                                <span className="text-2xl font-black">256-bit</span>
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Encryption</span>
                            </div>
                            <div className="w-px h-8 bg-white/10" />
                            <div className="flex flex-col">
                                <span className="text-2xl font-black">RBAC</span>
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Enabled</span>
                            </div>
                        </div>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 bg-indigo-500/20 blur-[80px] rounded-full" />
                        <div className="relative bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-3xl shadow-2xl">
                            <div className="space-y-6">
                                <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full bg-red-500/50" />
                                        <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                                        <div className="w-3 h-3 rounded-full bg-green-500/50" />
                                    </div>
                                    <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">Internal Dashboard</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="h-24 bg-white/5 rounded-2xl border border-white/5 p-4">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center mb-2">
                                            <Users className="w-4 h-4 text-indigo-400" />
                                        </div>
                                        <div className="w-12 h-2 bg-white/20 rounded-full mb-1" />
                                        <div className="w-8 h-1.5 bg-white/10 rounded-full" />
                                    </div>
                                    <div className="h-24 bg-white/5 rounded-2xl border border-white/5 p-4">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-2">
                                            <Building2 className="w-4 h-4 text-emerald-400" />
                                        </div>
                                        <div className="w-12 h-2 bg-white/20 rounded-full mb-1" />
                                        <div className="w-8 h-1.5 bg-white/10 rounded-full" />
                                    </div>
                                </div>
                                <div className="h-48 bg-white/5 rounded-2xl border border-white/5 p-6 flex flex-col justify-between">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <ShieldCheck className="w-5 h-5 text-indigo-400" />
                                            <div className="h-2 w-32 bg-white/20 rounded-full" />
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Gavel className="w-5 h-5 text-slate-500" />
                                            <div className="h-2 w-48 bg-white/10 rounded-full" />
                                        </div>
                                    </div>
                                    <div className="flex justify-end">
                                        <div className="h-8 w-24 bg-indigo-600 rounded-lg flex items-center justify-center text-[10px] font-bold">VERIFY_FLOW</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Features Grid */}
                <div className="grid md:grid-cols-3 gap-8 mt-40">
                    {[
                        {
                            icon: Building2,
                            title: "Multitenancy",
                            desc: "Strict logical isolation for every firm. Your data never crosses firm boundaries."
                        },
                        {
                            icon: ShieldCheck,
                            title: "RBAC Controls",
                            desc: "Fine-grained permissions for Admins, Case Managers, and Associate Lawyers."
                        },
                        {
                            icon: Users,
                            title: "Staff Onboarding",
                            desc: "Streamlined invitation and acceptance flow for rapidly scaling teams."
                        }
                    ].map((feature, idx) => (
                        <div key={idx} className="p-8 bg-white/5 border border-white/10 rounded-3xl hover:bg-white/[0.07] transition-all group">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <feature.icon className="w-6 h-6 text-indigo-400" />
                            </div>
                            <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                            <p className="text-sm text-slate-400 leading-relaxed">{feature.desc}</p>
                        </div>
                    ))}
                </div>
            </main>

            {/* Simple Footer */}
            <footer className="relative z-10 border-t border-white/5 py-12">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2 grayscale brightness-50">
                        <Scale className="w-5 h-5 text-indigo-400" />
                        <span className="text-lg font-black italic tracking-tighter">CASEBRIDGE</span>
                    </div>
                    <p className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.2em]">
                        Internal Management Environment © 2026
                    </p>
                </div>
            </footer>
        </div>
    );
}
