import React, { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import {
    Eye,
    EyeOff,
    User,
    Mail,
    Phone,
    Globe,
    Lock,
    ShieldCheck,
    ChevronRight,
    ChevronLeft,
    CheckCircle2
} from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

export default function Signup() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
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

    const stepRef = useRef<HTMLDivElement>(null);
    const progressRef = useRef<HTMLDivElement>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const nextStep = () => {
        if (step === 1) {
            if (!formData.firstName || !formData.lastName || !formData.email) {
                setError("Please fill in all personal details.");
                return;
            }
        }
        if (step === 2) {
            if (!formData.phone || !formData.country || !formData.password) {
                setError("Please complete your account setup.");
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
        }

        if (step === 1) {
            checkEmailAvailability();
        } else {
            proceedToNextStep();
        }
    };

    const checkEmailAvailability = async () => {
        setLoading(true);
        setError(null);
        try {
            // 1. Check if user already exists in external_users
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

            // 2. Check if user already exists in internal profiles
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

            proceedToNextStep();
        } catch (err) {
            console.error("Email check error:", err);
            proceedToNextStep(); // Fallback
        } finally {
            setLoading(false);
        }
    };

    const proceedToNextStep = () => {
        setError(null);
        gsap.to(stepRef.current, {
            opacity: 0,
            x: -20,
            duration: 0.3,
            onComplete: () => {
                setStep(s => s + 1);
                gsap.fromTo(stepRef.current, { x: 20, opacity: 0 }, { x: 0, opacity: 1, duration: 0.3 });
            }
        });
    };

    const prevStep = () => {
        setError(null);
        gsap.to(stepRef.current, {
            opacity: 0,
            x: 20,
            duration: 0.3,
            onComplete: () => {
                setStep(s => s - 1);
                gsap.fromTo(stepRef.current, { x: -20, opacity: 0 }, { x: 0, opacity: 1, duration: 0.3 });
            }
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!formData.agreeTerms || !formData.agreeRelationship) {
            setError("You must accept the terms and acknowledgments.");
            return;
        }

        setLoading(true);

        try {
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

    useGSAP(() => {
        gsap.to(progressRef.current, {
            width: `${(step / 3) * 100}%`,
            duration: 0.5,
            ease: "power2.out"
        });
    }, [step]);

    return (
        <div className="page-container bg-[#020617] relative overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            <div className="glass-card auth-card relative z-10 border-white/5 bg-slate-900/40 backdrop-blur-3xl shadow-2xl rounded-[2.5rem] overflow-hidden">
                {/* Progress Bar */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-white/5">
                    <div ref={progressRef} className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                </div>

                <div className="p-2 sm:p-4">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 mb-1 block">Step 0{step} / 03</span>
                            <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">
                                {step === 1 && "Personal Identity"}
                                {step === 2 && "Account Setup"}
                                {step === 3 && "Verification"}
                            </h1>
                        </div>
                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                            {step === 1 && <User className="text-blue-400" size={24} />}
                            {step === 2 && <Lock className="text-indigo-400" size={24} />}
                            {step === 3 && <ShieldCheck className="text-emerald-400" size={24} />}
                        </div>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-3 animate-fade-in">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <div ref={stepRef}>
                        {step === 1 && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase tracking-widest font-black text-slate-500 flex items-center gap-2">
                                            First Name
                                        </label>
                                        <input
                                            name="firstName"
                                            required
                                            value={formData.firstName}
                                            onChange={handleChange}
                                            placeholder="John"
                                            className="bg-white/5 border-white/10 focus:ring-blue-500/50"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase tracking-widest font-black text-slate-500">
                                            Last Name
                                        </label>
                                        <input
                                            name="lastName"
                                            required
                                            value={formData.lastName}
                                            onChange={handleChange}
                                            placeholder="Doe"
                                            className="bg-white/5 border-white/10 focus:ring-blue-500/50"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase tracking-widest font-black text-slate-500 flex items-center gap-2">
                                        <Mail size={12} /> Email Address
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        required
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="john@example.com"
                                        className="bg-white/5 border-white/10 focus:ring-blue-500/50"
                                    />
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase tracking-widest font-black text-slate-500 flex items-center gap-2">
                                            <Phone size={12} /> Phone
                                        </label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            required
                                            value={formData.phone}
                                            onChange={handleChange}
                                            placeholder="+1 234..."
                                            className="bg-white/5 border-white/10 focus:ring-indigo-500/50"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase tracking-widest font-black text-slate-500 flex items-center gap-2">
                                            <Globe size={12} /> Country
                                        </label>
                                        <input
                                            name="country"
                                            required
                                            value={formData.country}
                                            onChange={handleChange}
                                            placeholder="United States"
                                            className="bg-white/5 border-white/10 focus:ring-indigo-500/50"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 relative">
                                    <label className="text-[10px] uppercase tracking-widest font-black text-slate-500">Password</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            name="password"
                                            required
                                            value={formData.password}
                                            onChange={handleChange}
                                            className="bg-white/5 border-white/10 focus:ring-indigo-500/50 pr-12"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase tracking-widest font-black text-slate-500">Confirm Password</label>
                                    <div className="relative">
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            name="confirmPassword"
                                            required
                                            value={formData.confirmPassword}
                                            onChange={handleChange}
                                            className="bg-white/5 border-white/10 focus:ring-indigo-500/50 pr-12"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                                        >
                                            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-6">
                                <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                        Please review and accept our security protocols and legal acknowledgments to proceed.
                                        CaseBridge ensures your data is protected by enterprise-grade encryption.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <label className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/[0.08] transition-all cursor-pointer group">
                                        <div className="relative flex items-center h-5">
                                            <input
                                                type="checkbox"
                                                name="agreeTerms"
                                                checked={formData.agreeTerms}
                                                onChange={handleChange}
                                                className="w-5 h-5 rounded-md border-white/20 bg-black/20 text-blue-500 focus:ring-blue-500/50 transition-all cursor-pointer"
                                            />
                                        </div>
                                        <div>
                                            <span className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">Accept Governance Framework</span>
                                            <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-medium">Terms of Service & Privacy Policy</p>
                                        </div>
                                    </label>

                                    <label className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/[0.08] transition-all cursor-pointer group">
                                        <div className="relative flex items-center h-5">
                                            <input
                                                type="checkbox"
                                                name="agreeRelationship"
                                                checked={formData.agreeRelationship}
                                                onChange={handleChange}
                                                className="w-5 h-5 rounded-md border-white/20 bg-black/20 text-emerald-500 focus:ring-emerald-500/50 transition-all cursor-pointer"
                                            />
                                        </div>
                                        <div>
                                            <span className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">Counsel Acknowledgment</span>
                                            <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-medium font-bold">Registration does not establish an attorney-client relationship</p>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
                        {step > 1 && (
                            <button
                                type="button"
                                onClick={prevStep}
                                className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white py-4 px-8 rounded-2xl border border-white/5 hover:bg-white/5 transition-all w-full sm:w-auto"
                            >
                                <ChevronLeft size={14} /> Back
                            </button>
                        )}

                        {step < 3 ? (
                            <button
                                type="button"
                                onClick={nextStep}
                                disabled={loading}
                                className="flex-1 flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] bg-blue-600 hover:bg-blue-500 text-white py-4 px-8 rounded-2xl shadow-xl shadow-blue-600/20 transition-all w-full scale-100 active:scale-95 group disabled:opacity-50"
                            >
                                {loading ? "Checking Identity..." : <>Next Step <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" /></>}
                            </button>
                        ) : (
                            <button
                                type="submit"
                                onClick={handleSubmit}
                                disabled={loading}
                                className="flex-1 flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] bg-emerald-600 hover:bg-emerald-500 text-white py-4 px-8 rounded-2xl shadow-xl shadow-emerald-600/20 transition-all w-full scale-100 active:scale-95 group disabled:opacity-50"
                            >
                                {loading ? "Initializing..." : <>Finalize Registration <CheckCircle2 size={14} /></>}
                            </button>
                        )}
                    </div>

                    <p className="text-center mt-8 text-[10px] font-black uppercase tracking-widest text-slate-500">
                        Already authenticated? <Link to="/login" className="text-blue-500 hover:text-blue-400 ml-2">Secure Login</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

// Helper components
const AlertCircle = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
);
