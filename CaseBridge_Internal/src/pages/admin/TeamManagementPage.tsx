import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';
import {
    UserPlus,
    Mail,
    Shield,
    Ban,
    Search,
    CheckCircle2,
    XCircle,
    Clock
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface InviteDialogProps {
    isOpen: boolean;
    onClose: () => void;
    firmId: string;
}

function InviteUserDialog({ isOpen, onClose, firmId }: InviteDialogProps) {
    const queryClient = useQueryClient();
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<'case_manager' | 'associate_lawyer' | 'client'>('associate_lawyer');
    const [loading, setLoading] = useState(false);

    const { data: profile } = useQuery({
        queryKey: ['current-user'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            const { data } = await supabase.from('profiles').select('internal_role').eq('id', user?.id).single();
            return data;
        },
    });

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Generate token
            const token = `inv-${Date.now()}-${Math.random().toString(36).substring(7)}`;
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

            // Create invitation
            const { error: inviteError } = await supabase.from('invitations').insert({
                firm_id: firmId,
                email,
                internal_role: role,
                token,
                expires_at: expiresAt.toISOString(),
                status: 'pending',
                invited_by: user.id,
            });

            if (inviteError) throw inviteError;

            // Create audit log
            await supabase.from('audit_logs').insert({
                firm_id: firmId,
                actor_id: user.id,
                action: 'user_invited',
                details: { email, role, token },
            });

            toast({
                title: 'Invitation Sent',
                description: `Invitation link created for ${email}`,
            });

            queryClient.invalidateQueries({ queryKey: ['invitations'] });
            setEmail('');
            setRole('case_manager');
            onClose();
        } catch (error: any) {
            toast({
                title: 'Invitation Failed',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-md shadow-2xl max-w-md w-full p-6">
                <h2 className="text-xl font-semibold text-slate-900 uppercase tracking-tight mb-4">
                    Invite Team Member
                </h2>

                <form onSubmit={handleInvite} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                            Email Address
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full h-11 px-4 bg-slate-50 border border-transparent focus:bg-white focus:border-primary rounded-md text-sm font-medium transition-all outline-none"
                            placeholder="colleague@firm.com"
                            required
                            disabled={loading}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                            Role
                        </label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value as any)}
                            className="w-full h-11 px-4 bg-slate-50 border border-transparent focus:bg-white focus:border-primary rounded-md text-sm font-medium transition-all outline-none"
                            disabled={loading}
                        >
                            {profile?.internal_role === 'admin_manager' && (
                                <option value="case_manager">Case Manager</option>
                            )}
                            <option value="associate_lawyer">Associate Lawyer</option>
                            <option value="client">Client</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 h-10 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-sm rounded-md transition-colors"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 h-10 bg-primary hover:bg-primary/90 text-white font-semibold text-sm uppercase tracking-wide rounded-md transition-colors disabled:opacity-50"
                            disabled={loading}
                        >
                            {loading ? 'Sending...' : 'Send Invite'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function TeamManagementPage() {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'staff' | 'clients'>('staff');
    const [searchTerm, setSearchTerm] = useState('');
    const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{ userId: string; status: string; name: string } | null>(null);

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

    const { data: teamMembers, isLoading: isLoadingTeam } = useQuery({
        queryKey: ['team-members', profile?.firm_id],
        queryFn: async () => {
            if (!profile?.firm_id) return [];

            const { data, error } = await supabase
                .from('profiles')
                .select('id, first_name, last_name, email, internal_role, status, created_at')
                .eq('firm_id', profile.firm_id)
                .not('internal_role', 'is', null)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        },
        enabled: !!profile?.firm_id,
    });

    const { data: clients, isLoading: isLoadingClients } = useQuery({
        queryKey: ['clients', profile?.firm_id],
        queryFn: async () => {
            if (!profile?.firm_id) return [];

            // Fetch clients who have matters in this firm or unassigned matters
            const { data: matters, error: mError } = await supabase
                .from('matters')
                .select('client_id')
                .or(`firm_id.eq.${profile.firm_id},firm_id.is.null`);

            if (mError) throw mError;
            if (!matters?.length) return [];

            const clientIds = [...new Set(matters.map(m => m.client_id))];

            const { data, error } = await supabase
                .from('profiles')
                .select('id, first_name, last_name, email, role, status, created_at')
                .in('id', clientIds)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        },
        enabled: !!profile?.firm_id,
    });

    const { data: invitations } = useQuery({
        queryKey: ['invitations', profile?.firm_id],
        queryFn: async () => {
            if (!profile?.firm_id) return [];

            const { data, error } = await supabase
                .from('invitations')
                .select('*')
                .eq('firm_id', profile.firm_id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        },
        enabled: !!profile?.firm_id,
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { error } = await supabase
                .from('profiles')
                .update({ status })
                .eq('id', userId);

            if (error) throw error;

            // Create audit log
            await supabase.from('audit_logs').insert({
                firm_id: profile?.firm_id,
                actor_id: user.id,
                target_user_id: userId,
                action: `user_${status}`,
                details: { status },
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['team-members'] });
            toast({
                title: 'Status Updated',
                description: 'User status has been changed successfully.',
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

    const filteredStaff = teamMembers?.filter(member =>
        member.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredClients = clients?.filter(client =>
        client.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'admin_manager': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'case_manager': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'associate_lawyer': return 'bg-green-100 text-green-700 border-green-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-[10px] font-semibold uppercase rounded-md"><CheckCircle2 className="h-3 w-3" />Active</span>;
            case 'suspended':
                return <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-semibold uppercase rounded-md"><Ban className="h-3 w-3" />Suspended</span>;
            case 'deactivated':
                return <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-[10px] font-semibold uppercase rounded-md"><XCircle className="h-3 w-3" />Deactivated</span>;
            default:
                return <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 text-[10px] font-semibold uppercase rounded-md"><Clock className="h-3 w-3" />{status}</span>;
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-semibold text-slate-900 uppercase tracking-tight">
                        Team Management
                    </h1>
                    <p className="text-sm text-slate-600 font-medium mt-1">
                        Manage your firm's internal users and invitations
                    </p>
                </div>
                <button
                    onClick={() => setInviteDialogOpen(true)}
                    className="inline-flex items-center gap-2 px-6 h-11 bg-primary hover:bg-primary/90 text-white font-semibold text-sm uppercase tracking-wide rounded-md transition-colors"
                >
                    <UserPlus className="h-4 w-4" />
                    Invite User
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('staff')}
                    className={`px-6 py-3 text-sm font-semibold uppercase tracking-wide transition-all border-b-2 ${activeTab === 'staff' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'
                        }`}
                >
                    Internal Team
                </button>
                <button
                    onClick={() => setActiveTab('clients')}
                    className={`px-6 py-3 text-sm font-semibold uppercase tracking-wide transition-all border-b-2 ${activeTab === 'clients' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'
                        }`}
                >
                    Clients
                </button>
            </div>

            {/* Search Bar */}
            <div className="flex items-center gap-3 bg-white p-2 rounded-md border border-slate-100 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                    <input
                        type="text"
                        placeholder={`Search ${activeTab}...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-10 pl-11 pr-4 bg-slate-50 border-transparent focus:bg-white focus:ring-primary rounded-md text-sm font-semibold transition-all outline-none"
                    />
                </div>
            </div>

            {/* Team Members Table */}
            <div className="bg-white rounded-md border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400">User</th>
                                <th className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400">Role</th>
                                <th className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400">Status</th>
                                <th className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400">Joined</th>
                                <th className="px-6 py-4 text-right text-[10px] font-semibold uppercase tracking-wide text-slate-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeTab === 'staff' ? (
                                (isLoadingTeam ? (
                                    <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500">Loading team...</td></tr>
                                ) : filteredStaff?.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500">No team members found</td></tr>
                                ) : (
                                    filteredStaff?.map((member) => (
                                        <tr key={member.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900">{member.first_name} {member.last_name}</p>
                                                    <p className="text-xs text-slate-500 font-medium">{member.email}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-block px-3 py-1 text-[10px] font-semibold uppercase rounded-md border ${getRoleBadgeColor(member.internal_role || '')}`}>
                                                    {member.internal_role?.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">{getStatusBadge(member.status || 'active')}</td>
                                            <td className="px-6 py-4"><span className="text-xs text-slate-600 font-medium">{new Date(member.created_at).toLocaleDateString()}</span></td>
                                            <td className="px-6 py-4 text-right">
                                                {/* Actions same as before */}
                                                <div className="flex items-center justify-end gap-2">
                                                    {member.status === 'active' && (
                                                        <button onClick={() => setConfirmAction({ userId: member.id, status: 'suspended', name: `${member.first_name} ${member.last_name}` })} className="px-3 py-1.5 text-xs font-bold text-amber-600 hover:bg-amber-50 rounded-md">Suspend</button>
                                                    )}
                                                    {member.status === 'suspended' && (
                                                        <button onClick={() => setConfirmAction({ userId: member.id, status: 'active', name: `${member.first_name} ${member.last_name}` })} className="px-3 py-1.5 text-xs font-bold text-green-600 hover:bg-green-50 rounded-md">Activate</button>
                                                    )}
                                                    {member.status !== 'deactivated' && (
                                                        <button onClick={() => setConfirmAction({ userId: member.id, status: 'deactivated', name: `${member.first_name} ${member.last_name}` })} className="px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-md">Deactivate</button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ))
                            ) : (
                                (isLoadingClients ? (
                                    <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500">Loading clients...</td></tr>
                                ) : filteredClients?.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500">No clients found</td></tr>
                                ) : (
                                    filteredClients?.map((client) => (
                                        <tr key={client.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900">{client.first_name} {client.last_name}</p>
                                                    <p className="text-xs text-slate-500 font-medium">{client.email}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-block px-3 py-1 text-[10px] font-semibold uppercase rounded-md border bg-slate-100 text-slate-700">Client</span>
                                            </td>
                                            <td className="px-6 py-4">{getStatusBadge(client.status || 'active')}</td>
                                            <td className="px-6 py-4"><span className="text-xs text-slate-600 font-medium">{new Date(client.created_at).toLocaleDateString()}</span></td>
                                            <td className="px-6 py-4 text-right italic text-slate-400 text-[10px] font-semibold uppercase">Readonly</td>
                                        </tr>
                                    ))
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pending Invitations */}
            {invitations && invitations.filter(inv => inv.status === 'pending').length > 0 && (
                <div className="bg-white rounded-md border border-slate-200 shadow-sm p-6">
                    <h2 className="text-lg font-semibold text-slate-900 uppercase tracking-tight mb-4">
                        Pending Invitations
                    </h2>
                    <div className="space-y-3">
                        {invitations.filter(inv => inv.status === 'pending').map((invitation) => (
                            <div key={invitation.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-md">
                                <div className="flex items-center gap-3">
                                    <Mail className="h-5 w-5 text-slate-400" />
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">{invitation.email}</p>
                                        <p className="text-xs text-slate-500 capitalize">{invitation.internal_role.replace('_', ' ')}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-slate-500">
                                        Expires {new Date(invitation.expires_at).toLocaleDateString()}
                                    </span>
                                    <button
                                        onClick={() => {
                                            const inviteUrl = `${window.location.origin}/accept-invite/${invitation.token}`;
                                            navigator.clipboard.writeText(inviteUrl).then(() => {
                                                toast({
                                                    title: 'Link Copied!',
                                                    description: 'Invitation link copied to clipboard',
                                                });
                                            }).catch(() => {
                                                toast({
                                                    title: 'Copy Failed',
                                                    description: 'Please copy manually: ' + inviteUrl,
                                                    variant: 'destructive',
                                                });
                                            });
                                        }}
                                        className="px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/10 rounded-md transition-colors"
                                    >
                                        Copy Link
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <InviteUserDialog
                isOpen={inviteDialogOpen}
                onClose={() => setInviteDialogOpen(false)}
                firmId={profile?.firm_id || ''}
            />

            {/* Confirmation Modal */}
            {confirmAction && (
                <div className="fixed inset-0 bg-slate-900/50 z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-md shadow-2xl max-w-sm w-full p-6 text-center">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${confirmAction.status === 'active' ? 'bg-green-100 text-green-600' :
                            confirmAction.status === 'suspended' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'
                            }`}>
                            <Shield className="h-8 w-8" />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-900 uppercase tracking-tight mb-2">
                            Confirm Action
                        </h3>
                        <p className="text-sm text-slate-600 mb-6">
                            Are you sure you want to set <strong>{confirmAction.name}</strong> as <strong>{confirmAction.status}</strong>?
                            {confirmAction.status === 'deactivated' && ' This action is permanent.'}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmAction(null)}
                                className="flex-1 h-10 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-sm rounded-md transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    updateStatusMutation.mutate({ userId: confirmAction.userId, status: confirmAction.status });
                                    setConfirmAction(null);
                                }}
                                className={`flex-1 h-10 text-white font-semibold text-sm uppercase tracking-wide rounded-md transition-colors ${confirmAction.status === 'active' ? 'bg-green-600 hover:bg-green-700' :
                                    confirmAction.status === 'suspended' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-red-600 hover:bg-red-700'
                                    }`}
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
