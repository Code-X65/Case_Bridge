import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInternalSession } from '@/hooks/useInternalSession';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Briefcase, Plus, Search, X, UserPlus, FileText, Check, ExternalLink } from 'lucide-react';
import InternalSidebar from '@/components/layout/InternalSidebar';

export default function MatterManagementPage() {
    const { session } = useInternalSession();
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newMatter, setNewMatter] = useState({ title: '', description: '' });

    const [isAssignOpen, setIsAssignOpen] = useState(false);
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [selectedMatter, setSelectedMatter] = useState<string | null>(null);
    const [selectedAssociate, setSelectedAssociate] = useState('');
    const [clientEmail, setClientEmail] = useState('');

    // Fetch Firm Matters
    const { data: matters, isLoading } = useQuery({
        queryKey: ['firm_matters', session?.firm_id],
        enabled: !!session?.firm_id,
        queryFn: async () => {
            const { data } = await supabase
                .from('matters')
                .select(`
                    id, title, description, lifecycle_state, created_at, matter_number,
                    assignee:assigned_associate ( id, full_name, email )
                `)
                .eq('firm_id', session!.firm_id)
                .order('created_at', { ascending: false });
            return data || [];
        }
    });

    // Fetch Associates (for assignment)
    const { data: associates } = useQuery({
        queryKey: ['firm_associates', session?.firm_id],
        enabled: !!session?.firm_id,
        queryFn: async () => {
            // Join user_firm_roles -> profiles
            const { data } = await supabase
                .from('user_firm_roles')
                .select(`
                    user_id,
                    role,
                    profile:profiles ( id, full_name, email )
                `)
                .eq('firm_id', session!.firm_id)
                .in('role', ['associate', 'associate_lawyer'])
                .eq('status', 'active');

            return data?.map(r => r.profile) || []; // Flatten to just profiles
        }
    });

    // Create Matter Mutation
    const createMutation = useMutation({
        mutationFn: async (e: React.FormEvent) => {
            e.preventDefault();
            const { error } = await supabase.from('matters').insert({
                firm_id: session!.firm_id,
                title: newMatter.title,
                description: newMatter.description,
                lifecycle_state: 'submitted',
                created_by: session!.user_id
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['firm_matters'] });
            setIsCreateOpen(false);
            setNewMatter({ title: '', description: '' });
        }
    });

    // Assign Associate Mutation
    const assignMutation = useMutation({
        mutationFn: async () => {
            if (!selectedMatter) return;
            // update matter set assigned_associate = selectedAssociate
            const { error } = await supabase
                .from('matters')
                .update({ assigned_associate: selectedAssociate || null }) // allow unassigning
                .eq('id', selectedMatter);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['firm_matters'] });
            setIsAssignOpen(false);
            setSelectedMatter(null);
            setSelectedAssociate('');
        }
    });

    const openAssignModal = (matterId: string, currentAssigneeId?: string) => {
        setSelectedMatter(matterId);
        setSelectedAssociate(currentAssigneeId || '');
        setIsAssignOpen(true);
    };

    const openInviteModal = (matterId: string) => {
        setSelectedMatter(matterId);
        setClientEmail('');
        setIsInviteOpen(true);
    };

    const inviteMutation = useMutation({
        mutationFn: async () => {
            if (!selectedMatter || !clientEmail) return;

            const { error } = await supabase
                .from('client_invites')
                .insert({
                    client_email: clientEmail,
                    firm_id: session!.firm_id,
                    matter_id: selectedMatter,
                    invited_by: session!.user_id,
                    status: 'pending'
                });

            if (error) throw error;
        },
        onSuccess: () => {
            setIsInviteOpen(false);
            setSelectedMatter(null);
            setClientEmail('');
            alert('Client invite sent successfully (simulated email)');
        }
    });

    return (
        <div className="min-h-screen bg-[#0F172A] text-white">
            <InternalSidebar />

            <main className="ml-64 p-10 min-h-screen relative">
                <header className="flex items-center justify-between mb-10">
                    <div>
                        <h2 className="text-3xl font-black mb-2">Matters</h2>
                        <p className="text-slate-400">Manage all legal matters and active cases.</p>
                    </div>
                    <button
                        onClick={() => setIsCreateOpen(true)}
                        className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                    >
                        <Plus className="w-5 h-5" />
                        New Matter
                    </button>
                </header>

                {/* Filters & Search */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search by matter name or ID..."
                            className="w-full bg-[#1E293B] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500"
                        />
                    </div>
                </div>

                {/* Matters Table */}
                <div className="bg-[#1E293B] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[#0F172A]/50 text-slate-400 font-bold uppercase tracking-wider text-xs border-b border-white/5">
                            <tr>
                                <th className="p-4 pl-6">Matter Name</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Assigned Associate</th>
                                <th className="p-4">Created</th>
                                <th className="p-4 text-right pr-6">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500">Loading matters...</td>
                                </tr>
                            ) : matters?.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                                                <Briefcase className="w-8 h-8 text-slate-600" />
                                            </div>
                                            <p className="font-bold text-slate-400 mb-1">No matters found</p>
                                            <p className="text-slate-500 text-xs">Get started by creating a new matter above.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                matters?.map((matter: any) => (
                                    <tr key={matter.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="p-4 pl-6 font-bold text-white">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                                                    <FileText className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-bold text-sm tracking-tight">{matter.title}</p>
                                                        <span className="text-[10px] font-mono text-indigo-400/70">{matter.matter_number}</span>
                                                    </div>
                                                    <p className="text-[10px] text-slate-500 font-normal truncate max-w-[200px]">{matter.description}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${matter.lifecycle_state === 'in_progress' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                                                matter.lifecycle_state === 'closed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                    'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                                }`}>
                                                {matter.lifecycle_state?.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="p-4 text-slate-300">
                                            {matter.assignee ? (
                                                <div className="flex items-center gap-2 text-xs font-medium text-slate-300 bg-white/5 px-2 py-1 rounded-lg w-fit">
                                                    <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-[8px] font-bold text-white shadow-sm">
                                                        {matter.assignee.full_name?.charAt(0)}
                                                    </div>
                                                    {matter.assignee.full_name}
                                                </div>
                                            ) : (
                                                <span className="text-slate-600 text-xs italic flex items-center gap-1">
                                                    Unassigned
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-slate-500 font-mono text-xs">{new Date(matter.created_at).toLocaleDateString()}</td>
                                        <td className="p-4 text-right pr-6">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => navigate(`/internal/matter/${matter.id}`)}
                                                    className="text-white hover:bg-white/10 font-bold text-xs transition-colors flex items-center gap-1 border border-white/10 px-3 py-1.5 rounded-lg bg-indigo-600 shadow-sm"
                                                >
                                                    <ExternalLink className="w-3 h-3" />
                                                    Workspace
                                                </button>
                                                <button
                                                    onClick={() => openInviteModal(matter.id)}
                                                    className="text-indigo-400 hover:text-white font-bold text-xs transition-colors flex items-center gap-1 border border-indigo-500/20 hover:border-indigo-500 px-3 py-1.5 rounded-lg bg-indigo-500/5 hover:bg-indigo-500/20"
                                                >
                                                    <UserPlus className="w-3 h-3" />
                                                    Invite Guest
                                                </button>
                                                <button
                                                    onClick={() => openAssignModal(matter.id, matter.assignee?.id)}
                                                    className="text-slate-400 hover:text-white font-bold text-xs transition-colors flex items-center gap-1 border border-white/10 hover:border-slate-400 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10"
                                                >
                                                    <UserPlus className="w-3 h-3" />
                                                    {matter.assignee ? 'Reassign' : 'Assign'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Create Modal */}
                {isCreateOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCreateOpen(false)} />
                        <div className="relative bg-[#1E293B] border border-white/10 w-full max-w-lg rounded-2xl p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                            <button
                                onClick={() => setIsCreateOpen(false)}
                                className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="mb-6">
                                <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400 mb-4">
                                    <Plus className="w-6 h-6" />
                                </div>
                                <h3 className="text-2xl font-black text-white tracking-tight">Create New Matter</h3>
                                <p className="text-slate-400 text-sm">Initialize a new legal matter case file.</p>
                            </div>

                            <form onSubmit={createMutation.mutate}>
                                <div className="space-y-5 mb-8">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Matter Title</label>
                                        <input
                                            value={newMatter.title}
                                            onChange={e => setNewMatter(prev => ({ ...prev, title: e.target.value }))}
                                            className="w-full bg-[#0F172A] border border-slate-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
                                            placeholder="e.g. Smith v. Jones - Estate Dispute"
                                            autoFocus
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Description / Notes</label>
                                        <textarea
                                            value={newMatter.description}
                                            onChange={e => setNewMatter(prev => ({ ...prev, description: e.target.value }))}
                                            className="w-full bg-[#0F172A] border border-slate-700 rounded-xl py-3 px-4 text-white h-32 resize-none focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm leading-relaxed"
                                            placeholder="Provide a brief overview of the case details..."
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreateOpen(false)}
                                        className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={createMutation.isPending}
                                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                                    >
                                        {createMutation.isPending ? 'Creating...' : 'Create Matter'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Assign Modal */}
                {isAssignOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsAssignOpen(false)} />
                        <div className="relative bg-[#1E293B] border border-white/10 w-full max-w-md rounded-2xl p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                            <button
                                onClick={() => setIsAssignOpen(false)}
                                className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="mb-6">
                                <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 mb-4">
                                    <UserPlus className="w-6 h-6" />
                                </div>
                                <h3 className="text-2xl font-black text-white tracking-tight">Assign Associate</h3>
                                <p className="text-slate-400 text-sm">Select an associate to lead this matter.</p>
                            </div>

                            <div className="space-y-4 mb-8">
                                <div className="max-h-60 overflow-y-auto custom-scrollbar border border-white/10 rounded-xl bg-[#0F172A] p-1">
                                    {associates?.length === 0 ? (
                                        <p className="text-center text-slate-500 py-4 text-xs">No active associates found in firm.</p>
                                    ) : (
                                        associates?.map((assoc: any) => (
                                            <button
                                                key={assoc.id}
                                                onClick={() => setSelectedAssociate(assoc.id === selectedAssociate ? '' : assoc.id)}
                                                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${selectedAssociate === assoc.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:bg-white/5'
                                                    }`}
                                            >
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${selectedAssociate === assoc.id ? 'bg-white text-indigo-600' : 'bg-slate-700 text-slate-300'
                                                    }`}>
                                                    {assoc.full_name?.charAt(0)}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-bold text-sm">{assoc.full_name}</p>
                                                    <p className={`text-[10px] ${selectedAssociate === assoc.id ? 'text-indigo-200' : 'text-slate-500'}`}>{assoc.email}</p>
                                                </div>
                                                {selectedAssociate === assoc.id && <Check className="w-4 h-4" />}
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                                <button
                                    type="button"
                                    onClick={() => setIsAssignOpen(false)}
                                    className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => assignMutation.mutate()}
                                    disabled={assignMutation.isPending}
                                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                                >
                                    {assignMutation.isPending ? 'Saving...' : 'Confirm Assignment'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Invite Client Modal */}
                {isInviteOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsInviteOpen(false)} />
                        <div className="relative bg-[#1E293B] border border-white/10 w-full max-w-md rounded-[2rem] p-10 shadow-3xl animate-in fade-in zoom-in-95 duration-300">
                            <button
                                onClick={() => setIsInviteOpen(false)}
                                className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>

                            <div className="mb-8">
                                <div className="w-14 h-14 bg-indigo-600/20 rounded-2xl flex items-center justify-center text-indigo-400 mb-6 border border-indigo-600/30">
                                    <UserPlus className="w-8 h-8" />
                                </div>
                                <h3 className="text-3xl font-black text-white tracking-tighter uppercase italic leading-none">Invite Guest</h3>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] mt-3">Canonical Access v1</p>
                            </div>

                            <div className="space-y-6 mb-10">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Client Identity (Email)</label>
                                    <input
                                        type="email"
                                        value={clientEmail}
                                        onChange={e => setClientEmail(e.target.value)}
                                        placeholder="client@example.com"
                                        className="w-full bg-[#0F172A] border border-white/5 rounded-2xl py-4 px-5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-bold placeholder:text-slate-700"
                                        required
                                    />
                                </div>
                                <div className="p-5 bg-indigo-600/5 border border-indigo-600/10 rounded-2xl">
                                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest leading-relaxed">
                                        Identity isolation is enforced. Inviting this client will grant them explicit read-only access to this matter via the Client Portal.
                                    </p>
                                </div>
                            </div>

                            <div className="flex justify-end gap-4 pt-6 border-t border-white/5">
                                <button
                                    type="button"
                                    onClick={() => setIsInviteOpen(false)}
                                    className="px-6 py-3 text-xs font-black text-slate-500 hover:text-white uppercase tracking-widest transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => inviteMutation.mutate()}
                                    disabled={inviteMutation.isPending || !clientEmail}
                                    className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-indigo-600/20 uppercase tracking-widest text-[10px] flex items-center gap-3"
                                >
                                    {inviteMutation.isPending ? 'Processing...' : 'Secure Invite'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}
