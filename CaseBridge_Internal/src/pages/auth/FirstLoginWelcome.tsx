import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { PartyPopper, ArrowRight, ShieldCheck, Briefcase, Zap, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { supabase } from '@/lib/supabase';

export default function FirstLoginWelcome() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [step, setStep] = useState(1);

    useEffect(() => {
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#6366f1', '#4f46e5', '#4338ca']
        });
    }, []);

    const handleNext = async () => {
        if (step < 3) {
            setStep(s => s + 1);
        } else {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    await supabase
                        .from('profiles')
                        .update({
                            first_login_flag: false,
                            onboarding_state: 'completed'
                        })
                        .eq('id', user.id);
                }
                // Invalidate profile status so ProtectedRoute doesn't redirect back here
                await queryClient.invalidateQueries({ queryKey: ['profile_status'] });

                navigate('/internal/dashboard');
            } catch (error) {
                console.warn('Profile update warning:', error);

                // Invalidate anyway just in case it succeeded but threw on something else
                await queryClient.invalidateQueries({ queryKey: ['profile_status'] });

                // Proceed anyway, strict blocking is not needed for this UX polish
                navigate('/internal/dashboard');
            }
        }
    };

    return (
        <div className="min-h-screen bg-[#0F172A] text-white flex items-center justify-center p-6 bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A]">
            <div className="max-w-xl w-full">
                <div className="bg-white/5 border border-white/10 rounded-[3rem] p-12 backdrop-blur-xl relative overflow-hidden shadow-2xl">
                    {/* Progress Bar */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
                        <div
                            className="h-full bg-indigo-500 transition-all duration-500 ease-out"
                            style={{ width: `${(step / 3) * 100}%` }}
                        />
                    </div>

                    <div className="text-center">
                        {step === 1 && (
                            <div className="animate-in fade-in zoom-in duration-500">
                                <div className="w-24 h-24 bg-indigo-500/10 border border-indigo-500/20 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-indigo-500/10">
                                    <PartyPopper className="w-12 h-12 text-indigo-400" />
                                </div>
                                <h1 className="text-4xl font-black italic tracking-tighter uppercase mb-4">Welcome to CaseBridge</h1>
                                <p className="text-slate-400 text-lg font-medium leading-relaxed mb-10">
                                    Your professional profile has been successfully activated. You are now part of a next-generation legal platform.
                                </p>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="animate-in slide-in-from-right duration-500">
                                <div className="grid grid-cols-2 gap-4 mb-10">
                                    <div className="p-6 bg-white/5 rounded-[2rem] border border-white/5 text-left">
                                        <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center mb-4">
                                            <ShieldCheck className="w-5 h-5 text-green-400" />
                                        </div>
                                        <h3 className="font-black text-sm uppercase tracking-widest mb-2 italic">Secure Identity</h3>
                                        <p className="text-xs text-slate-500 leading-relaxed font-medium">Your account is protected by firm-scoped encryption and RBAC governance.</p>
                                    </div>
                                    <div className="p-6 bg-white/5 rounded-[2rem] border border-white/5 text-left">
                                        <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center mb-4">
                                            <Briefcase className="w-5 h-5 text-indigo-400" />
                                        </div>
                                        <h3 className="font-black text-sm uppercase tracking-widest mb-2 italic">Unified Workflow</h3>
                                        <p className="text-xs text-slate-500 leading-relaxed font-medium">Cases, matters, and documents all within your firm's private cloud workspace.</p>
                                    </div>
                                </div>
                                <h2 className="text-2xl font-black uppercase tracking-tight mb-8">Ready to transform your practice?</h2>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="animate-in slide-in-from-bottom duration-500">
                                <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <CheckCircle2 className="w-10 h-10 text-green-400" />
                                </div>
                                <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-4">You're All Set!</h2>
                                <p className="text-slate-400 font-medium mb-10 italic">Your first-login activation is complete. Welcome aboard.</p>

                                <div className="p-6 bg-indigo-600/10 rounded-3xl border border-indigo-500/20 mb-10 flex items-center gap-4 text-left">
                                    <Zap className="w-8 h-8 text-indigo-400 shrink-0" />
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Quick Tip</p>
                                        <p className="text-xs text-slate-400 leading-relaxed">Check your <span className="text-white font-bold">Notifications</span> for any cases already waiting for your expertise.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={handleNext}
                            className="w-full h-16 bg-white text-slate-900 font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-3 transition-all hover:bg-slate-200 group shadow-2xl shadow-indigo-500/10"
                        >
                            <span>{step === 3 ? 'Enter Workspace' : 'Continue'}</span>
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
