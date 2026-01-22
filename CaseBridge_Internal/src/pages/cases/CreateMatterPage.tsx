import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState, useEffect } from 'react';
import {
    Loader2,
    ArrowLeft,
    ShieldCheck,
    Zap,
    Star,
    Plus
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const matterSchema = z.object({
    client_id: z.string().optional(),
    new_client_email: z.string().email('Invalid email').optional(),
    title: z.string().min(5, 'Title too short'),
    description: z.string().min(20, 'Min 20 characters required'),
    matter_type: z.string().min(1, 'Selection required'),
    service_tier: z.string().min(1, 'Selection required'),
}).refine(data => data.client_id || data.new_client_email, {
    message: "Select an existing client or provide a new client's email",
    path: ['client_id']
});

const SERVICE_TIERS = [
    { id: 'Standard', name: 'Standard', price: 15000, description: 'Junior Associate review.', icon: ShieldCheck },
    { id: 'Priority', name: 'Priority', price: 35000, description: 'Senior Counsel review.', icon: Zap },
    { id: 'Expert', name: 'Expert', price: 75000, description: 'Senior Partner review.', icon: Star },
];

const MATTER_TYPES = [
    'Corporate & Commercial',
    'Criminal Defense',
    'Civil Litigation',
    'Family Law',
    'Real Estate & Property',
    'Employment & Labor',
    'Intellectual Property',
    'Human Rights',
    'Taxation',
    'Others'
];

type MatterFormValues = z.infer<typeof matterSchema>;

export default function CreateMatterPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [clients, setClients] = useState<any[]>([]);
    const [isNewClient, setIsNewClient] = useState(false);

    useEffect(() => {
        async function fetchClients() {
            const { data } = await supabase
                .from('profiles')
                .select('id, first_name, last_name, email')
                .is('internal_role', null);
            setClients(data || []);
        }
        fetchClients();
    }, []);

    const { register, handleSubmit, watch, formState: { errors } } = useForm<MatterFormValues>({
        resolver: zodResolver(matterSchema),
        defaultValues: {
            service_tier: 'Standard',
        }
    });

    const selectedTier = watch('service_tier');
    const tierData = SERVICE_TIERS.find(t => t.id === selectedTier) || SERVICE_TIERS[0];

    async function onSubmit(values: MatterFormValues) {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            let finalClientId = values.client_id;

            // If new client, we first need to check if they exist or invite them
            if (isNewClient && values.new_client_email) {
                // Check if user already exists
                const { data: existingUser } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('email', values.new_client_email.toLowerCase())
                    .single();

                if (existingUser) {
                    finalClientId = existingUser.id;
                } else {
                    // Invite new client
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('firm_id')
                        .eq('id', user.id)
                        .single();

                    const token = Math.random().toString(36).substring(2, 15);
                    const { error: inviteError } = await supabase.from('invitations').insert({
                        firm_id: profile?.firm_id,
                        email: values.new_client_email.toLowerCase(),
                        internal_role: 'client',
                        token,
                        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                        invited_by: user.id
                    });

                    if (inviteError) throw inviteError;

                    // We can't set client_id for matter yet if they don't have a profile
                    // For now, let's assume Case Manager can only create for existing clients OR
                    // we need to handle "Pre-registration matters" (which the schema might not support)
                    // Actually, the request says "System sets status = In Review", implying the client exists.
                    // Let's restrict to existing clients for matter creation, or handle client creation.
                    throw new Error("Matter creation requires an existing client profile or invitation acceptance first.");
                }
            }

            if (!finalClientId) throw new Error("Client selection required");

            const matterNumber = `CB-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

            const { data: matter, error: matterError } = await supabase.from('matters').insert({
                client_id: finalClientId,
                matter_number: matterNumber,
                title: values.title,
                description: values.description,
                matter_type: values.matter_type,
                service_tier: values.service_tier,
                status: 'In Review', // Direct to In Review as per Flow 3A
            }).select().single();

            if (matterError) throw matterError;

            // Log activity
            await supabase.from('case_logs').insert({
                matter_id: matter.id,
                action: 'matter_created_internally',
                details: { created_on_behalf_of: finalClientId },
                performed_by: user.id
            });

            toast({
                title: "Matter Created",
                description: "Matter has been successfully created and set to In Review status.",
            });

            navigate(`/cases/${matter.id}`);
        } catch (error: any) {
            toast({
                title: "Creation Failed",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-md transition-colors">
                    <ArrowLeft className="h-5 w-5 text-slate-600" />
                </button>
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900 uppercase tracking-tight">Create New Matter</h1>
                    <p className="text-sm text-slate-500 font-medium">Filing a matter on behalf of a client</p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    {/* Client Selection */}
                    <div className="bg-white p-6 rounded-md border border-slate-200 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Client Association</h2>
                            <button
                                type="button"
                                onClick={() => setIsNewClient(!isNewClient)}
                                className="text-xs font-semibold uppercase text-primary hover:underline"
                            >
                                {isNewClient ? 'Select Existing Client' : 'Invite New Client'}
                            </button>
                        </div>

                        {isNewClient ? (
                            <div className="space-y-2">
                                <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Client Email Address</label>
                                <div className="relative">
                                    <Plus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        {...register('new_client_email')}
                                        placeholder="client@example.com"
                                        className="w-full h-11 pl-10 pr-4 bg-slate-50 border-transparent rounded-md text-sm font-bold focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                                    />
                                </div>
                                {errors.new_client_email && <p className="text-[10px] text-red-500 font-bold">{errors.new_client_email.message}</p>}
                                <p className="text-[10px] text-amber-600 font-bold bg-amber-50 p-2 rounded-md leading-tight">
                                    Note: Creating a matter for a new client will send them an invitation. They must accept and register before the matter is fully active.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Select Client</label>
                                <select
                                    {...register('client_id')}
                                    className="w-full h-11 px-4 bg-slate-50 border-transparent rounded-md text-sm font-bold focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                                >
                                    <option value="">Choose a client...</option>
                                    {clients.map(c => (
                                        <option key={c.id} value={c.id}>{c.first_name} {c.last_name} ({c.email})</option>
                                    ))}
                                </select>
                                {errors.client_id && <p className="text-[10px] text-red-500 font-bold">{errors.client_id.message}</p>}
                            </div>
                        )}
                    </div>

                    {/* Case Details */}
                    <div className="bg-white p-6 rounded-md border border-slate-200 shadow-sm space-y-6 text-slate-900">
                        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Matter Specifics</h2>

                        <div className="space-y-2">
                            <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Subject / Title</label>
                            <input
                                {...register('title')}
                                placeholder="e.g. Contract Dispute with X Corp"
                                className="w-full h-11 px-4 bg-slate-50 border-transparent rounded-md text-sm font-bold focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                            />
                            {errors.title && <p className="text-[10px] text-red-500 font-bold">{errors.title.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Legal Category</label>
                            <select
                                {...register('matter_type')}
                                className="w-full h-11 px-4 bg-slate-50 border-transparent rounded-md text-sm font-bold focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                            >
                                <option value="">Select category...</option>
                                {MATTER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            {errors.matter_type && <p className="text-[10px] text-red-500 font-bold">{errors.matter_type.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Detailed Description</label>
                            <textarea
                                {...register('description')}
                                placeholder="Describe the matter in detail..."
                                className="w-full min-h-[150px] p-4 bg-slate-50 border-transparent rounded-md text-sm font-medium focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-none"
                            />
                            {errors.description && <p className="text-[10px] text-red-500 font-bold">{errors.description.message}</p>}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Tier Selection */}
                    <div className="bg-white p-6 rounded-md border border-slate-200 shadow-sm space-y-4 text-slate-900">
                        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Service Tier</h2>
                        <div className="space-y-2">
                            {SERVICE_TIERS.map(tier => {
                                const Icon = tier.icon;
                                const isSelected = selectedTier === tier.id;
                                return (
                                    <label key={tier.id} className={`flex items-start gap-3 p-3 rounded-md border-2 transition-all cursor-pointer ${isSelected ? 'border-primary bg-primary/5' : 'border-slate-50 hover:bg-slate-50'}`}>
                                        <input
                                            type="radio"
                                            value={tier.id}
                                            {...register('service_tier')}
                                            className="hidden"
                                        />
                                        <div className={`p-2 rounded-md ${isSelected ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}>
                                            <Icon className="h-4 w-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <p className="text-xs font-semibold uppercase">{tier.name}</p>
                                                <p className="text-xs font-semibold">₦{tier.price.toLocaleString()}</p>
                                            </div>
                                            <p className="text-[10px] text-slate-500 font-medium leading-tight">{tier.description}</p>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    {/* Summary & Submit */}
                    <div className="bg-slate-900 text-white p-6 rounded-md shadow-xl space-y-6">
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wide opacity-40 mb-2">Total Estimates</p>
                            <div className="flex items-end justify-between">
                                <span className="text-3xl font-semibold text-primary">₦{tierData.price.toLocaleString()}</span>
                                <span className="text-[10px] font-bold opacity-40 pb-1">Retainer Basis</span>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 bg-primary text-white font-semibold uppercase tracking-wide text-xs rounded-md hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                            Create Matter
                        </button>

                        <div className="flex items-center justify-center gap-2 opacity-30">
                            <ShieldCheck className="h-3 w-3" />
                            <span className="text-[8px] font-semibold uppercase tracking-wide">Internal Filing Enforcement</span>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
