import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';

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
        <div className="page-container">
            <div className="glass-card auth-card">
                <h1 className="text-center mb-4">Welcome Back</h1>
                <p className="text-center text-muted mb-8 text-sm">Sign in to your CaseBridge account</p>

                {error && (
                    <div className="mb-4 p-3 bg-red-900/20 border border-red-500/20 text-red-200 rounded text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <label>Email</label>
                    <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="john@example.com"
                    />

                    <label>Password</label>
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pr-10"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-[60%] text-gray-400 hover:text-white"
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>

                    <div className="text-right mb-6">
                        <Link to="/forgot-password" style={{ fontSize: '0.875rem' }}>Forgot password?</Link>
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Logging in...' : 'Log In'}
                    </button>

                    <p className="text-center mt-6 text-sm">
                        Don't have an account? <Link to="/signup">Sign Up</Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
