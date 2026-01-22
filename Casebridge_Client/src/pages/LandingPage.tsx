import { ArrowRight, CheckCircle2, Shield, Scale, Clock, MessageSquare, ChevronRight, LogIn } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useState, useEffect, useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import HeroScene from "@/components/landing/HeroScene";
import heroBg from "@/assets/hero-bg.png";
import legalReview from "@/assets/legal-review.png";
import trackingBg from "@/assets/tracking-bg.png";

gsap.registerPlugin(ScrollTrigger);

export default function LandingPage() {
    const [scrolled, setScrolled] = useState(false);

    // Refs for animation targets
    const heroRef = useRef<HTMLDivElement>(null);
    const valueRef = useRef<HTMLDivElement>(null);
    const stepsRef = useRef<HTMLDivElement>(null);
    const trackingRef = useRef<HTMLDivElement>(null);
    const ctaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    useLayoutEffect(() => {
        const ctx = gsap.context(() => {
            // Hero Animation: Entrance
            const tl = gsap.timeline();
            tl.from(".hero-text > *", {
                y: 50,
                opacity: 0,
                duration: 1,
                stagger: 0.1,
                ease: "power2.out",
                delay: 0.2
            });

            gsap.to(".hero-bg-img", {
                scrollTrigger: {
                    trigger: heroRef.current,
                    start: "top top",
                    end: "bottom top",
                    scrub: 0.5
                },
                y: 100,
                scale: 1.2
            });

            // Value Strip Animation: Toggle Actions (Enter/Leave)
            gsap.from(".value-item", {
                scrollTrigger: {
                    trigger: valueRef.current,
                    start: "top 80%",
                    toggleActions: "play none none reverse"
                },
                y: 30,
                opacity: 0,
                duration: 0.8,
                stagger: 0.2,
                ease: "power2.out"
            });

            // How It Works Animation: Staggered Entrance
            gsap.from(".step-card", {
                scrollTrigger: {
                    trigger: stepsRef.current,
                    start: "top 75%",
                    toggleActions: "play none none reverse"
                },
                y: 50,
                opacity: 0,
                duration: 0.8,
                stagger: 0.15,
                ease: "power2.out"
            });

            // Tracking Section: Visuals slide up with scrub
            gsap.from(".tracking-visual", {
                scrollTrigger: {
                    trigger: trackingRef.current,
                    start: "top 80%",
                    end: "center center",
                    scrub: 1
                },
                scale: 0.9,
                opacity: 0.5
            });

            // Final CTA Animation
            gsap.from(".cta-content > *", {
                scrollTrigger: {
                    trigger: ctaRef.current,
                    start: "top 80%",
                    toggleActions: "play none none reverse"
                },
                y: 30,
                opacity: 0,
                duration: 0.8,
                stagger: 0.1,
                ease: "back.out(1.7)"
            });

        });

        return () => ctx.revert();
    }, []);

    return (
        <div className="min-h-screen bg-slate-950 font-sans text-slate-100 selection:bg-blue-900 selection:text-white overflow-x-hidden">
            {/* Top Navigation */}
            <nav className={cn(
                "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
                scrolled ? "bg-slate-950/90 backdrop-blur-md shadow-lg py-4 border-b border-slate-800" : "bg-transparent py-6"
            )}>
                <div className="container px-4 mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-md bg-white flex items-center justify-center text-slate-950">
                            <Scale className="h-5 w-5" />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-white">CaseBridge</span>
                    </div>

                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
                        <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
                        <a href="#tracking" className="hover:text-white transition-colors">Track Case</a>
                        <Link to="/support" className="hover:text-white transition-colors">Support</Link>
                    </div>

                    <div className="flex items-center gap-4">
                        <Link to="/login" className="text-sm font-semibold text-slate-300 hover:text-white transition-colors">
                            Log in
                        </Link>
                        <Link to="/signup" className="hidden sm:flex px-6 py-2.5 rounded-full text-sm font-semibold transition-all shadow-sm bg-white text-slate-950 hover:bg-slate-100 items-center gap-2">
                            Start for free <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Immersive Hero Section */}
            <section ref={heroRef} className="relative h-screen flex items-center overflow-hidden">
                {/* Background Image */}
                <div className="absolute inset-0 z-0 overflow-hidden">
                    <img
                        src={heroBg}
                        alt="Modern Law Office"
                        className="w-full h-full object-cover scale-110 opacity-40 hero-bg-img"
                    />
                </div>

                {/* 3D Scene Background */}
                <div className="absolute inset-0 z-10 opacity-30">
                    <HeroScene />
                </div>

                {/* Overlays */}
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/40 to-transparent z-20"></div>
                <div className="absolute inset-0 bg-slate-950/20 z-20"></div>

                <div className="container px-4 mx-auto relative z-30 pt-20">
                    <div className="max-w-4xl space-y-8 hero-text transform-gpu">
                        <h1 className="text-6xl md:text-7xl lg:text-9xl font-bold tracking-tight text-white leading-[0.9]">
                            BE THE NEXT <br />
                            <span className="text-slate-500">CATEGORY</span> <br />
                            CREATOR
                        </h1>
                        <p className="text-xl md:text-2xl text-slate-400 max-w-2xl leading-relaxed font-light">
                            Dream big, build fast, and manage your legal matters with a platform that works as hard as you do.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 pt-8">
                            <Link to="/signup" className="bg-white text-slate-950 px-8 py-4 rounded-full text-lg font-bold hover:bg-slate-200 transition-all hover:scale-105 shadow-[0_0_30px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2 min-w-[200px] uppercase tracking-wider">
                                Start for free
                            </Link>
                            <Link to="#how-it-works" className="bg-transparent border border-white/20 text-white px-8 py-4 rounded-full text-lg font-bold hover:bg-white/5 transition-all flex items-center justify-center gap-2 min-w-[200px] backdrop-blur-sm uppercase tracking-wider">
                                See how it works
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Value Strip */}
            <section ref={valueRef} className="border-y border-slate-900 bg-slate-950 py-24">
                <div className="container px-4 mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
                        <div className="value-item group">
                            <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-blue-400 transition-colors">SECURE & <br /> CONFIDENTIAL</h3>
                            <p className="text-slate-500 leading-relaxed">Enterprise-grade encryption for every case file and communication. Your privacy is non-negotiable.</p>
                        </div>
                        <div className="value-item group">
                            <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-blue-400 transition-colors">PROFESSIONAL <br /> LEGAL REVIEW</h3>
                            <p className="text-slate-500 leading-relaxed">Qualified legal minds behind every document update and case status change.</p>
                        </div>
                        <div className="value-item group">
                            <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-blue-400 transition-colors">TRANSPARENT <br /> TRACKING</h3>
                            <p className="text-slate-500 leading-relaxed">No black boxes. Real-time updates on assignments, hearings, and progress.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works - High Impact Imagery */}
            <section id="how-it-works" ref={stepsRef} className="py-32 bg-slate-950 overflow-hidden">
                <div className="container px-4 mx-auto">
                    <div className="flex flex-col lg:flex-row items-center gap-24">
                        <div className="lg:w-1/2 space-y-12">
                            <div className="space-y-4">
                                <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight uppercase">THE PROCESS</h2>
                                <p className="text-slate-400 text-lg leading-relaxed">Complexity simplified. We've distilled the legal journey into four clear phases, backed by industry-leading professionals.</p>
                            </div>

                            <div className="space-y-8">
                                {[
                                    { step: "01", title: "Intake", desc: "Securely submit your case details via our encrypted gateway." },
                                    { step: "02", title: "Analysis", desc: "Expert review of your documentation and legal requirements." },
                                    { step: "03", title: "Strategic Execution", desc: "Assignment to a specialized legal team and active management." },
                                    { step: "04", title: "Resolution", desc: "Finalization and hand-off with complete documentation." }
                                ].map((item, idx) => (
                                    <div key={idx} className="step-card flex gap-6 group">
                                        <span className="text-3xl font-bold text-slate-800 group-hover:text-white transition-colors">{item.step}</span>
                                        <div>
                                            <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                                            <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="lg:w-1/2 relative">
                            <div className="aspect-square rounded-2xl overflow-hidden border border-slate-800 shadow-[0_0_100px_rgba(0,0,0,0.5)]">
                                <img src={legalReview} alt="Expert Review" className="w-full h-full object-cover opacity-80" />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>
                            </div>
                            {/* Floating Stats */}
                            <div className="absolute -bottom-10 -left-10 bg-slate-900 border border-slate-800 p-8 rounded-xl shadow-2xl backdrop-blur-xl">
                                <p className="text-5xl font-bold text-white mb-2">98%</p>
                                <p className="text-slate-500 text-xs uppercase tracking-widest font-bold">CLIENT SATISFACTION</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Tracking Preview - More Image Impact */}
            <section id="tracking" ref={trackingRef} className="py-32 bg-slate-950 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1/2 h-full bg-blue-600/5 blur-[120px] rounded-full"></div>

                <div className="container px-4 mx-auto">
                    <div className="flex flex-col lg:flex-row items-center gap-24">
                        <div className="lg:w-1/2 order-2 lg:order-1 tracking-visual">
                            <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
                                <img src={trackingBg} alt="Real-time Tracking" className="w-full h-full object-cover opacity-90" />
                                <div className="absolute inset-0 bg-gradient-to-r from-slate-950/40 to-transparent"></div>
                            </div>
                        </div>

                        <div className="lg:w-1/2 order-1 lg:order-2 space-y-8">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-400 text-xs font-bold uppercase tracking-widest">
                                <Clock className="h-3.5 w-3.5" />
                                Live Status Updates
                            </div>
                            <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight uppercase">ABSOLUTE <br /> CLARITY</h2>
                            <p className="text-xl text-slate-400 leading-relaxed font-light">
                                Uncertainty is the enemy of success. We provide a live, high-fidelity window into your case progression, accessible from any device, anywhere in the world.
                            </p>
                            <div className="grid grid-cols-2 gap-8 pt-4">
                                <div className="space-y-2">
                                    <div className="h-1 w-12 bg-blue-500"></div>
                                    <p className="text-white font-bold">MILITARY-GRADE</p>
                                    <p className="text-slate-500 text-sm">Security for all communications</p>
                                </div>
                                <div className="space-y-2">
                                    <div className="h-1 w-12 bg-white/20"></div>
                                    <p className="text-white font-bold">REAL-TIME</p>
                                    <p className="text-slate-500 text-sm">Document & deadline tracking</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section ref={ctaRef} className="py-48 bg-slate-950 text-center relative overflow-hidden">
                {/* Background Text Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none select-none">
                    <span className="text-[20vw] font-black uppercase leading-none tracking-tighter">CASEBRIDGE</span>
                </div>

                <div className="container px-4 mx-auto relative z-10">
                    <div className="max-w-4xl mx-auto space-y-12 cta-content">
                        <h2 className="text-5xl md:text-8xl font-black tracking-tighter text-white uppercase leading-none">
                            Ready to <br />
                            start your <br />
                            journey?
                        </h2>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-12">
                            <Link to="/signup" className="w-full sm:w-auto bg-white text-slate-950 px-12 py-5 rounded-full text-xl font-bold hover:bg-slate-200 transition-all hover:scale-105 shadow-[0_0_50px_rgba(255,255,255,0.15)] uppercase tracking-widest">
                                Launch My Case
                            </Link>
                            <Link to="/login" className="w-full sm:w-auto bg-transparent border border-white/20 text-white px-12 py-5 rounded-full text-xl font-bold hover:bg-white/5 transition-all flex items-center justify-center gap-2 uppercase tracking-widest">
                                Client Login
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-slate-950 py-20 border-t border-slate-900">
                <div className="container px-4 mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-16 mb-16">
                        <div className="col-span-1 md:col-span-2 space-y-6">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-md bg-white flex items-center justify-center text-slate-950">
                                    <Scale className="h-5 w-5" />
                                </div>
                                <span className="text-xl font-bold text-white tracking-tight">CaseBridge</span>
                            </div>
                            <p className="text-slate-500 max-w-sm leading-relaxed">The future of legal case management. Technology built on a foundation of trust and professional integrity.</p>
                        </div>
                        <div className="space-y-4">
                            <h4 className="text-white font-bold uppercase tracking-widest text-xs">Platform</h4>
                            <ul className="space-y-2 text-slate-500 text-sm">
                                <li><a href="#" className="hover:text-white transition-colors">How it works</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Case Tracking</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
                            </ul>
                        </div>
                        <div className="space-y-4">
                            <h4 className="text-white font-bold uppercase tracking-widest text-xs">Company</h4>
                            <ul className="space-y-2 text-slate-500 text-sm">
                                <li><a href="#" className="hover:text-white transition-colors">Support</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-slate-900">
                        <div className="text-xs text-slate-700 font-bold tracking-widest uppercase mb-4 md:mb-0">
                            &copy; {new Date().getFullYear()} CaseBridge Legal Tech. All Rights Reserved.
                        </div>
                        <div className="flex gap-6">
                            {/* Social Icons Placeholders */}
                            <div className="w-4 h-4 bg-slate-800 rounded-full"></div>
                            <div className="w-4 h-4 bg-slate-800 rounded-full"></div>
                            <div className="w-4 h-4 bg-slate-800 rounded-full"></div>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
