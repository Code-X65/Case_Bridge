import React, { useEffect, useState, useRef } from 'react';
import ClientLayout from '../components/ClientLayout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

export default function Profile() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [initialData, setInitialData] = useState<any>(null);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        phone: '',
        country: '',
        email: '',
        status: ''
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });
    const containerRef = useRef<HTMLDivElement>(null);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        if (!user) return;

        const fetchProfile = async () => {
            const { data } = await supabase
                .from('external_users')
                .select('*')
                .eq('id', user.id)
                .single();

            if (data) {
                const profileData = {
                    firstName: data.first_name || '',
                    lastName: data.last_name || '',
                    phone: data.phone || '',
                    country: data.country || '',
                    email: data.email || '',
                    status: data.status || 'active'
                };
                setFormData(profileData);
                setInitialData(profileData);
            }
            setLoading(false);
        };

        fetchProfile();
    }, [user]);

    // Check for changes
    useEffect(() => {
        if (!initialData) return;
        const isChanged =
            formData.firstName !== initialData.firstName ||
            formData.lastName !== initialData.lastName ||
            formData.phone !== initialData.phone ||
            formData.country !== initialData.country;

        setHasChanges(isChanged);
    }, [formData, initialData]);

    // Validation Logic
    const validate = () => {
        const newErrors: Record<string, string> = {};
        const nameRegex = /^[a-zA-Z\s-]+$/;

        if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
        else if (!nameRegex.test(formData.firstName)) newErrors.firstName = 'Name must differ from numbers/symbols';

        if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
        else if (!nameRegex.test(formData.lastName)) newErrors.lastName = 'Name must differ from numbers/symbols';

        if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
        else if (formData.phone.length < 8) newErrors.phone = 'Phone number seems too short';

        if (!formData.country.trim()) newErrors.country = 'Country/Region is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatusMsg({ text: '', type: '' });

        if (!validate()) return;

        setSaving(true);

        try {
            const { error } = await supabase
                .from('external_users')
                .update({
                    first_name: formData.firstName,
                    last_name: formData.lastName,
                    phone: formData.phone,
                    country: formData.country,
                })
                .eq('id', user?.id);

            if (error) throw error;

            // Audit Log
            await supabase.rpc('log_client_event', {
                p_action: 'client_profile_updated',
                p_details: { fields: Object.keys(formData).filter(k => formData[k as keyof typeof formData] !== initialData[k as keyof typeof initialData]) }
            });

            setInitialData({ ...formData });
            setHasChanges(false);
            setStatusMsg({ text: 'Profile updated successfully', type: 'success' });

            // Auto-hide success message
            setTimeout(() => setStatusMsg({ text: '', type: '' }), 3000);

        } catch (err: any) {
            console.error(err);
            setStatusMsg({ text: err.message || 'Error updating profile', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    useGSAP(() => {
        if (statusMsg.text) {
            gsap.from('.status-msg', { y: -10, opacity: 0, duration: 0.3 });
        }
    }, [statusMsg]);

    if (loading) return (
        <ClientLayout>
            <div className="flex justify-center py-20">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        </ClientLayout>
    );

    return (
        <ClientLayout>
            <div ref={containerRef} className="max-w-4xl">
                <div className="mb-8 flex items-end justify-between">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400">My Profile</h1>
                        <p className="text-muted-foreground mt-1">This is who you are on CaseBridge.</p>
                    </div>
                </div>

                {/* Section A: Profile Summary Header */}
                <div className="glass-card mb-8 border-l-4 border-l-blue-500">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-bold">{formData.firstName} {formData.lastName}</h2>
                            <p className="text-muted-foreground text-sm m-0">{formData.email}</p>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 rounded-full border border-blue-500/20 w-fit">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                            </span>
                            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">
                                {formData.status.toUpperCase()} ACCOUNT
                            </span>
                        </div>
                    </div>
                </div>

                {/* Section B: Editable Info */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="glass-card">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6 border-b border-white/10 pb-2">
                            Personal Information
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label>First Name</label>
                                <input
                                    type="text"
                                    value={formData.firstName}
                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                    className={errors.firstName ? 'border-red-500/50 focus:ring-red-500/50' : ''}
                                />
                                {errors.firstName && <p className="text-red-400 text-xs mt-1">{errors.firstName}</p>}
                            </div>
                            <div>
                                <label>Last Name</label>
                                <input
                                    type="text"
                                    value={formData.lastName}
                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                    className={errors.lastName ? 'border-red-500/50 focus:ring-red-500/50' : ''}
                                />
                                {errors.lastName && <p className="text-red-400 text-xs mt-1">{errors.lastName}</p>}
                            </div>
                        </div>

                        <div className="mt-4">
                            <label>Email Address</label>
                            <div className="relative">
                                <input
                                    type="email"
                                    value={formData.email}
                                    disabled
                                    className="opacity-50 cursor-not-allowed bg-white/5 pl-10"
                                />
                                <div className="absolute left-3 top-3.5 text-muted-foreground">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                                </div>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1">
                                Email cannot be changed in this version. Contact support if critical.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                            <div>
                                <label>Phone Number</label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className={errors.phone ? 'border-red-500/50 focus:ring-red-500/50' : ''}
                                />
                                {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
                            </div>
                            <div>
                                <label>Country / Region</label>
                                <input
                                    type="text"
                                    value={formData.country}
                                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                    className={errors.country ? 'border-red-500/50 focus:ring-red-500/50' : ''}
                                />
                                {errors.country && <p className="text-red-400 text-xs mt-1">{errors.country}</p>}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="h-8">
                            {statusMsg.text && (
                                <div className={`status-msg flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${statusMsg.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                    {statusMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                                    {statusMsg.text}
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={saving || !hasChanges}
                            className={`btn w-fit px-8 flex items-center gap-2 ${hasChanges ? 'btn-primary' : 'bg-white/5 text-muted-foreground cursor-not-allowed'}`}
                        >
                            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </ClientLayout>
    );
}
