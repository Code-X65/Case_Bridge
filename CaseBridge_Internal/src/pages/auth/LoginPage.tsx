import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, ShieldCheck, AlertCircle } from 'lucide-react';

const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [checkingAuth, setCheckingAuth] = useState(true);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
    });

    // Check if user is already logged in
    useEffect(() => {
        const checkSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();

                if (session) {
                    // User is already logged in, redirect to dashboard
                    navigate('/dashboard', { replace: true });
                }
            } catch (error) {
                console.error('Session check error:', error);
            } finally {
                setCheckingAuth(false);
            }
        };

        checkSession();
    }, [navigate]);

    const onSubmit = async (values: LoginFormValues) => {
        setLoading(true);
        setError(null);

        try {
            // Sign in with Supabase
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: values.email,
                password: values.password,
            });

            if (authError) throw authError;

            if (!authData.user) {
                throw new Error('Login failed');
            }

            console.log('✅ Auth successful for user:', authData.user.id);

            // Check if user is internal user with timeout
            try {
                console.log('🔍 Fetching profile for user:', authData.user.id);

                const profilePromise = supabase
                    .from('profiles')
                    .select('internal_role, status, firm_id')
                    .eq('id', authData.user.id)
                    .single();

                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Profile fetch timeout - RLS may be blocking')), 5000)
                );

                const { data: profile, error: profileError } = await Promise.race([
                    profilePromise,
                    timeoutPromise
                ]) as any;

                if (profileError) {
                    console.error('❌ Profile fetch error:', profileError);
                    throw profileError;
                }

                console.log('✅ Profile fetched:', profile);

                if (!profile.internal_role) {
                    console.error('❌ No internal_role found for user');
                    await supabase.auth.signOut();
                    throw new Error('This portal is for internal users only');
                }

                if (profile.status !== 'active') {
                    console.error('❌ User status is not active:', profile.status);
                    await supabase.auth.signOut();
                    throw new Error(`Your account is ${profile.status}. Contact your administrator.`);
                }

                console.log('✅ Login successful! Role:', profile.internal_role);
                // Successful login - redirect to dashboard
                navigate('/dashboard');
            } catch (profileErr: any) {
                console.error('❌ Profile check failed:', profileErr);
                await supabase.auth.signOut();
                throw profileErr;
            }
        } catch (err: any) {
            console.error('❌ Login error:', err);
            setError(err.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Show loading while checking authentication
    if (checkingAuth) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-sm text-slate-600 font-medium">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
            <div className="max-w-md w-full space-y-8">
                {/* Header */}
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-md mb-4">
                        <ShieldCheck className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-semibold text-slate-900 uppercase tracking-tight">
                        CaseBridge Internal
                    </h1>
                    <p className="mt-2 text-sm text-slate-600 font-medium">
                        Sign in to access your workspace
                    </p>
                </div>

                {/* Login Form */}
                <div className="bg-white p-8 rounded-md shadow-lg border border-slate-100">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {/* Error Alert */}
                        {error && (
                            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-md">
                                <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-bold text-red-900">Login Failed</p>
                                    <p className="text-xs text-red-700 mt-0.5">{error}</p>
                                </div>
                            </div>
                        )}

                        {/* Email Field */}
                        <div>
                            <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                                Email Address
                            </label>
                            <input
                                {...register('email')}
                                type="email"
                                id="email"
                                className="w-full h-11 px-4 bg-slate-50 border border-transparent focus:bg-white focus:border-primary rounded-md text-sm font-medium transition-all outline-none"
                                placeholder="your.email@firm.com"
                                disabled={loading}
                            />
                            {errors.email && (
                                <p className="mt-1.5 text-xs text-red-600 font-medium">{errors.email.message}</p>
                            )}
                        </div>

                        {/* Password Field */}
                        <div>
                            <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                                Password
                            </label>
                            <input
                                {...register('password')}
                                type="password"
                                id="password"
                                className="w-full h-11 px-4 bg-slate-50 border border-transparent focus:bg-white focus:border-primary rounded-md text-sm font-medium transition-all outline-none"
                                placeholder="••••••••"
                                disabled={loading}
                            />
                            {errors.password && (
                                <p className="mt-1.5 text-xs text-red-600 font-medium">{errors.password.message}</p>
                            )}
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold text-sm uppercase tracking-wide rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Signing In...
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>

                    {/* Footer Note */}
                    <div className="mt-6 pt-6 border-t border-slate-100">
                        <p className="text-center text-xs text-slate-500">
                            Internal access only. Need an account?{' '}
                            <span className="text-primary font-bold">Contact your administrator</span>
                        </p>
                    </div>
                </div>

                {/* Security Notice */}
                <div className="text-center">
                    <p className="text-xs text-slate-400 font-medium">
                        🔒 Secure connection • All activity is logged
                    </p>
                </div>
            </div>
        </div>
    );
}
