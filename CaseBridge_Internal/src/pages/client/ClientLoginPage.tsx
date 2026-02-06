import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import AuthNavbar from '@/components/layout/AuthNavbar';

export default function ClientLoginPage() {
    const navigate = useNavigate();

    const [loginMode, setLoginMode] = useState<'otp' | 'password'>('password');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setMessage('');

        try {
            if (loginMode === 'password') {
                const { error, data } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });

                if (error) throw error;

                // Check if user is actually a client
                if (data.user) {
                    const { data: clientProfile } = await supabase
                        .from('client_profiles')
                        .select('id')
                        .eq('id', data.user.id)
                        .single();

                    if (clientProfile) {
                        navigate('/client/dashboard');
                    } else {
                        // Not a client profile, maybe internal trying to log in? 
                        // Or check if they are internal in user_firm_roles?
                        // For V1 client portal, we assume strict separation or dual roles handled by table checks.
                        // If no client profile, warn them.
                        await supabase.auth.signOut();
                        setError('Account exists but is not registered as a Client. Please use the Internal Portal.');
                    }
                }
            } else {
                // OTP Login (Magic Link)
                const { error } = await supabase.auth.signInWithOtp({
                    email,
                    options: {
                        emailRedirectTo: `${window.location.origin}/client/dashboard`
                    }
                });
                if (error) throw error;
                setMessage('Check your email for the secure login link.');
            }
        } catch (err: any) {
            console.error('Login error:', err);
            setError(err.message || 'Failed to authenticate');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <AuthNavbar variant="client" />
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 flex items-center justify-center p-6 text-white relative overflow-hidden pt-24">
                {/* Animated Background Elements */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-900/30 via-transparent to-transparent" />
                    <div className="absolute bottom-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent" />

                    {/* Floating Orbs */}
                    <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[120px] animate-pulse" />
                    <div className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-[120px] animate-pulse delay-700" />
                </div>

                {/* Glassmorphic Card */}
                <div className="w-full max-w-md relative z-10">
                    <div className="bg-white/[0.03] border border-white/[0.08] p-10 rounded-3xl backdrop-blur-2xl relative shadow-2xl shadow-black/50">
                        {/* Glass shine effect */}
                        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/[0.08] to-transparent pointer-events-none" />

                        <div className="relative z-10">
                            {/* Header */}
                            <div className="text-center mb-10">
                                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-purple-500/30 relative group">
                                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="text-white font-black text-2xl relative z-10">CB</div>
                                </div>
                                <h1 className="text-4xl font-black mb-3 tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                                    Client Portal
                                </h1>
                                <p className="text-slate-400 font-medium">Secure access to your legal matters</p>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="mb-6 bg-red-500/10 border border-red-500/30 backdrop-blur-xl rounded-2xl p-4 flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-300 font-medium">{error}</p>
                                </div>
                            )}

                            {/* Success Message */}
                            {message && (
                                <div className="mb-6 bg-green-500/10 border border-green-500/30 backdrop-blur-xl rounded-2xl p-4 flex items-start gap-3">
                                    <Mail className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-green-300 font-medium">{message}</p>
                                </div>
                            )}

                            {/* Login Form */}
                            <form className="space-y-5" onSubmit={handleLogin}>
                                <div>
                                    <label htmlFor="email" className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">
                                        Email address
                                    </label>
                                    <div className="relative group">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            autoComplete="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 focus:bg-white/[0.05] transition-all placeholder:text-slate-600 font-medium backdrop-blur-xl"
                                            placeholder="Enter your registered email"
                                        />
                                    </div>
                                </div>

                                {loginMode === 'password' && (
                                    <div>
                                        <label htmlFor="password" className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">
                                            Password
                                        </label>
                                        <div className="relative group">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                                            <input
                                                id="password"
                                                name="password"
                                                type={showPassword ? "text" : "password"}
                                                autoComplete="current-password"
                                                required
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3.5 pl-12 pr-12 text-white focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 focus:bg-white/[0.05] transition-all placeholder:text-slate-600 font-medium backdrop-blur-xl"
                                                placeholder="••••••••"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-purple-400 transition-colors"
                                            >
                                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black uppercase tracking-widest py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xl shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Authenticating...
                                        </>
                                    ) : loginMode === 'password' ? 'Sign in securely' : 'Send Magic Link'}
                                </button>
                            </form>

                            {/* Alternative Login */}
                            <div className="mt-6">
                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-white/10" />
                                    </div>
                                    <div className="relative flex justify-center text-sm">
                                        <span className="px-3 bg-transparent text-slate-500 font-medium backdrop-blur-xl">
                                            Alternative Login
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-6">
                                    <button
                                        onClick={() => setLoginMode(loginMode === 'password' ? 'otp' : 'password')}
                                        className="w-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-white font-bold py-3 rounded-xl transition-all backdrop-blur-xl"
                                    >
                                        {loginMode === 'password' ? 'Sign in with Magic Link' : 'Sign in with Password'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="absolute bottom-6 text-center text-[10px] text-slate-700 font-mono tracking-wider">
                    CASEBRIDGE CLIENT PORTAL v2.0.0
                </div>
            </div>
        </>
    );
}
