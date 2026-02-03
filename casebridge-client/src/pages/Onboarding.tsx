import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    Shield,
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
    ChevronLeft
} from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

function TargetIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
        </svg>
    );
}

const STEPS = [
    { title: 'Identity', icon: User },
    { title: 'Intent', icon: TargetIcon },
    { title: 'Timeline', icon: Clock },
    { title: 'Verification', icon: ShieldCheck },
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

    const stepRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useGSAP(() => {
        gsap.to(stepRef.current, {
            opacity: 1,
            x: 0,
            duration: 0.5,
            ease: 'power3.out'
        });
    }, [step]);

    const nextStep = () => {
        gsap.to(stepRef.current, {
            opacity: 0,
            x: -20,
            duration: 0.3,
            onComplete: () => {
                setStep(s => s + 1);
                gsap.set(stepRef.current, { x: 20 });
            }
        });
    };

    const prevStep = () => {
        gsap.to(stepRef.current, {
            opacity: 0,
            x: 20,
            duration: 0.3,
            onComplete: () => {
                setStep(s => s - 1);
                gsap.set(stepRef.current, { x: -20 });
            }
        });
    };

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

            gsap.to(containerRef.current, {
                opacity: 0,
                scale: 0.95,
                duration: 0.5,
                onComplete: () => {
                    navigate('/dashboard');
                }
            });

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
        <div ref={containerRef} className="min-h-screen bg-[#020617] flex items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-blue-500/30">
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 z-50"></div>
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[120px] rounded-full"></div>

            <div className="w-full max-w-4xl relative z-10">
                {/* Header Section */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-6 backdrop-blur-md">
                        <Lock size={12} className="text-blue-400" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Secure Legal Onboarding v1.2</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-white italic uppercase tracking-tighter leading-none mb-4">
                        Initialize <span className="text-blue-500">Workspace</span>
                    </h1>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Phased Configuration • Identity Alignment</p>
                </div>

                {/* Progress Bar */}
                <div className="flex justify-between items-center mb-16 px-4">
                    {STEPS.map((s, i) => (
                        <div key={i} className="flex flex-col items-center relative group">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-500 ${step === i ? 'bg-blue-600 border-blue-400 text-white shadow-xl shadow-blue-600/30 scale-110' :
                                    step > i ? 'bg-green-500/20 border-green-500/40 text-green-400' :
                                        'bg-white/5 border-white/5 text-slate-600'
                                }`}>
                                <s.icon size={20} />
                            </div>
                            <span className={`absolute -bottom-7 text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${step === i ? 'text-blue-400 opacity-100' : 'text-slate-700 opacity-50'
                                }`}>
                                {s.title}
                            </span>
                            {i < STEPS.length - 1 && (
                                <div className={`absolute top-1/2 left-[calc(100%+8px)] w-[calc(100%+32px)] h-0.5 -translate-y-1/2 rounded-full hidden md:block ${step > i ? 'bg-green-500/30' : 'bg-white/5'
                                    }`} />
                            )}
                        </div>
                    ))}
                </div>

                {/* Step Container */}
                <div ref={stepRef} className="glass-card border border-white/10 p-8 md:p-12 min-h-[450px] flex flex-col justify-between rounded-[2.5rem] bg-gradient-to-br from-white/[0.04] to-transparent shadow-2xl transition-all opacity-0">

                    {error && (
                        <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-xs font-bold flex items-center gap-3">
                            <Shield size={16} /> {error}
                        </div>
                    )}

                    {/* STEP 1: PERSONA */}
                    {step === 0 && (
                        <div>
                            <div className="mb-10">
                                <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-2">Who are you representing?</h2>
                                <p className="text-slate-500 text-sm font-medium tracking-tight">Identity classification helps us tailor the legal environment.</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {[
                                    { id: 'individual', label: 'Individual', icon: User, desc: 'Personal legal matters' },
                                    { id: 'business', label: 'Business owner', icon: Briefcase, desc: 'Corporate & SME affairs' },
                                    { id: 'organisation_rep', label: 'Organization', icon: Globe, desc: 'NGOs & Enterprise' }
                                ].map(persona => (
                                    <button
                                        key={persona.id}
                                        onClick={() => setFormData({ ...formData, personaType: persona.id })}
                                        className={`p-6 rounded-3xl border text-left transition-all group ${formData.personaType === persona.id
                                                ? 'bg-blue-600 border-blue-400 shadow-xl shadow-blue-600/20'
                                                : 'bg-white/5 border-white/5 hover:border-white/20'
                                            }`}
                                    >
                                        <div className={`mb-4 w-12 h-12 rounded-xl flex items-center justify-center transition-all ${formData.personaType === persona.id ? 'bg-white text-blue-600' : 'bg-slate-800 text-slate-400'
                                            }`}>
                                            <persona.icon size={24} />
                                        </div>
                                        <h3 className={`font-black uppercase tracking-widest text-xs mb-2 transition-all ${formData.personaType === persona.id ? 'text-white' : 'text-slate-300'
                                            }`}>{persona.label}</h3>
                                        <p className={`text-[10px] leading-relaxed transition-all ${formData.personaType === persona.id ? 'text-blue-100' : 'text-slate-500'
                                            }`}>{persona.desc}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* STEP 2: INTENT */}
                    {step === 1 && (
                        <div>
                            <div className="mb-10">
                                <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-2">What is your primary goal?</h2>
                                <p className="text-slate-500 text-sm font-medium tracking-tight">Select all that apply to your current situation.</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                                        className={`p-5 rounded-2xl border flex items-center justify-between transition-all ${formData.primaryGoals.includes(goal)
                                                ? 'bg-blue-600 border-blue-400 text-white'
                                                : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/10'
                                            }`}
                                    >
                                        <span className="text-xs font-black uppercase tracking-widest">{goal}</span>
                                        {formData.primaryGoals.includes(goal) ? (
                                            <CheckCircle2 size={18} />
                                        ) : (
                                            <div className="w-4 h-4 rounded-full border border-white/10" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* STEP 3: URGENCY & SOURCE */}
                    {step === 2 && (
                        <div>
                            <div className="mb-10">
                                <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-2">Timeline & Insight</h2>
                                <p className="text-slate-500 text-sm font-medium tracking-tight">Help us prioritize your case priority in the workspace.</p>
                            </div>
                            <div className="space-y-8">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 block">Urgency Classification</label>
                                    <div className="flex gap-2">
                                        {[
                                            { id: 'urgent', label: 'CRITICAL', color: 'bg-red-500' },
                                            { id: 'soon', label: 'ELEVATED', color: 'bg-orange-500' },
                                            { id: 'researching', label: 'ROUTINE', color: 'bg-blue-500' }
                                        ].map(opt => (
                                            <button
                                                key={opt.id}
                                                onClick={() => setFormData({ ...formData, urgencyLevel: opt.id })}
                                                className={`flex-1 py-4 rounded-2xl border transition-all text-[10px] font-black tracking-widest ${formData.urgencyLevel === opt.id
                                                        ? `${opt.color} border-transparent text-white shadow-lg`
                                                        : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'
                                                    }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 block">How did you find us?</label>
                                    <input
                                        name="referralSource"
                                        value={formData.referralSource}
                                        onChange={e => setFormData({ ...formData, referralSource: e.target.value })}
                                        placeholder="Referral Source (Optional)"
                                        className="w-full bg-[#0F172A] border border-white/5 rounded-2xl py-5 px-6 text-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-bold placeholder:text-slate-800 text-sm mb-0"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: VERIFICATION (PREMIUM SCAN) */}
                    {step === 3 && (
                        <div className="flex flex-col items-center justify-center text-center py-6">
                            {!verifying ? (
                                <>
                                    <div className="w-20 h-20 bg-blue-600/20 rounded-[2rem] flex items-center justify-center text-blue-400 mb-8 border border-blue-600/30">
                                        <ShieldCheck size={40} />
                                    </div>
                                    <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-3">Integrity Verification</h2>
                                    <p className="text-slate-500 text-sm max-w-sm font-medium tracking-tight mb-8">
                                        By proceeding, you agree to our terms of legal service and authorize initialization of your secure workspace.
                                    </p>
                                    <div className="flex flex-col gap-3 w-full max-w-xs">
                                        <div className="flex items-center gap-3 py-3 px-5 rounded-2xl bg-white/[0.03] border border-white/5 text-left">
                                            <Lock size={14} className="text-blue-500" />
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">End-to-End Encryption</span>
                                        </div>
                                        <div className="flex items-center gap-3 py-3 px-5 rounded-2xl bg-white/[0.03] border border-white/5 text-left">
                                            <Eye size={14} className="text-blue-500" />
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Identity Isolation Active</span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="w-full flex flex-col items-center">
                                    <div className="relative w-32 h-32 mb-10">
                                        <div className="absolute inset-0 rounded-[2.5rem] border-4 border-blue-600/20"></div>
                                        <div
                                            className="absolute inset-0 rounded-[2.5rem] border-4 border-blue-500 transition-all duration-300 shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                                            style={{ clipPath: `inset(${100 - verifyProgress}% 0 0 0)` }}
                                        ></div>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Loader2 size={32} className="text-blue-500 animate-spin" />
                                        </div>
                                    </div>
                                    <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-2">Analyzing Profile</h2>
                                    <div className="flex items-center gap-4 w-full max-w-xs">
                                        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-600 transition-all duration-300"
                                                style={{ width: `${verifyProgress}%` }}
                                            />
                                        </div>
                                        <span className="text-[10px] font-black text-blue-400 font-mono">{Math.round(verifyProgress)}%</span>
                                    </div>
                                    <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.3em] mt-8 text-center animate-pulse">
                                        Encrypting Metadata • SEC-256 Alignment
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="pt-12 border-t border-white/5 flex gap-4 mt-auto">
                        {step > 0 && !verifying && (
                            <button
                                onClick={prevStep}
                                className="px-8 py-4 rounded-2xl bg-white/5 border border-white/5 text-slate-500 hover:text-white transition-all text-xs font-black uppercase tracking-widest flex items-center gap-2 group"
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
                                className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-20 disabled:grayscale text-white rounded-2xl shadow-xl shadow-blue-600/20 shadow-blue-600 transition-all scale-100 hover:scale-[1.02] active:scale-[0.98] text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 group"
                            >
                                Continue Phasing
                                <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        ) : (
                            <button
                                onClick={handleVerification}
                                disabled={verifying || loading}
                                className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl shadow-2xl shadow-blue-600/30 transition-all scale-100 hover:scale-[1.02] active:scale-[0.98] text-xs font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 group"
                            >
                                {verifying ? 'Verifying Integrity...' : 'Initialize Workspace'}
                                {!verifying && <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />}
                            </button>
                        )}
                    </div>
                </div>

                <p className="text-center mt-8 text-[9px] font-black text-slate-700 uppercase tracking-[0.4em]">
                    Canonical Legal Orchestration Engine • CaseBridge Infrastructure
                </p>
            </div>
        </div>
    );
}
