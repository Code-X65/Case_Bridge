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
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        setError('');
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/client/dashboard`
                }
            });
            if (error) throw error;
        } catch (err: any) {
            console.error('Google login error:', err);
            setError(err.message || 'Failed to initialize Google login');
            setIsLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!email) {
            setError('Please enter your email first to reset password.');
            return;
        }
        setIsLoading(true);
        setError('');
        setMessage('');
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/client/update-password`
            });
            if (error) throw error;
            setMessage('Password reset link sent to your email.');
        } catch (err: any) {
            console.error('Reset password error:', err);
            setError(err.message || 'Failed to send reset link');
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
                    <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[120px] animate-pulse" />
                    <div className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-[120px] animate-pulse delay-700" />
                </div>

                {/* Glassmorphic Card */}
                <div className="w-full max-w-md relative z-10">
                    <div className="bg-white/[0.03] border border-white/[0.08] p-10 rounded-3xl backdrop-blur-2xl relative shadow-2xl shadow-black/50">
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

                            {/* Messages */}
                            {error && (
                                <div className="mb-6 bg-red-500/10 border border-red-500/30 backdrop-blur-xl rounded-2xl p-4 flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-300 font-medium">{error}</p>
                                </div>
                            )}

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
                                    <>
                                        <div className="flex justify-between items-center px-1">
                                            <label htmlFor="password" className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                                                Password
                                            </label>
                                            <button
                                                type="button"
                                                onClick={handleForgotPassword}
                                                className="text-[10px] font-black text-purple-400 uppercase tracking-widest hover:text-purple-300 transition-colors mb-2"
                                            >
                                                Forgot Reset?
                                            </button>
                                        </div>
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
                                    </>
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

                                <div className="mt-6 grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => setLoginMode(loginMode === 'password' ? 'otp' : 'password')}
                                        className="w-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-white font-bold py-3 rounded-xl transition-all backdrop-blur-xl text-xs uppercase tracking-widest"
                                    >
                                        {loginMode === 'password' ? 'Magic Link' : 'Password'}
                                    </button>
                                    <button
                                        onClick={handleGoogleLogin}
                                        className="w-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-white font-bold py-3 rounded-xl transition-all backdrop-blur-xl flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
                                    >
                                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path fill="currentColor" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
                                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                        </svg>
                                        Google
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
