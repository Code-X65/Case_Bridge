import { useState, useRef } from 'react';
import ClientLayout from '../components/ClientLayout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
    KeyRound, ShieldCheck, LifeBuoy, LogOut, ChevronRight,
    Loader2, CheckCircle2, AlertTriangle, X, Eye, EyeOff
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

const SettingItem = ({ icon: Icon, title, description, badge = '', onClick, destructive = false }: any) => (
    <button
        onClick={onClick}
        className="w-full text-left glass-card flex items-start gap-4 hover:border-white/20 transition-all group mb-4"
    >
        <div className={`p-3 rounded-xl ${destructive ? 'bg-red-500/10 text-red-400' : 'bg-white/5 text-muted-foreground'} group-hover:scale-110 transition-transform`}>
            <Icon size={24} />
        </div>
        <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
                <h3 className={`font-semibold ${destructive ? 'text-red-400' : 'text-foreground'}`}>{title}</h3>
                {badge && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded uppercase tracking-wider font-bold">{badge}</span>}
            </div>
            <p className="text-sm text-muted-foreground m-0 leading-relaxed">{description}</p>
        </div>
        <ChevronRight size={20} className="text-muted-foreground/30 mt-4 group-hover:translate-x-1 transition-transform" />
    </button>
);

export default function Settings() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showHelpModal, setShowHelpModal] = useState(false);
    const helpModalRef = useRef<HTMLDivElement>(null);

    // Password Logic
    const [passData, setPassData] = useState({ current: '', new: '', confirm: '' });
    const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
    const [passError, setPassError] = useState('');
    const [passSuccess, setPassSuccess] = useState('');
    const [changingPass, setChangingPass] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);
    useGSAP(() => {
        if (showPasswordModal) {
            gsap.fromTo(modalRef.current,
                { y: 50, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.3, ease: 'power2.out' }
            );
        }
    }, [showPasswordModal]);

    useGSAP(() => {
        if (showHelpModal) {
            gsap.fromTo(helpModalRef.current,
                { scale: 0.9, opacity: 0 },
                { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.7)' }
            );
        }
    }, [showHelpModal]);

    const handleLogout = async () => {
        setLoading(true);
        await supabase.rpc('log_client_event', { p_action: 'client_logged_out' });
        await supabase.auth.signOut();
        navigate('/login');
    };

    const validatePassword = (p: string) => {
        if (p.length < 10) return "Password must be at least 10 characters";
        if (!/[A-Z]/.test(p)) return "Password must contain an uppercase letter";
        if (!/[0-9]/.test(p)) return "Password must contain a number";
        if (!/[^A-Za-z0-9]/.test(p)) return "Password must contain a special symbol";
        return null;
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPassError('');
        setPassSuccess('');

        // 1. Validation
        if (passData.new !== passData.confirm) {
            setPassError("New passwords do not match");
            return;
        }

        const complexityError = validatePassword(passData.new);
        if (complexityError) {
            setPassError(complexityError);
            return;
        }

        setChangingPass(true);

        try {
            // 2. Verify Current Password by signing in (Supabase doesn't strictly require this for update if session active, NOT RECOMMENDED flow usually, but we simulate verification)
            // Ideally we re-auth.
            if (user?.email) {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email: user.email,
                    password: passData.current
                });

                if (signInError) throw new Error("Incorrect current password");
            }

            // 3. Update Password
            const { error } = await supabase.auth.updateUser({ password: passData.new });
            if (error) throw error;

            // 4. Audit
            await supabase.rpc('log_client_event', { p_action: 'client_password_changed' });

            setPassSuccess("Password updated successfully.");
            setPassData({ current: '', new: '', confirm: '' });
            setTimeout(() => {
                setShowPasswordModal(false);
                setPassSuccess('');
            }, 2000);

        } catch (err: any) {
            setPassError(err.message || "Failed to update password");
        } finally {
            setChangingPass(false);
        }
    };

    return (
        <ClientLayout>
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Account Settings</h1>
                <p className="text-muted-foreground mt-1">Manage your security and account preferences.</p>
            </div>

            <div className="max-w-3xl relative">
                <div className={`${showPasswordModal ? 'blur-sm pointer-events-none' : ''} transition-all duration-300`}>
                    <div className="mb-8">
                        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-2">
                            Security & Authentication
                        </h2>
                        <SettingItem
                            icon={KeyRound}
                            title="Change Password"
                            description="Update your password to keep your account secure."
                            onClick={() => setShowPasswordModal(true)}
                        />
                        <SettingItem
                            icon={ShieldCheck}
                            title="Two-Factor Authentication"
                            description="Add an extra layer of security to your client portal."
                            badge="Start Phase 2"
                        />
                    </div>

                    <div className="mb-8">
                        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-2">
                            Support & Privacy
                        </h2>
                        <SettingItem
                            icon={LifeBuoy}
                            title="Help & Documentation"
                            description="Learn how CaseBridge protects your legal data."
                            onClick={() => setShowHelpModal(true)}
                        />
                    </div>

                    <div className="mt-12 pt-8 border-t border-white/5">
                        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-2 text-red-400/50">
                            Account Actions
                        </h2>
                        <SettingItem
                            icon={LogOut}
                            title="Sign Out"
                            description="Securely terminate your current session."
                            destructive
                            onClick={handleLogout}
                        />
                    </div>
                </div>

                {/* Password Modal Overlay */}
                {showPasswordModal && (
                    <div className="absolute top-0 left-0 w-full h-full min-h-[500px] flex items-start justify-center pt-10 z-20">
                        <div ref={modalRef} className="glass-card w-full max-w-lg border border-white/20 shadow-2xl bg-[#0a0f1e]/90">
                            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                                <h3 className="text-xl font-bold">Change Password</h3>
                                <button onClick={() => setShowPasswordModal(false)} className="text-muted-foreground hover:text-white">
                                    <X size={20} />
                                </button>
                            </div>

                            {passError && (
                                <div className="mb-4 p-3 bg-red-900/20 border border-red-500/20 text-red-200 rounded text-sm flex items-center gap-2">
                                    <AlertTriangle size={16} /> {passError}
                                </div>
                            )}

                            {passSuccess && (
                                <div className="mb-4 p-3 bg-green-900/20 border border-green-500/20 text-green-200 rounded text-sm flex items-center gap-2">
                                    <CheckCircle2 size={16} /> {passSuccess}
                                </div>
                            )}

                            <form onSubmit={handleChangePassword} className="space-y-4">
                                <div>
                                    <label>Current Password</label>
                                    <div className="relative">
                                        <input
                                            type={showPasswords.current ? "text" : "password"}
                                            value={passData.current}
                                            onChange={e => setPassData({ ...passData, current: e.target.value })}
                                            placeholder="Enter current password"
                                            required
                                            className="w-full pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                                        >
                                            {showPasswords.current ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label>New Password</label>
                                    <div className="relative">
                                        <input
                                            type={showPasswords.new ? "text" : "password"}
                                            value={passData.new}
                                            onChange={e => setPassData({ ...passData, new: e.target.value })}
                                            placeholder="Min 10 chars, Upper, Number, Symbol"
                                            required
                                            className="w-full pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                                        >
                                            {showPasswords.new ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">Min 10 chars, Uppercase, Number, Special Symbol required.</p>
                                </div>

                                <div>
                                    <label>Confirm New Password</label>
                                    <div className="relative">
                                        <input
                                            type={showPasswords.confirm ? "text" : "password"}
                                            value={passData.confirm}
                                            onChange={e => setPassData({ ...passData, confirm: e.target.value })}
                                            placeholder="Re-enter new password"
                                            required
                                            className="w-full pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                                        >
                                            {showPasswords.confirm ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswordModal(false)}
                                        className="px-4 py-2 rounded-lg hover:bg-white/5 text-sm transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={changingPass}
                                        className="btn btn-primary w-fit px-6 py-2 text-sm"
                                    >
                                        {changingPass ? 'Updating...' : 'Update Password'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Documentation Modal Overlay */}
                {showHelpModal && (
                    <div className="fixed inset-0 flex items-center justify-center z-[100] px-4">
                        <div className="absolute inset-0 bg-[#0a0f1e]/80 backdrop-blur-md" onClick={() => setShowHelpModal(false)}></div>
                        <div ref={helpModalRef} className="glass-card w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col relative z-10 border border-white/20 shadow-2xl">
                            <div className="flex justify-between items-center p-6 border-b border-white/10 bg-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400">
                                        <ShieldCheck size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold">CaseBridge Documentation</h3>
                                        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-0.5">V1.0 Canonical Model</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowHelpModal(false)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5 text-muted-foreground hover:text-white transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                                <section>
                                    <h4 className="text-blue-400 font-black text-xs uppercase tracking-widest mb-4">Account & Governance</h4>
                                    <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
                                        <p><strong>Identity binding:</strong> Your account is protected by military-grade encryption and dual-factor authentication potential. Every action is logged in our immutable audit trail.</p>
                                        <p><strong>Privileged Access:</strong> Only you and your assigned legal team (Associate Lawyer & Case Manager) have access to your case details and files.</p>
                                    </div>
                                </section>

                                <section>
                                    <h4 className="text-indigo-400 font-black text-xs uppercase tracking-widest mb-4">Case Lifecycle</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                            <p className="text-xs font-bold text-white mb-2 underline decoration-indigo-500 decoration-2">Scheduling</p>
                                            <p className="text-[11px] text-slate-400">Time selection is coordinate via Calendly. All meeting history is persisted within our secure database.</p>
                                        </div>
                                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                            <p className="text-xs font-bold text-white mb-2 underline decoration-emerald-500 decoration-2">Updates</p>
                                            <p className="text-[11px] text-slate-400">Professional updates are provided by your legal team. You will be notified of any significant milestones.</p>
                                        </div>
                                    </div>
                                </section>

                                <section>
                                    <h4 className="text-emerald-400 font-black text-xs uppercase tracking-widest mb-4">Data Sovereignty</h4>
                                    <p className="text-sm text-slate-300 leading-relaxed">
                                        CaseBridge ensures your legal data never leaves our secure perimeter. All document transfers use short-lived signed URLs for maximum rotation security.
                                    </p>
                                </section>
                            </div>

                            <div className="p-6 bg-white/5 border-t border-white/10 flex justify-end">
                                <button
                                    onClick={() => setShowHelpModal(false)}
                                    className="btn btn-secondary text-xs px-8"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {loading && (
                <div className="fixed inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-[100]">
                    <Loader2 className="animate-spin text-primary" size={48} />
                </div>
            )}
        </ClientLayout>
    );
}
