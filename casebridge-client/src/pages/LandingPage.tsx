import { Link } from 'react-router-dom';
import { ArrowRight, Shield, Lock, FileText, Cpu, CheckCircle2, Users, FolderOpen } from 'lucide-react';

export default function LandingPage() {
    return (
        <div className="flex flex-col gap-24 pb-24 lg:gap-32 w-full">

            {/* 1. HERO SECTION (Following Leap design structure) */}
            <section className="relative pt-12 lg:pt-20">
                <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.1fr] gap-12 lg:gap-8 items-start">

                    {/* Left Column */}
                    <div className="flex flex-col pr-0 lg:pr-8">
                        <h1 className="text-5xl lg:text-7xl xl:text-[5rem] font-bold text-foreground leading-[1.1] tracking-tight mb-6">
                            Legal Problems Are Complicated.<br />
                            <span className="text-primary mt-2 block">Finding Help Shouldn't Be.</span>
                        </h1>

                        <p className="text-xl text-muted-foreground mb-10 max-w-2xl leading-relaxed">
                            CaseBridge guides you through the first step of any legal situation. Describe your issue. Understand your legal position. Prepare for professional legal support.
                        </p>

                        {/* CTAs */}
                        <div className="flex flex-col sm:flex-row gap-4 mb-16">
                            <Link
                                to="/signup"
                                className="px-8 py-4 rounded-[var(--radius-neumorph)] bg-background text-foreground font-bold text-lg text-center shadow-neumorph hover:shadow-neumorph-inset transition-all border border-border"
                            >
                                Start Your Legal Journey
                            </Link>
                            <Link
                                to="/how-it-works"
                                className="px-8 py-4 rounded-[var(--radius-neumorph)] bg-primary text-primary-foreground border border-primary font-bold text-lg text-center hover:opacity-90 transition-opacity shadow-[0_4px_14px_0_rgba(201,162,77,0.39)]"
                            >
                                See How CaseBridge Works
                            </Link>
                        </div>

                        {/* Below CTAs (Inspired by Leap "Free live support" & "Community insights") */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                            {/* Feature 1 */}
                            <div className="flex items-start gap-4">
                                <div className="w-16 h-16 shrink-0 rounded-[var(--radius-neumorph)] bg-card shadow-neumorph flex items-center justify-center text-primary border border-border/50">
                                    <FileText size={28} />
                                </div>
                                <div className="flex flex-col justify-center h-16">
                                    <h3 className="text-lg font-bold text-foreground leading-tight mb-1">Guided Legal Intake</h3>
                                    <Link to="/how-it-works" className="text-sm text-primary font-medium hover:underline flex items-center gap-1">
                                        Learn about intake <ArrowRight size={14} />
                                    </Link>
                                </div>
                            </div>

                            {/* Feature 2 */}
                            <div className="flex items-start gap-4">
                                <div className="w-16 h-16 shrink-0 rounded-[var(--radius-neumorph)] bg-card shadow-neumorph flex items-center justify-center text-primary border border-border/50">
                                    <Cpu size={28} />
                                </div>
                                <div className="flex flex-col justify-center h-16">
                                    <h3 className="text-lg font-bold text-foreground leading-tight mb-1">Intelligent Guidance</h3>
                                    <Link to="/ai-guidance" className="text-sm text-primary font-medium hover:underline flex items-center gap-1">
                                        See AI features <ArrowRight size={14} />
                                    </Link>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Right Column - Hero Image */}
                    <div className="relative h-full min-h-[500px] w-full mt-12 xl:mt-0 flex items-center justify-center">
                        {/* Split 3D Scene */}
                        <div className="w-full max-w-2xl aspect-[4/3] relative rounded-3xl bg-card border border-border/30 shadow-neumorph flex items-center justify-center overflow-hidden">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(201,162,77,0.1)_0,transparent_60%)]"></div>

                            {/* Left Side of Scene: Stressed User with Paperwork */}
                            <div className="absolute left-[10%] top-[40%] -translate-y-1/2 w-48 h-64 bg-background rounded-2xl border border-border/50 shadow-neumorph-inset flex flex-col items-center justify-center p-6 z-10 animate-float" style={{ animationDelay: '0s' }}>
                                <Users size={56} className="text-muted-foreground/60 mb-6" />
                                <div className="space-y-3 w-full">
                                    <div className="h-2 w-full bg-border/60 rounded"></div>
                                    <div className="h-2 w-3/4 bg-border/60 rounded"></div>
                                    <div className="h-2 w-5/6 bg-border/60 rounded"></div>
                                    <div className="h-2 w-2/3 bg-border/60 rounded"></div>
                                </div>
                            </div>

                            {/* Connecting Wave */}
                            <svg className="absolute inset-0 w-full h-full z-10 opacity-30" preserveAspectRatio="none">
                                <path d="M 0,200 C 200,200 250,120 1000,120" fill="none" stroke="currentColor" className="text-primary" strokeWidth="2" strokeDasharray="6,6" />
                            </svg>

                            {/* Right Side of Scene: Floating AI Dashboard */}
                            <div className="absolute right-[10%] top-[40%] -translate-y-1/4 w-64 bg-[#112233] rounded-2xl border border-primary/20 shadow-[0_10px_40px_rgba(201,162,77,0.15)] flex flex-col p-6 z-20 animate-float" style={{ animationDelay: '2s' }}>
                                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                        <Cpu size={20} />
                                    </div>
                                    <div className="text-sm font-bold text-white">AI Analysis</div>
                                </div>

                                <div className="space-y-4">
                                    <div className="bg-background/40 rounded-xl p-3 border border-white/5">
                                        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Legal Category</div>
                                        <div className="text-sm font-medium text-white flex items-center gap-2">
                                            <FolderOpen size={14} className="text-primary" /> Employment
                                        </div>
                                    </div>
                                    <div className="bg-background/40 rounded-xl p-3 border border-white/5">
                                        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Urgency</div>
                                        <div className="text-sm font-medium text-secondary">Medium</div>
                                    </div>
                                    <div className="bg-background/40 rounded-xl p-3 border border-white/5">
                                        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Status</div>
                                        <div className="text-sm font-medium text-emerald-400 flex items-center gap-1.5">
                                            <CheckCircle2 size={14} /> Intake Complete
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </section>

            {/* 2. TRUST BAR */}
            <section className="py-10 border-y border-border/40 bg-card/20 backdrop-blur-sm -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-10 md:gap-20">
                    {[
                        { icon: Lock, label: 'Encrypted Platform' },
                        { icon: Shield, label: 'Secure Infrastructure' },
                        { icon: Users, label: 'Privacy First' },
                        { icon: Cpu, label: 'AI Assisted' },
                    ].map((item, i) => (
                        <div key={i} className="flex items-center gap-3 text-muted-foreground/80">
                            <item.icon size={26} className="text-primary/80" />
                            <span className="font-semibold tracking-wide">{item.label}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* 3. PROBLEM SECTION */}
            <section className="py-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 xl:gap-24 items-center">
                    {/* 3D Illustration */}
                    <div className="order-2 lg:order-1 relative h-[450px]">
                        <div className="absolute inset-0 rounded-[2rem] bg-card border border-border/40 shadow-neumorph flex items-center justify-center overflow-hidden">
                            <div className="absolute w-[120%] h-[120%] bg-[radial-gradient(circle_at_center,rgba(11,26,42,0.8)_0,rgba(22,43,60,1)_100%)]"></div>

                            {/* 3D user overwhelmed */}
                            <div className="relative z-10 flex items-center gap-4 xl:gap-8">
                                <div className="w-24 h-32 xl:w-32 xl:h-40 bg-background rounded-xl border border-border/50 shadow-neumorph-inset flex flex-col p-4 opacity-40 transform -rotate-12 translate-y-8 translate-x-8">
                                    <div className="h-2 w-full bg-border/50 rounded mb-2"></div>
                                </div>
                                <div className="w-28 h-36 xl:w-36 xl:h-48 bg-background rounded-xl border border-primary/20 shadow-neumorph-inset flex flex-col p-4 z-20">
                                    <div className="h-2 w-full bg-border/50 rounded mb-3"></div>
                                    <div className="h-2 w-3/4 bg-border/50 rounded mb-1"></div>
                                    <div className="h-2 w-full bg-border/50 rounded"></div>
                                </div>
                                <div className="w-24 h-32 xl:w-32 xl:h-40 bg-background rounded-xl border border-border/50 shadow-neumorph-inset flex flex-col p-4 opacity-40 transform rotate-12 translate-y-4 -translate-x-8">
                                    <div className="h-2 w-full bg-border/50 rounded mb-2"></div>
                                </div>

                                {/* AI Hologram */}
                                <div className="absolute top-0 right-10 transform -translate-y-6 translate-x-12 bg-card border border-primary/30 rounded-[1.2rem] p-5 shadow-[0_0_30px_rgba(201,162,77,0.25)] animate-float">
                                    <Cpu size={40} className="text-primary" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="order-1 lg:order-2">
                        <h2 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground mb-8 leading-tight"> Most People Don't Know Where To Start With Legal Issues</h2>
                        <div className="text-lg xl:text-xl text-muted-foreground space-y-6">
                            <p>Legal systems can be complex and intimidating.</p>
                            <p>People often struggle with:</p>
                            <ul className="space-y-4 font-medium text-foreground py-2">
                                <li className="flex items-center gap-4 bg-card px-5 py-4 rounded-xl border border-border/30 shadow-neumorph w-max">
                                    <div className="w-2.5 h-2.5 rounded-full bg-secondary"></div>
                                    understanding their legal position
                                </li>
                                <li className="flex items-center gap-4 bg-card px-5 py-4 rounded-xl border border-border/30 shadow-neumorph w-max">
                                    <div className="w-2.5 h-2.5 rounded-full bg-secondary"></div>
                                    organizing important documents
                                </li>
                                <li className="flex items-center gap-4 bg-card px-5 py-4 rounded-xl border border-border/30 shadow-neumorph w-max">
                                    <div className="w-2.5 h-2.5 rounded-full bg-secondary"></div>
                                    finding the right legal professional
                                </li>
                            </ul>
                            <p className="pt-6 text-primary font-bold text-2xl tracking-tight">CaseBridge simplifies the early stages of legal engagement.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 4. WHAT IS CASEBRIDGE SECTION */}
            <section className="py-12">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-6">What Is CaseBridge?</h2>
                    <p className="text-xl text-muted-foreground leading-relaxed">
                        CaseBridge is a digital platform designed to simplify the early stages of legal engagement. Instead of approaching legal professionals without preparation, CaseBridge helps individuals organize their situation into a structured legal intake profile.
                    </p>
                    <p className="text-xl text-muted-foreground leading-relaxed mt-4 font-medium text-foreground/80">
                        This ensures clarity, efficiency, and better legal conversations.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-card rounded-[2rem] p-8 border border-border/40 shadow-neumorph">
                        <div className="w-14 h-14 rounded-xl bg-background shadow-neumorph-inset flex items-center justify-center text-primary mb-6">
                            <FileText size={28} />
                        </div>
                        <h3 className="text-xl font-bold text-foreground mb-4">Guided Legal Intake</h3>
                        <p className="text-muted-foreground leading-relaxed">A structured questionnaire helps you describe your legal situation clearly.</p>
                    </div>

                    <div className="bg-card rounded-[2rem] p-8 border border-border/40 shadow-neumorph transform lg:-translate-y-4">
                        <div className="w-14 h-14 rounded-xl bg-background shadow-neumorph-inset flex items-center justify-center text-primary mb-6">
                            <Cpu size={28} />
                        </div>
                        <h3 className="text-xl font-bold text-foreground mb-4">Smart Case Structuring</h3>
                        <p className="text-muted-foreground leading-relaxed">Your responses are organised into a clear legal intake summary.</p>
                    </div>

                    <div className="bg-card rounded-[2rem] p-8 border border-border/40 shadow-neumorph">
                        <div className="w-14 h-14 rounded-xl bg-background shadow-neumorph-inset flex items-center justify-center text-primary mb-6">
                            <Users size={28} />
                        </div>
                        <h3 className="text-xl font-bold text-foreground mb-4">Prepared Legal Engagement</h3>
                        <p className="text-muted-foreground leading-relaxed">You approach legal professionals with organised information.</p>
                    </div>
                </div>
            </section>

            {/* 5. HOW IT WORKS SECTION */}
            <section className="py-12">
                <div className="text-center mb-16">
                    <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-6">A Clear 3 Step Process</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    {/* Step 1 */}
                    <div className="flex flex-col items-center text-center">
                        <div className="w-32 h-32 rounded-[2rem] bg-card border border-border/50 shadow-neumorph flex items-center justify-center text-primary mb-8 relative">
                            <div className="absolute top-0 right-0 -mt-3 -mr-3 w-8 h-8 rounded-full bg-primary text-background font-bold flex items-center justify-center shadow-lg">1</div>
                            <FileText size={48} />
                        </div>
                        <h3 className="text-2xl font-bold text-foreground mb-4">Describe Your Situation</h3>
                        <p className="text-muted-foreground">Answer a set of structured questions designed to understand your legal issue.</p>
                    </div>
                    {/* Step 2 */}
                    <div className="flex flex-col items-center text-center">
                        <div className="w-32 h-32 rounded-[2rem] bg-card border border-border/50 shadow-neumorph flex items-center justify-center text-primary mb-8 relative">
                            <div className="absolute top-0 right-0 -mt-3 -mr-3 w-8 h-8 rounded-full bg-primary text-background font-bold flex items-center justify-center shadow-lg">2</div>
                            <Cpu size={48} />
                        </div>
                        <h3 className="text-2xl font-bold text-foreground mb-4">CaseBridge Structures Your Case</h3>
                        <p className="text-muted-foreground">Your responses are analysed and organised into a clear case profile.</p>
                    </div>
                    {/* Step 3 */}
                    <div className="flex flex-col items-center text-center">
                        <div className="w-32 h-32 rounded-[2rem] bg-card border border-border/50 shadow-neumorph flex items-center justify-center text-primary mb-8 relative">
                            <div className="absolute top-0 right-0 -mt-3 -mr-3 w-8 h-8 rounded-full bg-primary text-background font-bold flex items-center justify-center shadow-lg">3</div>
                            <Users size={48} />
                        </div>
                        <h3 className="text-2xl font-bold text-foreground mb-4">Prepare For Legal Assistance</h3>
                        <p className="text-muted-foreground">Your structured profile prepares you for productive conversations with legal professionals.</p>
                    </div>
                </div>
                <div className="flex justify-center mt-12">
                    <Link to="/how-it-works" className="text-primary font-bold hover:underline flex items-center gap-2">View full process <ArrowRight size={16} /></Link>
                </div>
            </section>

            {/* 6. LEGAL AREAS SECTION */}
            <section className="py-12 bg-card/20 rounded-[3rem] px-8 lg:px-16 border border-border/20 shadow-neumorph-inset">
                <div className="mb-12">
                    <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-6">Legal Situations CaseBridge Helps You Navigate</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[
                        { title: "Immigration", list: ["Visa issues", "Residency concerns", "Immigration disputes"] },
                        { title: "Employment", list: ["Workplace disputes", "Termination issues", "Employment contracts"] },
                        { title: "Family Law", list: ["Divorce", "Child custody", "Family disputes"] },
                        { title: "Business Law", list: ["Partnership disputes", "Commercial contracts", "Business compliance"] },
                        { title: "Property Law", list: ["Ownership disputes", "Rental disagreements", "Land transactions"] },
                        { title: "Consumer Rights", list: ["Service disputes", "Product issues", "Contract disagreements"] }
                    ].map((area, idx) => (
                        <div key={idx} className="bg-card rounded-2xl p-6 border border-border/50 shadow-neumorph hover:scale-[1.02] transition-transform cursor-pointer">
                            <h3 className="text-xl font-bold text-foreground mb-4">{area.title}</h3>
                            <ul className="space-y-2 text-muted-foreground text-sm">
                                {area.list.map((item, i) => (
                                    <li key={i} className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary/50"></div>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
                <div className="mt-12 text-center">
                    <Link to="/legal-areas" className="text-primary font-bold hover:underline flex items-center justify-center gap-2">Explore all legal areas <ArrowRight size={16} /></Link>
                </div>
            </section>

            {/* 7. AI GUIDANCE SECTION */}
            <section className="py-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div>
                        <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-6">Intelligent Legal Guidance</h2>
                        <p className="text-xl text-muted-foreground mb-10 leading-relaxed">
                            CaseBridge includes intelligent systems that help identify legal categories, urgency levels, and relevant pathways based on the information you provide.
                        </p>
                        <div className="space-y-6">
                            {[
                                { title: 'Legal Category Identification', desc: 'The system identifies the legal area relevant to your situation.' },
                                { title: 'Urgency Detection', desc: 'Cases are categorized based on urgency signals.' },
                                { title: 'Structured Case Summary', desc: 'Your responses are converted into a clear legal intake summary.' }
                            ].map((feature, idx) => (
                                <div key={idx} className="flex gap-4">
                                    <div className="mt-1">
                                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary border border-primary/30">
                                            <CheckCircle2 size={14} />
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-bold text-foreground">{feature.title}</h4>
                                        <p className="text-muted-foreground">{feature.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-10">
                            <Link to="/ai-guidance" className="text-primary font-bold hover:underline flex items-center gap-2">Learn about our AI <ArrowRight size={16} /></Link>
                        </div>
                    </div>

                    <div className="relative h-[400px]">
                        <div className="absolute inset-0 rounded-[2rem] bg-card border border-border/40 shadow-neumorph flex items-center justify-center p-8">
                            <div className="w-full max-w-sm bg-background rounded-2xl border border-border shadow-neumorph-inset p-6 space-y-5">
                                <div className="flex items-center justify-between border-b border-border pb-4">
                                    <div className="flex items-center gap-3">
                                        <Cpu className="text-primary" />
                                        <span className="font-bold text-foreground">AI Intelligence</span>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Case Category</div>
                                        <div className="text-base font-bold text-foreground bg-card px-3 py-2 rounded-lg border border-border shadow-neumorph">Immigration</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Urgency</div>
                                        <div className="text-base font-bold text-secondary bg-card px-3 py-2 rounded-lg border border-border shadow-neumorph">High</div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1">
                                            <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Documents</div>
                                            <div className="text-sm font-medium text-foreground">3 Uploaded</div>
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Status</div>
                                            <div className="text-sm font-medium text-emerald-400">Ready</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 8. SECURITY SECTION */}
            <section className="py-12 bg-card/20 rounded-[3rem] p-8 lg:p-16 border border-border/20 shadow-neumorph-inset flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-2xl bg-card shadow-neumorph flex items-center justify-center text-primary mb-8 border border-border/40">
                    <Lock size={40} />
                </div>
                <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-6">Your Information Is Protected</h2>
                <p className="text-xl text-muted-foreground mb-12 max-w-3xl leading-relaxed">
                    Legal information is highly sensitive. CaseBridge is designed with security and privacy as foundational principles.
                </p>
                <div className="flex flex-wrap justify-center gap-4 lg:gap-8 mb-8">
                    {['End-to-end encryption', 'Secure authentication', 'Strict access controls', 'Data privacy protection'].map((item, idx) => (
                        <div key={idx} className="bg-card px-6 py-3 rounded-full border border-border shadow-neumorph text-foreground font-medium flex items-center gap-2">
                            <Shield size={16} className="text-primary" /> {item}
                        </div>
                    ))}
                </div>
                <span className="text-primary font-bold">Built into our core platform</span>
            </section>

            {/* 9. SUCCESS STORIES SECTION */}
            <section className="py-12">
                <div className="text-center mb-16">
                    <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-6">Real People. Real Legal Clarity.</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    <div className="bg-card rounded-[2rem] p-10 border border-border/40 shadow-neumorph relative">
                        <div className="text-6xl text-primary/20 absolute top-6 left-6 font-serif">"</div>
                        <p className="text-lg text-foreground italic relative z-10 mb-8 mt-4 leading-relaxed">
                            I was overwhelmed by my employment dispute. CaseBridge helped me organize everything before speaking with a lawyer.
                        </p>
                        <div className="flex items-center gap-4 border-t border-border pt-6">
                            <div className="w-12 h-12 rounded-full bg-background shadow-neumorph-inset flex items-center justify-center text-primary font-bold text-lg border border-border/50">S</div>
                            <div className="font-bold text-foreground">Sarah M</div>
                        </div>
                    </div>
                    <div className="bg-card rounded-[2rem] p-10 border border-border/40 shadow-neumorph relative">
                        <div className="text-6xl text-primary/20 absolute top-6 left-6 font-serif">"</div>
                        <p className="text-lg text-foreground italic relative z-10 mb-8 mt-4 leading-relaxed">
                            The intake process helped me understand my immigration situation clearly. I walked into my consultation feeling prepared instead of confused.
                        </p>
                        <div className="flex items-center gap-4 border-t border-border pt-6">
                            <div className="w-12 h-12 rounded-full bg-background shadow-neumorph-inset flex items-center justify-center text-primary font-bold text-lg border border-border/50">D</div>
                            <div className="font-bold text-foreground">David R</div>
                        </div>
                    </div>
                </div>
                <div className="mt-12 text-center">
                    <Link to="/success-stories" className="text-primary font-bold hover:underline flex items-center justify-center gap-2">Read more stories <ArrowRight size={16} /></Link>
                </div>
            </section>

            {/* 10. PRICING PREVIEW */}
            <section className="py-12">
                <div className="text-center mb-16">
                    <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-6">Start With Confidence</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {/* Free Plan */}
                    <div className="bg-background rounded-[2rem] p-10 border border-border shadow-neumorph-inset flex flex-col">
                        <h3 className="text-2xl font-bold text-foreground mb-2">Free Plan</h3>
                        <div className="text-4xl font-bold text-foreground mb-8">$0</div>
                        <ul className="space-y-4 mb-10 flex-1">
                            <li className="flex gap-3 text-muted-foreground"><CheckCircle2 className="text-primary shrink-0" /> Create account</li>
                            <li className="flex gap-3 text-muted-foreground"><CheckCircle2 className="text-primary shrink-0" /> Complete legal intake questionnaire</li>
                            <li className="flex gap-3 text-muted-foreground"><CheckCircle2 className="text-primary shrink-0" /> Generate case profile</li>
                        </ul>
                        <Link to="/signup" className="w-full block text-center py-4 rounded-[var(--radius-neumorph)] border border-primary text-primary font-bold hover:bg-primary/5 transition-colors shadow-neumorph">Get Started</Link>
                    </div>

                    {/* Premium Plan */}
                    <div className="bg-card rounded-[2rem] p-10 border border-primary/40 shadow-[0_0_30px_rgba(201,162,77,0.15)] flex flex-col relative overflow-hidden">
                        <div className="absolute top-6 right-6 bg-primary/20 text-primary text-xs font-bold px-3 py-1 rounded-full border border-primary/30">POPULAR</div>
                        <h3 className="text-2xl font-bold text-foreground mb-2">Premium Plan</h3>
                        <div className="text-4xl font-bold text-foreground mb-8">Custom</div>
                        <ul className="space-y-4 mb-10 flex-1">
                            <li className="flex gap-3 text-foreground font-medium"><CheckCircle2 className="text-primary shrink-0" /> Priority support</li>
                            <li className="flex gap-3 text-foreground font-medium"><CheckCircle2 className="text-primary shrink-0" /> Enhanced case preparation</li>
                            <li className="flex gap-3 text-foreground font-medium"><CheckCircle2 className="text-primary shrink-0" /> Extended assistance</li>
                        </ul>
                        <Link to="/contact" className="w-full block text-center py-4 rounded-[var(--radius-neumorph)] bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity shadow-[0_4px_14px_0_rgba(201,162,77,0.39)]">Contact Enterprise Sales</Link>
                    </div>
                </div>
            </section>

            {/* 11. FINAL CTA SECTION */}
            <section className="py-20 mb-12">
                <div className="bg-card rounded-[2.5rem] p-12 lg:p-20 text-center border border-primary/20 shadow-[0_20px_50px_rgba(201,162,77,0.1)] relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(201,162,77,0.15)_0,transparent_70%)]"></div>

                    <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center">
                        <div className="w-20 h-20 rounded-[var(--radius-neumorph)] bg-background shadow-neumorph-inset flex items-center justify-center text-primary mb-8 border border-border">
                            <div className="w-8 h-8 rounded-[8px] bg-primary"></div>
                        </div>
                        <h2 className="text-4xl lg:text-6xl font-bold text-foreground mb-8 leading-tight tracking-tight">
                            Legal clarity begins with understanding your situation.
                        </h2>
                        <div className="flex flex-col sm:flex-row gap-5 items-center justify-center">
                            <Link
                                to="/signup"
                                className="w-full sm:w-auto px-10 py-5 rounded-[var(--radius-neumorph)] bg-primary text-primary-foreground font-bold text-xl hover:opacity-90 transition-opacity shadow-[0_4px_20px_rgba(201,162,77,0.4)]"
                            >
                                Create Your CaseBridge Account
                            </Link>
                            <Link
                                to="/login"
                                className="w-full sm:w-auto px-10 py-5 rounded-[var(--radius-neumorph)] bg-background text-foreground font-bold text-xl hover:bg-white/5 transition-colors border border-border shadow-neumorph text-center"
                            >
                                Login
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

        </div>
    );
}
