import { Lock, Timer, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LockedAccountPage() {
    return (
        <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-[2.5rem] p-10 relative overflow-hidden">
                {/* Visual Background */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 via-orange-500 to-red-500" />

                <div className="text-center">
                    <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-center justify-center mx-auto mb-8 animate-pulse">
                        <Lock className="w-10 h-10 text-red-500" />
                    </div>

                    <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase mb-4">
                        Account Locked
                    </h1>

                    <p className="text-slate-400 font-medium leading-relaxed mb-8">
                        For your security, this account has been temporarily locked due to multiple failed login attempts.
                    </p>

                    <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-6 mb-8 flex items-center gap-4 text-left">
                        <Timer className="w-8 h-8 text-red-400 shrink-0" />
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-1">Cooldown Active</p>
                            <p className="text-sm text-slate-300 font-medium">Please wait 30 minutes before attempting to log in again.</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Link
                            to="/auth/reset-password"
                            className="block w-full py-4 bg-white text-slate-900 font-black uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-colors"
                        >
                            Reset Password
                        </Link>

                        <div className="flex items-center justify-center gap-2 pt-4">
                            <ShieldCheck className="w-4 h-4 text-slate-500" />
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">CaseBridge Security Protocol</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
