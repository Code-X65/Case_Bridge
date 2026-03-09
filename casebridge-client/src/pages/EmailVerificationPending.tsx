import { Link } from 'react-router-dom';
import Header from '../components/visitor/Header';
import { Mail, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function EmailVerificationPending() {
    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col font-sans relative overflow-hidden">
            <Header />

            {/* Background decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[20%] left-[50%] -translate-x-1/2 w-[60%] h-[60%] bg-primary/5 blur-[120px] rounded-full animate-pulse" />
            </div>

            <main className="flex-1 flex items-center justify-center relative z-10 px-4 pt-20">
                <div className="w-full max-w-2xl bg-card border border-border shadow-neumorph rounded-[2rem] p-8 sm:p-12 text-center animate-fade-in relative overflow-hidden">
                    {/* Inner accent gradient */}
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>

                    <div className="flex justify-center mb-8 relative">
                        <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-150 animate-pulse"></div>
                        <div className="w-24 h-24 bg-card shadow-neumorph-inset rounded-full flex items-center justify-center relative z-10 border border-border">
                            <Mail size={40} className="text-primary" />
                        </div>
                    </div>

                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">
                        Verify Your Identity
                    </h1>

                    <p className="text-lg text-muted-foreground mb-10 max-w-lg mx-auto leading-relaxed">
                        We've sent a secure verification link to your email address. Please click the link to confirm your identity and activate your CaseBridge portal.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto mb-10 text-left">
                        <div className="flex items-start gap-3 p-4 bg-background/50 border border-border rounded-xl shadow-sm">
                            <ShieldCheck size={20} className="text-primary shrink-0 mt-0.5" />
                            <div>
                                <h3 className="text-sm font-semibold text-foreground">Secure Connection</h3>
                                <p className="text-xs text-muted-foreground mt-1">Verifying your email protects your legal data.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-4 bg-background/50 border border-border rounded-xl shadow-sm">
                            <CheckCircle2 size={20} className="text-primary shrink-0 mt-0.5" />
                            <div>
                                <h3 className="text-sm font-semibold text-foreground">Next Steps</h3>
                                <p className="text-xs text-muted-foreground mt-1">Complete your profile onboarding after verification.</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            to="/login"
                            className="w-full sm:w-auto flex items-center justify-center gap-3 text-sm font-bold uppercase tracking-wider bg-primary hover:bg-primary/90 text-primary-foreground py-4 px-8 rounded-[var(--radius-neumorph)] shadow-[0_0_20px_rgba(201,162,77,0.3)] transition-all scale-100 active:scale-95 group"
                        >
                            Return to Login <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>

                    <p className="mt-8 text-xs text-muted-foreground">
                        Didn't receive an email? Check your spam folder or return to login and try signing in to resend.
                    </p>
                </div>
            </main>
        </div>
    );
}
