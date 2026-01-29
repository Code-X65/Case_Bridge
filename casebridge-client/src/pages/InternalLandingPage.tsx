import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    CheckCircle2,
    ArrowRight,
    Menu,
    X,
    Scale,
    CreditCard,
    BarChart3,
    Users,
    Shield,
    Workflow
} from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

const InternalLandingPage = () => {
    const navigate = useNavigate();
    const { } = useAuth(); // Note: This might need to check for internal user specific context in future
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    // Initialize Smooth Scroll and Animations
    useEffect(() => {
        const lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true,
        });

        lenis.on('scroll', ScrollTrigger.update);

        gsap.ticker.add((time) => {
            lenis.raf(time * 1000);
        });

        gsap.ticker.lagSmoothing(0);

        return () => {
            lenis.destroy();
            gsap.ticker.remove(lenis.raf);
        };
    }, []);

    useGSAP(() => {
        if (!containerRef.current) return;

        // Hero Animations
        const tl = gsap.timeline();
        tl.from('.gsap-hero-text > *', {
            y: 50,
            opacity: 0,
            duration: 1,
            stagger: 0.1,
            ease: "power3.out"
        })
            .from('.gsap-hero-visual', {
                x: 50,
                opacity: 0,
                duration: 1.2,
                ease: "power3.out"
            }, "-=0.8");

        // Stats Animation
        gsap.from('.gsap-stats > div', {
            scrollTrigger: {
                trigger: '.gsap-stats',
                start: "top 80%",
            },
            y: 50,
            opacity: 0,
            duration: 0.8,
            stagger: 0.2,
            ease: "power2.out"
        });

        // Feature Sections Slide-In
        const sections = gsap.utils.toArray('.gsap-feature-section');
        sections.forEach((section: any, i) => {
            const isLeft = i % 2 === 0;
            gsap.from(section.querySelectorAll('.gsap-feature-content, .gsap-feature-visual'), {
                scrollTrigger: {
                    trigger: section,
                    start: "top 75%",
                },
                x: isLeft ? -50 : 50,
                opacity: 0,
                duration: 1,
                stagger: 0.2,
                ease: "power3.out",
                clearProps: "all"
            });
        });

        // Main Feature (Blue Section)
        gsap.from('.gsap-main-feature', {
            scrollTrigger: {
                trigger: '.gsap-main-feature',
                start: "top 70%",
            },
            y: 60,
            opacity: 0,
            duration: 1,
            ease: "power3.out"
        });

        // Social Proof
        gsap.from('.gsap-brands', {
            scrollTrigger: {
                trigger: '.gsap-brands',
                start: "top 90%",
            },
            y: 20,
            opacity: 0,
            duration: 1,
            ease: "power2.out"
        });

        // Footer CTA
        gsap.from('.gsap-footer-cta', {
            scrollTrigger: {
                trigger: '.gsap-footer-cta',
                start: "top 80%",
            },
            scale: 0.95,
            opacity: 0,
            duration: 0.8,
            ease: "back.out(1.7)"
        });

    }, { scope: containerRef });

    return (
        <div ref={containerRef} className="min-h-screen bg-[#0a0f1c] text-foreground overflow-x-hidden selection:bg-indigo-500/30 font-sans">
            {/* Navigation */}
            <nav className="fixed w-full z-50 glass border-b border-white/5 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-20">
                        <div className="flex items-center gap-12">
                            <div className="flex-shrink-0 cursor-pointer flex items-center gap-2" onClick={() => navigate('/')}>
                                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                                    <Scale className="text-white w-5 h-5" />
                                </div>
                                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-200 tracking-tight">
                                    CASE BRIDGE <span className="text-xs ml-1 font-mono text-white/50 border border-white/10 px-1 rounded bg-white/5">FIRM</span>
                                </h1>
                            </div>
                            <div className="hidden lg:block">
                                <div className="flex items-baseline space-x-8">
                                    <a href="#features" className="hover:text-primary transition-colors px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-white">Features</a>
                                    <a href="#solutions" className="hover:text-primary transition-colors px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-white">Solutions</a>
                                    <a href="#pricing" className="hover:text-primary transition-colors px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-white">Pricing</a>
                                    <a href="#enterprise" className="hover:text-primary transition-colors px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-white">Enterprise</a>
                                </div>
                            </div>
                        </div>
                        <div className="hidden lg:flex items-center space-x-6">
                            <button
                                onClick={() => window.location.href = '#sales'}
                                className="text-sm font-semibold hover:text-white text-muted-foreground transition-colors"
                            >
                                Contact Sales
                            </button>
                            <div className="h-4 w-px bg-white/10"></div>
                            <button
                                onClick={() => navigate('/login')}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-md text-sm font-bold shadow-lg shadow-indigo-900/20 transition-all duration-200 hover:-translate-y-0.5"
                            >
                                Partner Login
                            </button>
                        </div>
                        <div className="-mr-2 flex lg:hidden">
                            <button
                                onClick={toggleMenu}
                                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-white/10 focus:outline-none"
                            >
                                <span className="sr-only">Open main menu</span>
                                {isMenuOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile menu */}
                {isMenuOpen && (
                    <div className="lg:hidden glass border-b border-white/5 absolute w-full">
                        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                            <a href="#features" className="hover:bg-white/5 block px-3 py-2 rounded-md text-base font-medium">Features</a>
                            <a href="#solutions" className="hover:bg-white/5 block px-3 py-2 rounded-md text-base font-medium">Solutions</a>
                            <a href="#pricing" className="hover:bg-white/5 block px-3 py-2 rounded-md text-base font-medium">Pricing</a>
                            <div className="mt-4 border-t border-white/10 pt-4 flex flex-col space-y-3 px-3">
                                <button
                                    onClick={() => navigate('/login')}
                                    className="w-full text-center py-3 text-base font-bold bg-indigo-600 text-white hover:bg-indigo-500 rounded-md shadow-lg"
                                >
                                    Partner Login
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden bg-gradient-to-b from-[#0a0f1c] via-indigo-950/20 to-[#0a0f1c]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <div className="max-w-2xl gsap-hero-text">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-6">
                                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
                                New: AI Document Analysis
                            </div>
                            <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight mb-8 leading-[1.15] text-white">
                                The Operating System for <br />
                                <span className="text-indigo-400">Modern Law Firms</span>
                            </h1>
                            <p className="text-lg text-muted-foreground mb-10 leading-relaxed max-w-lg">
                                Streamline intake, automate complex workflows, and manage billing in one secure, compliance-ready platform designed for growth.
                            </p>

                            <ul className="space-y-4 mb-10">
                                <HeroListItem text="Centralized case & document management" />
                                <HeroListItem text="Automated client intake & onboarding" />
                                <HeroListItem text="Integrated trust accounting & billing" />
                            </ul>

                            <div className="flex flex-col sm:flex-row gap-3 max-w-md">
                                <button
                                    onClick={() => navigate('/signup')}
                                    className="h-14 bg-white text-indigo-950 hover:bg-indigo-50 font-bold px-8 rounded-md whitespace-nowrap shadow-xl shadow-white/5 transition-all hover:scale-105"
                                >
                                    Start Free Trial
                                </button>
                                <button
                                    onClick={() => window.location.href = '#demo'}
                                    className="h-14 bg-indigo-600/10 border border-indigo-500/20 hover:bg-indigo-600/20 text-white font-bold px-8 rounded-md whitespace-nowrap transition-all"
                                >
                                    Request Demo
                                </button>
                            </div>
                            <p className="mt-6 text-xs text-muted-foreground flex items-center gap-2">
                                <Shield className="w-4 h-4 text-green-400" /> SOC2 Compliant • Bank-Level Security • 99.9% Uptime
                            </p>
                        </div>

                        <div className="relative lg:h-[600px] w-full flex items-center justify-center perspective-1000 gsap-hero-visual">
                            {/* Dashboard Visual */}
                            <div className="relative w-full aspect-[16/9] transform rotate-y-[-5deg] rotate-x-[5deg] hover:rotate-0 transition-all duration-700 perspective-1000 group">
                                <img
                                    src="/assets/hero-dashboard.png"
                                    alt="CaseBridge Internal Dashboard"
                                    className="w-full h-full object-cover rounded-xl shadow-2xl border border-white/10 ring-1 ring-white/5"
                                />
                                {/* Floating Element Overlay */}
                                <div className="absolute top-10 -right-10 bg-card/90 backdrop-blur-md border border-white/10 p-4 rounded-lg shadow-xl mb-4 w-72 animate-float z-20">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                            <span className="text-xs font-bold text-white uppercase tracking-wider">Firm Revenue</span>
                                            <span className="text-xs text-green-400 font-mono">+12.5%</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-24 bg-green-500/10 rounded flex items-end p-1 gap-1">
                                                <div className="w-1/3 h-1/2 bg-green-500/40 rounded-sm"></div>
                                                <div className="w-1/3 h-3/4 bg-green-500/40 rounded-sm"></div>
                                                <div className="w-1/3 h-full bg-green-500 rounded-sm"></div>
                                            </div>
                                            <div>
                                                <div className="text-lg font-bold text-white">$42,500</div>
                                                <div className="text-[10px] text-muted-foreground">This Week</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Social Proof Strip */}
            <div className="border-y border-white/5 bg-white/[0.02] gsap-brands">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <p className="text-center text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-8">
                        Trusted by High-Growth Firms
                    </p>
                    <div className="flex flex-wrap justify-center items-center gap-12 md:gap-20 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
                        {/* Placeholder for Firm Logos */}
                        <div className="text-xl font-bold font-serif text-white/50">LATHAM & WATKINS</div>
                        <div className="text-xl font-bold font-serif text-white/50">KIRKLAND & ELLIS</div>
                        <div className="text-xl font-bold font-serif text-white/50">DLA PIPER</div>
                        <div className="text-xl font-bold font-serif text-white/50">BAKER MCKENZIE</div>
                    </div>
                </div>
            </div>

            {/* Main Feature - Dark Purple Section */}
            <section className="py-24 bg-gradient-to-br from-[#0f0a1c] to-[#120f2e] relative overflow-hidden gsap-main-feature">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5"></div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
                            Unified Practice Management
                        </h2>
                        <div className="flex flex-wrap justify-center gap-2 max-w-4xl mx-auto bg-white/5 p-1 rounded-full backdrop-blur-sm">
                            {['Intake & CRN', 'Case Management', 'Billing & Trust', 'Document Assembly', 'Analytics'].map((tab, i) => (
                                <button key={tab} className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all ${i === 1 ? 'bg-indigo-600 text-white shadow-lg' : 'text-indigo-200 hover:bg-white/5'}`}>
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="relative rounded-xl overflow-hidden glass shadow-2xl border border-white/10 max-w-5xl mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-12">
                            <div className="md:col-span-5 bg-[#0a0f1c]/90 border-r border-white/10 p-10 flex flex-col justify-center">
                                <div className="space-y-8">
                                    <div>
                                        <div className="w-12 h-12 rounded-lg bg-indigo-500/20 flex items-center justify-center mb-4 text-indigo-400">
                                            <Workflow className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-white mb-3">Workflow Automation</h3>
                                        <p className="text-muted-foreground leading-relaxed">
                                            Eliminate manual data entry. configure triggers to automatically send emails, assign tasks, and generate documents based on case stage changes.
                                        </p>
                                    </div>
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center gap-3 text-sm text-indigo-200">
                                            <CheckCircle2 className="w-4 h-4 text-green-400" /> Auto-follow up sequences
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-indigo-200">
                                            <CheckCircle2 className="w-4 h-4 text-green-400" /> Deadline calculation
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-indigo-200">
                                            <CheckCircle2 className="w-4 h-4 text-green-400" /> Client intake syncing
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="md:col-span-7 bg-[#1e2030]/50 p-8 flex items-center justify-center">
                                {/* Abstract UI Representation of a Workflow */}
                                <div className="space-y-4 w-full max-w-md">
                                    <div className="flex items-center justify-between p-4 rounded bg-[#0a0f1c] border border-white/10">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                            <span className="text-sm font-mono text-white">New Lead Received</span>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                    <div className="flex justify-center"><div className="h-6 w-px bg-white/10"></div></div>
                                    <div className="flex items-center justify-between p-4 rounded bg-[#0a0f1c] border border-white/10">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                            <span className="text-sm font-mono text-white">Create Contact & Matter</span>
                                        </div>
                                        <div className="px-2 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-400">AUTO</div>
                                    </div>
                                    <div className="flex justify-center"><div className="h-6 w-px bg-white/10"></div></div>
                                    <div className="flex items-center justify-between p-4 rounded bg-[#0a0f1c] border border-white/10">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                            <span className="text-sm font-mono text-white">Send Welcome Email</span>
                                        </div>
                                        <div className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-400">SENT</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Cards Section */}
            <section className="-mt-16 pb-20 relative z-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 gsap-stats">
                        <StatsCard number="30%" label="Increase in Billable Hours" />
                        <StatsCard number="15hrs" label="Saved per week per attorney" />
                        <StatsCard number="100%" label="Compliance & Audit Trail" highlight />
                    </div>
                </div>
            </section>

            {/* Z-Pattern Features */}
            <div className="py-20 space-y-32">
                {/* Feature 1 */}
                <FeatureSection
                    title="Collaborative"
                    titleHighlight="Staff Management"
                    description="Assign roles, track performance, and manage workloads across your entire firm. Ensure everyone is aligned and productive."
                    imageSide="left"
                    icon={<Users className="w-6 h-6 text-yellow-400" />}
                    imageSrc="/assets/hero-dashboard.png"
                />

                {/* Feature 2 */}
                <FeatureSection
                    title="Financial"
                    titleHighlight="Health & Billing"
                    description="Integrated trust accounting, LEDES billing, and automated invoicing. Get paid faster and stay compliant with trust account rules."
                    imageSide="right"
                    icon={<CreditCard className="w-6 h-6 text-green-400" />}
                    imageSrc="/assets/hero-dashboard.png"
                />

                {/* Feature 3 */}
                <FeatureSection
                    title="Secure"
                    titleHighlight="Client Portal"
                    description="Reduce phone tag by 80%. Provide clients with a secure portal to upload documents, view status, and pay invoices."
                    imageSide="left"
                    icon={<Shield className="w-6 h-6 text-blue-400" />}
                    imageSrc="/assets/feature-document.png"
                />

                {/* Feature 4 */}
                <FeatureSection
                    title="Actionable"
                    titleHighlight="Firm Analytics"
                    description="Make data-driven decisions. Visualize revenue trends, case aging, and staff utilization in real-time dashboards."
                    imageSide="right"
                    icon={<BarChart3 className="w-6 h-6 text-purple-400" />}
                    imageSrc="/assets/feature-pipeline.png"
                />
            </div>

            {/* Footer / CTA 2 */}
            <section className="py-24 bg-[#0f0a1c] border-t border-white/5 gsap-footer-cta">
                <div className="max-w-4xl mx-auto text-center px-4">
                    <div className="w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-8 text-indigo-400">
                        <Scale className="w-8 h-8" />
                    </div>
                    <h2 className="text-3xl md:text-5xl font-bold mb-8 text-white">Ready to modernize your firm?</h2>
                    <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
                        Join the fastest-growing law firms running on CaseBridge.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <button
                            onClick={() => navigate('/signup')} // Ideally triggers a partner signup flow
                            className="btn bg-white hover:bg-gray-100 text-indigo-950 font-bold h-14 px-10 rounded-full shadow-lg"
                        >
                            Get Started
                        </button>
                        <button
                            className="btn border border-white/10 hover:bg-white/5 text-white h-14 px-10 rounded-full font-semibold"
                        >
                            Contact Sales
                        </button>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-black py-16 border-t border-white/10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-muted-foreground">
                        <p>&copy; {new Date().getFullYear()} CaseBridge Inc. All rights reserved.</p>
                        <div className="flex gap-6 mt-4 md:mt-0">
                            <span className="text-indigo-500 font-medium">Internal System Status: Operational</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

// Helper Components
// (Reusing same components but defining them here to keep file self-contained for now, or could export/import if refactoring)

const HeroListItem = ({ text }: { text: string }) => (
    <li className="flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
        <span className="text-lg text-indigo-100/90">{text}</span>
    </li>
);

const StatsCard = ({ number, label, highlight }: { number: string, label: string, highlight?: boolean }) => (
    <div className={`glass-card p-10 rounded-xl border relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300 ${highlight ? 'border-indigo-500/30 bg-indigo-900/10' : 'border-white/10'}`}>
        {highlight && <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/20 rounded-bl-full -mr-10 -mt-10"></div>}
        <div className={`text-5xl font-extrabold mb-4 ${highlight ? 'text-indigo-400' : 'text-white'}`}>
            {number}
        </div>
        <div className="text-lg text-muted-foreground font-medium">
            {label}
        </div>
    </div>
);

const FeatureSection = ({
    title,
    titleHighlight,
    description,
    imageSide,
    icon,
    imageSrc
}: {
    title: string,
    titleHighlight: string,
    description: string,
    imageSide: 'left' | 'right',
    icon?: React.ReactNode,
    imageSrc?: string
}) => (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 gsap-feature-section">
        <div className={`flex flex-col lg:flex-row gap-16 items-center ${imageSide === 'right' ? '' : 'lg:flex-row-reverse'}`}>
            <div className="flex-1 space-y-6 gsap-feature-content">
                <div className="flex items-center gap-3 mb-2">
                    {icon && <div className="p-3 bg-white/5 rounded-lg border border-white/10">{icon}</div>}
                    <span className="text-sm font-bold text-indigo-400 uppercase tracking-widest">Platform Feature</span>
                </div>
                <h3 className="text-3xl md:text-5xl font-bold text-white leading-tight">
                    {title} <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">
                        {titleHighlight}
                    </span>
                </h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                    {description}
                </p>
                <button className="btn btn-secondary w-auto gap-2 group mt-4">
                    Explore Solutions <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
            </div>
            <div className="flex-1 w-full gsap-feature-visual">
                {/* Feature Visual */}
                <div className="relative aspect-video rounded-xl bg-gradient-to-br from-[#0a0f1c] to-[#120f2e] border border-white/10 shadow-2xl overflow-hidden group hover:border-indigo-500/30 transition-colors">
                    {imageSrc ? (
                        <div className="w-full h-full relative overflow-hidden">
                            <div className="absolute inset-0 bg-indigo-900/10 mix-blend-overlay z-10"></div>
                            <img src={imageSrc} alt={title} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" />
                        </div>
                    ) : (
                        <div className="absolute inset-0 bg-indigo-500/5 group-hover:bg-indigo-500/10 transition-colors rounded-xl"></div>
                    )}
                </div>
            </div>
        </div>
    </section>
);

export default InternalLandingPage;
