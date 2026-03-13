
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import type { NotificationCategory } from '@/hooks/useNotifications';
import InternalSidebar from '@/components/layout/InternalSidebar';
import { Mail, Smartphone, Globe, ShieldAlert, CreditCard, UserPlus, Info, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/common/ToastService';

const CATEGORIES: { id: NotificationCategory; label: string; icon: any; description: string }[] = [
    { id: 'assignments', label: 'Assignments', icon: UserPlus, description: 'New matter assignments and role changes.' },
    { id: 'matter_updates', label: 'Case Updates', icon: ShieldAlert, description: 'Status changes, document uploads, and case activity.' },
    { id: 'billing', label: 'Billing & Invoices', icon: CreditCard, description: 'Invoice generation, payments, and subscription alerts.' },
    { id: 'system', label: 'System Security', icon: Info, description: 'Account login alerts, security changes, and firm-wide notices.' },
];

export default function NotificationSettings() {
    const { preferences, updatePreference } = useNotificationPreferences();
    const navigate = useNavigate();
    const { toast } = useToast();

    const handleToggle = (category: NotificationCategory, channel: 'email' | 'push' | 'in_app', currentVal: boolean) => {
        const existing = preferences?.find(p => p.category === category);
        
        updatePreference.mutate({
            category,
            email_enabled: channel === 'email' ? !currentVal : (existing?.email_enabled ?? true),
            push_enabled: channel === 'push' ? !currentVal : (existing?.push_enabled ?? false),
            in_app_enabled: channel === 'in_app' ? !currentVal : (existing?.in_app_enabled ?? true),
        });
    };

    return (
        <div className="min-h-screen bg-[#0F172A] text-white">
            <InternalSidebar />

            <main className="ml-64 p-10 min-h-screen max-w-5xl">
                <header className="flex items-center justify-between mb-12">
                    <div className="flex items-center gap-5">
                        <button 
                            onClick={() => navigate('/internal/notifications')}
                            className="w-12 h-12 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center text-slate-400 transition-all border border-white/5"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <div>
                            <h2 className="text-4xl font-black mb-1 italic tracking-tighter uppercase">Delivery <span className="text-indigo-400">Governance</span></h2>
                            <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Configure multi-channel notification routing</p>
                        </div>
                    </div>
                </header>

                <div className="bg-[#1E293B]/50 border border-white/5 rounded-[3rem] p-12 shadow-2xl overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent"></div>
                    
                    <div className="grid grid-cols-1 gap-8">
                        {CATEGORIES.map((cat) => {
                            const pref = preferences?.find(p => p.category === cat.id);
                            const emailEnabled = pref?.email_enabled ?? true;
                            const pushEnabled = pref?.push_enabled ?? false;
                            const inAppEnabled = pref?.in_app_enabled ?? true;

                            return (
                                <div key={cat.id} className="group bg-[#1E293B] border border-white/5 rounded-[2.5rem] p-8 hover:border-indigo-500/30 transition-all shadow-lg hover:shadow-indigo-500/5">
                                    <div className="flex items-center justify-between gap-8">
                                        <div className="flex items-center gap-6 flex-1">
                                            <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">
                                                <cat.icon className="w-8 h-8" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black uppercase italic tracking-tight mb-1">{cat.label}</h3>
                                                <p className="text-slate-500 text-sm font-medium">{cat.description}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            {/* In-App Toggle */}
                                            <button
                                                onClick={() => handleToggle(cat.id, 'in_app', inAppEnabled)}
                                                className={`flex flex-col items-center justify-center w-24 h-24 rounded-3xl transition-all border ${
                                                    inAppEnabled 
                                                        ? 'bg-indigo-600 border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.3)]' 
                                                        : 'bg-white/5 border-white/5 grayscale opacity-40 hover:grayscale-0 hover:opacity-100'
                                                }`}
                                            >
                                                <Globe className="w-6 h-6 mb-2" />
                                                <span className="text-[9px] font-black uppercase tracking-widest">In-App</span>
                                            </button>

                                            {/* Email Toggle */}
                                            <button
                                                onClick={() => handleToggle(cat.id, 'email', emailEnabled)}
                                                className={`flex flex-col items-center justify-center w-24 h-24 rounded-3xl transition-all border ${
                                                    emailEnabled 
                                                        ? 'bg-indigo-600 border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.3)]' 
                                                        : 'bg-white/5 border-white/5 grayscale opacity-40 hover:grayscale-0 hover:opacity-100'
                                                }`}
                                            >
                                                <Mail className="w-6 h-6 mb-2" />
                                                <span className="text-[9px] font-black uppercase tracking-widest">Email</span>
                                            </button>

                                            {/* Push Toggle */}
                                            <button
                                                onClick={() => handleToggle(cat.id, 'push', pushEnabled)}
                                                className={`flex flex-col items-center justify-center w-24 h-24 rounded-3xl transition-all border ${
                                                    pushEnabled 
                                                        ? 'bg-indigo-600 border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.3)]' 
                                                        : 'bg-white/5 border-white/5 grayscale opacity-40 hover:grayscale-0 hover:opacity-100'
                                                }`}
                                            >
                                                <Smartphone className="w-6 h-6 mb-2" />
                                                <span className="text-[9px] font-black uppercase tracking-widest">Push</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-12 p-8 bg-indigo-500/5 rounded-[2rem] border border-indigo-500/10">
                        <div className="flex items-center gap-6">
                            <div className="w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400">
                                <Info className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-sm font-black uppercase tracking-widest mb-1">Authorization <span className="text-indigo-400">Protocol</span></h4>
                                <p className="text-slate-500 text-xs font-bold leading-relaxed">
                                    Changes take effect immediately across all firm instances. High-priority system security alerts bypass these settings to ensure institutional integrity.
                                </p>
                            </div>
                            <button 
                                onClick={() => {
                                    toast('preferences updated successfully', 'success');
                                    navigate('/internal/notifications');
                                }}
                                className="bg-white text-[#0F172A] px-10 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl"
                            >
                                Return to Hub
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
