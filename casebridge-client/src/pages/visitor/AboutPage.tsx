import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

export default function AboutPage() {
    return (
        <div className="flex flex-col gap-24 pb-24 w-full pt-12">

            {/* 1. HERO */}
            <section className="text-center max-w-4xl mx-auto px-4">
                <h1 className="text-5xl lg:text-7xl font-bold text-foreground leading-[1.1] tracking-tight mb-8">
                    Bridging The Gap To <span className="text-primary block mt-2">Legal Access</span>
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed">
                    The legal system is intimidating. We believe finding the right help shouldn't be. CaseBridge is building the infrastructure to make legal intake clear, structured, and accessible.
                </p>
            </section>

            {/* 2. VISION SPLIT */}
            <section className="max-w-6xl mx-auto px-4 w-full">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div className="relative h-[400px]">
                        <div className="absolute inset-0 bg-card rounded-[3rem] border border-border/50 shadow-neumorph flex items-center justify-center p-12">
                            <div className="w-full h-full relative">
                                {/* Abstract 3D Bridge */}
                                <div className="absolute left-0 bottom-10 w-1/3 h-32 bg-background rounded-l-2xl border-t border-b border-l border-border/50 shadow-neumorph-inset"></div>
                                <div className="absolute right-0 top-10 w-1/3 h-32 bg-background rounded-r-2xl border-t border-b border-r border-border/50 shadow-neumorph-inset"></div>
                                <svg className="absolute inset-0 w-full h-full z-10" preserveAspectRatio="none">
                                    <path d="M 30%,70% C 50%,70% 50%,30% 70%,30%" fill="none" stroke="currentColor" className="text-primary" strokeWidth="4" strokeDasharray="8,8" />
                                </svg>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-primary/10 rounded-full border border-primary/30 flex items-center justify-center z-20 shadow-[0_0_30px_rgba(201,162,77,0.3)] animate-pulse">
                                    <ShieldCheck size={32} className="text-primary" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">Our Mission</h2>
                        <div className="space-y-6 text-lg text-muted-foreground">
                            <p>
                                Every day, thousands of individuals face legal challenges without knowing where to begin. They struggle to articulate their problems in legal terms, leading to frustration and wasted time in expensive consultations.
                            </p>
                            <p>
                                <strong>CaseBridge was founded to solve this problem.</strong>
                            </p>
                            <p>
                                By combining conversational technology with legal structuring, we convert overwhelming situations into organized profiles. We prepare the client, so the lawyer can get straight to work.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 3. PLATFORM PHILOSOPHY */}
            <section className="max-w-5xl mx-auto px-4 w-full text-center">
                <h2 className="text-3xl font-bold text-foreground mb-12">Our Philosophy</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-background rounded-3xl p-8 border border-border shadow-neumorph-inset">
                        <h3 className="text-xl font-bold text-foreground mb-4">Clarity First</h3>
                        <p className="text-muted-foreground">Legal concepts should be accessible. We strip away the jargon so anyone can understand their situation.</p>
                    </div>
                    <div className="bg-background rounded-3xl p-8 border border-border shadow-neumorph-inset">
                        <h3 className="text-xl font-bold text-foreground mb-4">Privacy By Design</h3>
                        <p className="text-muted-foreground">Legal data is deeply personal. We operate with bank-level encryption and strict privacy protocols.</p>
                    </div>
                    <div className="bg-background rounded-3xl p-8 border border-border shadow-neumorph-inset">
                        <h3 className="text-xl font-bold text-foreground mb-4">Efficiency</h3>
                        <p className="text-muted-foreground">We believe preparation saves money. An organized intake leads to faster and more productive legal resolutions.</p>
                    </div>
                </div>
            </section>

            {/* 4. CTA */}
            <section className="max-w-4xl mx-auto w-full px-4">
                <div className="bg-card rounded-[2.5rem] p-12 text-center border border-border/40 shadow-neumorph relative overflow-hidden">
                    <div className="relative z-10 mx-auto flex flex-col items-center">
                        <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-8">Ready to organize your legal issue?</h2>
                        <Link
                            to="/signup"
                            className="px-10 py-4 rounded-[var(--radius-neumorph)] bg-primary text-primary-foreground font-bold text-lg hover:opacity-90 transition-opacity shadow-[0_4px_15px_rgba(201,162,77,0.3)]"
                        >
                            Create Your Free Account
                        </Link>
                    </div>
                </div>
            </section>

        </div>
    );
}
