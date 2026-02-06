import { supabase } from '../../lib/supabase';
import { useQuery } from '@tanstack/react-query';
import {
    CheckCircle2,
    Clock,
    AlertCircle,
    Loader2,
    Calendar,
    Target
} from 'lucide-react';

interface Task {
    id: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    due_date: string;
    stage_id: string;
}

interface ClientTaskTrackerProps {
    matterId: string;
    currentStageId: string | null;
}

export default function ClientTaskTracker({ matterId, currentStageId }: ClientTaskTrackerProps) {

    const { data: tasks, isLoading } = useQuery<Task[]>({
        queryKey: ['client_matter_tasks', matterId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('matter_tasks')
                .select('*')
                .eq('matter_id', matterId)
                .eq('is_client_visible', true)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        }
    });

    if (isLoading) return <div className="h-20 flex items-center justify-center opacity-30"><Loader2 className="animate-spin text-blue-500" size={20} /></div>;

    const currentStageTasks = tasks?.filter(t => t.status !== 'completed') || [];
    const completedTasks = tasks?.filter(t => t.status === 'completed') || [];

    return (
        <div className="bg-[#111827]/50 backdrop-blur-xl border border-white/5 rounded-3xl p-6 sm:p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1">Collaboration Hub</h3>
                    <p className="text-xl font-black text-white italic uppercase tracking-tighter">Required Actions</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                    <Target size={20} />
                </div>
            </div>

            <div className="space-y-4">
                {currentStageTasks.length === 0 && completedTasks.length === 0 ? (
                    <div className="text-center py-10 opacity-30">
                        <p className="text-xs font-bold uppercase tracking-widest">No active tasks for your review</p>
                    </div>
                ) : (
                    <>
                        {currentStageTasks.map(task => {
                            const isCurrentStage = task.stage_id === currentStageId;
                            return (
                                <div key={task.id} className={`group bg-white/5 border ${isCurrentStage ? 'border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'border-white/5'} rounded-2xl p-4 transition-all hover:border-blue-500/30`}>
                                    <div className="flex items-start gap-4">
                                        <div className="mt-1">
                                            {task.status === 'blocked' ? (
                                                <AlertCircle className="text-red-400" size={20} />
                                            ) : (
                                                <Clock className={`text-blue-400 ${isCurrentStage ? 'animate-pulse' : ''}`} size={20} />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-bold text-white text-sm truncate">{task.title}</h4>
                                                {isCurrentStage && <span className="text-[8px] font-black bg-blue-500 text-white px-1.5 py-0.5 rounded tracking-tighter uppercase">Current Phase</span>}
                                            </div>
                                            <p className="text-xs text-slate-400 leading-relaxed mb-3 line-clamp-2">
                                                {task.description || 'Action required by the legal team or client.'}
                                            </p>
                                            <div className="flex items-center gap-3">
                                                {task.due_date && (
                                                    <span className="text-[10px] text-slate-500 flex items-center gap-1 font-bold bg-white/5 px-2 py-0.5 rounded">
                                                        <Calendar size={10} /> {new Date(task.due_date).toLocaleDateString()}
                                                    </span>
                                                )}
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${task.priority === 'urgent' ? 'text-red-400 border-red-400/20 bg-red-400/10' :
                                                        'text-blue-400 border-blue-400/20 bg-blue-400/10'
                                                    }`}>
                                                    {task.priority}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {completedTasks.length > 0 && (
                            <div className="pt-4 mt-4 border-t border-white/5">
                                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-4">Completed Items</p>
                                <div className="space-y-2">
                                    {completedTasks.map(task => (
                                        <div key={task.id} className="flex items-center gap-3 p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl opacity-60">
                                            <CheckCircle2 className="text-emerald-500" size={14} />
                                            <span className="text-xs text-slate-400 font-medium line-through">{task.title}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
