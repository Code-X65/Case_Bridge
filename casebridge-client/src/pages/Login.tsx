import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/visitor/Header';
import {
    Eye,
    EyeOff,
    Mail,
    Lock,
    ShieldCheck,
    AlertCircle,
    ArrowRight,
    User
} from 'lucide-react';

export default function Login() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) throw authError;

            if (!user) throw new Error('No user found');

            // Check user status in external_users
            const { data: userData, error: userError } = await supabase
                .from('external_users')
                .select('status')
                .eq('id', user.id)
                .single();

            if (userError) throw userError;

            if (userData.status === 'registered') {
                // Needs email verification
                navigate('/email-verification-pending');
            } else if (userData.status === 'verified') {
                // Needs onboarding
                navigate('/onboarding');
            } else {
                // Active
                navigate('/dashboard');
            }

        } catch (err: any) {
            console.error('Login error:', err);

            // Handle Email Not Confirmed specifically
            if (err.message?.includes('Email not confirmed') || err.status === 400 && err.message?.includes('confirm')) {
                setError('Your email is not verified. A new verification link has been sent to your inbox.');
                try {
                    await supabase.auth.resend({
                        type: 'signup',
                        email: email,
                        options: {
                            emailRedirectTo: `${window.location.origin}/verify-email`
                        }
                    });
                } catch (resendErr) {
                    console.error('Failed to resend verification:', resendErr);
                }
                setLoading(false);
                return;
            }

            setError(err.message || 'Failed to login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col font-sans relative overflow-hidden">
            <Header />

            {/* Background decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            <main className="flex-1 flex flex-col xl:flex-row relative z-10 pt-20">
                {/* Left side value proposition */}
                <div className="w-full xl:w-5/12 p-8 xl:p-16 flex flex-col justify-center border-b xl:border-b-0 xl:border-r border-border bg-card/30 backdrop-blur-xl">
                    <div className="max-w-xl mx-auto xl:mx-0">
                        <h1 className="text-4xl sm:text-5xl xl:text-6xl font-bold tracking-tight text-foreground mb-6">
                            Welcome Back to <span className="text-primary">CaseBridge</span>
                        </h1>
                        <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
                            Sign in to access your secure client portal, track your case progress, and communicate safely with your legal team.
                        </p>

                        <div className="space-y-6">
                            <div className="flex items-start gap-4 p-4 rounded-xl bg-card border border-border shadow-neumorph-inset">
                                <div className="p-3 bg-primary/10 rounded-lg text-primary">
                                    <ShieldCheck size={24} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-foreground">Secure Access</h3>
                                    <p className="text-sm text-muted-foreground">End-to-end encrypted connection protecting your legal communications.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4 p-4 rounded-xl bg-card border border-border shadow-neumorph-inset">
                                <div className="p-3 bg-primary/10 rounded-lg text-primary">
                                    <User size={24} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-foreground">Client Dashboard</h3>
                                    <p className="text-sm text-muted-foreground">Your centralized hub for document management and status updates.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form section */}
                <div className="w-full xl:w-7/12 p-8 xl:p-16 flex flex-col justify-center overflow-y-auto">
                    <div className="max-w-md mx-auto w-full">
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold mb-2">Secure Login</h2>
                            <p className="text-sm text-muted-foreground">
                                Access your CaseBridge account
                            </p>
                        </div>

                        {error && (
                            <div className="mb-8 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-sm font-semibold flex items-center gap-3 animate-fade-in shadow-neumorph-inset">
                                <AlertCircle size={18} />
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                        <Mail size={14} /> Email Address
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="john@example.com"
                                        className="w-full bg-input border border-border rounded-[var(--radius-neumorph)] px-4 py-3 text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-neumorph-inset"
                                    />
                                </div>

                                <div className="space-y-2 relative">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                            <Lock size={14} /> Password
                                        </label>
                                        <Link to="/forgot-password" className="text-xs font-bold text-primary hover:underline">
                                            Forgot password?
                                        </Link>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full bg-input border border-border rounded-[var(--radius-neumorph)] px-4 py-3 pr-12 text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-neumorph-inset"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-3 text-sm font-bold uppercase tracking-wider bg-primary hover:bg-primary/90 text-primary-foreground py-4 px-8 rounded-[var(--radius-neumorph)] shadow-[0_0_20px_rgba(201,162,77,0.3)] transition-all scale-100 active:scale-95 disabled:opacity-50 disabled:pointer-events-none mt-4 group"
                            >
                                {loading ? "Authenticating..." : <>Access Portal <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></>}
                            </button>

                            <div className="pt-6 border-t border-border mt-8 text-center">
                                <p className="text-sm text-muted-foreground">
                                    Don't have an account yet?{' '}
                                    <Link to="/signup" className="text-primary hover:underline font-semibold">
                                        Sign Up Here
                                    </Link>
                                </p>
                            </div>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
}
