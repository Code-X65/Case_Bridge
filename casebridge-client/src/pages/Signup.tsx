import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/visitor/Header';
import {
    Eye,
    EyeOff,
    User,
    Mail,
    Phone,
    Globe,
    Lock,
    ShieldCheck,
    AlertCircle,
    CheckCircle2
} from 'lucide-react';

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

        // Validations
        if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone || !formData.country || !formData.password) {
            setError("Please fill in all details.");
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (formData.password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        if (!formData.agreeTerms || !formData.agreeRelationship) {
            setError("You must accept the terms and acknowledgments.");
            return;
        }

        setLoading(true);

        try {
            // Check email
            const { data: existingClient } = await supabase
                .from('external_users')
                .select('id')
                .eq('email', formData.email)
                .maybeSingle();

            if (existingClient) {
                setError("An account with this email already exists. Please log in.");
                setLoading(false);
                return;
            }

            const { data: existingInternal } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', formData.email)
                .maybeSingle();

            if (existingInternal) {
                setError("This email is registered to an internal staff account. Please use a different email for client access.");
                setLoading(false);
                return;
            }

            const { error: signUpError } = await supabase.auth.signUp({
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

            if (signUpError) throw signUpError;
            navigate('/email-verification-pending');
        } catch (err: any) {
            setError(err.message || 'An error occurred during signup');
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
                {/* Left side / Top side content */}
                <div className="w-full xl:w-5/12 p-8 xl:p-16 flex flex-col justify-center border-b xl:border-b-0 xl:border-r border-border bg-card/30 backdrop-blur-xl">
                    <div className="max-w-xl mx-auto xl:mx-0">
                        <h1 className="text-4xl sm:text-5xl xl:text-6xl font-bold tracking-tight text-foreground mb-6">
                            Create Your <span className="text-primary">CaseBridge</span> Account
                        </h1>
                        <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
                            Join our platform to manage your legal needs efficiently. We ensure your personal data is protected by enterprise-grade encryption.
                        </p>

                        <div className="space-y-6">
                            <div className="flex items-start gap-4 p-4 rounded-xl bg-card border border-border shadow-neumorph-inset">
                                <div className="p-3 bg-primary/10 rounded-lg text-primary">
                                    <ShieldCheck size={24} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-foreground">Secure & Private</h3>
                                    <p className="text-sm text-muted-foreground">Your information is handled with the utmost confidentiality.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4 p-4 rounded-xl bg-card border border-border shadow-neumorph-inset">
                                <div className="p-3 bg-primary/10 rounded-lg text-primary">
                                    <User size={24} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-foreground">Personalized Dashboard</h3>
                                    <p className="text-sm text-muted-foreground">Get instant access to your cases, documents, and updates.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form section */}
                <div className="w-full xl:w-7/12 p-8 xl:p-16 flex flex-col justify-center overflow-y-auto">
                    <div className="max-w-2xl mx-auto w-full">
                        <div className="mb-8 flex items-center justify-between">
                            <h2 className="text-2xl font-bold">Registration Form</h2>
                            <p className="text-sm text-muted-foreground">
                                Already have an account? <Link to="/login" className="text-primary hover:underline font-semibold">Login</Link>
                            </p>
                        </div>

                        {error && (
                            <div className="mb-8 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-sm font-semibold flex items-center gap-3 animate-fade-in shadow-neumorph-inset">
                                <AlertCircle size={18} />
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-8">

                            {/* Personal Details */}
                            <div className="space-y-6">
                                <h3 className="text-lg font-semibold border-b border-border pb-2 flex items-center gap-2">
                                    <User size={18} className="text-primary" /> Personal Details
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">First Name</label>
                                        <input
                                            name="firstName"
                                            required
                                            value={formData.firstName}
                                            onChange={handleChange}
                                            placeholder="John"
                                            className="w-full bg-input border border-border rounded-[var(--radius-neumorph)] px-4 py-3 text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-neumorph-inset"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Last Name</label>
                                        <input
                                            name="lastName"
                                            required
                                            value={formData.lastName}
                                            onChange={handleChange}
                                            placeholder="Doe"
                                            className="w-full bg-input border border-border rounded-[var(--radius-neumorph)] px-4 py-3 text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-neumorph-inset"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                        <Mail size={14} /> Email Address
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        required
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="john@example.com"
                                        className="w-full bg-input border border-border rounded-[var(--radius-neumorph)] px-4 py-3 text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-neumorph-inset"
                                    />
                                </div>
                            </div>

                            {/* Contact & Location */}
                            <div className="space-y-6">
                                <h3 className="text-lg font-semibold border-b border-border pb-2 flex items-center gap-2">
                                    <Globe size={18} className="text-primary" /> Contact & Location
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                            <Phone size={14} /> Phone
                                        </label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            required
                                            value={formData.phone}
                                            onChange={handleChange}
                                            placeholder="+1 234 567 8900"
                                            className="w-full bg-input border border-border rounded-[var(--radius-neumorph)] px-4 py-3 text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-neumorph-inset"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                            <Globe size={14} /> Country
                                        </label>
                                        <input
                                            name="country"
                                            required
                                            value={formData.country}
                                            onChange={handleChange}
                                            placeholder="United States"
                                            className="w-full bg-input border border-border rounded-[var(--radius-neumorph)] px-4 py-3 text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-neumorph-inset"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Security Setup */}
                            <div className="space-y-6">
                                <h3 className="text-lg font-semibold border-b border-border pb-2 flex items-center gap-2">
                                    <Lock size={18} className="text-primary" /> Security
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-2 relative">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Password</label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                name="password"
                                                required
                                                value={formData.password}
                                                onChange={handleChange}
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

                                    <div className="space-y-2 relative">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Confirm Password</label>
                                        <div className="relative">
                                            <input
                                                type={showConfirmPassword ? "text" : "password"}
                                                name="confirmPassword"
                                                required
                                                value={formData.confirmPassword}
                                                onChange={handleChange}
                                                placeholder="••••••••"
                                                className="w-full bg-input border border-border rounded-[var(--radius-neumorph)] px-4 py-3 pr-12 text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-neumorph-inset"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Acknowledgments */}
                            <div className="space-y-4 pt-4 border-t border-border">
                                <label className="flex items-start gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-all cursor-pointer group shadow-neumorph">
                                    <div className="relative flex items-center h-5 mt-0.5">
                                        <input
                                            type="checkbox"
                                            name="agreeTerms"
                                            checked={formData.agreeTerms}
                                            onChange={handleChange}
                                            className="w-5 h-5 rounded-md border-border bg-input text-primary focus:ring-primary transition-all cursor-pointer shadow-neumorph-inset accent-primary"
                                        />
                                    </div>
                                    <div>
                                        <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">Accept Governance Framework</span>
                                        <p className="text-xs text-muted-foreground mt-1 font-medium">I engage to the Terms of Service & Privacy Policy of CaseBridge.</p>
                                    </div>
                                </label>

                                <label className="flex items-start gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-all cursor-pointer group shadow-neumorph">
                                    <div className="relative flex items-center h-5 mt-0.5">
                                        <input
                                            type="checkbox"
                                            name="agreeRelationship"
                                            checked={formData.agreeRelationship}
                                            onChange={handleChange}
                                            className="w-5 h-5 rounded-md border-border bg-input text-primary focus:ring-primary transition-all cursor-pointer shadow-neumorph-inset accent-primary"
                                        />
                                    </div>
                                    <div>
                                        <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">Counsel Acknowledgment</span>
                                        <p className="text-xs text-muted-foreground mt-1 font-medium">Registration does not establish an attorney-client relationship.</p>
                                    </div>
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-3 text-sm font-bold uppercase tracking-wider bg-primary hover:bg-primary/90 text-primary-foreground py-4 px-8 rounded-[var(--radius-neumorph)] shadow-[0_0_20px_rgba(201,162,77,0.3)] transition-all scale-100 active:scale-95 disabled:opacity-50 disabled:pointer-events-none mt-8 group"
                            >
                                {loading ? "Creating Account..." : <>Finalize Registration <CheckCircle2 size={18} className="group-hover:scale-110 transition-transform" /></>}
                            </button>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
}
