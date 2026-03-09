import { MapPin, Mail, MessageSquare } from 'lucide-react';

export default function ContactPage() {
    return (
        <div className="flex flex-col gap-16 pb-24 w-full pt-12">

            {/* 1. HERO */}
            <section className="text-center max-w-3xl mx-auto px-4">
                <h1 className="text-5xl lg:text-6xl font-bold text-foreground leading-[1.1] tracking-tight mb-6">
                    Get in Touch
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed">
                    Have questions about our platform, need partnership details, or require technical support? Our team is here to help.
                </p>
            </section>

            {/* 2. CONTACT CONTENT */}
            <section className="max-w-6xl mx-auto px-4 w-full">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">

                    {/* Info Side */}
                    <div className="space-y-8">
                        <h2 className="text-3xl font-bold text-foreground mb-8">Contact Information</h2>

                        <div className="flex gap-6">
                            <div className="w-16 h-16 shrink-0 rounded-[1.25rem] bg-card border border-border/40 shadow-neumorph flex items-center justify-center text-primary">
                                <Mail size={24} />
                            </div>
                            <div className="flex flex-col justify-center">
                                <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">Email Us</div>
                                <div className="text-xl font-medium text-foreground">support@casebridge.io</div>
                            </div>
                        </div>

                        <div className="flex gap-6">
                            <div className="w-16 h-16 shrink-0 rounded-[1.25rem] bg-card border border-border/40 shadow-neumorph flex items-center justify-center text-primary">
                                <MapPin size={24} />
                            </div>
                            <div className="flex flex-col justify-center">
                                <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">Office</div>
                                <div className="text-xl font-medium text-foreground">
                                    123 Legal Tech Way<br />
                                    Innovation District<br />
                                    New York, NY 10001
                                </div>
                            </div>
                        </div>

                        <div className="pt-8 mt-8 border-t border-border">
                            <h3 className="text-xl font-bold text-foreground mb-4">Note for Legal Assistance</h3>
                            <p className="text-muted-foreground">
                                CaseBridge is a technology platform, not a law firm. We do not provide legal advice. If you have an urgent legal matter, please use the platform to generate your case profile and contact a qualified attorney immediately.
                            </p>
                        </div>
                    </div>

                    {/* Form Side */}
                    <div>
                        <div className="bg-card rounded-[2rem] p-8 md:p-10 border border-border/40 shadow-neumorph relative overflow-hidden">
                            <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl"></div>
                            <h2 className="text-2xl font-bold text-foreground mb-8 flex items-center gap-3">
                                <MessageSquare className="text-primary" size={24} /> Send a Message
                            </h2>

                            <form className="space-y-6 relative z-10" onSubmit={(e) => e.preventDefault()}>
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-muted-foreground mb-2">Full Name</label>
                                    <input
                                        type="text"
                                        id="name"
                                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-neumorph-inset"
                                        placeholder="Jane Doe"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-muted-foreground mb-2">Email Address</label>
                                    <input
                                        type="email"
                                        id="email"
                                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-neumorph-inset"
                                        placeholder="jane@example.com"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="message" className="block text-sm font-medium text-muted-foreground mb-2">Message</label>
                                    <textarea
                                        id="message"
                                        rows={5}
                                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-neumorph-inset resize-none"
                                        placeholder="How can we help you?"
                                    ></textarea>
                                </div>
                                <button
                                    type="submit"
                                    className="w-full py-4 rounded-[var(--radius-neumorph)] bg-primary text-primary-foreground font-bold text-lg hover:opacity-90 transition-opacity shadow-[0_4px_15px_rgba(201,162,77,0.3)]"
                                >
                                    Send Message
                                </button>
                            </form>
                        </div>
                    </div>

                </div>
            </section>

        </div>
    );
}
