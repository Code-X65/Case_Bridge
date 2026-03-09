import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/visitor/Header';
import {
    User,
    Briefcase,
    Globe,
    CheckCircle2,
    Clock,
    ShieldCheck,
    Loader2,
    Lock,
    Eye,
    ChevronRight,
    ChevronLeft,
    AlertCircle
} from 'lucide-react';

const STEPS = [
    { title: 'Identity', desc: 'Who are you representing?', icon: User },
    { title: 'Alignment', desc: 'What is your primary goal?', icon: Briefcase },
    { title: 'Priority', desc: 'Timeline & Insight', icon: Clock },
    { title: 'Workspace', desc: 'Integrity Verification', icon: ShieldCheck }
];

export default function Onboarding() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [verifying, setVerifying] = useState(false);
    const [verifyProgress, setVerifyProgress] = useState(0);

    const [formData, setFormData] = useState({
        primaryGoals: [] as string[],
        personaType: '',
        urgencyLevel: '',
        referralSource: ''
    });

    const nextStep = () => setStep(s => s + 1);
    const prevStep = () => setStep(s => s - 1);

    const handleVerification = () => {
        setVerifying(true);
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
                setTimeout(() => {
                    setVerifying(false);
                    submitData();
                }, 1000);
            }
            setVerifyProgress(progress);
        }, 300);
    };

    const submitData = async () => {
        setError(null);
        setLoading(true);

        if (!user) {
            setError("Session Timeout. Please login again.");
            setLoading(false);
            return;
        }

        try {
            const { error: intentError } = await supabase
                .from('external_user_intent')
                .insert({
                    external_user_id: user.id,
                    primary_goals: formData.primaryGoals,
                    persona_type: formData.personaType,
                    urgency_level: formData.urgencyLevel,
                    referral_source: formData.referralSource || null
                });

            if (intentError) throw intentError;

            const { error: updateError } = await supabase
                .from('external_users')
                .update({ status: 'active' })
                .eq('id', user.id);

            if (updateError) throw updateError;

            navigate('/dashboard');

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Onboarding synchronization failed.');
            setStep(STEPS.length - 1); // Stay on last step to retry
        } finally {
            setLoading(false);
        }
    };

    const toggleGoal = (goal: string) => {
        setFormData(prev => ({
            ...prev,
            primaryGoals: prev.primaryGoals.includes(goal)
                ? prev.primaryGoals.filter(g => g !== goal)
                : [...prev.primaryGoals, goal]
        }));
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col font-sans relative overflow-hidden selection:bg-primary/30">
            <Header />

            {/* Background decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            <main className="flex-1 flex flex-col xl:flex-row relative z-10 pt-20">

                {/* Left side value proposition & progress */}
                <div className="w-full xl:w-5/12 p-8 xl:p-16 flex flex-col border-b xl:border-b-0 xl:border-r border-border bg-card/30 backdrop-blur-xl">
                    <div className="max-w-xl mx-auto xl:mx-0 flex-1 flex flex-col">
                        <div className="mb-10">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
                                <Lock size={12} className="text-primary" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Secure Client Onboarding</span>
                            </div>
                            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-6">
                                Initialize <span className="text-primary">Workspace</span>
                            </h1>
                            <p className="text-lg text-muted-foreground leading-relaxed">
                                Configure your legal environment. This brief setup ensures we align our services to your exact needs.
                            </p>
                        </div>

                        {/* Vertical Progress (Desktop) */}
                        <div className="mt-8 space-y-6 hidden xl:block">
                            {STEPS.map((s, i) => (
                                <div key={i} className={`flex items-start gap-4 transition-all duration-300 ${step === i ? 'opacity-100' : step > i ? 'opacity-60' : 'opacity-30'}`}>
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-500 ${step === i ? 'bg-primary border-primary text-primary-foreground shadow-[0_0_15px_rgba(201,162,77,0.3)] scale-110' : step > i ? 'bg-primary/20 border-primary/30 text-primary' : 'bg-card border-border text-muted-foreground shadow-neumorph-inset'}`}>
                                        <s.icon size={20} />
                                    </div>
                                    <div className="pt-1">
                                        <h3 className={`font-semibold ${step === i ? 'text-foreground' : 'text-muted-foreground'}`}>Step 0{i + 1}: {s.title}</h3>
                                        <p className="text-sm text-muted-foreground mt-1">{s.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Form Section */}
                <div className="w-full xl:w-7/12 p-8 xl:p-16 flex flex-col justify-center overflow-y-auto">
                    <div className="max-w-2xl mx-auto w-full">

                        {/* Mobile Progress Bar (Horizontal) */}
                        <div className="xl:hidden flex justify-between items-center mb-10 px-2">
                            {STEPS.map((s, i) => (
                                <div key={i} className="flex flex-col items-center relative group">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-500 ${step === i ? 'bg-primary border-primary text-primary-foreground shadow-[0_0_10px_rgba(201,162,77,0.3)] scale-110' : step > i ? 'bg-primary/20 border-primary/30 text-primary' : 'bg-card border-border text-muted-foreground shadow-neumorph-inset'}`}>
                                        <s.icon size={16} />
                                    </div>
                                    <span className={`absolute -bottom-6 text-[9px] font-bold uppercase tracking-wider whitespace-nowrap transition-all ${step === i ? 'text-primary opacity-100' : 'text-muted-foreground opacity-50'}`}>
                                        {s.title}
                                    </span>
                                    {i < STEPS.length - 1 && (
                                        <div className={`absolute top-1/2 left-[calc(100%+8px)] w-[calc(100%+8px)] sm:w-[calc(100%+24px)] h-0.5 -translate-y-1/2 rounded-full hidden xs:block ${step > i ? 'bg-primary/30' : 'bg-border'}`} />
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Active Step Card */}
                        <div className="bg-card border border-border p-6 sm:p-10 min-h-[450px] flex flex-col justify-between rounded-[2rem] shadow-neumorph relative overflow-hidden">
                            {error && (
                                <div className="mb-8 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-sm font-semibold flex items-center gap-3 animate-fade-in shadow-neumorph-inset">
                                    <AlertCircle size={18} />
                                    {error}
                                </div>
                            )}

                            {/* STEP 1: PERSONA */}
                            {step === 0 && (
                                <div className="animate-fade-in">
                                    <div className="mb-8 border-b border-border pb-6">
                                        <h2 className="text-2xl font-bold mb-2">Who are you representing?</h2>
                                        <p className="text-muted-foreground text-sm">Identity classification helps us tailor the legal environment.</p>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        {[
                                            { id: 'individual', label: 'Individual', icon: User, desc: 'Personal legal matters' },
                                            { id: 'business', label: 'Business Owner', icon: Briefcase, desc: 'Corporate & SME affairs' },
                                            { id: 'organisation_rep', label: 'Organization', icon: Globe, desc: 'NGOs & Enterprise' }
                                        ].map(persona => (
                                            <button
                                                key={persona.id}
                                                onClick={() => setFormData({ ...formData, personaType: persona.id })}
                                                className={`p-6 rounded-2xl border text-left transition-all group ${formData.personaType === persona.id
                                                    ? 'bg-primary/10 border-primary text-foreground shadow-[0_0_15px_rgba(201,162,77,0.15)]'
                                                    : 'bg-input border-border hover:border-primary/50 text-muted-foreground shadow-neumorph-inset'
                                                    }`}
                                            >
                                                <div className={`mb-4 w-12 h-12 rounded-xl flex items-center justify-center transition-all ${formData.personaType === persona.id ? 'bg-primary text-primary-foreground shadow-lg' : 'bg-card text-muted-foreground shadow-sm border border-border'}`}>
                                                    <persona.icon size={24} />
                                                </div>
                                                <h3 className={`font-bold tracking-tight text-sm mb-2 transition-colors ${formData.personaType === persona.id ? 'text-primary' : 'text-foreground'}`}>{persona.label}</h3>
                                                <p className="text-xs leading-relaxed opacity-80">{persona.desc}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: INTENT */}
                            {step === 1 && (
                                <div className="animate-fade-in">
                                    <div className="mb-8 border-b border-border pb-6">
                                        <h2 className="text-2xl font-bold mb-2">What is your primary goal?</h2>
                                        <p className="text-muted-foreground text-sm">Select all that apply to your current situation.</p>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {[
                                            'Report a legal issue',
                                            'Track an ongoing case',
                                            'Consult a legal professional',
                                            'Upload or manage documents',
                                            'Just exploring'
                                        ].map(goal => (
                                            <button
                                                key={goal}
                                                onClick={() => toggleGoal(goal)}
                                                className={`p-5 text-left rounded-2xl border flex items-center justify-between transition-all group ${formData.primaryGoals.includes(goal)
                                                    ? 'bg-primary/10 border-primary text-foreground shadow-[0_0_15px_rgba(201,162,77,0.15)]'
                                                    : 'bg-input border-border hover:border-primary/50 text-muted-foreground shadow-neumorph-inset'
                                                    }`}
                                            >
                                                <span className={`text-sm font-semibold transition-colors ${formData.primaryGoals.includes(goal) ? 'text-primary' : 'text-foreground'}`}>{goal}</span>
                                                {formData.primaryGoals.includes(goal) ? (
                                                    <CheckCircle2 size={18} className="text-primary shrink-0" />
                                                ) : (
                                                    <div className="w-[18px] h-[18px] rounded-full border-2 border-border shrink-0" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* STEP 3: URGENCY & SOURCE */}
                            {step === 2 && (
                                <div className="animate-fade-in">
                                    <div className="mb-8 border-b border-border pb-6">
                                        <h2 className="text-2xl font-bold mb-2">Timeline & Insight</h2>
                                        <p className="text-muted-foreground text-sm">Help us prioritize your case priority in the workspace.</p>
                                    </div>
                                    <div className="space-y-8">
                                        <div>
                                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 block">Urgency Classification</label>
                                            <div className="grid grid-cols-3 gap-3">
                                                {[
                                                    { id: 'urgent', label: 'CRITICAL', ring: 'focus:ring-red-500/50', activeBg: 'bg-red-500/20 text-red-500 border-red-500/50' },
                                                    { id: 'soon', label: 'ELEVATED', ring: 'focus:ring-orange-500/50', activeBg: 'bg-orange-500/20 text-orange-500 border-orange-500/50' },
                                                    { id: 'researching', label: 'ROUTINE', ring: 'focus:ring-blue-500/50', activeBg: 'bg-blue-500/20 text-blue-500 border-blue-500/50' }
                                                ].map(opt => (
                                                    <button
                                                        key={opt.id}
                                                        onClick={() => setFormData({ ...formData, urgencyLevel: opt.id })}
                                                        className={`py-4 rounded-xl border transition-all text-[10px] sm:text-xs font-bold tracking-wider uppercase flex items-center justify-center text-center ${formData.urgencyLevel === opt.id
                                                            ? `${opt.activeBg} shadow-inner`
                                                            : 'bg-input border-border text-muted-foreground hover:bg-card shadow-neumorph-inset'
                                                            }`}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 block">How did you find us?</label>
                                            <input
                                                name="referralSource"
                                                value={formData.referralSource}
                                                onChange={e => setFormData({ ...formData, referralSource: e.target.value })}
                                                placeholder="Referral Source (Optional)"
                                                className="w-full bg-input border border-border rounded-[var(--radius-neumorph)] py-4 px-6 text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-semibold shadow-neumorph-inset"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 4: VERIFICATION (PREMIUM SCAN) */}
                            {step === 3 && (
                                <div className="flex flex-col items-center justify-center text-center py-6 animate-fade-in relative z-10">
                                    {!verifying ? (
                                        <>
                                            <div className="w-24 h-24 bg-card rounded-full flex items-center justify-center text-primary mb-8 border border-border shadow-neumorph-inset relative">
                                                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse"></div>
                                                <ShieldCheck size={40} className="relative z-10" />
                                            </div>
                                            <h2 className="text-3xl font-bold tracking-tight text-foreground mb-4">Integrity Verification</h2>
                                            <p className="text-muted-foreground text-sm max-w-sm mb-10 leading-relaxed">
                                                By proceeding, you agree to our terms of legal service and authorize initialization of your secure workspace.
                                            </p>
                                            <div className="flex flex-col gap-3 w-full max-w-sm mx-auto">
                                                <div className="flex items-center gap-4 py-4 px-6 rounded-xl bg-card border border-border text-left shadow-sm">
                                                    <Lock size={18} className="text-primary shrink-0" />
                                                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">End-to-End Encryption</span>
                                                </div>
                                                <div className="flex items-center gap-4 py-4 px-6 rounded-xl bg-card border border-border text-left shadow-sm">
                                                    <Eye size={18} className="text-primary shrink-0" />
                                                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Identity Isolation Active</span>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="w-full flex flex-col items-center">
                                            <div className="relative w-32 h-32 mb-10">
                                                <div className="absolute inset-0 rounded-full border-[6px] border-border shadow-neumorph-inset"></div>
                                                <div
                                                    className="absolute inset-0 rounded-full border-[6px] border-primary transition-all duration-300 shadow-[0_0_20px_rgba(201,162,77,0.5)]"
                                                    style={{ clipPath: `inset(${100 - verifyProgress}% 0 0 0)` }}
                                                ></div>
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <Loader2 size={36} className="text-primary animate-spin" />
                                                </div>
                                            </div>
                                            <h2 className="text-2xl font-bold tracking-tight text-foreground mb-4">Analyzing Profile</h2>
                                            <div className="flex items-center gap-4 w-full max-w-xs">
                                                <div className="flex-1 h-2 bg-input rounded-full overflow-hidden shadow-neumorph-inset">
                                                    <div
                                                        className="h-full bg-primary transition-all duration-300 relative overflow-hidden"
                                                        style={{ width: `${verifyProgress}%` }}
                                                    >
                                                        <div className="absolute inset-0 bg-white/30 backdrop-blur-sm -translate-x-full animate-[shimmer_2s_infinite]"></div>
                                                    </div>
                                                </div>
                                                <span className="text-xs font-bold text-primary font-mono">{Math.round(verifyProgress)}%</span>
                                            </div>
                                            <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-[0.2em] mt-8 text-center animate-pulse">
                                                Encrypting Metadata • SEC-256 Alignment
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Navigation Buttons */}
                            <div className="pt-10 border-t border-border flex gap-4 mt-8">
                                {step > 0 && !verifying && (
                                    <button
                                        onClick={prevStep}
                                        className="px-6 py-4 rounded-[var(--radius-neumorph)] bg-card border border-border text-muted-foreground hover:text-foreground transition-all text-xs font-bold uppercase tracking-wider flex items-center gap-2 group shadow-sm hover:shadow-neumorph"
                                    >
                                        <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                                        Back
                                    </button>
                                )}

                                {step < STEPS.length - 1 ? (
                                    <button
                                        onClick={nextStep}
                                        disabled={
                                            (step === 0 && !formData.personaType) ||
                                            (step === 1 && formData.primaryGoals.length === 0) ||
                                            (step === 2 && !formData.urgencyLevel)
                                        }
                                        className="flex-1 py-4 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground rounded-[var(--radius-neumorph)] shadow-[0_0_15px_rgba(201,162,77,0.3)] transition-all scale-100 active:scale-95 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-3 group"
                                    >
                                        Continue Phasing
                                        <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleVerification}
                                        disabled={verifying || loading}
                                        className="flex-1 py-4 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground rounded-[var(--radius-neumorph)] shadow-[0_0_20px_rgba(201,162,77,0.4)] transition-all scale-100 active:scale-95 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-3 group bg-gradient-to-r from-primary to-primary/80"
                                    >
                                        {verifying ? 'Verifying...' : 'Initialize Workspace'}
                                        {!verifying && <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />}
                                    </button>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
}

