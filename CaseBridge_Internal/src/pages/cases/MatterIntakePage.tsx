import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';
import {
    Briefcase,
    Search,
    UserPlus,
    CheckCircle2,
    Clock,
    AlertCircle,
    FileText,
    ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

export default function MatterIntakePage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

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

    const { data: matters, isLoading } = useQuery({
        queryKey: ['matters'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('matters')
                .select(`
          *,
          client:profiles!matters_client_id_fkey(first_name, last_name, email),
          assignments:case_assignments(
            associate:profiles!case_assignments_associate_id_fkey(id, first_name, last_name)
          )
        `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        },
    });

    // Stats calculation
    const stats = {
        total: matters?.length || 0,
        pending: matters?.filter(m => m.status === 'Pending Review').length || 0,
        active: matters?.filter(m => ['Active', 'In Progress', 'Assigned'].includes(m.status)).length || 0,
        unassigned: matters?.filter(m => (!m.assignments || m.assignments.length === 0) && m.status !== 'Draft').length || 0,
    };

    const getStatusBadge = (status: string) => {
        // Judicial Modern Status Colors
        const statusConfig: Record<string, string> = {
            'Draft': 'bg-slate-100 text-slate-600',
            'Pending Review': 'bg-amber-100 text-amber-700',
            'In Review': 'bg-blue-100 text-blue-700',
            'Awaiting Documents': 'bg-orange-100 text-orange-700',
            'Assigned': 'bg-indigo-100 text-indigo-700',
            'In Progress': 'bg-green-100 text-green-700',
            'Active': 'bg-green-100 text-green-700',
            'On Hold': 'bg-yellow-100 text-yellow-700',
            'Completed': 'bg-slate-100 text-slate-600',
            'Closed': 'bg-slate-100 text-slate-500',
            'Rejected': 'bg-red-100 text-red-700',
        };

        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-semibold uppercase rounded-md ${statusConfig[status] || 'bg-slate-100 text-slate-600'}`}>
                {status}
            </span>
        );
    };

    const filteredMatters = matters?.filter(matter =>
        (matter.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            matter.case_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            matter.client?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            matter.client?.last_name?.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (statusFilter === 'all' || matter.status === statusFilter) &&
        // Access Control: Associate Lawyers only see their assigned cases
        (profile?.internal_role !== 'associate_lawyer' || matter.assignments?.some((a: any) => a.associate?.id === profile.id || a.associate_id === profile.id))
    );

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-semibold text-slate-900 uppercase tracking-tight">
                    {profile?.internal_role === 'associate_lawyer' ? 'My Assigned Portfolio' : 'Case Intake'}
                </h1>
                <p className="text-sm text-slate-600 font-medium mt-1">
                    {profile?.internal_role === 'associate_lawyer'
                        ? 'View and manage cases specifically assigned to you'
                        : 'Review and manage client-submitted legal cases'}
                </p>
            </div>

            {/* Stats Cards */}
            <div className={`grid grid-cols-1 ${profile?.internal_role === 'associate_lawyer' ? 'md:grid-cols-3' : 'md:grid-cols-4'} gap-4`}>
                <div className="bg-white p-6 rounded-md border border-slate-200 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center gap-3 mb-2">
                        <Briefcase className="h-5 w-5 text-primary" />
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total Cases</p>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                </div>

                {profile?.internal_role !== 'associate_lawyer' && (
                    <div className="bg-white p-6 rounded-md border border-slate-200 shadow-sm transition-all hover:shadow-md">
                        <div className="flex items-center gap-3 mb-2">
                            <Clock className="h-5 w-5 text-amber-600" />
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Pending Review</p>
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{stats.pending}</p>
                    </div>
                )}

                <div className="bg-white p-6 rounded-md border border-slate-200 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center gap-3 mb-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Active</p>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{stats.active}</p>
                </div>

                {profile?.internal_role !== 'associate_lawyer' ? (
                    <div className="bg-white p-6 rounded-md border border-slate-200 shadow-sm transition-all hover:shadow-md">
                        <div className="flex items-center gap-3 mb-2">
                            <UserPlus className="h-5 w-5 text-blue-600" />
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Unassigned</p>
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{stats.unassigned}</p>
                    </div>
                ) : (
                    <div className="bg-white p-6 rounded-md border border-slate-200 shadow-sm border-l-4 border-l-primary transition-all hover:shadow-md">
                        <div className="flex items-center gap-3 mb-2">
                            <FileText className="h-5 w-5 text-primary" />
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Latest Updates</p>
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{matters?.filter(m => format(new Date(m.updated_at), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')).length || 0}</p>
                    </div>
                )}
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search cases, clients, or IDs..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-10 pl-10 pr-4 bg-white border border-slate-200 rounded-md text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-10 px-4 bg-white border border-slate-200 rounded-md text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer"
                >
                    <option value="all">All Statuses</option>
                    <option value="Pending Review">Pending Review</option>
                    <option value="Active">Active</option>
                    <option value="Assigned">Assigned</option>
                    <option value="Completed">Completed</option>
                    <option value="Closed">Closed</option>
                </select>
            </div>

            {/* Case List */}
            <div className="bg-white rounded-md border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">Case ID & Title</th>
                                <th className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">Client Name</th>
                                <th className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">Case Status</th>
                                <th className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">Last Updated</th>
                                {profile?.internal_role !== 'associate_lawyer' && (
                                    <th className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">Assigned Lawyer</th>
                                )}
                                <th className="px-6 py-4 text-right text-[10px] font-semibold uppercase tracking-wide text-slate-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                        Loading cases...
                                    </td>
                                </tr>
                            ) : filteredMatters?.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                        No cases found matching your filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredMatters?.map((matter) => (
                                    <tr key={matter.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="text-[10px] text-slate-400 font-mono font-semibold uppercase tracking-tight mb-0.5">{matter.matter_number}</p>
                                                <p className="text-sm font-bold text-slate-900 tracking-tight uppercase">{matter.title}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-900">
                                                    {matter.client?.first_name} {matter.client?.last_name}
                                                </p>
                                                <p className="text-[10px] text-slate-400 font-medium uppercase">{matter.matter_type}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(matter.status)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
                                                <Clock className="h-3.5 w-3.5 text-slate-300" />
                                                {format(new Date(matter.updated_at), 'MMM dd, HH:mm')}
                                            </div>
                                        </td>
                                        {profile?.internal_role !== 'associate_lawyer' && (
                                            <td className="px-6 py-4">
                                                {matter.assignments && matter.assignments.length > 0 ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                                            {matter.assignments[0].associate?.first_name[0]}{matter.assignments[0].associate?.last_name[0]}
                                                        </div>
                                                        <span className="text-xs text-slate-600 font-semibold">
                                                            {matter.assignments[0].associate?.first_name}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-300">Unassigned</span>
                                                )}
                                            </td>
                                        )}
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link
                                                    to={`/cases/${matter.id}`}
                                                    className="inline-flex items-center gap-2 px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-white bg-slate-900 hover:bg-primary rounded-md transition-all shadow-sm active:scale-95"
                                                >
                                                    View Case
                                                    <ArrowRight className="h-3 w-3" />
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
