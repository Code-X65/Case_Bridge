import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';

export default function Signup() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        country: '',
        password: '',
        confirmPassword: '',
        agreeTerms: false,
        agreeRelationship: false,
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;

        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        if (formData.password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }
        if (!formData.agreeTerms || !formData.agreeRelationship) {
            setError("You must accept the terms and acknowledgments.");
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        first_name: formData.firstName,
                        last_name: formData.lastName,
                        phone: formData.phone,
                        country: formData.country,
                    },
                    emailRedirectTo: `${window.location.origin}/verify-email`
                }
            });

            if (error) throw error;

            navigate('/email-verification-pending');
        } catch (err: any) {
            setError(err.message || 'An error occurred during signup');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-container">
            <div className="glass-card auth-card">
                <h1 className="text-center mb-4">Create Account</h1>
                <p className="text-center text-muted mb-8 text-sm">Join CaseBridge securely</p>

                {error && (
                    <div className="mb-4 p-3 bg-red-900/20 border border-red-500/20 text-red-200 rounded text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label>First Name</label>
                            <input name="firstName" required value={formData.firstName} onChange={handleChange} placeholder="John" />
                        </div>
                        <div>
                            <label>Last Name</label>
                            <input name="lastName" required value={formData.lastName} onChange={handleChange} placeholder="Doe" />
                        </div>
                    </div>

                    <label>Email</label>
                    <input type="email" name="email" required value={formData.email} onChange={handleChange} placeholder="john@example.com" />

                    <label>Phone Number</label>
                    <input type="tel" name="phone" required value={formData.phone} onChange={handleChange} placeholder="+1 234 567 890" />

                    <label>Country</label>
                    <input name="country" required value={formData.country} onChange={handleChange} placeholder="United States" />

                    <label>Password</label>
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            name="password"
                            required
                            value={formData.password}
                            onChange={handleChange}
                            className="w-full pr-10"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>

                    <label>Confirm Password</label>
                    <div className="relative">
                        <input
                            type={showConfirmPassword ? "text" : "password"}
                            name="confirmPassword"
                            required
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            className="w-full pr-10"
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                            {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>

                    <div className="mb-4">
                        <label style={{ display: 'flex', alignItems: 'flex-start', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                name="agreeTerms"
                                checked={formData.agreeTerms}
                                onChange={handleChange}
                                style={{ width: 'auto', marginRight: '0.75rem', marginTop: '0.2rem' }}
                            />
                            <span className="text-sm">I accept the Terms of Service and Privacy Policy</span>
                        </label>
                    </div>

                    <div className="mb-8">
                        <label style={{ display: 'flex', alignItems: 'flex-start', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                name="agreeRelationship"
                                checked={formData.agreeRelationship}
                                onChange={handleChange}
                                style={{ width: 'auto', marginRight: '0.75rem', marginTop: '0.2rem' }}
                            />
                            <span className="text-sm">I acknowledge that creating an account <span className="font-bold text-white">does not</span> establish a lawyer–client relationship</span>
                        </label>
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Creating Account...' : 'Sign Up'}
                    </button>

                    <p className="text-center mt-6 text-sm">
                        Already have an account? <Link to="/login">Log In</Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
