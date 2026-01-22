import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, ShieldCheck, AlertCircle, CheckCircle2, User, Mail, Lock } from 'lucide-react';

const acceptInviteSchema = z.object({
    firstName: z.string().min(2, 'First name is required'),
    lastName: z.string().min(2, 'Last name is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

type AcceptInviteFormValues = z.infer<typeof acceptInviteSchema>;

interface InvitationData {
    id: string;
    email: string;
    internal_role: string;
    firm_id: string;
    status: string;
    expires_at: string;
}

export default function AcceptInvitePage() {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [invitation, setInvitation] = useState<InvitationData | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<AcceptInviteFormValues>({
        resolver: zodResolver(acceptInviteSchema),
    });

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                // User is already logged in, redirect to dashboard
                navigate('/dashboard', { replace: true });
                return;
            }
            // Not logged in, proceed with verification
            verifyInvitation();
        };

        checkAuth();
    }, [token, navigate]);

    const verifyInvitation = async () => {
        if (!token) {
            setError('Invalid invitation link');
            setVerifying(false);
            return;
        }

        try {
            const { data, error: fetchError } = await supabase
                .from('invitations')
                .select('*')
                .eq('token', token)
                .single();

            if (fetchError) throw new Error('Invitation not found');

            if (data.status !== 'pending') {
                throw new Error('This invitation has already been used');
            }

            const expiresAt = new Date(data.expires_at);
            if (expiresAt < new Date()) {
                throw new Error('This invitation has expired');
            }

            setInvitation(data);
        } catch (err: any) {
            setError(err.message || 'Invalid invitation');
        } finally {
            setVerifying(false);
        }
    };

    const onSubmit = async (values: AcceptInviteFormValues) => {
        if (!invitation) return;

        setLoading(true);
        setError(null);

        try {
            // 1. Create auth user
            const { data: authData, error: signUpError } = await supabase.auth.signUp({
                email: invitation.email,
                password: values.password,
                options: {
                    data: {
                        first_name: values.firstName,
                        last_name: values.lastName,
                    },
                },
            });

            if (signUpError) throw signUpError;
            if (!authData.user) throw new Error('Failed to create account');

            // 2. Sign in immediately to establish session
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: invitation.email,
                password: values.password,
            });

            if (signInError) throw signInError;

            // 3. Wait a moment for the profile trigger to complete
            await new Promise(resolve => setTimeout(resolve, 1500));

            // 4. Update profile with internal role and firm (trigger already created it)
            console.log('📝 Updating profile with:', {
                first_name: values.firstName,
                last_name: values.lastName,
                firm_id: invitation.firm_id,
                internal_role: invitation.internal_role,
                status: 'active',
            });

            const { data: updateData, error: profileError } = await supabase
                .from('profiles')
                .update({
                    first_name: values.firstName,
                    last_name: values.lastName,
                    firm_id: invitation.firm_id,
                    internal_role: invitation.internal_role,
                    status: 'active',
                })
                .eq('id', authData.user.id)
                .select();

            if (profileError) {
                console.error('❌ Profile update error:', profileError);
                throw new Error(`Failed to update profile: ${profileError.message}`);
            }

            console.log('✅ Profile updated successfully:', updateData);

            // Verify the update worked
            const { data: verifyProfile } = await supabase
                .from('profiles')
                .select('internal_role, status, firm_id')
                .eq('id', authData.user.id)
                .single();

            console.log('🔍 Verification - Profile after update:', verifyProfile);

            if (!verifyProfile?.internal_role) {
                console.error('❌ WARNING: internal_role is still NULL after update!');
                throw new Error('Profile update failed - internal_role not set. Please contact administrator.');
            }

            // 5. Mark invitation as accepted
            const { error: inviteError } = await supabase
                .from('invitations')
                .update({ status: 'accepted' })
                .eq('id', invitation.id);

            if (inviteError) throw inviteError;

            // 6. Create audit log (commented out due to RLS issues)
            // TODO: Fix RLS policies for audit_logs or create via backend function
            /*
            await supabase.from('audit_logs').insert({
                firm_id: invitation.firm_id,
                actor_id: authData.user.id,
                target_user_id: authData.user.id,
                action: 'user_accepted_invitation',
                details: {
                    role: invitation.internal_role,
                    email: invitation.email,
                },
            });
            */

            // 7. Sign out and redirect to login
            await supabase.auth.signOut();

            // Success - redirect to login
            navigate('/login', {
                state: { message: 'Account created successfully! Please sign in.' },
            });
        } catch (err: any) {
            console.error('Accept invitation error:', err);
            setError(err.message || 'Failed to create account. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (verifying) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-sm text-slate-600 font-medium">Verifying invitation...</p>
                </div>
            </div>
        );
    }

    if (error && !invitation) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
                <div className="max-w-md w-full p-8 bg-white rounded-md shadow-lg border border-slate-100 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-red-50 rounded-md mb-4">
                        <AlertCircle className="h-8 w-8 text-red-600" />
                    </div>
                    <h2 className="text-xl font-semibold text-slate-900 mb-2">Invalid Invitation</h2>
                    <p className="text-sm text-slate-600">{error}</p>
                    <button
                        onClick={() => navigate('/login')}
                        className="mt-6 px-6 h-10 bg-slate-900 text-white text-xs font-semibold uppercase tracking-wide rounded-md hover:bg-slate-800 transition-colors"
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
            <div className="max-w-md w-full space-y-8">
                {/* Header */}
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-md mb-4">
                        <ShieldCheck className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-semibold text-slate-900 uppercase tracking-tight">
                        Welcome to CaseBridge
                    </h1>
                    <p className="mt-2 text-sm text-slate-600 font-medium">
                        Complete your account setup
                    </p>
                </div>

                {/* Invitation Info */}
                {invitation && (
                    <div className="bg-blue-50 border border-blue-100 rounded-md p-4">
                        <div className="flex items-start gap-3">
                            <Mail className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold uppercase tracking-wide text-blue-900 mb-1">
                                    You've been invited as
                                </p>
                                <p className="text-sm font-bold text-blue-900">{invitation.email}</p>
                                <p className="text-xs text-blue-700 mt-1 capitalize">
                                    Role: {invitation.internal_role.replace('_', ' ')}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Setup Form */}
                <div className="bg-white p-8 rounded-md shadow-lg border border-slate-100">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        {/* Error Alert */}
                        {error && (
                            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-md">
                                <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-bold text-red-900">Setup Failed</p>
                                    <p className="text-xs text-red-700 mt-0.5">{error}</p>
                                </div>
                            </div>
                        )}

                        {/* First Name */}
                        <div>
                            <label htmlFor="firstName" className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                                First Name
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    {...register('firstName')}
                                    type="text"
                                    id="firstName"
                                    className="w-full h-11 pl-10 pr-4 bg-slate-50 border border-transparent focus:bg-white focus:border-primary rounded-md text-sm font-medium transition-all outline-none"
                                    placeholder="John"
                                    disabled={loading}
                                />
                            </div>
                            {errors.firstName && (
                                <p className="mt-1.5 text-xs text-red-600 font-medium">{errors.firstName.message}</p>
                            )}
                        </div>

                        {/* Last Name */}
                        <div>
                            <label htmlFor="lastName" className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                                Last Name
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    {...register('lastName')}
                                    type="text"
                                    id="lastName"
                                    className="w-full h-11 pl-10 pr-4 bg-slate-50 border border-transparent focus:bg-white focus:border-primary rounded-md text-sm font-medium transition-all outline-none"
                                    placeholder="Doe"
                                    disabled={loading}
                                />
                            </div>
                            {errors.lastName && (
                                <p className="mt-1.5 text-xs text-red-600 font-medium">{errors.lastName.message}</p>
                            )}
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                                Create Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    {...register('password')}
                                    type="password"
                                    id="password"
                                    className="w-full h-11 pl-10 pr-4 bg-slate-50 border border-transparent focus:bg-white focus:border-primary rounded-md text-sm font-medium transition-all outline-none"
                                    placeholder="••••••••"
                                    disabled={loading}
                                />
                            </div>
                            {errors.password && (
                                <p className="mt-1.5 text-xs text-red-600 font-medium">{errors.password.message}</p>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label htmlFor="confirmPassword" className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                                Confirm Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    {...register('confirmPassword')}
                                    type="password"
                                    id="confirmPassword"
                                    className="w-full h-11 pl-10 pr-4 bg-slate-50 border border-transparent focus:bg-white focus:border-primary rounded-md text-sm font-medium transition-all outline-none"
                                    placeholder="••••••••"
                                    disabled={loading}
                                />
                            </div>
                            {errors.confirmPassword && (
                                <p className="mt-1.5 text-xs text-red-600 font-medium">{errors.confirmPassword.message}</p>
                            )}
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold text-sm uppercase tracking-wide rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Creating Account...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="h-4 w-4" />
                                    Complete Setup
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Security Notice */}
                <div className="text-center">
                    <p className="text-xs text-slate-400 font-medium">
                        🔒 Your data is encrypted and secure
                    </p>
                </div>
            </div>
        </div>
    );
}
