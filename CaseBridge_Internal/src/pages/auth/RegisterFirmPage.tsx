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
import AuthNavbar from '@/components/layout/AuthNavbar';

const MIN_PASSWORD_LENGTH = 10;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;

type FormStep = 'personal' | 'firm' | 'success';

export default function RegisterFirmPage() {
    const { session } = useInternalSession();
    const navigate = useNavigate();

    useEffect(() => {
        async function checkRestriction() {
            if (session) {
                navigate('/internal/dashboard');
                return;
            }

            // CHECK: System restriction to ONE firm
            const { count } = await supabase
                .from('firms')
                .select('*', { count: 'exact', head: true });

            if (count && count > 0) {
                console.log('System restricted to single firm. Redirecting to login.');
                navigate('/internal/login');
            }
        }
        checkRestriction();
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
    const [agreeToTerms, setAgreeToTerms] = useState(false);
    const [resendStatus, setResendStatus] = useState<string | null>(null);

    const validateEmail = (emailStr: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr);
    };

    const handlePersonalNext = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!validateEmail(email)) {
            setError('Please enter a valid email address');
            return;
        }

        if (!agreeToTerms) {
            setError('You must agree to the Terms of Service and Privacy Policy');
            return;
        }

        // Validation
        if (password.length < MIN_PASSWORD_LENGTH) {
            setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
            return;
        }

        // Added special character requirement
        const complexityRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/;
        if (!complexityRegex.test(password)) {
            setError('Password must contain at least one uppercase letter, one number, and one special character');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        checkExistingUser();
    };

    const checkExistingUser = async () => {
        setLoading(true);
        setError(null);
        try {
            // 1. Check if profile exists (already a registered user)
            const { data: existingProfile } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', email)
                .maybeSingle();

            if (existingProfile) {
                setError('An account with this email already exists. Please log in to your existing account.');
                setLoading(false);
                return;
            }

            // 2. Check if they have a pending invitation
            const { data: pendingInvite } = await supabase
                .from('invitations')
                .select('firm_id, firms(name)')
                .eq('email', email)
                .eq('status', 'pending')
                .maybeSingle();

            if (pendingInvite) {
                setError(`You have a pending invitation to join ${pendingInvite.firms?.name}. Please check your email or log in to accept the invitation.`);
                setLoading(false);
                return;
            }

            // 3. Check if they have an unconfirmed registration
            // Fixed potential SQL injection and improved check logic
            const { data: pendingRegByEmail, error: regError } = await supabase
                .from('pending_firm_registrations')
                .select('id')
                .eq('firm_email', email)
                .maybeSingle();

            if (regError) throw regError;

            if (pendingRegByEmail) {
                setError('A registration involving this email is already underway. Please check your inbox for the verification link.');
                setLoading(false);
                return;
            }

            // 4. Check if the email is already used as a primary Firm Email
            const { data: existingFirm } = await supabase
                .from('firms')
                .select('id, name')
                .eq('email', email)
                .maybeSingle();

            if (existingFirm) {
                setError(`This email is already registered as the primary contact for ${existingFirm.name}.`);
                setLoading(false);
                return;
            }

            setStep('firm');
        } catch (err) {
            console.error('Check user error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleFirmSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // STEP 1: Create Supabase auth user with email confirmation
            const { data: authData, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/confirm`,
                },
            });

            if (signUpError) throw signUpError;
            if (!authData.user) throw new Error('Failed to create user account');

            // STEP 2: Use the user ID from authData
            const userId = authData.user.id;

            // STEP 3: Store firm data in DATABASE
            // IDEMPOTENCY CHECK: Check if registration already exists
            const { data: existingPending } = await supabase
                .from('pending_firm_registrations')
                .select('id')
                .eq('user_id', userId)
                .maybeSingle();

            if (existingPending) {
                setStep('success');
                return;
            }

            // Add a small delay to ensure auth.users record is committed
            await new Promise(resolve => setTimeout(resolve, INITIAL_RETRY_DELAY));

            // Retry logic for race condition handling
            let pendingError = null;

            for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
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
                    });

                if (!result.error) {
                    pendingError = null;
                    break;
                }

                pendingError = result.error;

                // If duplicate key error (23505), treat as success
                if (pendingError.code === '23505') {
                    setStep('success');
                    return;
                }

                // If it's a foreign key error, wait and retry with exponential backoff
                if (pendingError.code === '23503' && attempt < MAX_RETRIES) {
                    const delay = attempt * INITIAL_RETRY_DELAY;
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    break;
                }
            }

            if (pendingError) {
                // Provide more specific error message
                if (pendingError.code === '42501') {
                    throw new Error('Permission denied. Please ensure your email is valid and try again.');
                } else if (pendingError.code === '23503') {
                    throw new Error('Database synchronization issue. This usually happens when the authentication server is busy. Please try again in a few moments.');
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
        <>
            <AuthNavbar variant="internal" />
            <div className="min-h-screen bg-[#0F172A] text-white flex items-center justify-center p-6 pt-24">
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
                                            placeholder="+1 (555) 000-0000"
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
                                            minLength={10}
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
                                    <p className="text-xs text-slate-500 mt-1.5">Minimum 10 characters with uppercase and number</p>
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

                                <div>
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                checked={agreeToTerms}
                                                onChange={(e) => setAgreeToTerms(e.target.checked)}
                                                className="peer sr-only"
                                            />
                                            <div className="w-5 h-5 border border-white/20 bg-white/5 rounded transition-all group-hover:border-indigo-500 peer-checked:bg-indigo-600 peer-checked:border-indigo-600 flex items-center justify-center">
                                                {agreeToTerms && <CheckCircle2 className="w-4 h-4 text-white" />}
                                            </div>
                                        </div>
                                        <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">
                                            I agree to the <Link to="/terms" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-4">Terms of Service</Link> and <Link to="/privacy" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-4">Privacy Policy</Link>
                                        </span>
                                    </label>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-sm tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 mt-6 disabled:opacity-50"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Checking Identity...
                                        </>
                                    ) : (
                                        <>
                                            <span>Continue to Firm Details</span>
                                            <ArrowRight className="w-5 h-5" />
                                        </>
                                    )}
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
                                            Click the <strong>activation link</strong> in your email to verify your account and initialize your workspace.
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
                                    {resendStatus && (
                                        <div className={`mb-4 p-3 rounded-lg text-xs font-medium w-full max-w-xs ${resendStatus.includes('failed') ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>
                                            {resendStatus}
                                        </div>
                                    )}
                                    <button
                                        onClick={async () => {
                                            try {
                                                setLoading(true);
                                                setResendStatus(null);
                                                const { error } = await supabase.auth.resend({
                                                    type: 'signup',
                                                    email: email,
                                                });
                                                if (error) throw error;
                                                setResendStatus('Verification email resent! Check your inbox.');
                                            } catch (err: any) {
                                                setResendStatus(`Resend failed: ${err.message || 'Unknown error'}`);
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
        </>
    );
}
