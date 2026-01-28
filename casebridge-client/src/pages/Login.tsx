import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';

export default function Login() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
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
            setError(err.message || 'Failed to login');
            // If login failed, it might be because of email not confirmed if Supabase enforces it.
            // But typically we can still sign in, just session might be limited or we check status manually.
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
                    <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />

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
