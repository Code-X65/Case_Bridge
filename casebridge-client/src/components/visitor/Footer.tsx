import { Link } from 'react-router-dom';

export default function Footer() {
    return (
        <footer className="bg-card w-full mt-24 border-t border-border pt-16 pb-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-8 mb-16">

                    <div className="lg:col-span-2">
                        <Link to="/" className="flex items-center gap-2 group mb-4">
                            <div className="w-8 h-8 rounded-lg bg-background card-neumorph-inset flex items-center justify-center">
                                <div className="w-3 h-3 rounded-[3px] bg-primary"></div>
                            </div>
                            <span className="text-xl font-bold tracking-tight text-foreground">CASEBRIDGE</span>
                        </Link>
                        <p className="text-muted-foreground max-w-sm mb-6">
                            Legal clarity begins with understanding your situation. We guide you through the first step of any legal engagement.
                        </p>
                    </div>

                    <div>
                        <h3 className="font-semibold text-foreground mb-4">Platform</h3>
                        <ul className="space-y-3">
                            <li><Link to="/how-it-works" className="text-muted-foreground hover:text-primary transition-colors">How It Works</Link></li>
                            <li><Link to="/legal-areas" className="text-muted-foreground hover:text-primary transition-colors">Legal Areas</Link></li>
                            <li><Link to="/ai-guidance" className="text-muted-foreground hover:text-primary transition-colors">AI Guidance</Link></li>
                            <li><Link to="/pricing" className="text-muted-foreground hover:text-primary transition-colors">Pricing</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-semibold text-foreground mb-4">Company</h3>
                        <ul className="space-y-3">
                            <li><Link to="/about" className="text-muted-foreground hover:text-primary transition-colors">About</Link></li>
                            <li><Link to="/security" className="text-muted-foreground hover:text-primary transition-colors">Security</Link></li>
                            <li><Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors">Contact</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-semibold text-foreground mb-4">Account</h3>
                        <ul className="space-y-3">
                            <li><Link to="/login" className="text-muted-foreground hover:text-primary transition-colors">Login</Link></li>
                            <li><Link to="/signup" className="text-primary font-medium hover:text-primary/80 transition-colors">Create Account</Link></li>
                        </ul>
                    </div>

                </div>

                <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-muted-foreground">
                        &copy; {new Date().getFullYear()} CaseBridge. All rights reserved.
                    </p>
                    <div className="flex gap-6">
                        <Link to="/legal/privacy" className="text-sm text-muted-foreground hover:text-foreground">Privacy Policy</Link>
                        <Link to="/legal/terms" className="text-sm text-muted-foreground hover:text-foreground">Terms of Service</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
