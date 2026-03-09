import { Link } from 'react-router-dom';
import { Briefcase, Heart, Home, Shield, FileText, Scale, ArrowRight } from 'lucide-react';

const CATEGORIES = [
    {
        title: "Employment Law",
        icon: <Briefcase size={32} className="text-primary" />,
        description: "Navigate workplace disputes, wrongful termination, discrimination, and contract reviews with clarity.",
        examples: ["Wrongful Termination", "Severance Negotiation", "Workplace Harassment", "Non-Compete Clauses"]
    },
    {
        title: "Family Law",
        icon: <Heart size={32} className="text-primary" />,
        description: "Find structure during difficult times including divorce, custody arrangements, and domestic matters.",
        examples: ["Divorce Proceedings", "Child Custody", "Pre-nuptial Agreements", "Adoption"]
    },
    {
        title: "Property & Real Estate",
        icon: <Home size={32} className="text-primary" />,
        description: "Handle property disputes, tenancy issues, and complex real estate transactions safely.",
        examples: ["Eviction Defense", "Lease Disputes", "Boundary Issues", "Title Transfers"]
    },
    {
        title: "Immigration",
        icon: <Shield size={32} className="text-primary" />,
        description: "Understand your visa options, residency paths, and deal with immigration disputes efficiently.",
        examples: ["Visa Applications", "Asylum Claims", "Deportation Defense", "Citizenship"]
    },
    {
        title: "Business & Corporate",
        icon: <FileText size={32} className="text-primary" />,
        description: "Protect your enterprise with clear guidance on formation, compliance, and commercial disputes.",
        examples: ["LLC Formation", "Partnership Disputes", "Intellectual Property", "Contract Breach"]
    },
    {
        title: "Consumer Rights",
        icon: <Scale size={32} className="text-primary" />,
        description: "Action against faulty products, predatory lending, or breach of consumer contracts.",
        examples: ["Product Liability", "Fraudulent Services", "Debt Collection Abuse", "Warranty Claims"]
    }
];

export default function LegalAreasPage() {
    return (
        <div className="flex flex-col gap-16 pb-24 w-full pt-12">

            {/* 1. HERO */}
            <section className="text-center max-w-3xl mx-auto px-4">
                <div className="w-20 h-20 mx-auto rounded-3xl bg-card border border-border shadow-neumorph flex items-center justify-center mb-8">
                    <Scale size={40} className="text-primary" />
                </div>
                <h1 className="text-5xl font-bold text-foreground leading-[1.1] tracking-tight mb-6">
                    Legal Areas We Cover
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed">
                    CaseBridge is equipped to handle the intake phase for a wide variety of legal situations, helping you organize the facts before you speak to counsel.
                </p>
            </section>

            {/* 2. GRID */}
            <section className="max-w-7xl mx-auto px-4 w-full">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {CATEGORIES.map((category, idx) => (
                        <div key={idx} className="bg-card rounded-[2rem] p-8 border border-border/40 shadow-neumorph flex flex-col items-start group hover:-translate-y-2 transition-transform duration-300">
                            <div className="w-16 h-16 rounded-2xl bg-background shadow-neumorph-inset flex items-center justify-center mb-6 border border-border/50 group-hover:border-primary/50 transition-colors">
                                {category.icon}
                            </div>
                            <h3 className="text-2xl font-bold text-foreground mb-3">{category.title}</h3>
                            <p className="text-muted-foreground mb-6 line-clamp-3">
                                {category.description}
                            </p>
                            <div className="mt-auto w-full">
                                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Common Scenarios</div>
                                <div className="flex flex-wrap gap-2">
                                    {category.examples.map((ex, i) => (
                                        <span key={i} className="text-xs font-medium text-foreground bg-background px-3 py-1.5 rounded-full border border-border shadow-sm">
                                            {ex}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* 3. CTA */}
            <section className="py-12 px-4 max-w-4xl mx-auto w-full">
                <div className="bg-[#112233] rounded-[2.5rem] p-12 text-center border border-primary/20 shadow-[0_10px_40px_rgba(201,162,77,0.1)] relative overflow-hidden">
                    <div className="relative z-10 mx-auto flex flex-col items-center">
                        <h2 className="text-3xl font-bold text-white mb-4">Don't see your issue listed?</h2>
                        <p className="text-muted-foreground mb-8 text-lg">Our AI intake engine can adapt to almost any legal scenario.</p>
                        <Link
                            to="/signup"
                            className="px-8 py-4 rounded-[var(--radius-neumorph)] bg-primary text-primary-foreground font-bold text-lg hover:opacity-90 transition-opacity flex items-center gap-2 shadow-[0_4px_20px_rgba(201,162,77,0.4)]"
                        >
                            Describe Your Situation <ArrowRight size={20} />
                        </Link>
                    </div>
                </div>
            </section>

        </div>
    );
}
