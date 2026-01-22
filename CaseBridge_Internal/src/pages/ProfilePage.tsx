import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { User, Mail, Shield, Loader2, Save, Lock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const profileSchema = z.object({
    first_name: z.string().min(2, 'First name must be at least 2 characters'),
    last_name: z.string().min(2, 'Last name must be at least 2 characters'),
});

const passwordSchema = z.object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm_password: z.string()
}).refine((data) => data.password === data.confirm_password, {
    message: "Passwords don't match",
    path: ["confirm_password"],
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
    const queryClient = useQueryClient();

    const { data: profile, isLoading } = useQuery({
        queryKey: ['current-user-full'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            return { ...data, email: user.email };
        },
    });

    const {
        register: registerProfile,
        handleSubmit: handleSubmitProfile,
        formState: { errors: profileErrors },
    } = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        values: profile ? {
            first_name: profile.first_name || '',
            last_name: profile.last_name || '',
        } : undefined,
    });

    const {
        register: registerPassword,
        handleSubmit: handleSubmitPassword,
        formState: { errors: passwordErrors },
        reset: resetPassword,
    } = useForm<PasswordFormValues>({
        resolver: zodResolver(passwordSchema),
    });

    const updateProfileMutation = useMutation({
        mutationFn: async (values: ProfileFormValues) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { error } = await supabase
                .from('profiles')
                .update({
                    first_name: values.first_name,
                    last_name: values.last_name,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user.id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['current-user'] });
            queryClient.invalidateQueries({ queryKey: ['current-user-full'] });
            toast({
                title: 'Profile Updated',
                description: 'Your personal details have been saved successfully.',
            });
        },
        onError: (error: any) => {
            toast({
                title: 'Update Failed',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    const updatePasswordMutation = useMutation({
        mutationFn: async (values: PasswordFormValues) => {
            const { error } = await supabase.auth.updateUser({
                password: values.password
            });
            if (error) throw error;
        },
        onSuccess: () => {
            resetPassword();
            toast({
                title: 'Password Updated',
                description: 'Your password has been changed successfully.',
            });
        },
        onError: (error: any) => {
            toast({
                title: 'Update Failed',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-semibold text-slate-900 uppercase tracking-tight">
                    Your Profile
                </h1>
                <p className="text-sm text-slate-600 font-medium mt-1">
                    Manage your personal information and security settings
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left Column: Personal Info */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white rounded-md border border-slate-200 shadow-sm p-8">
                        <h2 className="text-lg font-semibold text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-2">
                            <User className="h-5 w-5 text-primary" />
                            Personal Details
                        </h2>

                        <form onSubmit={handleSubmitProfile((data) => updateProfileMutation.mutate(data))} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                                        First Name
                                    </label>
                                    <input
                                        {...registerProfile('first_name')}
                                        className="w-full h-11 px-4 bg-slate-50 border border-transparent focus:bg-white focus:border-primary rounded-md text-sm font-medium transition-all outline-none"
                                        disabled={updateProfileMutation.isPending}
                                    />
                                    {profileErrors.first_name && (
                                        <p className="mt-1 text-xs text-red-600">{profileErrors.first_name.message}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                                        Last Name
                                    </label>
                                    <input
                                        {...registerProfile('last_name')}
                                        className="w-full h-11 px-4 bg-slate-50 border border-transparent focus:bg-white focus:border-primary rounded-md text-sm font-medium transition-all outline-none"
                                        disabled={updateProfileMutation.isPending}
                                    />
                                    {profileErrors.last_name && (
                                        <p className="mt-1 text-xs text-red-600">{profileErrors.last_name.message}</p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                                    Email Address (Read-only)
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        value={profile?.email || ''}
                                        readOnly
                                        className="w-full h-11 pl-10 pr-4 bg-slate-100 border-transparent rounded-md text-sm font-medium text-slate-500 cursor-not-allowed outline-none"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={updateProfileMutation.isPending}
                                    className="px-6 h-10 bg-primary hover:bg-primary/90 text-white font-semibold text-sm uppercase tracking-wide rounded-md transition-colors flex items-center gap-2"
                                >
                                    {updateProfileMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                    Save Profile
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="bg-white rounded-md border border-slate-200 shadow-sm p-8">
                        <h2 className="text-lg font-semibold text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-2">
                            <Lock className="h-5 w-5 text-primary" />
                            Security
                        </h2>

                        <form onSubmit={handleSubmitPassword((data) => updatePasswordMutation.mutate(data))} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                                    New Password
                                </label>
                                <input
                                    {...registerPassword('password')}
                                    type="password"
                                    className="w-full h-11 px-4 bg-slate-50 border border-transparent focus:bg-white focus:border-primary rounded-md text-sm font-medium transition-all outline-none"
                                    placeholder="••••••••"
                                />
                                {passwordErrors.password && (
                                    <p className="mt-1 text-xs text-red-600">{passwordErrors.password.message}</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                                    Confirm New Password
                                </label>
                                <input
                                    {...registerPassword('confirm_password')}
                                    type="password"
                                    className="w-full h-11 px-4 bg-slate-50 border border-transparent focus:bg-white focus:border-primary rounded-md text-sm font-medium transition-all outline-none"
                                    placeholder="••••••••"
                                />
                                {passwordErrors.confirm_password && (
                                    <p className="mt-1 text-xs text-red-600">{passwordErrors.confirm_password.message}</p>
                                )}
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={updatePasswordMutation.isPending}
                                    className="px-6 h-10 bg-slate-900 hover:bg-black text-white font-semibold text-sm uppercase tracking-wide rounded-md transition-colors"
                                >
                                    {updatePasswordMutation.isPending ? 'Updating...' : 'Update Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Right Column: Role/Status Card */}
                <div className="space-y-6">
                    <div className="bg-slate-900 rounded-md border border-slate-800 p-6 text-white">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                                <span className="text-lg font-semibold">
                                    {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                                </span>
                            </div>
                            <div>
                                <p className="font-semibold uppercase tracking-tight">{profile?.first_name} {profile?.last_name}</p>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">
                                    {profile?.internal_role?.replace('_', ' ')}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between py-2 border-b border-white/10">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Status</span>
                                <span className="text-xs font-semibold uppercase px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
                                    {profile?.status}
                                </span>
                            </div>
                            <div className="flex items-center justify-between py-2">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Member Since</span>
                                <span className="text-xs font-bold">
                                    {profile?.created_at && new Date(profile.created_at).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-md border border-slate-200 p-6">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-4 flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Access Permissions
                        </h3>
                        <ul className="space-y-2">
                            {profile?.internal_role === 'admin_manager' ? (
                                <>
                                    <li className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                                        Firm Management
                                    </li>
                                    <li className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                                        User Administration
                                    </li>
                                    <li className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                                        Audit Log Visibility
                                    </li>
                                    <li className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                                        <span className="text-slate-400 line-through">Case Access Restricted</span>
                                    </li>
                                </>
                            ) : (
                                <li className="text-sm font-bold text-slate-700">Role-based access enabled</li>
                            )}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
