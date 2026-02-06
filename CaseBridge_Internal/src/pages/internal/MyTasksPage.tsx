
import { useNavigate } from 'react-router-dom';
import { useInternalSession } from '@/hooks/useInternalSession';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    CheckSquare,
    Square,
    Search,
    Filter,
    Shield,
    Clock,
    AlertCircle,
    ExternalLink,
    Briefcase,
    Calendar,
    Loader2
} from 'lucide-react';
import InternalSidebar from '@/components/layout/InternalSidebar';

interface Task {
    id: string;
    title: string;
    description: string;
    status: 'pending' | 'in_progress' | 'under_review' | 'completed' | 'blocked';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    due_date: string;
    matter_id: string;
    matter: {
        title: string;
    };
    stage_id: string;
}

export default function MyTasksPage() {
    const { session } = useInternalSession();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const isCaseManager = session?.role === 'case_manager' || session?.role === 'admin' || session?.role === 'admin_manager';

    // Fetch Tasks
    const { data: tasks, isLoading } = useQuery<Task[]>({
        queryKey: ['global_tasks', session?.user_id],
        enabled: !!session?.user_id,
        queryFn: async () => {
            let query = supabase
                .from('matter_tasks')
                .select(`
                    *,
                    matter:matter_id ( title )
                `);

            // If associate, only show their tasks
            if (!isCaseManager) {
                query = query.eq('assigned_to_id', session!.user_id);
            }

            const { data, error } = await query.order('due_date', { ascending: true, nullsFirst: false });

            if (error) throw error;
            return data || [];
        }
    });

    const updateTaskStatus = useMutation({
        mutationFn: async ({ taskId, status }: { taskId: string, status: string }) => {
            const { error } = await supabase
                .from('matter_tasks')
                .update({
                    status,
                    completed_at: status === 'completed' ? new Date().toISOString() : null
                })
                .eq('id', taskId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['global_tasks'] });
        }
    });

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'urgent': return 'text-red-400 bg-red-400/10 border-red-400/20';
            case 'high': return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
            case 'medium': return 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20';
            default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckSquare className="text-emerald-500" size={20} />;
            case 'blocked': return <AlertCircle className="text-red-500" size={20} />;
            case 'in_progress': return <Clock className="text-indigo-400 animate-pulse" size={20} />;
            default: return <Square className="text-slate-600" size={20} />;
        }
    };

    return (
        <div className="min-h-screen bg-[#0F172A] text-white">
            <InternalSidebar />

            <main className="ml-64 p-12 min-h-screen max-w-7xl mx-auto">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                    <div>
                        <div className="flex items-center gap-2 text-indigo-400 font-bold uppercase tracking-[0.2em] text-[10px] mb-4">
                            <Shield size={12} /> Workflow Governance
                        </div>
                        <h2 className="text-4xl font-black tracking-tight mb-2 italic uppercase">
                            Task <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 font-black">Registry</span>
                        </h2>
                        <p className="text-slate-400 font-medium">
                            {isCaseManager ? 'Omni-view of all pending legal maneuvers across the firm.' : 'Personal operational queue for your assigned matters.'}
                        </p>
                    </div>
                </header>

                {/* Filters & Search Row */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="relative flex-1 max-w-md group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search your task queue..."
                            className="w-full bg-[#1E293B] border border-white/5 rounded-2xl py-3.5 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-600 shadow-xl"
                        />
                    </div>
                    <button className="px-5 py-3.5 bg-[#1E293B] border border-white/5 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white flex items-center gap-3 transition-all hover:bg-white/5 shadow-xl">
                        <Filter className="w-4 h-4" />
                        Status Filter
                    </button>
                    <button className="px-5 py-3.5 bg-[#1E293B] border border-white/5 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white flex items-center gap-3 transition-all hover:bg-white/5 shadow-xl ml-auto">
                        Show Completed
                    </button>
                </div>

                {/* Tasks List */}
                <div className="space-y-4">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-4">
                            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                            <p className="text-xs font-black uppercase tracking-widest text-slate-500">Syncing with task vault...</p>
                        </div>
                    ) : tasks?.filter(t => t.status !== 'completed').length === 0 ? (
                        <div className="bg-[#1E293B] border border-white/5 border-dashed rounded-3xl p-20 text-center">
                            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 mx-auto">
                                <CheckSquare className="w-10 h-10 text-emerald-500" />
                            </div>
                            <h4 className="font-black text-xl text-slate-400 mb-2">Zero Pending Missions.</h4>
                            <p className="text-slate-500 text-sm max-w-xs mx-auto">All active task objectives have been neutralized. Good work counselor.</p>
                        </div>
                    ) : (
                        tasks?.filter(t => t.status !== 'completed').map((task) => (
                            <div key={task.id} className="bg-[#1E293B] border border-white/5 rounded-3xl p-6 hover:border-indigo-500/30 transition-all group flex items-start gap-6 relative overflow-hidden">
                                <button
                                    onClick={() => updateTaskStatus.mutate({
                                        taskId: task.id,
                                        status: 'completed'
                                    })}
                                    className="pt-1 transition-transform active:scale-95"
                                >
                                    {getStatusIcon(task.status)}
                                </button>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 rounded-lg border border-white/5 text-[9px] font-black uppercase tracking-widest text-slate-400">
                                            <Briefcase size={10} /> {task.matter?.title}
                                        </div>
                                        <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${getPriorityColor(task.priority)}`}>
                                            {task.priority}
                                        </span>
                                    </div>
                                    <h3
                                        onClick={() => navigate(`/internal/matter/${task.matter_id}`)}
                                        className="text-xl font-black text-white hover:text-indigo-400 transition-colors cursor-pointer mb-1"
                                    >
                                        {task.title}
                                    </h3>
                                    <p className="text-sm text-slate-400 line-clamp-1 italic max-w-2xl">
                                        {task.description || 'No detailed instructions provided.'}
                                    </p>
                                </div>

                                <div className="flex flex-col items-end gap-3 shrink-0">
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-xl border border-white/5">
                                        <Calendar size={12} className="text-indigo-400" />
                                        <span className={`text-[11px] font-bold ${new Date(task.due_date) < new Date() ? 'text-red-400' : 'text-slate-400'}`}>
                                            {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No Deadline'}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => navigate(`/internal/matter/${task.matter_id}`)}
                                        className="bg-white/5 hover:bg-indigo-600 text-white p-3 rounded-xl transition-all border border-white/5 hover:border-indigo-400 group/btn"
                                    >
                                        <ExternalLink className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>
        </div>
    );
}
