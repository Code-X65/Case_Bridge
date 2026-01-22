import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
    ArrowLeft,
    User,
    Mail,
    Phone,
    Calendar,
    UserPlus,
    CheckCircle2,
    AlertCircle,
    Edit3,
    History,
    Save,
    Loader2,
    XCircle
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import CourtReportSubmission from '@/components/cases/CourtReportSubmission';
import CourtReportsList from '@/components/cases/CourtReportsList';
import ActivityTimeline from '@/components/cases/ActivityTimeline';

interface AssignDialogProps {
    isOpen: boolean;
    onClose: () => void;
    matterId: string;
    firmId: string;
}

function AssignDialog({ isOpen, onClose, matterId, firmId }: AssignDialogProps) {
    const queryClient = useQueryClient();
    const [selectedAssociate, setSelectedAssociate] = useState('');
    const [loading, setLoading] = useState(false);

    const { data: associates } = useQuery({
        queryKey: ['associates', firmId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, first_name, last_name, email')
                .eq('firm_id', firmId)
                .eq('internal_role', 'associate_lawyer')
                .eq('status', 'active');

            if (error) throw error;
            return data;
        },
        enabled: isOpen && !!firmId,
    });

    const handleAssign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAssociate) return;

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Create assignment
            const { error: assignError } = await supabase.from('case_assignments').insert({
                matter_id: matterId,
                associate_id: selectedAssociate,
                assigned_by: user.id,
                assigned_at: new Date().toISOString(),
            });

            if (assignError) throw assignError;

            // Transition case status to "Assigned"
            const { error: statusError } = await supabase.rpc('transition_case_status', {
                p_matter_id: matterId,
                p_new_status: 'Assigned',
                p_note: 'Associate Lawyer assigned to case'
            });

            if (statusError) {
                console.error('Status transition error:', statusError);
                // Don't throw - assignment succeeded, status transition is secondary
            }

            // Create case log
            await supabase.from('case_logs').insert({
                matter_id: matterId,
                action: 'case_assigned',
                details: { associate_id: selectedAssociate },
                performed_by: user.id,
            });

            // Create audit log
            await supabase.from('audit_logs').insert({
                firm_id: firmId,
                actor_id: user.id,
                action: 'case_assigned',
                details: { matter_id: matterId, associate_id: selectedAssociate },
            });

            toast({
                title: 'Case Assigned',
                description: 'The case has been assigned successfully and status updated to Assigned.',
            });

            queryClient.invalidateQueries({ queryKey: ['matter'] });
            queryClient.invalidateQueries({ queryKey: ['case-logs'] });
            onClose();
        } catch (error: any) {
            toast({
                title: 'Assignment Failed',
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
                    Assign Case
                </h2>

                <form onSubmit={handleAssign} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                            Select Associate Lawyer
                        </label>
                        <select
                            value={selectedAssociate}
                            onChange={(e) => setSelectedAssociate(e.target.value)}
                            className="w-full h-11 px-4 bg-slate-50 border border-transparent focus:bg-white focus:border-primary rounded-md text-sm font-medium transition-all outline-none"
                            required
                            disabled={loading}
                        >
                            <option value="">Choose an associate...</option>
                            {associates?.map((associate) => (
                                <option key={associate.id} value={associate.id}>
                                    {associate.first_name} {associate.last_name} ({associate.email})
                                </option>
                            ))}
                        </select>
                    </div>

                    {associates?.length === 0 && (
                        <div className="p-4 bg-amber-50 border border-amber-100 rounded-md">
                            <p className="text-sm text-amber-700">
                                No active associate lawyers available. Please invite associates from the Team page.
                            </p>
                        </div>
                    )}

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
                            disabled={loading || associates?.length === 0}
                        >
                            {loading ? 'Assigning...' : 'Assign Case'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function CaseStatementSection({ statement, onUpdate, isPending, canEdit }: {
    statement: any,
    onUpdate: (content: string) => void,
    isPending: boolean,
    canEdit: boolean
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [draft, setDraft] = useState('');

    useEffect(() => {
        if (statement?.content) setDraft(statement.content);
    }, [statement]);

    const handleSave = () => {
        onUpdate(draft);
        setIsEditing(false);
    };

    return (
        <div className="bg-white rounded-md border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-50 rounded-md flex items-center justify-center text-indigo-600">
                        <Edit3 className="h-4 w-4" />
                    </div>
                    <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                        Case Statement
                    </h2>
                </div>
                <div className="flex items-center gap-2">
                    {statement?.version && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold uppercase text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">
                            <History className="h-3 w-3" />
                            v{statement.version}
                        </span>
                    )}
                    {canEdit && (
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className="text-[10px] font-semibold uppercase text-primary hover:underline"
                        >
                            {isEditing ? 'Cancel' : 'Update Statement'}
                        </button>
                    )}
                </div>
            </div>

            <div className="p-6">
                {isEditing ? (
                    <div className="space-y-4">
                        <textarea
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            placeholder="Drafting the latest case narrative..."
                            className="w-full min-h-[200px] p-4 bg-slate-50 border-transparent rounded-md text-sm font-medium focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-none text-slate-900"
                        />
                        <div className="flex justify-end">
                            <button
                                onClick={handleSave}
                                disabled={isPending || !draft.trim()}
                                className="h-10 px-6 bg-primary text-white font-semibold text-xs uppercase tracking-wide rounded-md hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                Save Version
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="prose prose-slate max-w-none">
                        {statement?.content ? (
                            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                                {statement.content}
                            </p>
                        ) : (
                            <div className="text-center py-8 bg-slate-50/50 rounded-md border border-dashed border-slate-200 text-slate-900">
                                <p className="text-sm text-slate-500 font-medium">No case statement drafted yet.</p>
                                {canEdit && (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="mt-2 text-xs font-semibold uppercase text-primary hover:underline"
                                    >
                                        Draft First Version
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function MatterDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [assignDialogOpen, setAssignDialogOpen] = useState(false);

    const { data: profile } = useQuery({
        queryKey: ['current-user'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            const { data } = await supabase
                .from('profiles')
                .select('id, firm_id, internal_role')
                .eq('id', user.id)
                .single();

            return data;
        },
    });

    const { data: matter, isLoading } = useQuery({
        queryKey: ['matter', id],
        queryFn: async () => {
            if (!id) return null;

            const { data, error } = await supabase
                .from('matters')
                .select(`
          *,
          client:profiles!matters_client_id_fkey(first_name, last_name, email, phone),
          assignments:case_assignments(
            id,
            associate_id,
            assigned_at,
            associate:profiles!case_assignments_associate_id_fkey(first_name, last_name, email)
          ),
          documents(*),
          invoices(*),
          payments(*)
        `)
                .eq('id', id)
                .maybeSingle();

            if (error) throw error;
            return data;
        },
        enabled: !!id,
    });

    const { data: caseStatement } = useQuery({
        queryKey: ['case-statement', id],
        queryFn: async () => {
            if (!id) return null;
            const { data } = await supabase
                .from('case_statements')
                .select('*')
                .eq('matter_id', id)
                .order('version', { ascending: false })
                .limit(1)
                .maybeSingle();
            return data;
        },
        enabled: !!id,
    });

    const { data: caseLogs } = useQuery({
        queryKey: ['case-logs', id],
        queryFn: async () => {
            if (!id) return [];

            const { data, error } = await supabase
                .from('case_logs')
                .select(`
          *,
          performer:profiles!case_logs_performed_by_fkey(first_name, last_name)
        `)
                .eq('matter_id', id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        },
        enabled: !!id,
    });

    const updateStatusMutation = useMutation({
        mutationFn: async (newStatus: string) => {
            if (!id) throw new Error('No matter ID');

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { error } = await supabase.rpc('handle_matter_status_change', {
                p_matter_id: id,
                p_new_status: newStatus,
                p_note: null
            });

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['matter'] });
            queryClient.invalidateQueries({ queryKey: ['case-logs'] });
            toast({
                title: 'Status Updated',
                description: 'Case status has been changed successfully.',
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

    const updateStatementMutation = useMutation({
        mutationFn: async (content: string) => {
            if (!id) throw new Error('No matter ID');
            const { data: { user } } = await supabase.auth.getUser();

            const nextVersion = (caseStatement?.version || 0) + 1;

            const { error } = await supabase
                .from('case_statements')
                .insert({
                    matter_id: id,
                    content,
                    version: nextVersion,
                    created_by: user?.id
                });

            if (error) throw error;

            await supabase.from('case_logs').insert({
                matter_id: id,
                action: 'case_statement_updated',
                details: { version: nextVersion },
                performed_by: user?.id
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['case-statement'] });
            queryClient.invalidateQueries({ queryKey: ['case-logs'] });
            toast({
                title: 'Statement Updated',
                description: 'Case statement has been versioned and saved.',
            });
        },
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-sm text-slate-600 font-medium">Loading case details...</p>
                </div>
            </div>
        );
    }

    if (!matter || !id) {
        return (
            <div className="text-center py-24 bg-white rounded-md border border-slate-100 shadow-sm">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertCircle className="h-10 w-10 text-red-500" />
                </div>
                <h2 className="text-2xl font-semibold text-slate-900 uppercase tracking-tight mb-2">Case Not Found</h2>
                <p className="text-sm text-slate-500 max-w-xs mx-auto mb-8 font-medium">
                    The requested case could not be located. It may have been deleted or you may not have permission to view it.
                </p>
                <Link
                    to="/cases"
                    className="inline-flex items-center gap-2 px-8 h-12 bg-primary text-white font-semibold text-xs uppercase tracking-wide rounded-md hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Matters
                </Link>
            </div>
        );
    }

    // ROLE-BASED ACCESS CONTROL: Associate Lawyers can ONLY view assigned cases
    if (profile?.internal_role === 'associate_lawyer') {
        const isAssignedToLawyer = matter.assignments?.some((assignment: any) => {
            const assignedId = assignment.associate_id || assignment.associate?.id;
            return assignedId === profile.id;
        });

        if (!isAssignedToLawyer) {
            return (
                <div className="text-center py-24 bg-white rounded-md border border-slate-100 shadow-sm">
                    <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle className="h-10 w-10 text-amber-500" />
                    </div>
                    <h2 className="text-2xl font-semibold text-slate-900 uppercase tracking-tight mb-2">Access Denied</h2>
                    <p className="text-sm text-slate-500 max-w-xs mx-auto mb-8 font-medium">
                        You do not have permission to view this case. Only assigned cases are visible to Associate Lawyers.
                    </p>
                    <Link
                        to="/cases"
                        className="inline-flex items-center gap-2 px-8 h-12 bg-primary text-white font-semibold text-xs uppercase tracking-wide rounded-md hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to My Cases
                    </Link>
                </div>
            );
        }
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/cases')}
                        className="p-2 hover:bg-slate-100 rounded-md transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5 text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-semibold text-slate-900 uppercase tracking-tight">
                            {matter.title}
                        </h1>
                        <p className="text-sm text-slate-600 font-medium mt-1">
                            {matter.matter_number}
                        </p>
                    </div>
                    {/* CLOSED Badge */}
                    {['Closed', 'Completed'].includes(matter.status) && (
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-md border-2 border-slate-700 shadow-lg">
                            <XCircle className="h-5 w-5" />
                            <span className="text-sm font-semibold uppercase tracking-wide">
                                Case Closed
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    {/* Only Case Managers can assign cases */}
                    {profile?.internal_role === 'case_manager' && (!matter.assignments || matter.assignments.length === 0) && (
                        <button
                            onClick={() => setAssignDialogOpen(true)}
                            className="inline-flex items-center gap-2 px-6 h-10 bg-primary hover:bg-primary/90 text-white font-semibold text-sm uppercase tracking-wide rounded-md transition-colors"
                        >
                            <UserPlus className="h-4 w-4" />
                            Assign Case
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Case Information */}
                    <div className="bg-white rounded-md border border-slate-200 shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-slate-900 uppercase tracking-tight mb-4">
                            Case Information
                        </h2>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">
                                    Matter Type
                                </p>
                                <p className="text-sm font-bold text-slate-900">{matter.matter_type}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">
                                    Service Tier
                                </p>
                                <p className="text-sm font-bold text-slate-900">{matter.service_tier}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">
                                    Status
                                </p>
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold uppercase rounded-md border ${{
                                    'Draft': 'bg-slate-100 text-slate-500 border-slate-200',
                                    'Pending Review': 'bg-amber-100 text-amber-700 border-amber-200',
                                    'In Review': 'bg-blue-100 text-blue-700 border-blue-200',
                                    'Awaiting Documents': 'bg-orange-100 text-orange-700 border-orange-200',
                                    'Assigned': 'bg-purple-100 text-purple-700 border-purple-200',
                                    'In Progress': 'bg-green-100 text-green-700 border-green-200',
                                    'On Hold': 'bg-yellow-100 text-yellow-700 border-yellow-200',
                                    'Completed': 'bg-emerald-100 text-emerald-700 border-emerald-200',
                                    'Closed': 'bg-slate-100 text-slate-700 border-slate-200',
                                    'Rejected': 'bg-red-100 text-red-700 border-red-200',
                                }[matter.status as string] || 'bg-slate-100 text-slate-700 border-slate-200'
                                    }`}>
                                    {matter.status}
                                </span>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">
                                    Submitted
                                </p>
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <Calendar className="h-4 w-4 text-slate-400" />
                                    {format(new Date(matter.created_at), 'MMM dd, yyyy')}
                                </div>
                            </div>
                        </div>

                        {matter.description && (
                            <div className="mt-4 pt-4 border-t border-slate-100">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                                    Description
                                </p>
                                <p className="text-sm text-slate-700 leading-relaxed">{matter.description}</p>
                            </div>
                        )}
                    </div>

                    {/* Status Update - ONLY FOR CASE MANAGERS */}
                    {profile?.internal_role === 'case_manager' && (
                        <div className="bg-white rounded-md border border-slate-200 shadow-sm p-6">
                            <h2 className="text-lg font-semibold text-slate-900 uppercase tracking-tight mb-4">
                                Update Status
                            </h2>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                    {/* STATE MACHINE TRANSITIONS (STRICT) */}
                                    {matter.status === 'Pending Review' && (
                                        <>
                                            <button onClick={() => updateStatusMutation.mutate('In Review')} disabled={updateStatusMutation.isPending} className="h-10 px-4 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold rounded-md transition-colors text-sm">Accept for Review</button>
                                            <button onClick={() => updateStatusMutation.mutate('Rejected')} disabled={updateStatusMutation.isPending} className="h-10 px-4 bg-red-50 text-red-700 hover:bg-red-100 font-bold rounded-md transition-colors text-sm">Reject Case</button>
                                        </>
                                    )}

                                    {matter.status === 'In Review' && (
                                        <>
                                            <button onClick={() => updateStatusMutation.mutate('Awaiting Documents')} disabled={updateStatusMutation.isPending} className="h-10 px-4 bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold rounded-md transition-colors text-sm">Request Documents</button>
                                            <button onClick={() => updateStatusMutation.mutate('Assigned')} disabled={updateStatusMutation.isPending} className="h-10 px-4 bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold rounded-md transition-colors text-sm">Mark as Assigned</button>
                                        </>
                                    )}

                                    {matter.status === 'Assigned' && (
                                        <button onClick={() => updateStatusMutation.mutate('In Progress')} disabled={updateStatusMutation.isPending} className="h-10 px-4 bg-green-50 text-green-700 hover:bg-green-100 font-bold rounded-md transition-colors text-sm">Start Work (In Progress)</button>
                                    )}

                                    {matter.status === 'In Progress' && (
                                        <>
                                            <button onClick={() => updateStatusMutation.mutate('On Hold')} disabled={updateStatusMutation.isPending} className="h-10 px-4 bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold rounded-md transition-colors text-sm">Pause (On Hold)</button>
                                            <button onClick={() => updateStatusMutation.mutate('Completed')} disabled={updateStatusMutation.isPending} className="h-10 px-4 bg-green-50 text-green-700 hover:bg-green-100 font-bold rounded-md transition-colors text-sm">Mark Completed</button>
                                        </>
                                    )}

                                    {matter.status === 'On Hold' && (
                                        <button onClick={() => updateStatusMutation.mutate('In Progress')} disabled={updateStatusMutation.isPending} className="h-10 px-4 bg-green-50 text-green-700 hover:bg-green-100 font-bold rounded-md transition-colors text-sm">Resume Work</button>
                                    )}

                                    {matter.status === 'Completed' && (
                                        <button onClick={() => updateStatusMutation.mutate('Closed')} disabled={updateStatusMutation.isPending} className="h-10 px-4 bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold rounded-md transition-colors text-sm">Close Case</button>
                                    )}

                                    {['Closed', 'Rejected'].includes(matter.status) && (
                                        <p className="col-span-full text-sm text-slate-500 italic text-center py-2">
                                            This case is {matter.status.toLowerCase()} and cannot be modified.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <CaseStatementSection
                        statement={caseStatement}
                        onUpdate={(c) => updateStatementMutation.mutate(c)}
                        isPending={updateStatementMutation.isPending}
                        canEdit={['case_manager', 'associate_lawyer', 'admin_manager'].includes(profile?.internal_role || '')}
                    />

                    {/* Court Reports Section - Available to all internal roles (permission-based) */}
                    {profile && ['associate_lawyer', 'case_manager', 'admin_manager'].includes(profile.internal_role || '') && (
                        <CourtReportSubmission
                            matterId={id!}
                            matterStatus={matter.status}
                            isAssigned={
                                ['case_manager', 'admin_manager'].includes(profile.internal_role || '')
                                    ? true // Case Managers and Admin Managers can submit for all firm matters
                                    : matter.assignments?.some(
                                        (a: any) => a.associate?.id === profile.id || a.associate_id === profile.id
                                    ) || false
                            }
                        />
                    )}

                    {/* Court Reports List */}
                    <div className="bg-white rounded-md border border-slate-200 shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-slate-900 uppercase tracking-tight mb-4">
                            Court Reports
                        </h2>
                        <CourtReportsList matterId={id!} />
                    </div>

                    {/* Activity Timeline */}
                    <div className="bg-white rounded-md border border-slate-200 shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-slate-900 uppercase tracking-tight mb-6">
                            Activity Timeline
                        </h2>
                        <ActivityTimeline logs={caseLogs || []} />
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Client Information */}
                    <div className="bg-white rounded-md border border-slate-200 shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-slate-900 uppercase tracking-tight mb-4">
                            Client
                        </h2>

                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <User className="h-5 w-5 text-slate-400" />
                                <div>
                                    <p className="text-sm font-bold text-slate-900">
                                        {matter.client?.first_name} {matter.client?.last_name}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Mail className="h-5 w-5 text-slate-400" />
                                <p className="text-sm text-slate-600">{matter.client?.email}</p>
                            </div>
                            {matter.client?.phone && (
                                <div className="flex items-center gap-3">
                                    <Phone className="h-5 w-5 text-slate-400" />
                                    <p className="text-sm text-slate-600">{matter.client.phone}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Assignment */}
                    <div className="bg-white rounded-md border border-slate-200 shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-slate-900 uppercase tracking-tight mb-4">
                            Assignment
                        </h2>

                        {matter.assignments && matter.assignments.length > 0 ? (
                            <div className="space-y-3">
                                {matter.assignments.map((assignment: any) => (
                                    <div key={assignment.id} className="p-3 bg-green-50 rounded-md">
                                        <div className="flex items-center gap-2 mb-2">
                                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                                            <p className="text-sm font-bold text-green-900">Assigned</p>
                                        </div>
                                        <p className="text-sm text-slate-700">
                                            {assignment.associate?.first_name} {assignment.associate?.last_name}
                                        </p>
                                        <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                                            <Calendar className="h-3 w-3" />
                                            {format(new Date(assignment.assigned_at), 'MMM dd, yyyy')}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6 bg-slate-50 rounded-md border border-dashed border-slate-200">
                                <p className="text-sm text-slate-500">No lawyer assigned yet</p>
                            </div>
                        )}
                    </div>

                    <AssignDialog
                        isOpen={assignDialogOpen}
                        onClose={() => setAssignDialogOpen(false)}
                        matterId={id!}
                        firmId={profile?.firm_id || ''}
                    />
                </div>
            </div>
        </div>
    );
}
