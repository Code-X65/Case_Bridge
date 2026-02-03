import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    FileText,
    CheckCircle2,
    ArrowRight,
    Menu,
    X,
    Gavel,
    Scale,
    CreditCard,
    BarChart3,
    MessageSquare,
    Zap,
    Shield as ShieldIcon,
    Lock as LockIcon,
    ChevronRight
} from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

const LandingPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    // Initialize Smooth Scroll and Animations
    useEffect(() => {
        const lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // https://www.desmos.com/calculator/brs54l4x87
            smoothWheel: true,
        });

        // Sync Lenis with GSAP ScrollTrigger
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

        // Hero Animations - Pure Fade-In Only
        const tl = gsap.timeline();
        tl.from('.gsap-hero-text > *', {
            opacity: 0,
            duration: 1,
            stagger: 0.1,
            ease: "power3.out"
        })
            .from('.gsap-hero-visual', {
                opacity: 0,
                duration: 1.2,
                ease: "power3.out"
            }, "-=0.8");

        // Note: On-scroll fade-in animations removed per request.
    }, { scope: containerRef });

    return (
        <div ref={containerRef} className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/30 font-sans">
            {/* Navigation */}
            <nav className="fixed w-full z-50 glass border-b border-white/5 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-20">
                        <div className="flex items-center gap-12">
                            <div className="flex-shrink-0 cursor-pointer flex items-center gap-2" onClick={() => navigate('/')}>
                                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                                    <Scale className="text-white w-5 h-5" />
                                </div>
                                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-200 tracking-tight">
                                    CASE BRIDGE
                                </h1>
                            </div>
                            <div className="hidden lg:block">
                                <div className="flex items-baseline space-x-8">
                                    <NavDropdown title="Services" />
                                    <NavDropdown title="Practice Areas" />
                                    <a href="#resources" className="hover:text-primary transition-colors px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-white">Resources</a>
                                    <a href="#consultation" className="hover:text-primary transition-colors px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-white">Free Consultation</a>
                                </div>
                            </div>
                        </div>
                        <div className="hidden lg:flex items-center space-x-6">
                            <div className="text-sm font-medium text-muted-foreground">
                                800-555-0199
                            </div>
                            <div className="h-4 w-px bg-white/10"></div>
                            {user ? (
                                <button
                                    onClick={() => navigate('/dashboard')}
                                    className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-md text-sm font-bold shadow-lg shadow-blue-900/20 transition-all duration-200 hover:-translate-y-0.5"
                                >
                                    Dashboard
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={() => navigate('/login')}
                                        className="text-sm font-semibold hover:text-white text-muted-foreground transition-colors"
                                    >
                                        Log In
                                    </button>
                                    <button
                                        onClick={() => navigate('/signup')}
                                        className="bg-orange-600 hover:bg-orange-500 text-white px-5 py-2.5 rounded-md text-sm font-bold shadow-lg shadow-orange-900/20 transition-all duration-200 hover:-translate-y-0.5"
                                    >
                                        OPEN CASE
                                    </button>
                                </>
                            )}
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
                            <a href="#features" className="hover:bg-white/5 block px-3 py-2 rounded-md text-base font-medium">Services</a>
                            <a href="#solutions" className="hover:bg-white/5 block px-3 py-2 rounded-md text-base font-medium">Practice Areas</a>
                            <a href="#pricing" className="hover:bg-white/5 block px-3 py-2 rounded-md text-base font-medium">Consultation</a>
                            <div className="mt-4 border-t border-white/10 pt-4 flex flex-col space-y-3 px-3">
                                {user ? (
                                    <button
                                        onClick={() => navigate('/dashboard')}
                                        className="w-full text-center py-3 text-base font-bold bg-blue-600 text-white hover:bg-blue-500 rounded-md shadow-lg"
                                    >
                                        Dashboard
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => navigate('/login')}
                                            className="w-full text-center py-3 text-base font-medium hover:bg-white/5 rounded-md border border-white/10"
                                        >
                                            Log In
                                        </button>
                                        <button
                                            onClick={() => navigate('/signup')}
                                            className="w-full text-center py-3 text-base font-bold bg-orange-600 text-white hover:bg-orange-500 rounded-md shadow-lg"
                                        >
                                            OPEN NEW CASE
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden bg-gradient-to-b from-background via-blue-950/20 to-background">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <div className="max-w-2xl gsap-hero-text">
                            <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight mb-8 leading-[1.15] text-white">
                                Professional Legal <br />
                                <span className="text-blue-400">Representation</span> <br />
                                & Case Management
                            </h1>
                            <ul className="space-y-4 mb-10">
                                <HeroListItem text="Expert attorneys dedicated to resolving your legal matters" />
                                <HeroListItem text="Real-time case tracking and transparent communication" />
                                <HeroListItem text="Secure document handling and easy payment options" />
                            </ul>

                            <div className="flex flex-col sm:flex-row gap-3 max-w-md">
                                <input
                                    type="email"
                                    placeholder="Enter your email address"
                                    className="h-14 bg-white/5 border-white/10 focus:border-blue-500/50 text-white placeholder:text-muted-foreground w-full rounded-md"
                                />
                                <button
                                    onClick={() => navigate('/signup')}
                                    className="h-14 bg-orange-600 hover:bg-orange-500 text-white font-bold px-8 rounded-md whitespace-nowrap shadow-xl shadow-orange-900/20 transition-all hover:scale-105"
                                >
                                    Review My Case
                                </button>
                            </div>
                            <p className="mt-4 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                                Confidential • Free Initial Evaluation • No Obligation
                            </p>
                        </div>

                        <div className="relative lg:h-[600px] w-full flex items-center justify-center perspective-1000 gsap-hero-visual">
                            {/* Dashboard Visual */}
                            <div className="relative w-full aspect-[16/9] transform rotate-y-[5deg] rotate-x-[5deg] hover:rotate-0 transition-all duration-700 perspective-1000 group">
                                <img
                                    src="/assets/hero-dashboard.png"
                                    alt="CaseBridge Dashboard"
                                    className="w-full h-full object-cover rounded-xl shadow-2xl border border-white/10 ring-1 ring-white/5"
                                />
                                {/* Floating Element Overlay */}
                                <div className="absolute bottom-10 -left-10 bg-card/90 backdrop-blur-md border border-white/10 p-4 rounded-lg shadow-xl mb-4 w-64 animate-float z-20">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                                            <CheckCircle2 className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-white">Payment Received</div>
                                            <div className="text-xs text-muted-foreground">$1,250.00 - Johnson Case</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* DUAL PATHWAY SECTION */}
            <section className="py-20 -mt-10 relative z-30 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                        {/* PATH 1: REPORTERS */}
                        <div className="relative group overflow-hidden rounded-[2.5rem] border border-white/5 bg-gradient-to-br from-white/[0.03] to-transparent p-12 transition-all hover:border-blue-500/30 hover:shadow-[0_0_50px_rgba(59,130,246,0.1)]">
                            <div className="relative z-10">
                                <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center text-blue-400 mb-8 border border-blue-600/30 group-hover:scale-110 transition-transform">
                                    <ShieldIcon size={32} />
                                </div>
                                <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-4 leading-none">
                                    Incident <br /> <span className="text-blue-500">Intake Portal</span>
                                </h3>
                                <p className="text-slate-500 font-medium mb-10 max-w-sm">
                                    For individuals and organizations looking to report a new legal matter, submit evidence, or request emergency legal representation.
                                </p>
                                <button
                                    onClick={() => navigate('/signup')}
                                    className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.3em] text-white bg-blue-600 px-8 py-5 rounded-2xl shadow-xl shadow-blue-600/20 hover:bg-blue-500 transition-all scale-100 active:scale-95"
                                >
                                    Report New Case <ArrowRight size={16} />
                                </button>
                            </div>
                            <div className="absolute top-10 right-10 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                                <ShieldIcon size={200} />
                            </div>
                        </div>

                        {/* PATH 2: CLIENTS */}
                        <div className="relative group overflow-hidden rounded-[2.5rem] border border-white/5 bg-gradient-to-br from-white/[0.03] to-transparent p-12 transition-all hover:border-indigo-500/30 hover:shadow-[0_0_50px_rgba(99,102,241,0.1)]">
                            <div className="relative z-10">
                                <div className="w-16 h-16 bg-indigo-600/20 rounded-2xl flex items-center justify-center text-indigo-400 mb-8 border border-indigo-600/30 group-hover:scale-110 transition-transform">
                                    <LockIcon size={32} />
                                </div>
                                <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-4 leading-none">
                                    Secure <br /> <span className="text-indigo-500">Client Login</span>
                                </h3>
                                <p className="text-slate-500 font-medium mb-10 max-w-sm">
                                    Already have an active case? Access your secure vault, message your assigned legal team, and track your case progression in real-time.
                                </p>
                                <button
                                    onClick={() => navigate('/login')}
                                    className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.3em] text-white border border-white/10 bg-white/5 px-8 py-5 rounded-2xl hover:bg-white/10 transition-all scale-100 active:scale-95"
                                >
                                    Access Workspace <ChevronRight size={16} />
                                </button>
                            </div>
                            <div className="absolute top-10 right-10 opacity-[0.03] group-hover:opacity-[0.02] transition-opacity">
                                <LockIcon size={200} />
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* Social Proof Strip */}
            <div className="border-y border-white/5 bg-white/[0.02] gsap-brands">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <p className="text-center text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-8">
                        Recognized Excellence in Legal Practice
                    </p>
                    <div className="flex flex-wrap justify-center items-center gap-12 md:gap-20 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
                        {['Avvo', 'Super Lawyers', 'Martindale-Hubbell', 'Best Lawyers', 'Chambers'].map((brand) => (
                            <div key={brand} className="text-xl font-bold font-serif flex items-center gap-2">
                                <Gavel className="w-6 h-6" /> <span>{brand}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Feature - Blue Section */}
            <section className="py-24 bg-gradient-to-br from-indigo-900 to-blue-900 relative overflow-hidden gsap-main-feature">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
                            Complete Transparency <br /> in Your Legal Journey
                        </h2>
                        <div className="flex flex-wrap justify-center gap-2 max-w-4xl mx-auto bg-white/10 p-1 rounded-full backdrop-blur-sm">
                            {['Case Status', 'Secure Documents', 'Billing & Payments', 'Direct Messaging', 'Court Dates'].map((tab, i) => (
                                <button key={tab} className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all ${i === 1 ? 'bg-white text-blue-900 shadow-lg' : 'text-blue-100 hover:bg-white/10'}`}>
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="relative rounded-xl overflow-hidden glass shadow-2xl border border-white/10 max-w-5xl mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-12">
                            <div className="md:col-span-4 bg-white/5 border-r border-white/10 p-8 flex flex-col justify-center">
                                <div className="space-y-6">
                                    <h3 className="text-2xl font-bold text-white">Always Know Where You Stand</h3>
                                    <p className="text-blue-100 leading-relaxed">
                                        Never wonder about the status of your case. Our secure client portal gives you 24/7 access to case updates, filed documents, and upcoming milestones.
                                    </p>
                                    <button className="text-white font-bold flex items-center gap-2 group">
                                        See How It Works <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                            </div>
                            <div className="md:col-span-8 bg-card/50 p-6">
                                <div className="rounded-lg bg-background border border-white/5 h-[300px] flex items-center justify-center relative overlow-hidden">
                                    <div className="absolute top-4 left-4 right-4 flex gap-4">
                                        <div className="w-1/3 h-24 bg-blue-500/10 rounded border border-blue-500/20 p-4">
                                            <div className="w-8 h-8 rounded bg-blue-500/20 mb-2"></div>
                                            <div className="h-2 w-16 bg-blue-500/20 rounded"></div>
                                        </div>
                                        <div className="w-1/3 h-24 bg-indigo-500/10 rounded border border-indigo-500/20 p-4">
                                            <div className="w-8 h-8 rounded bg-indigo-500/20 mb-2"></div>
                                            <div className="h-2 w-16 bg-indigo-500/20 rounded"></div>
                                        </div>
                                        <div className="w-1/3 h-24 bg-purple-500/10 rounded border border-purple-500/20 p-4">
                                            <div className="w-8 h-8 rounded bg-purple-500/20 mb-2"></div>
                                            <div className="h-2 w-16 bg-purple-500/20 rounded"></div>
                                        </div>
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
                        <StatsCard number="98%" label="Success Rate in Litigation" />
                        <StatsCard number="5,000+" label="Happy Clients Represented" />
                        <StatsCard number="Top Rated" label="For Client Satisfaction & Trust" highlight />
                    </div>
                </div>
            </section>

            {/* Z-Pattern Features */}
            <div className="py-20 space-y-32">
                {/* Feature 1 */}
                <FeatureSection
                    title="Stay connected with"
                    titleHighlight="your legal team"
                    description="Our platform connects you directly with your attorney. Send messages, request meetings, and get answers to your questions without phone tag."
                    imageSide="left"
                    icon={<Zap className="w-6 h-6 text-yellow-400" />}
                    imageSrc="/assets/hero-dashboard.png"
                />

                {/* Feature 2 */}
                <FeatureSection
                    title="Visualize your"
                    titleHighlight="case timeline"
                    description="Understand exactly where your case is in the legal process. From intake to resolution, track every milestone and know what to expect next."
                    imageSide="right"
                    icon={<BarChart3 className="w-6 h-6 text-green-400" />}
                    imageSrc="/assets/feature-pipeline.png"
                />

                {/* Feature 3 */}
                <FeatureSection
                    title="Secure access to"
                    titleHighlight="legal documents"
                    description="Access your important files anytime, anywhere. Securely upload evidence and review contracts, filings, and settlements in our encrypted vault."
                    imageSide="left"
                    icon={<FileText className="w-6 h-6 text-blue-400" />}
                    imageSrc="/assets/feature-document.png"
                />

                {/* Feature 4 */}
                <FeatureSection
                    title="Transparent billing &"
                    titleHighlight="easy payments"
                    description="No surprise fees. View detailed invoices, understand your costs, and make secure payments online with a click of a button."
                    imageSide="right"
                    icon={<CreditCard className="w-6 h-6 text-purple-400" />}
                    imageSrc="/assets/hero-dashboard.png"
                />
            </div>

            {/* Footer / CTA 2 */}
            <section className="py-24 bg-card border-t border-white/5 gsap-footer-cta">
                <div className="max-w-4xl mx-auto text-center px-4">
                    <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-8 text-blue-400">
                        <MessageSquare className="w-8 h-8" />
                    </div>
                    <h2 className="text-3xl md:text-5xl font-bold mb-8 text-white">Resolve your legal matters with confidence</h2>
                    <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
                        Join the thousands of clients who found justice and peace of mind with CaseBridge.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <button
                            onClick={() => navigate('/signup')}
                            className="btn bg-orange-600 hover:bg-orange-500 text-white font-bold h-14 px-10 rounded-full shadow-lg"
                        >
                            Start Your Free Case Evaluation
                        </button>
                        <button
                            onClick={() => navigate('/demo')}
                            className="btn glass hover:bg-white/10 h-14 px-10 rounded-full text-white font-semibold"
                        >
                            Schedule a Demo
                        </button>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-black py-16 border-t border-white/10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10 mb-12 text-sm">
                        <div className="col-span-2 lg:col-span-1">
                            <div className="flex items-center gap-2 mb-6">
                                <Scale className="text-blue-500 w-6 h-6" />
                                <span className="text-xl font-bold text-white">CASE BRIDGE</span>
                            </div>
                            <p className="text-muted-foreground mb-6 max-w-xs">
                                The all-in-one legal case management software built for modern law firms.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-bold text-white mb-6">Services</h4>
                            <ul className="space-y-4 text-muted-foreground">
                                <li><a href="#" className="hover:text-blue-400">Practice Areas</a></li>
                                <li><a href="#" className="hover:text-blue-400">Our Attorneys</a></li>
                                <li><a href="#" className="hover:text-blue-400">Case Results</a></li>
                                <li><a href="#" className="hover:text-blue-400">Free Consultation</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold text-white mb-6">Clients</h4>
                            <ul className="space-y-4 text-muted-foreground">
                                <li><a href="#" className="hover:text-blue-400">Client Portal</a></li>
                                <li><a href="#" className="hover:text-blue-400">Make a Payment</a></li>
                                <li><a href="#" className="hover:text-blue-400">FAQ</a></li>
                                <li><a href="#" className="hover:text-blue-400">Legal Resources</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold text-white mb-6">Firm</h4>
                            <ul className="space-y-4 text-muted-foreground">
                                <li><a href="#" className="hover:text-blue-400">About Us</a></li>
                                <li><a href="#" className="hover:text-blue-400">Careers</a></li>
                                <li><a href="#" className="hover:text-blue-400">Contact</a></li>
                                <li><a href="#" className="hover:text-blue-400">Partners</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold text-white mb-6">Contact</h4>
                            <ul className="space-y-4 text-muted-foreground">
                                <li><a href="#" className="hover:text-blue-400">Find Office</a></li>
                                <li><a href="#" className="hover:text-blue-400">Email Us</a></li>
                                <li><a href="#" className="hover:text-blue-400">Call Now</a></li>
                                <li><a href="#" className="hover:text-blue-400">Emergency Support</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-muted-foreground">
                        <p>&copy; {new Date().getFullYear()} CaseBridge Inc. All rights reserved.</p>
                        <div className="flex gap-6 mt-4 md:mt-0">
                            <a href="#" className="hover:text-white">Privacy Policy</a>
                            <a href="#" className="hover:text-white">Terms of Service</a>
                            <a href="#" className="hover:text-white">Cookie Policy</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

// Helper Components

const NavDropdown = ({ title }: { title: string }) => (
    <div className="group relative">
        <button className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-white transition-colors py-2">
            {title} <span className="text-[10px]">▼</span>
        </button>
        <div className="absolute top-full left-0 w-48 pt-2 hidden group-hover:block transition-all">
            <div className="glass bg-background border border-white/10 rounded-lg shadow-xl py-2 flex flex-col">
                <a href="#" className="px-4 py-2 text-sm text-foreground hover:bg-white/5 hover:text-blue-400">Option 1</a>
                <a href="#" className="px-4 py-2 text-sm text-foreground hover:bg-white/5 hover:text-blue-400">Option 2</a>
                <a href="#" className="px-4 py-2 text-sm text-foreground hover:bg-white/5 hover:text-blue-400">Option 3</a>
            </div>
        </div>
    </div>
);

const HeroListItem = ({ text }: { text: string }) => (
    <li className="flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <span className="text-lg text-blue-100/90">{text}</span>
    </li>
);

const StatsCard = ({ number, label, highlight }: { number: string, label: string, highlight?: boolean }) => (
    <div className={`glass-card p-10 rounded-xl border relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300 ${highlight ? 'border-blue-500/30 bg-blue-900/10' : 'border-white/10'}`}>
        {highlight && <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/20 rounded-bl-full -mr-10 -mt-10"></div>}
        <div className={`text-5xl font-extrabold mb-4 ${highlight ? 'text-blue-400' : 'text-white'}`}>
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
                    <span className="text-sm font-bold text-blue-400 uppercase tracking-widest">Feature Highlight</span>
                </div>
                <h3 className="text-3xl md:text-5xl font-bold text-white leading-tight">
                    {title} <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">
                        {titleHighlight}
                    </span>
                </h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                    {description}
                </p>
                <button className="btn btn-secondary w-auto gap-2 group mt-4">
                    Learn More <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
            </div>
            <div className="flex-1 w-full gsap-feature-visual">
                {/* Feature Visual */}
                <div className="relative aspect-video rounded-xl bg-gradient-to-br from-card to-background border border-white/10 shadow-2xl overflow-hidden group hover:border-blue-500/30 transition-colors">
                    {imageSrc ? (
                        <div className="w-full h-full relative overflow-hidden">
                            <div className="absolute inset-0 bg-blue-900/10 mix-blend-overlay z-10"></div>
                            <img src={imageSrc} alt={title} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" />
                        </div>
                    ) : (
                        <>
                            <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors rounded-xl"></div>
                            {/* Internal Mockup Elements */}
                            <div className="h-full flex flex-col gap-4 relative z-10 p-6">
                                <div className="h-8 w-1/3 bg-white/5 rounded"></div>
                                <div className="flex-1 bg-white/5 rounded border border-white/5 flex items-center justify-center">
                                    <div className="text-white/20 font-mono text-sm">UI Visual Placeholder</div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    </section>
);

export default LandingPage;
