import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useInternalSession } from '@/hooks/useInternalSession';
import { useNavigate, Link } from 'react-router-dom';
import {
    ShieldCheck,
    Building2,
    User,
    Mail,
    Lock,
    Phone,
    MapPin,
    ArrowLeft,
    ArrowRight,
    Loader2,
    AlertCircle,
    CheckCircle2,
    Eye,
    EyeOff
} from 'lucide-react';

type FormStep = 'personal' | 'firm' | 'success';

export default function RegisterFirmPage() {
    const { session } = useInternalSession();
    const navigate = useNavigate();

    useEffect(() => {
        if (session) {
            navigate('/internal/dashboard');
        }
    }, [session, navigate]);

    // Form state
    const [step, setStep] = useState<FormStep>('personal');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Personal info
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [personalPhone, setPersonalPhone] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Firm info
    const [firmName, setFirmName] = useState('');
    const [firmEmail, setFirmEmail] = useState('');
    const [firmPhone, setFirmPhone] = useState('');
    const [firmAddress, setFirmAddress] = useState('');

    const handlePersonalNext = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        const complexityRegex = /^(?=.*[A-Z])(?=.*\d)/;
        if (!complexityRegex.test(password)) {
            setError('Password must contain at least one uppercase letter and one number');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setStep('firm');
    };

    const handleFirmSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            console.log('🚀 Starting firm registration...');

            // CRITICAL: Clear any existing session first
            await supabase.auth.signOut();
            console.log('🧹 Cleared any existing session');

            // STEP 1: Create Supabase auth user with email confirmation
            const { data: authData, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/confirm`,
                },
            });

            if (signUpError) {
                console.error('❌ Signup error:', signUpError);
                throw signUpError;
            }
            if (!authData.user) {
                throw new Error('Failed to create user account');
            }

            console.log('✅ User created:', authData.user.id);
            console.log('📧 Email confirmation required:', !authData.session);

            // STEP 2: Use the user ID from authData (NOT from session)
            const userId = authData.user.id;
            console.log('🆔 Using user ID:', userId);

            // STEP 3: Store firm data in DATABASE (not localStorage!)
            console.log('💾 Saving pending registration to database...');

            // IDEMPOTENCY CHECK: Check if registration already exists
            const { data: existingPending } = await supabase
                .from('pending_firm_registrations')
                .select('id')
                .eq('user_id', userId)
                .maybeSingle();

            if (existingPending) {
                console.log('⚠️ Found existing pending registration, treating as success.');
                setStep('success');
                return;
            }

            // Add a small delay to ensure auth.users record is committed
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Retry logic for race condition handling
            let insertedData = null;
            let pendingError = null;
            const maxRetries = 3;

            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                console.log(`📝 Attempt ${attempt}/${maxRetries} to save pending registration...`);

                const result = await supabase
                    .from('pending_firm_registrations')
                    .insert({
                        user_id: userId,
                        firm_name: firmName,
                        firm_email: firmEmail || email,
                        firm_phone: firmPhone,
                        firm_address: firmAddress,
                        user_first_name: firstName,
                        user_last_name: lastName,
                        user_phone: personalPhone,
                    })
                    .select();

                if (!result.error) {
                    insertedData = result.data;
                    pendingError = null;
                    console.log('✅ Pending registration saved on attempt', attempt, insertedData);
                    break;
                }

                pendingError = result.error;
                console.warn(`⚠️ Attempt ${attempt} failed:`, pendingError.code, pendingError.message);

                // If duplicate key error (23505), treat as success (race condition won checking constraints)
                if (pendingError.code === '23505') {
                    console.log('✅ Caught duplicate key error (23505), treating as success.');
                    setStep('success');
                    return;
                }

                // If it's a foreign key error, wait and retry
                if (pendingError.code === '23503' && attempt < maxRetries) {
                    const delay = attempt * 1000; // Exponential backoff
                    console.log(`⏳ Waiting ${delay}ms before retry...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    // For non-recoverable errors, break
                    break;
                }
            }

            if (pendingError) {
                console.error('❌ Failed to save pending registration after retries:', pendingError);

                // Provide more specific error message
                if (pendingError.code === '42501') {
                    throw new Error('Permission denied. Please ensure you are logged in and try again.');
                } else if (pendingError.code === '23503') {
                    throw new Error('Database synchronization issue. Please contact support.');
                } else {
                    throw new Error(`Failed to save registration data: ${pendingError.message}`);
                }
            }

            // STEP 4: Show success message
            setStep('success');

        } catch (err: any) {
            console.error('❌ Registration error:', err);
            setError(err.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0F172A] text-white flex items-center justify-center p-6">
            <div className="w-full max-w-2xl">
                {/* Header */}
                <div className="text-center mb-8">
                    <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6">
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm font-medium">Back to Home</span>
                    </Link>

                    <div className="w-16 h-16 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mx-auto mb-4">
                        <Building2 className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-black tracking-tight mb-2">Register Your Firm</h1>
                    <p className="text-slate-400">Create your firm account and become an Admin Manager</p>
                </div>

                {/* Progress Indicator */}
                {step !== 'success' && (
                    <div className="flex items-center justify-center gap-4 mb-8">
                        <div className={`flex items-center gap-2 ${step === 'personal' ? 'text-indigo-400' : 'text-green-400'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step === 'personal' ? 'bg-indigo-600' : 'bg-green-600'}`}>
                                {step === 'firm' ? '✓' : '1'}
                            </div>
                            <span className="text-sm font-medium">Personal Info</span>
                        </div>
                        <div className="w-12 h-0.5 bg-white/10" />
                        <div className={`flex items-center gap-2 ${step === 'firm' ? 'text-indigo-400' : 'text-slate-600'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step === 'firm' ? 'bg-indigo-600' : 'bg-white/10'}`}>
                                2
                            </div>
                            <span className="text-sm font-medium">Firm Details</span>
                        </div>
                    </div>
                )}

                {/* Form Container */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-bold text-red-400">Error</p>
                                <p className="text-sm text-red-300 mt-1">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* STEP 1: Personal Info */}
                    {step === 'personal' && (
                        <form onSubmit={handlePersonalNext} className="space-y-5">
                            <h2 className="text-xl font-black mb-6">Admin Personal Information</h2>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                                        First Name *
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                        <input
                                            type="text"
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            required
                                            className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
                                            placeholder="John"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                                        Last Name *
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                        <input
                                            type="text"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            required
                                            className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
                                            placeholder="Doe"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                                    Email Address *
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
                                        placeholder="john.doe@lawfirm.com"
                                    />
                                </div>
                                <p className="text-xs text-slate-500 mt-1.5">This will be your login email</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                                    Phone (Optional)
                                </label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                    <input
                                        type="tel"
                                        value={personalPhone}
                                        onChange={(e) => setPersonalPhone(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
                                        placeholder="+1 (555) 123-4567"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                                    Password *
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={8}
                                        className="w-full pl-11 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                                <p className="text-xs text-slate-500 mt-1.5">Minimum 8 characters</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                                    Confirm Password *
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        className="w-full pl-11 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                                    >
                                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-sm tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 mt-6"
                            >
                                <span>Continue to Firm Details</span>
                                <ArrowRight className="w-5 h-5" />
                            </button>
                        </form>
                    )}

                    {/* STEP 2: Firm Info */}
                    {step === 'firm' && (
                        <form onSubmit={handleFirmSubmit} className="space-y-5">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-black">Firm Information</h2>
                                <button
                                    type="button"
                                    onClick={() => setStep('personal')}
                                    className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Back
                                </button>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                                    Firm Name *
                                </label>
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                    <input
                                        type="text"
                                        value={firmName}
                                        onChange={(e) => setFirmName(e.target.value)}
                                        required
                                        className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
                                        placeholder="Sterling Legal Associates"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                                    Firm Email
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                    <input
                                        type="email"
                                        value={firmEmail}
                                        onChange={(e) => setFirmEmail(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
                                        placeholder="contact@lawfirm.com"
                                    />
                                </div>
                                <p className="text-xs text-slate-500 mt-1.5">Leave blank to use your email</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                                    Firm Phone
                                </label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                    <input
                                        type="tel"
                                        value={firmPhone}
                                        onChange={(e) => setFirmPhone(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
                                        placeholder="+1 (555) 987-6543"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                                    Firm Address (Optional)
                                </label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                                    <textarea
                                        value={firmAddress}
                                        onChange={(e) => setFirmAddress(e.target.value)}
                                        rows={3}
                                        className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none resize-none"
                                        placeholder="123 Legal Street, Suite 100, New York, NY 10001"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-sm tracking-widest rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Creating Your Account...
                                    </>
                                ) : (
                                    <>
                                        <ShieldCheck className="w-5 h-5" />
                                        Complete Registration
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    {/* STEP 3: Success / Email Verification */}
                    {step === 'success' && (
                        <div className="text-center py-12">
                            <div className="w-20 h-20 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Mail className="w-10 h-10 text-green-400" />
                            </div>
                            <h2 className="text-2xl font-black mb-4">Check Your Email!</h2>
                            <p className="text-slate-400 mb-6 max-w-md mx-auto">
                                We've sent a verification email to <span className="text-white font-bold">{email}</span>
                            </p>
                            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-6 max-w-md mx-auto mb-6">
                                <div className="flex items-start gap-3 mb-4">
                                    <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                                    <p className="text-sm text-indigo-300 text-left">
                                        Click the <strong>activation link</strong> in your email to verify your account and activate your firm.
                                    </p>
                                </div>
                                <div className="bg-white/5 rounded-lg p-4 text-left">
                                    <p className="text-xs text-slate-400 mb-2">
                                        <strong className="text-white">What happens next:</strong>
                                    </p>
                                    <ul className="text-xs text-slate-400 space-y-1">
                                        <li>✓ Your email will be verified</li>
                                        <li>✓ Your firm "<strong className="text-white">{firmName}</strong>" will be created</li>
                                        <li>✓ You'll be redirected to login</li>
                                        <li>✓ You'll have full Admin Manager access</li>
                                    </ul>
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 mb-6">
                                The link will expire in 24 hours. Didn't receive it? Check your spam folder.
                            </p>

                            {/* Resend Email Button */}
                            <div className="flex flex-col gap-3 items-center mb-6">
                                <button
                                    onClick={async () => {
                                        try {
                                            setLoading(true);
                                            const { error } = await supabase.auth.resend({
                                                type: 'signup',
                                                email: email,
                                            });
                                            if (error) throw error;
                                            alert('Verification email resent! Check your inbox.');
                                        } catch (err: any) {
                                            alert(err.message || 'Failed to resend email');
                                        } finally {
                                            setLoading(false);
                                        }
                                    }}
                                    disabled={loading}
                                    className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-sm rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <Mail className="w-4 h-4" />
                                            Resend Verification Email
                                        </>
                                    )}
                                </button>
                                <p className="text-xs text-slate-600">
                                    Didn't receive the email? Click above to send it again
                                </p>
                            </div>

                            <Link
                                to="/"
                                className="inline-flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Return to Home
                            </Link>
                        </div>
                    )}
                </div>

                {/* Footer Note */}
                {step !== 'success' && (
                    <div className="mt-6 text-center text-xs text-slate-600">
                        <p>By registering, you agree to our Terms of Service and Privacy Policy</p>
                    </div>
                )}
            </div>
        </div>
    );
}
