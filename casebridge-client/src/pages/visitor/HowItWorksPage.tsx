import { Link } from 'react-router-dom';
import { FileText, Cpu, Users, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function HowItWorksPage() {
    return (
        <div className="flex flex-col gap-24 pb-24 lg:gap-32 w-full pt-12">

            {/* 1. HERO */}
            <section className="relative">
                <div className="text-center max-w-4xl mx-auto px-4">
                    <h1 className="text-5xl lg:text-6xl font-bold text-foreground leading-[1.1] tracking-tight mb-6">
                        From Confusion To <span className="text-primary">Clarity</span>
                    </h1>
                    <p className="text-xl text-muted-foreground mb-10 leading-relaxed max-w-2xl mx-auto">
                        Our intelligent intake process helps you understand your legal situation and prepares you for professional representation.
                    </p>

                    <div className="w-full max-w-3xl mx-auto aspect-video rounded-3xl bg-card border border-border pb-4 shadow-neumorph-inset flex items-center justify-center p-8 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(201,162,77,0.1)_0,transparent_70%)]"></div>

                        {/* Abstract 3D Process Representation */}
                        <div className="flex items-center justify-between w-full relative z-10 px-4 md:px-12">

                            {/* Step 1 Node */}
                            <div className="flex flex-col items-center">
                                <div className="w-20 h-20 rounded-2xl bg-background border border-border shadow-neumorph flex items-center justify-center text-primary mb-4 transform -rotate-6">
                                    <FileText size={32} />
                                </div>
                                <div className="text-sm font-bold text-foreground">Describe</div>
                            </div>

                            {/* Arrow */}
                            <div className="flex-1 px-4">
                                <div className="h-1 bg-border relative">
                                    <div className="absolute inset-0 bg-primary/50 animate-pulse"></div>
                                </div>
                            </div>

                            {/* Step 2 Node */}
                            <div className="flex flex-col items-center">
                                <div className="w-24 h-24 rounded-2xl bg-card border border-primary/40 shadow-[0_0_30px_rgba(201,162,77,0.2)] flex items-center justify-center text-primary mb-4 z-10 animate-float">
                                    <Cpu size={40} />
                                </div>
                                <div className="text-sm font-bold text-primary">Structure</div>
                            </div>

                            {/* Arrow */}
                            <div className="flex-1 px-4">
                                <div className="h-1 bg-border relative">
                                    <div className="absolute inset-0 bg-primary/50 animate-pulse" style={{ animationDelay: '1s' }}></div>
                                </div>
                            </div>

                            {/* Step 3 Node */}
                            <div className="flex flex-col items-center">
                                <div className="w-20 h-20 rounded-2xl bg-background border border-border shadow-neumorph flex items-center justify-center text-primary mb-4 transform rotate-6">
                                    <Users size={32} />
                                </div>
                                <div className="text-sm font-bold text-foreground">Connect</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 2. FULL PROCESS BREAKDOWN */}
            <section className="max-w-4xl mx-auto px-4 w-full">
                <div className="space-y-24">

                    {/* Step 1 detail */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                        <div className="order-2 md:order-1 relative">
                            <div className="absolute right-0 top-0 text-9xl font-black text-border/40 -z-10 transform translate-x-4 -translate-y-8">1</div>
                            <div className="bg-card p-8 rounded-3xl border border-border/50 shadow-neumorph">
                                <div className="space-y-4">
                                    <div className="h-3 w-3/4 bg-border/60 rounded"></div>
                                    <div className="h-3 w-full bg-border/60 rounded"></div>
                                    <div className="h-3 w-5/6 bg-border/60 rounded"></div>
                                    <div className="mt-6 flex gap-4">
                                        <div className="w-8 h-8 rounded bg-primary/20"></div>
                                        <div className="w-8 h-8 rounded bg-border/60"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="order-1 md:order-2">
                            <h2 className="text-3xl font-bold text-foreground mb-4">Initial Questionnaire</h2>
                            <p className="text-lg text-muted-foreground mb-6">
                                Start by answering guided, simple questions about your situation. You don't need to know the legal jargon—our conversational interface figures out the details.
                            </p>
                            <ul className="space-y-3">
                                <li className="flex items-center gap-2 text-foreground"><CheckCircle2 size={18} className="text-primary" /> Plain English questions</li>
                                <li className="flex items-center gap-2 text-foreground"><CheckCircle2 size={18} className="text-primary" /> Takes 5-10 minutes</li>
                                <li className="flex items-center gap-2 text-foreground"><CheckCircle2 size={18} className="text-primary" /> No commitment required</li>
                            </ul>
                        </div>
                    </div>

                    {/* Step 2 detail */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                        <div>
                            <h2 className="text-3xl font-bold text-foreground mb-4">Intelligent Structuring</h2>
                            <p className="text-lg text-muted-foreground mb-6">
                                Our AI analyzes your answers to identify the relevant legal area, urgency level, and key facts. It organizes this into a standardized case profile.
                            </p>
                            <ul className="space-y-3">
                                <li className="flex items-center gap-2 text-foreground"><CheckCircle2 size={18} className="text-primary" /> Discovers legal categories</li>
                                <li className="flex items-center gap-2 text-foreground"><CheckCircle2 size={18} className="text-primary" /> Flags urgent deadlines</li>
                                <li className="flex items-center gap-2 text-foreground"><CheckCircle2 size={18} className="text-primary" /> Organizes a clear timeline</li>
                            </ul>
                        </div>
                        <div className="relative">
                            <div className="absolute left-0 top-0 text-9xl font-black text-border/40 -z-10 transform -translate-x-4 -translate-y-8">2</div>
                            <div className="bg-[#112233] p-8 rounded-3xl border border-primary/20 shadow-[0_10px_40px_rgba(201,162,77,0.15)] flex flex-col items-center">
                                <Cpu size={48} className="text-primary mb-4" />
                                <div className="w-full bg-background/50 rounded-xl p-4 mt-2">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs text-muted-foreground uppercase">Processing</span>
                                        <span className="text-xs text-primary font-bold">100%</span>
                                    </div>
                                    <div className="h-2 w-full bg-border rounded-full overflow-hidden">
                                        <div className="h-full w-full bg-primary rounded-full"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Step 3 detail */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                        <div className="order-2 md:order-1 relative">
                            <div className="absolute right-0 top-0 text-9xl font-black text-border/40 -z-10 transform translate-x-4 -translate-y-8">3</div>
                            <div className="bg-card p-8 rounded-3xl border border-border/50 shadow-neumorph flex gap-4">
                                <div className="w-16 h-16 rounded-full bg-background flex-shrink-0 flex items-center justify-center border border-border">
                                    <Users size={24} className="text-primary" />
                                </div>
                                <div className="flex-1 space-y-3 py-2">
                                    <div className="h-2 w-1/3 bg-border rounded"></div>
                                    <div className="h-2 w-1/2 bg-border rounded"></div>
                                    <div className="h-10 mt-4 rounded-lg bg-primary/20 border border-primary/30 flex items-center px-4 shadow-neumorph-inset">
                                        <div className="h-2 w-2 rounded-full bg-primary mr-2"></div>
                                        <div className="h-2 w-1/4 bg-primary/50 rounded"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="order-1 md:order-2">
                            <h2 className="text-3xl font-bold text-foreground mb-4">Ready for Representation</h2>
                            <p className="text-lg text-muted-foreground mb-6">
                                With your case profile ready, you are fully prepared to approach legal professionals. You save time and money by being organized from day one.
                            </p>
                            <ul className="space-y-3">
                                <li className="flex items-center gap-2 text-foreground"><CheckCircle2 size={18} className="text-primary" /> Professional summary PDF</li>
                                <li className="flex items-center gap-2 text-foreground"><CheckCircle2 size={18} className="text-primary" /> Clear next steps</li>
                                <li className="flex items-center gap-2 text-foreground"><CheckCircle2 size={18} className="text-primary" /> Confident consultations</li>
                            </ul>
                        </div>
                    </div>

                </div>
            </section>

            {/* 3. CTA */}
            <section className="py-12">
                <div className="bg-card rounded-[2.5rem] p-12 text-center border border-border/40 shadow-neumorph relative overflow-hidden mx-4">
                    <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center">
                        <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6 leading-tight tracking-tight">
                            Ready to take the first step?
                        </h2>
                        <div className="flex justify-center">
                            <Link
                                to="/signup"
                                className="px-8 py-4 rounded-[var(--radius-neumorph)] bg-primary text-primary-foreground font-bold text-lg hover:opacity-90 transition-opacity flex items-center gap-2"
                            >
                                Start Legal Intake <ArrowRight size={20} />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

        </div>
    );
}
