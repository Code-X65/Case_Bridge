import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useInternalSession } from '@/hooks/useInternalSession';
import InternalSidebar from '@/components/layout/InternalSidebar';
import {
    Loader2, Save, Building2, Globe, Mail, Phone, MapPin, Upload,
    ShieldCheck, ShieldAlert, Activity
} from 'lucide-react';

export default function FirmProfilePage() {
    const { session } = useInternalSession();
    const queryClient = useQueryClient();
    const [logoUrl, setLogoUrl] = useState('');

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        website: '',
    });

    const [securityData, setSecurityData] = useState({
        enforce_2fa: false,
        whitelist_ips: [] as string[],
        session_idle_timeout: 1440,
        matter_numbering_prefix: 'CB-',
    });
    const [ipInput, setIpInput] = useState('');

    const { data: firm, isLoading } = useQuery({
        queryKey: ['firm_profile', session?.firm_id],
        enabled: !!session?.firm_id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('firms')
                .select('*')
                .eq('id', session!.firm_id)
                .single();
            if (error) throw error;
            return data;
        }
    });

    // Populate form when data loads
    useEffect(() => {
        if (firm) {
            setFormData({
                name: firm.name || '',
                email: firm.email || '',
                phone: firm.phone || '',
                address: firm.address || '',
                website: firm.website || '',
            });
            setLogoUrl(firm.logo_url || '');
            setSecurityData({
                enforce_2fa: firm.enforce_2fa || false,
                whitelist_ips: firm.whitelist_ips || [],
                session_idle_timeout: firm.session_idle_timeout || 1440,
                matter_numbering_prefix: firm.matter_numbering_prefix || 'CB-',
            });
        }
    }, [firm]);

    const updateFirmMutation = useMutation({
        mutationFn: async (updatedData: typeof formData) => {
            const { error } = await supabase
                .from('firms')
                .update({
                    ...updatedData,
                    ...securityData,
                    logo_url: logoUrl,
                    updated_at: new Date().toISOString()
                })
                .eq('id', session!.firm_id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['firm_profile'] });
            alert('Firm profile updated successfully.');
        },
        onError: (error: any) => {
            alert(`Failed to update profile: ${error.message}`);
        }
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const addIp = () => {
        if (ipInput && !securityData.whitelist_ips.includes(ipInput)) {
            setSecurityData(prev => ({ ...prev, whitelist_ips: [...prev.whitelist_ips, ipInput] }));
            setIpInput('');
        }
    };

    const removeIp = (ip: string) => {
        setSecurityData(prev => ({ ...prev, whitelist_ips: prev.whitelist_ips.filter(i => i !== ip) }));
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0F172A] text-white">
            <InternalSidebar />

            <main className="ml-64 p-12 max-w-4xl">
                <header className="mb-12">
                    <h1 className="text-4xl font-black mb-2 tracking-tight">Firm Profile</h1>
                    <p className="text-slate-400 text-lg">Manage your organization's public identity and contact details.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">

                    {/* Left Column: Logo & Branding */}
                    <div className="space-y-6">
                        <div className="bg-[#1E293B] border border-white/10 rounded-2xl p-6 text-center">
                            <div className="w-32 h-32 bg-slate-800 rounded-full mx-auto mb-6 overflow-hidden border-4 border-slate-700 relative group flex items-center justify-center">
                                {logoUrl ? (
                                    <img src={logoUrl} alt="Firm Logo" className="w-full h-full object-cover" />
                                ) : (
                                    <Building2 className="w-12 h-12 text-slate-600" />
                                )}

                                {/* Placeholder for actual file upload implementing later */}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                                    <Upload className="w-8 h-8 text-white" />
                                </div>
                            </div>

                            <h3 className="font-bold text-white mb-1">Firm Logo</h3>
                            <p className="text-xs text-slate-500 mb-4">Recommended 512x512px</p>

                            {/* Temporary Input for URL until storage bucket is ready */}
                            <input
                                type="text"
                                placeholder="Paste Logo URL..."
                                value={logoUrl}
                                onChange={(e) => setLogoUrl(e.target.value)}
                                className="w-full bg-[#0F172A] border border-slate-700 rounded-lg py-2 px-3 text-xs text-white placeholder-slate-600 focus:border-indigo-500 outline-none text-center"
                            />
                        </div>
                    </div>

                    {/* Right Column: Details Form */}
                    <div className="md:col-span-2 space-y-8">

                        {/* Basic Information */}
                        <section className="bg-[#1E293B] border border-white/10 rounded-2xl p-8">
                            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <Building2 className="w-4 h-4" /> General Information
                            </h2>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Firm Legal Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        className="w-full bg-[#0F172A] border border-slate-700 rounded-xl p-4 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all font-medium"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Website</label>
                                    <div className="relative">
                                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                        <input
                                            type="url"
                                            name="website"
                                            placeholder="https://www.example.com"
                                            value={formData.website}
                                            onChange={handleInputChange}
                                            className="w-full bg-[#0F172A] border border-slate-700 rounded-xl py-4 pl-12 pr-4 text-white focus:border-indigo-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Contact Details */}
                        <section className="bg-[#1E293B] border border-white/10 rounded-2xl p-8">
                            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <Phone className="w-4 h-4" /> Contact Information
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">General Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            className="w-full bg-[#0F172A] border border-slate-700 rounded-xl py-4 pl-12 pr-4 text-white focus:border-indigo-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Phone Number</label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleInputChange}
                                            className="w-full bg-[#0F172A] border border-slate-700 rounded-xl py-4 pl-12 pr-4 text-white focus:border-indigo-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Headquarters Address</label>
                                <div className="relative">
                                    <MapPin className="absolute left-4 top-4 w-4 h-4 text-slate-500" />
                                    <textarea
                                        name="address"
                                        rows={3}
                                        value={formData.address}
                                        onChange={handleInputChange}
                                        className="w-full bg-[#0F172A] border border-slate-700 rounded-xl py-4 pl-12 pr-4 text-white focus:border-indigo-500 outline-none transition-all resize-none"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Security & Governance */}
                        <section className="bg-[#1E293B] border border-white/10 rounded-2xl p-8">
                            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Security & Governance
                            </h2>

                            <div className="space-y-8">
                                <div className="flex items-center justify-between p-4 bg-[#0F172A] rounded-xl border border-white/5">
                                    <div>
                                        <p className="font-bold text-white text-sm">Enforce Two-Factor Authentication</p>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Global requirement for all firm users</p>
                                    </div>
                                    <button
                                        onClick={() => setSecurityData(s => ({ ...s, enforce_2fa: !s.enforce_2fa }))}
                                        className={`w-12 h-6 rounded-full transition-all relative ${securityData.enforce_2fa ? 'bg-emerald-600' : 'bg-slate-700'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${securityData.enforce_2fa ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-3">IP Infrastructure Whitelist</label>
                                    <div className="flex gap-3 mb-4">
                                        <input
                                            type="text"
                                            placeholder="Add CIDR or Static IP (e.g. 192.168.1.1)"
                                            value={ipInput}
                                            onChange={e => setIpInput(e.target.value)}
                                            className="flex-1 bg-[#0F172A] border border-slate-700 rounded-xl p-3 text-sm focus:border-indigo-500 outline-none"
                                        />
                                        <button
                                            onClick={addIp}
                                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
                                        >
                                            Add IP
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {securityData.whitelist_ips.map(ip => (
                                            <div key={ip} className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-lg">
                                                <span className="text-xs font-mono text-indigo-400">{ip}</span>
                                                <button onClick={() => removeIp(ip)} className="text-slate-500 hover:text-rose-500"><ShieldAlert size={14} /></button>
                                            </div>
                                        ))}
                                        {securityData.whitelist_ips.length === 0 && (
                                            <p className="text-xs text-slate-500 italic">No IP restrictions active. Global access permitted.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Operational Defaults */}
                        <section className="bg-[#1E293B] border border-white/10 rounded-2xl p-8">
                            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <Activity className="w-4 h-4" /> Operational Defaults
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Matter Numbering Prefix</label>
                                    <input
                                        type="text"
                                        value={securityData.matter_numbering_prefix}
                                        onChange={e => setSecurityData(s => ({ ...s, matter_numbering_prefix: e.target.value }))}
                                        className="w-full bg-[#0F172A] border border-slate-700 rounded-xl p-3 text-sm focus:border-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Session Idle Timeout (Minutes)</label>
                                    <input
                                        type="number"
                                        value={securityData.session_idle_timeout}
                                        onChange={e => setSecurityData(s => ({ ...s, session_idle_timeout: parseInt(e.target.value) || 1440 }))}
                                        className="w-full bg-[#0F172A] border border-slate-700 rounded-xl p-3 text-sm focus:border-indigo-500 outline-none"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Action Bar */}
                        <div className="flex justify-end pt-4">
                            <button
                                onClick={() => updateFirmMutation.mutate(formData)}
                                disabled={updateFirmMutation.isPending}
                                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-xs rounded-2xl transition-all shadow-xl shadow-indigo-600/20 flex items-center gap-3 active:scale-[0.98] disabled:opacity-50"
                            >
                                {updateFirmMutation.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
