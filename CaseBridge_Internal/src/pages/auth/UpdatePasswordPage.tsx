import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Loader2, Lock, ShieldCheck, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/components/common/ToastService';
import AuthNavbar from '@/components/layout/AuthNavbar';

export default function UpdatePasswordPage() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: password
            });

            if (updateError) throw updateError;

            setSuccess(true);
            toast('Password updated successfully', 'success');

            // Redirect after 2 seconds
            setTimeout(() => {
                navigate('/internal/login');
            }, 2000);

        } catch (err: any) {
            console.error('Update password error:', err);
            setError(err.message || 'Failed to update password.');
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex items-center justify-center p-6 text-white">
                <div className="max-w-md w-full bg-white/[0.03] border border-white/[0.08] p-10 rounded-3xl backdrop-blur-2xl text-center shadow-2xl">
                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10 text-green-500" />
                    </div>
                    <h1 className="text-3xl font-black mb-4 uppercase tracking-tighter italic">Security Updated</h1>
                    <p className="text-slate-400 font-medium mb-8">Your password has been changed successfully. Redirecting to login...</p>
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mx-auto" />
                </div>
            </div>
        );
    }

    return (
        <>
            <AuthNavbar variant="internal" />
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex items-center justify-center p-6 text-white relative overflow-hidden pt-24">
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-900/30 via-transparent to-transparent" />
                    <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent" />
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-[120px] animate-pulse" />
                </div>

                <div className="w-full max-w-md relative z-10">
                    <div className="bg-white/[0.03] border border-white/[0.08] p-10 rounded-3xl backdrop-blur-2xl relative shadow-2xl">
                        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/[0.08] to-transparent pointer-events-none" />

                        <div className="relative z-10 text-center mb-10">
                            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-500/30">
                                <ShieldCheck className="w-8 h-8 text-white font-black" />
                            </div>
                            <h1 className="text-3xl font-black mb-2 tracking-tight">Security Hub</h1>
                            <p className="text-slate-400 font-medium">Reset your CaseBridge credentials</p>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 backdrop-blur-xl text-red-200 p-4 rounded-xl mb-6 text-xs font-bold uppercase tracking-wider flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-red-400 shrink-0 animate-pulse" />
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleUpdatePassword} className="space-y-5">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 px-1">
                                    New secret key
                                </label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3.5 pl-12 pr-12 text-white focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono text-sm"
                                        placeholder="••••••••"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-400 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 px-1">
                                    Verify secret key
                                </label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3.5 pl-12 pr-12 text-white focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono text-sm"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full h-14 bg-white text-slate-900 font-black uppercase tracking-[0.2em] text-[10px] rounded-xl hover:bg-slate-100 transition-all flex items-center justify-center gap-2 mt-4 shadow-xl active:scale-[0.98] disabled:opacity-50"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Updating...
                                    </>
                                ) : (
                                    'Seal Identity'
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
}
