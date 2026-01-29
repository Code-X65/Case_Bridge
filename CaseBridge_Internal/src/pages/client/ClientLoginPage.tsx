import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';

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
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-indigo-600 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 text-white font-bold text-xl shadow-lg shadow-indigo-500/30">
                    CB
                </div>
                <h2 className="text-center text-3xl font-extrabold text-slate-900 tracking-tight">
                    CaseBridge Client Portal
                </h2>
                <p className="mt-2 text-center text-sm text-slate-600">
                    Secure access to your legal matters
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-slate-100">

                    {error && (
                        <div className="mb-6 bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-600 font-medium">{error}</p>
                        </div>
                    )}

                    {message && (
                        <div className="mb-6 bg-green-50 border border-green-100 rounded-xl p-4 flex items-start gap-3">
                            <Mail className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-green-600 font-medium">{message}</p>
                        </div>
                    )}

                    <form className="space-y-6" onSubmit={handleLogin}>
                        <div>
                            <label htmlFor="email" className="block text-sm font-bold text-slate-700">
                                Email address
                            </label>
                            <div className="mt-1 relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="appearance-none block w-full px-3 py-3 pl-10 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
                                    placeholder="Enter your registered email"
                                />
                            </div>
                        </div>

                        {loginMode === 'password' && (
                            <div>
                                <label htmlFor="password" className="block text-sm font-bold text-slate-700">
                                    Password
                                </label>
                                <div className="mt-1 relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        autoComplete="current-password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="appearance-none block w-full px-3 py-3 pl-10 pr-12 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>
                        )}

                        <div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Authenticating...
                                    </>
                                ) : loginMode === 'password' ? 'Sign in securely' : 'Send Magic Link'}
                            </button>
                        </div>
                    </form>

                    <div className="mt-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-200" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-slate-500 font-medium">
                                    Alternative Login
                                </span>
                            </div>
                        </div>

                        <div className="mt-6">
                            <button
                                onClick={() => setLoginMode(loginMode === 'password' ? 'otp' : 'password')}
                                className="w-full inline-flex justify-center py-2.5 px-4 border border-slate-300 rounded-xl shadow-sm bg-white text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                            >
                                {loginMode === 'password' ? 'Sign in with Magic Link' : 'Sign in with Password'}
                            </button>
                        </div>

                        <div className="mt-6 text-center">
                            <a href="/internal/login" className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors">
                                Go to Staff Portal
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
