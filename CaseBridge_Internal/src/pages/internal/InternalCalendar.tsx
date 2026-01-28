import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useInternalSession } from '@/hooks/useInternalSession';
import {
    Calendar as CalendarIcon,
    Briefcase, Video, Building2,
    CheckCircle2, Search
} from 'lucide-react';
import { useState } from 'react';
import InternalSidebar from '@/components/layout/InternalSidebar';

export default function InternalCalendar() {
    const { session } = useInternalSession();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const isAdmin = session?.role === 'admin_manager';

    const { data: meetings, isLoading } = useQuery({
        queryKey: ['all_meetings', session?.firm_id, session?.user_id],
        enabled: !!session,
        queryFn: async () => {
            // Requires case_meetings.lawyer_user_id -> profiles.id FK for full_name select
            let query = supabase
                .from('case_meetings')
                // Fetch canonical fields
                .select(`
                    *,
                    matter:case_id(title, id, firm_id, assigned_associate, assigned_case_manager),
                    client:client_id(first_name, last_name, email),
                    lawyer:lawyer_user_id(full_name)
                `)
                .order('created_at', { ascending: false }); // Show newest requests first

            if (isAdmin) {
                // Admin sees everything for the firm
                // Note: RLS handles the firm filtering based on user_firm_roles in canonical db_scheduling_v1.sql
                // But we can be explicit if needed.
            } else {
                // Associate/CM see assigned only
                // Filtered by RLS: lawyer_user_id = auth.uid() OR manager for firm
            }

            const { data, error } = await query;
            if (error) throw error;
            return data;
        }
    });

    const filteredMeetings = meetings?.filter((m: any) => {
        const searchMatch =
            m.matter?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.client?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.client?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.lawyer?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());

        const statusMatch = statusFilter === 'all' || m.status === statusFilter;

        return searchMatch && statusMatch;
    });

    return (
        <div className="min-h-screen bg-[#0F172A] text-white">
            <InternalSidebar />

            <main className="ml-64 p-10 max-w-7xl mx-auto">
                <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight mb-2">Operational Calendar</h1>
                        <p className="text-slate-400 text-sm">Centralized visibility of all scheduled legal coordination sessions.</p>
                    </div>

                    <div className="flex items-center gap-4 bg-[#1E293B] p-2 rounded-2xl border border-white/5">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search by case, client or lawyer..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="bg-[#0F172A] border border-white/5 rounded-xl py-2 pl-10 pr-4 text-xs w-64 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className="bg-[#0F172A] border border-white/5 rounded-xl py-2 px-4 text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        >
                            <option value="all">All Statuses</option>
                            <option value="requested">Requests</option>
                            <option value="accepted">Accepted</option>
                            <option value="rejected">Rejected</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                </header>

                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin text-indigo-500"><CalendarIcon size={40} /></div>
                    </div>
                ) : filteredMeetings?.length === 0 ? (
                    <div className="bg-[#1E293B] border border-white/10 rounded-3xl p-20 text-center">
                        <CalendarIcon size={48} className="mx-auto text-slate-700 mb-4 opacity-20" />
                        <h2 className="text-xl font-bold text-slate-400">No scheduled sessions found</h2>
                        <p className="text-slate-500 mt-2">Try adjusting your filters or search terms.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredMeetings?.map((meeting: any) => (
                            <div key={meeting.id} className="bg-[#1E293B] border border-white/10 rounded-3xl p-6 hover:border-indigo-500/30 transition-all group relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                    {meeting.meeting_type === 'virtual' ? <Video size={64} /> : <Building2 size={64} />}
                                </div>

                                <div className="flex justify-between items-start mb-6">
                                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${meeting.status === 'requested' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                            meeting.status === 'accepted' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                meeting.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                    'bg-red-500/10 text-red-400 border-red-500/20'
                                        }`}>
                                        {meeting.status}
                                    </div>
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                                        {meeting.meeting_type === 'virtual' ? <Video size={12} /> : <Building2 size={12} />}
                                        {meeting.meeting_type}
                                    </span>
                                </div>

                                <div className="space-y-4 mb-6">
                                    <div>
                                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                            <Briefcase size={10} /> Case Reference
                                        </p>
                                        <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors leading-tight">
                                            {meeting.matter?.title}
                                        </h3>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Client</p>
                                            <p className="text-sm font-bold text-slate-200">
                                                {meeting.client?.first_name} {meeting.client?.last_name}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Lawyer</p>
                                            <p className="text-sm font-bold text-slate-200">
                                                {meeting.lawyer?.full_name || 'Unassigned'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                                            <CalendarIcon size={16} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-white">
                                                {meeting.confirmed_start ?
                                                    new Date(meeting.confirmed_start).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) :
                                                    new Date(meeting.proposed_start).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) + ' (Proposed)'}
                                            </p>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase">
                                                {meeting.confirmed_start ?
                                                    new Date(meeting.confirmed_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) :
                                                    new Date(meeting.proposed_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>

                                    <button className="p-2 text-slate-500 hover:text-white transition-colors">
                                        <CheckCircle2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
