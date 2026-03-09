import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

const NAV_LINKS = [
    { label: 'How It Works', path: '/how-it-works' },
    { label: 'Legal Areas', path: '/legal-areas' },
    { label: 'About', path: '/about' },
    { label: 'Contact', path: '/contact' },
];

export default function Header() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <header className="fixed top-0 left-0 w-full z-50 bg-background/80 backdrop-blur-lg border-b border-border shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">

                    {/* Logo & Tagline */}
                    <div className="flex-shrink-0 flex items-center gap-3">
                        <Link to="/" className="flex items-center gap-2 group">
                            <div className="w-10 h-10 rounded-xl bg-card card-neumorph flex items-center justify-center transition-transform group-hover:scale-105">
                                <div className="w-4 h-4 rounded-[4px] bg-primary"></div>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xl font-bold tracking-tight text-foreground leading-none">CASEBRIDGE</span>
                                <span className="text-xs font-medium text-muted-foreground mt-1">Legal Clarity Starts Here</span>
                            </div>
                        </Link>
                    </div>

                    {/* Desktop Nav */}
                    <nav className="hidden xl:flex items-center gap-6">
                        {NAV_LINKS.map(link => (
                            <Link
                                key={link.path}
                                to={link.path}
                                className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>

                    {/* Actions */}
                    <div className="hidden lg:flex items-center gap-4">
                        <Link
                            to="/login"
                            className="px-5 py-2.5 rounded-[var(--radius-neumorph)] border border-primary text-primary font-medium hover:bg-primary/10 transition-colors shadow-[0_0_10px_rgba(201,162,77,0.1)]"
                        >
                            Login
                        </Link>
                        <Link
                            to="/signup"
                            className="px-5 py-2.5 rounded-[var(--radius-neumorph)] bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity shadow-[0_0_15px_rgba(201,162,77,0.3)]"
                        >
                            Create Account
                        </Link>
                    </div>

                    {/* Mobile menu button */}
                    <div className="xl:hidden flex items-center">
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="text-muted-foreground hover:text-foreground p-2"
                        >
                            {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="xl:hidden bg-card border-b border-border shadow-xl absolute top-20 left-0 w-full animate-fade-in">
                    <div className="px-4 pt-2 pb-6 space-y-1 shadow-neumorph-inset pb-4">
                        {NAV_LINKS.map(link => (
                            <Link
                                key={link.path}
                                to={link.path}
                                onClick={() => setMobileMenuOpen(false)}
                                className="block px-3 py-3 rounded-md text-base font-medium text-muted-foreground hover:text-primary hover:bg-background/50"
                            >
                                {link.label}
                            </Link>
                        ))}
                        <div className="mt-6 flex flex-col gap-3 px-3">
                            <Link
                                to="/login"
                                className="text-center px-4 py-3 rounded-[var(--radius-neumorph)] border border-primary text-primary font-medium w-full"
                            >
                                Login
                            </Link>
                            <Link
                                to="/signup"
                                className="text-center px-4 py-3 rounded-[var(--radius-neumorph)] bg-primary text-primary-foreground font-semibold w-full"
                            >
                                Create Account
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}
