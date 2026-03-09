import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useInternalSession } from '@/hooks/useInternalSession';
import InternalSidebar from '@/components/layout/InternalSidebar';
import {
    Loader2, Save, Building2, Globe, Mail, Phone, MapPin, Upload,
    ShieldCheck, ShieldAlert, Activity, FileText, Lock, Clock, Settings,
    CheckCircle2, Info
} from 'lucide-react';
import { useToast } from '@/components/common/ToastService';
import Skeleton from '@/components/ui/Skeleton';

type Tab = 'general' | 'security' | 'governance';

export default function FirmSettingsPage() {
    const { session } = useInternalSession();
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState<Tab>('general');
    const [logoPreview, setLogoPreview] = useState('');
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        website: '',
        tax_id: '',
        logo_url: '',
        enforce_2fa: false,
        whitelist_ips: [] as string[],
        session_idle_timeout: 1440,
        matter_numbering_prefix: 'CB-',
    });
    const [ipInput, setIpInput] = useState('');

    const { data: firm, isLoading } = useQuery({
        queryKey: ['firm_settings', session?.firm_id],
        enabled: !!session?.firm_id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('firms')
                .select('*')
                .eq('id', session!.firm_id)
                .maybeSingle();
            if (error) throw error;
            return data;
        }
    });

    useEffect(() => {
        if (firm) {
            setFormData({
                name: firm.name || '',
                email: firm.email || '',
                phone: firm.phone || '',
                address: firm.address || '',
                website: firm.website || '',
                tax_id: firm.tax_id || '',
                logo_url: firm.logo_url || '',
                enforce_2fa: firm.enforce_2fa || false,
                whitelist_ips: firm.whitelist_ips || [],
                session_idle_timeout: firm.session_idle_timeout || 1440,
                matter_numbering_prefix: firm.matter_numbering_prefix || 'CB-',
            });
            setLogoPreview(firm.logo_url || '');
        }
    }, [firm]);

    const updateFirmMutation = useMutation({
        mutationFn: async (updatedData: typeof formData) => {
            const { error } = await supabase
                .from('firms')
                .update({
                    ...updatedData,
                    updated_at: new Date().toISOString()
                })
                .eq('id', session!.firm_id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['firm_settings'] });
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        },
        onError: (error: any) => {
            toast(`Failed to update settings: ${error.message}`, 'error');
        }
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target as HTMLInputElement;
        const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
        setFormData(prev => ({ ...prev, [name]: val }));
    };

    const addIp = () => {
        if (ipInput && !formData.whitelist_ips.includes(ipInput)) {
            setFormData(prev => ({ ...prev, whitelist_ips: [...prev.whitelist_ips, ipInput] }));
            setIpInput('');
        }
    };

    const removeIp = (ip: string) => {
        setFormData(prev => ({ ...prev, whitelist_ips: prev.whitelist_ips.filter(i => i !== ip) }));
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0F172A] text-white">
                <InternalSidebar />
                <div className="ml-64 p-12 max-w-5xl animate-in fade-in duration-500">
                    <div className="mb-12 flex justify-between">
                        <div>
                            <Skeleton className="h-12 w-64 mb-2" />
                            <Skeleton className="h-6 w-96" />
                        </div>
                        <Skeleton className="h-12 w-48" />
                    </div>
                    <Skeleton className="h-14 w-96 mb-10" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                        <Skeleton className="h-96 w-full" />
                        <div className="md:col-span-2 space-y-8">
                            <Skeleton className="h-64 w-full" />
                            <Skeleton className="h-64 w-full" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0F172A] text-white">
            <InternalSidebar />

            <main className="ml-64 p-12 max-w-5xl">
                <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20 text-indigo-400">
                                <Settings className="w-5 h-5" />
                            </div>
                            <h1 className="text-4xl font-black tracking-tight">Firm Settings</h1>
                        </div>
                        <p className="text-slate-400 text-lg">Central hub for identity, governance, and system-wide security policies.</p>
                    </div>

                    <div className="flex items-center gap-4">
                        {saveSuccess && (
                            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-widest animate-in fade-in slide-in-from-right-4">
                                <CheckCircle2 className="w-4 h-4" /> Changes Deployed
                            </div>
                        )}
                        <button
                            onClick={() => updateFirmMutation.mutate(formData)}
                            disabled={updateFirmMutation.isPending}
                            className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl transition-all shadow-xl shadow-indigo-600/20 flex items-center gap-3 active:scale-[0.98] disabled:opacity-50"
                        >
                            {updateFirmMutation.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                            Synchronize Changes
                        </button>
                    </div>
                </header>

                {/* Tab Navigation */}
                <nav className="flex items-center gap-2 mb-10 p-1.5 bg-white/5 border border-white/10 rounded-2xl w-fit">
                    <TabButton
                        active={activeTab === 'general'}
                        icon={Building2}
                        label="Identity & Branding"
                        onClick={() => setActiveTab('general')}
                    />
                    <TabButton
                        active={activeTab === 'security'}
                        icon={ShieldCheck}
                        label="Security & Access"
                        onClick={() => setActiveTab('security')}
                    />
                    <TabButton
                        active={activeTab === 'governance'}
                        icon={Activity}
                        label="Governance Defaults"
                        onClick={() => setActiveTab('governance')}
                    />
                </nav>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    <div className="lg:col-span-12 space-y-8">

                        {/* Tab: General & Branding */}
                        {activeTab === 'general' && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                {/* Logo Section */}
                                <div className="space-y-6">
                                    <div className="bg-[#1E293B] border border-white/10 rounded-[2rem] p-8 text-center sticky top-12">
                                        <div className="w-32 h-32 bg-slate-800 rounded-3xl mx-auto mb-6 overflow-hidden border-4 border-slate-700 relative group flex items-center justify-center shadow-2xl transition-transform hover:scale-[1.02]">
                                            {logoPreview ? (
                                                <img src={logoPreview} alt="Firm Logo" className="w-full h-full object-cover" />
                                            ) : (
                                                <Building2 className="w-12 h-12 text-slate-600" />
                                            )}
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                                                <Upload className="w-8 h-8 text-white" />
                                            </div>
                                        </div>
                                        <h3 className="font-bold text-white mb-1 uppercase tracking-tighter text-lg italic">Brand Registry</h3>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-6">Vector or High-Res PNG preferred</p>

                                        <div className="text-left space-y-4">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Public Logo URL</label>
                                                <input
                                                    type="text"
                                                    name="logo_url"
                                                    value={formData.logo_url}
                                                    onChange={handleInputChange}
                                                    onBlur={() => setLogoPreview(formData.logo_url)}
                                                    className="w-full bg-[#0F172A] border border-slate-700 rounded-xl py-3 px-4 text-xs text-white placeholder-slate-600 focus:border-indigo-500 outline-none transition-all"
                                                    placeholder="https://cloud.cdn/logo.png"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Details Section */}
                                <div className="md:col-span-2 space-y-8">
                                    <FormSection icon={FileText} title="Firm Identity">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="md:col-span-2">
                                                <InputField
                                                    label="Legal Business Name"
                                                    name="name"
                                                    value={formData.name}
                                                    onChange={handleInputChange}
                                                    placeholder="Sterling & Cooper Law Group"
                                                />
                                            </div>
                                            <InputField
                                                label="Tax ID / Registration Number"
                                                name="tax_id"
                                                value={formData.tax_id}
                                                onChange={handleInputChange}
                                                placeholder="VAT-987654321"
                                            />
                                            <InputField
                                                label="Corporate Website"
                                                name="website"
                                                value={formData.website}
                                                onChange={handleInputChange}
                                                placeholder="www.sterlinglegal.com"
                                                icon={Globe}
                                            />
                                        </div>
                                    </FormSection>

                                    <FormSection icon={Phone} title="Contact Information">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <InputField
                                                label="Public Email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleInputChange}
                                                placeholder="enquiries@firm.com"
                                                icon={Mail}
                                            />
                                            <InputField
                                                label="Switchboard Phone"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleInputChange}
                                                placeholder="+1 (202) 555-0123"
                                                icon={Phone}
                                            />
                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Headquarters Address</label>
                                                <div className="relative">
                                                    <MapPin className="absolute left-4 top-4 w-4 h-4 text-slate-600" />
                                                    <textarea
                                                        name="address"
                                                        rows={4}
                                                        value={formData.address}
                                                        onChange={handleInputChange}
                                                        className="w-full bg-[#0F172A] border border-slate-700/50 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-indigo-500 outline-none transition-all resize-none shadow-inner"
                                                        placeholder="742 Evergreen Terrace, Suite 100..."
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </FormSection>
                                </div>
                            </div>
                        )}

                        {/* Tab: Security & Access */}
                        {activeTab === 'security' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <FormSection icon={Lock} title="Authentication Policies">
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between p-6 bg-[#0F172A] rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-all cursor-pointer group" onClick={() => setFormData(p => ({ ...p, enforce_2fa: !p.enforce_2fa }))}>
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 group-hover:scale-110 transition-transform">
                                                    <ShieldCheck className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white text-lg tracking-tight">Strict Two-Factor Authentication</p>
                                                    <p className="text-xs text-slate-500 font-medium mt-1">Require all staff members to verify identity via TOTP or Bio-Auth. Highly Recommended.</p>
                                                </div>
                                            </div>
                                            <button
                                                className={`w-14 h-7 rounded-full transition-all relative ${formData.enforce_2fa ? 'bg-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-slate-700'}`}
                                            >
                                                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${formData.enforce_2fa ? 'left-8' : 'left-1'}`} />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-10">
                                            <div className="space-y-6">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Globe className="w-4 h-4 text-indigo-400" />
                                                    <h4 className="text-sm font-black uppercase text-white tracking-widest">Network Whitelist</h4>
                                                </div>
                                                <p className="text-xs text-slate-500 leading-relaxed mb-4">Restrict portal access to specific static IPs or corporate VPN ranges. Leave empty for global access.</p>

                                                <div className="flex gap-3">
                                                    <input
                                                        type="text"
                                                        placeholder="CIDR or IP (e.g. 192.168.1.1)"
                                                        value={ipInput}
                                                        onChange={e => setIpInput(e.target.value)}
                                                        className="flex-1 bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none"
                                                    />
                                                    <button
                                                        onClick={addIp}
                                                        className="px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors active:scale-95"
                                                    >
                                                        Register IP
                                                    </button>
                                                </div>

                                                <div className="flex flex-wrap gap-3 mt-4">
                                                    {formData.whitelist_ips.map(ip => (
                                                        <div key={ip} className="flex items-center gap-3 bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 rounded-xl group/ip">
                                                            <span className="text-xs font-mono text-indigo-300 font-bold">{ip}</span>
                                                            <button onClick={() => removeIp(ip)} className="text-slate-600 hover:text-rose-500 transition-colors opacity-0 group-hover/ip:opacity-100"><ShieldAlert size={14} /></button>
                                                        </div>
                                                    ))}
                                                    {formData.whitelist_ips.length === 0 && (
                                                        <div className="w-full p-6 text-center border-2 border-dashed border-white/5 rounded-2xl">
                                                            <p className="text-xs text-slate-500 italic">No network restrictions active.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="space-y-6">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Clock className="w-4 h-4 text-indigo-400" />
                                                    <h4 className="text-sm font-black uppercase text-white tracking-widest">Session Persistence</h4>
                                                </div>
                                                <p className="text-xs text-slate-500 leading-relaxed mb-4">Define logic for automatic logout during inactivity. Enforced for SOC2 compliance.</p>

                                                <div className="space-y-8">
                                                    <div>
                                                        <div className="flex items-center justify-between mb-3">
                                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Idle Timeout (Minutes)</label>
                                                            <span className="text-indigo-400 font-black text-lg">{formData.session_idle_timeout}m</span>
                                                        </div>
                                                        <input
                                                            type="range"
                                                            min="15"
                                                            max="10080"
                                                            step="15"
                                                            value={formData.session_idle_timeout}
                                                            onChange={e => setFormData(p => ({ ...p, session_idle_timeout: parseInt(e.target.value) }))}
                                                            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                                        />
                                                        <div className="flex justify-between mt-2 text-[10px] font-bold text-slate-600">
                                                            <span>15m (High)</span>
                                                            <span>1w (Standard)</span>
                                                        </div>
                                                    </div>

                                                    <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-start gap-3">
                                                        <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                                        <p className="text-[10px] text-amber-200/60 leading-relaxed font-medium">Session changes affect new logins only. Existing sessions remain valid until natural expiration or explicit termination.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </FormSection>
                            </div>
                        )}

                        {/* Tab: Governance Defaults */}
                        {activeTab === 'governance' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <FormSection icon={Activity} title="System Operations">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <div className="space-y-6">
                                            <InputField
                                                label="Matter Numbering Prefix"
                                                name="matter_numbering_prefix"
                                                value={formData.matter_numbering_prefix}
                                                onChange={handleInputChange}
                                                placeholder="LIT-"
                                                hint="This prefix will be applied globally to all new matter files."
                                            />

                                            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                                                <h5 className="text-xs font-black text-white uppercase tracking-widest mb-2">Live Preview</h5>
                                                <p className="text-2xl font-mono text-indigo-400 font-black tracking-tighter">
                                                    {formData.matter_numbering_prefix}2026-0001
                                                </p>
                                            </div>
                                        </div>

                                        <div className="bg-indigo-600/10 border border-indigo-600/20 p-8 rounded-[2.5rem] flex flex-col justify-between">
                                            <div>
                                                <h4 className="text-lg font-black text-white mb-2 italic">Immutable Audit Trail</h4>
                                                <p className="text-sm text-slate-400 leading-relaxed mb-6">
                                                    All changes to firm settings are recorded in the governance ledger. Administrators can trace configuration history via the Audit module.
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => window.open('/internal/audit-logs', '_blank')}
                                                className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all flex items-center justify-center gap-3"
                                            >
                                                <Activity className="w-4 h-4" /> View Configuration History
                                            </button>
                                        </div>
                                    </div>
                                </FormSection>
                            </div>
                        )}

                    </div>
                </div>
            </main>
        </div>
    );
}

// Helper Components
function TabButton({ active, icon: Icon, label, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-3 px-6 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${active
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                }`}
        >
            <Icon size={16} className={active ? 'text-white' : 'text-slate-600'} />
            {label}
        </button>
    );
}

function FormSection({ icon: Icon, title, children }: any) {
    return (
        <section className="bg-[#1E293B] border border-white/10 rounded-[2.5rem] p-10 backdrop-blur-md shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none group-hover:rotate-12 transition-transform duration-700">
                <Icon className="w-48 h-48" />
            </div>
            <h2 className="text-sm font-black text-slate-500 uppercase tracking-[0.3em] mb-10 flex items-center gap-3">
                <Icon className="w-5 h-5 text-indigo-500" /> {title}
            </h2>
            {children}
        </section>
    );
}

function InputField({ label, name, value, onChange, placeholder, icon: Icon, hint }: any) {
    return (
        <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">{label}</label>
            <div className="relative">
                {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />}
                <input
                    type="text"
                    name={name}
                    value={value}
                    onChange={onChange}
                    className={`w-full bg-[#0F172A] border border-slate-700/50 rounded-2xl ${Icon ? 'pl-12' : 'px-5'} py-4 text-white placeholder-slate-600 focus:border-indigo-500 outline-none transition-all shadow-inner font-medium`}
                    placeholder={placeholder}
                />
            </div>
            {hint && <p className="text-[10px] text-slate-600 mt-2 italic font-medium">{hint}</p>}
        </div>
    );
}
