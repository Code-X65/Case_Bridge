import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Save, Loader2, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';

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

    if (loading) return (
        <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-primary" size={40} />
        </div>
    );

    return (
        <div className="animate-fade-in relative max-w-4xl mx-auto pb-10">
            {/* Ambient Background Blur for main content area */}
            <div className="absolute top-[0%] right-[10%] w-[30%] h-[30%] bg-primary/5 blur-[120px] rounded-full pointer-events-none z-0"></div>

            <div className="relative z-10 px-2 sm:px-0">
                <div className="mb-8">
                    <h1 className="text-3xl sm:text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary/80 to-primary/50 mb-2">My Profile</h1>
                    <p className="text-muted-foreground text-sm sm:text-base">Manage your identity and personal details securely.</p>
                </div>

                {/* Section A: Profile Summary Header */}
                <div className="bg-card border border-border shadow-neumorph rounded-[2rem] p-6 sm:p-8 mb-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700 hidden sm:block scale-150 origin-top-right">
                        <ShieldCheck size={120} />
                    </div>

                    <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="min-w-0">
                            <h2 className="text-xl sm:text-2xl font-bold truncate text-foreground">{formData.firstName} {formData.lastName}</h2>
                            <p className="text-muted-foreground text-sm sm:text-base m-0 truncate mt-1">{formData.email}</p>
                        </div>
                        <div className="flex items-center gap-3 px-4 py-2 bg-primary/10 rounded-xl border border-primary/20 w-fit shrink-0 shadow-sm">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                            </span>
                            <span className="text-xs font-bold text-primary uppercase tracking-widest">
                                {formData.status.toUpperCase()} ACCOUNT
                            </span>
                        </div>
                    </div>
                </div>

                {/* Section B: Editable Info */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-card border border-border shadow-neumorph-inset rounded-[2rem] p-6 sm:p-8">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-6 border-b border-border pb-4">
                            Personal Information
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">First Name</label>
                                <input
                                    type="text"
                                    value={formData.firstName}
                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                    className={`w-full bg-input border ${errors.firstName ? 'border-destructive' : 'border-border'} rounded-xl py-3 px-4 text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm`}
                                />
                                {errors.firstName && <p className="text-destructive text-[10px] sm:text-xs mt-1.5 font-bold">{errors.firstName}</p>}
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Last Name</label>
                                <input
                                    type="text"
                                    value={formData.lastName}
                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                    className={`w-full bg-input border ${errors.lastName ? 'border-destructive' : 'border-border'} rounded-xl py-3 px-4 text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm`}
                                />
                                {errors.lastName && <p className="text-destructive text-[10px] sm:text-xs mt-1.5 font-bold">{errors.lastName}</p>}
                            </div>
                        </div>

                        <div className="mb-6">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Email Address (Archived)</label>
                            <div className="relative relative flex items-center">
                                <div className="absolute left-4 text-muted-foreground">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                                </div>
                                <input
                                    type="email"
                                    value={formData.email}
                                    disabled
                                    className="w-full bg-background border border-border rounded-xl py-3 pl-12 pr-4 text-muted-foreground cursor-not-allowed shadow-inner opacity-70"
                                />
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-2 font-semibold">
                                Email cannot be changed in this version. Contact support if critical.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Phone Number</label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className={`w-full bg-input border ${errors.phone ? 'border-destructive' : 'border-border'} rounded-xl py-3 px-4 text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm`}
                                />
                                {errors.phone && <p className="text-destructive text-[10px] sm:text-xs mt-1.5 font-bold">{errors.phone}</p>}
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Country / Region</label>
                                <input
                                    type="text"
                                    value={formData.country}
                                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                    className={`w-full bg-input border ${errors.country ? 'border-destructive' : 'border-border'} rounded-xl py-3 px-4 text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm`}
                                />
                                {errors.country && <p className="text-destructive text-[10px] sm:text-xs mt-1.5 font-bold">{errors.country}</p>}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-4">
                        <div className="min-h-[2.5rem] flex-1">
                            {statusMsg.text && (
                                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold shadow-sm animate-fade-in ${statusMsg.type === 'success' ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-destructive/10 text-destructive border border-destructive/20'}`}>
                                    {statusMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                                    {statusMsg.text}
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={saving || !hasChanges}
                            className={`w-full sm:w-auto px-8 py-4 rounded-[var(--radius-neumorph)] flex items-center justify-center gap-3 text-sm font-bold uppercase tracking-wider transition-all scale-100 active:scale-95 shadow-sm 
                                ${hasChanges
                                    ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_rgba(201,162,77,0.3)] hover:shadow-[0_0_20px_rgba(201,162,77,0.4)]'
                                    : 'bg-input text-muted-foreground cursor-not-allowed border border-border shadow-none'}`}
                        >
                            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
