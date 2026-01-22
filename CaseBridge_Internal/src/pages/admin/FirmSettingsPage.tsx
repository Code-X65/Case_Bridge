import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Building2, Mail, Phone, MapPin, Loader2, Save } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const firmSchema = z.object({
    name: z.string().min(3, 'Firm name must be at least 3 characters'),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    phone: z.string().optional(),
    address: z.string().optional(),
});

type FirmFormValues = z.infer<typeof firmSchema>;

export default function FirmSettingsPage() {
    const queryClient = useQueryClient();

    const { data: profile } = useQuery({
        queryKey: ['current-user'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            const { data } = await supabase
                .from('profiles')
                .select('firm_id, internal_role')
                .eq('id', user.id)
                .single();

            return data;
        },
    });

    const { data: firm, isLoading } = useQuery({
        queryKey: ['firm', profile?.firm_id],
        queryFn: async () => {
            if (!profile?.firm_id) return null;

            const { data, error } = await supabase
                .from('firms')
                .select('*')
                .eq('id', profile.firm_id)
                .single();

            if (error) throw error;
            return data;
        },
        enabled: !!profile?.firm_id,
    });

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm<FirmFormValues>({
        resolver: zodResolver(firmSchema),
        values: firm ? {
            name: firm.name || '',
            email: firm.email || '',
            phone: firm.phone || '',
            address: firm.address || '',
        } : undefined,
    });

    const updateMutation = useMutation({
        mutationFn: async (values: FirmFormValues) => {
            if (!profile?.firm_id) throw new Error('No firm ID');

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { error } = await supabase
                .from('firms')
                .update({
                    name: values.name,
                    email: values.email || null,
                    phone: values.phone || null,
                    address: values.address || null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', profile.firm_id);

            if (error) throw error;

            // Create audit log
            await supabase.from('audit_logs').insert({
                firm_id: profile.firm_id,
                actor_id: user.id,
                action: 'firm_profile_updated',
                details: { updated_fields: Object.keys(values) },
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['firm'] });
            toast({
                title: 'Firm Profile Updated',
                description: 'Your firm information has been saved successfully.',
            });
        },
        onError: (error: any) => {
            toast({
                title: 'Update Failed',
                description: error.message || 'Failed to update firm profile.',
                variant: 'destructive',
            });
        },
    });

    const onSubmit = (values: FirmFormValues) => {
        updateMutation.mutate(values);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-sm text-slate-600">Loading firm profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-semibold text-slate-900 uppercase tracking-tight">
                    Firm Profile
                </h1>
                <p className="text-sm text-slate-600 font-medium mt-1">
                    Manage your firm's information and contact details
                </p>
            </div>

            {/* Form */}
            <div className="bg-white rounded-md border border-slate-200 shadow-sm p-8">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Firm Name */}
                    <div>
                        <label htmlFor="name" className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                            Firm Name *
                        </label>
                        <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                {...register('name')}
                                type="text"
                                id="name"
                                className="w-full h-11 pl-10 pr-4 bg-slate-50 border border-transparent focus:bg-white focus:border-primary rounded-md text-sm font-medium transition-all outline-none"
                                placeholder="Apex Law Partners"
                                disabled={updateMutation.isPending}
                            />
                        </div>
                        {errors.name && (
                            <p className="mt-1.5 text-xs text-red-600 font-medium">{errors.name.message}</p>
                        )}
                    </div>

                    {/* Email */}
                    <div>
                        <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                            Contact Email
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                {...register('email')}
                                type="email"
                                id="email"
                                className="w-full h-11 pl-10 pr-4 bg-slate-50 border border-transparent focus:bg-white focus:border-primary rounded-md text-sm font-medium transition-all outline-none"
                                placeholder="contact@apexlaw.com"
                                disabled={updateMutation.isPending}
                            />
                        </div>
                        {errors.email && (
                            <p className="mt-1.5 text-xs text-red-600 font-medium">{errors.email.message}</p>
                        )}
                    </div>

                    {/* Phone */}
                    <div>
                        <label htmlFor="phone" className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                            Phone Number
                        </label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                {...register('phone')}
                                type="tel"
                                id="phone"
                                className="w-full h-11 pl-10 pr-4 bg-slate-50 border border-transparent focus:bg-white focus:border-primary rounded-md text-sm font-medium transition-all outline-none"
                                placeholder="+234-800-APEX-LAW"
                                disabled={updateMutation.isPending}
                            />
                        </div>
                    </div>

                    {/* Address */}
                    <div>
                        <label htmlFor="address" className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                            Office Address
                        </label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <textarea
                                {...register('address')}
                                id="address"
                                rows={3}
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-transparent focus:bg-white focus:border-primary rounded-md text-sm font-medium transition-all outline-none resize-none"
                                placeholder="123 Legal Street, Lagos, Nigeria"
                                disabled={updateMutation.isPending}
                            />
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => reset()}
                            className="px-6 h-10 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors"
                            disabled={updateMutation.isPending}
                        >
                            Reset
                        </button>
                        <button
                            type="submit"
                            disabled={updateMutation.isPending}
                            className="px-6 h-10 bg-primary hover:bg-primary/90 text-white font-semibold text-sm uppercase tracking-wide rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {updateMutation.isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
