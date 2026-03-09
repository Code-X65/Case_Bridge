import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    CheckSquare,
    Square,
    Clock,
    User,
    Plus,
    ChevronDown,
    ChevronUp,
    Eye,
    EyeOff,
    Loader2,
    Calendar,
    Flag,
    ListTodo,
    Target
} from 'lucide-react';

interface Task {
    id: string;
    title: string;
    description: string;
    status: 'pending' | 'in_progress' | 'under_review' | 'completed' | 'blocked';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    due_date: string;
    is_client_visible: boolean;
    required_for_stage_completion: boolean;
    stage_id: string | null;
    assigned_to_id: string | null;
    checklist_items?: Array<{ id: string; text: string; completed: boolean }> | null;
}

interface MatterTasksProps {
    matterId: string;
    currentStageId: string | null;
    isCaseManager: boolean;
}

export default function MatterTasks({ matterId, currentStageId, isCaseManager }: MatterTasksProps) {
    const queryClient = useQueryClient();
    const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
    const [isAddingTask, setIsAddingTask] = useState(false);

    // Form State
    const [newTask, setNewTask] = useState({
        title: '',
        description: '',
        priority: 'medium' as const,
        due_date: '',
        is_client_visible: false,
        assigned_to_id: '',
        stage_id: currentStageId || ''
    });

    const { data: tasks, isLoading } = useQuery<Task[]>({
        queryKey: ['matter_tasks', matterId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('matter_tasks')
                .select('*')
                .eq('matter_id', matterId)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        }
    });

    const { data: staff } = useQuery({
        queryKey: ['firm_staff_for_tasks', matterId],
        enabled: isAddingTask,
        queryFn: async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return [];
            const { data: myRole } = await supabase.from('user_firm_roles').select('firm_id').eq('user_id', session.user.id).single();
            if (!myRole) return [];
            const { data } = await supabase.from('user_firm_roles').select('user_id, profile:profiles(id, full_name)').eq('firm_id', myRole.firm_id).eq('status', 'active');
            return data?.map((d: any) => ({ id: d.user_id, full_name: d.profile.full_name })) || [];
        }
    });

    const createTask = useMutation({
        mutationFn: async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const { error } = await supabase.from('matter_tasks').insert({
                ...newTask,
                matter_id: matterId,
                stage_id: newTask.stage_id || null,
                assigned_to_id: newTask.assigned_to_id || null,
                due_date: newTask.due_date || null,
                created_by_id: session?.user?.id
            });
            if (error) throw error;

            // Audit Log
            await supabase.rpc('log_audit_event', {
                p_action: 'task_created',
                p_matter_id: matterId,
                p_metadata: { title: newTask.title, priority: newTask.priority }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['matter_tasks', matterId] });
            setIsAddingTask(false);
            setNewTask({ title: '', description: '', priority: 'medium', due_date: '', is_client_visible: false, assigned_to_id: '', stage_id: currentStageId || '' });
        }
    });

    const updateTaskStatus = useMutation({
        mutationFn: async ({ taskId, status }: { taskId: string, status: string }) => {
            const { error } = await supabase.from('matter_tasks').update({ status, completed_at: status === 'completed' ? new Date().toISOString() : null }).eq('id', taskId);
            if (error) throw error;

            // Audit Log
            await supabase.rpc('log_audit_event', {
                p_action: 'task_status_updated',
                p_matter_id: matterId,
                p_metadata: { task_id: taskId, new_status: status }
            });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['matter_tasks', matterId] })
    });

    const toggleClientVisibility = useMutation({
        mutationFn: async ({ taskId, visible }: { taskId: string, visible: boolean }) => {
            const { error } = await supabase.from('matter_tasks').update({ is_client_visible: visible }).eq('id', taskId);
            if (error) throw error;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['matter_tasks', matterId] })
    });

    const currentStageTasks = tasks?.filter(t => t.stage_id === currentStageId) || [];
    const generalTasks = tasks?.filter(t => !t.stage_id) || [];
    const otherTasks = tasks?.filter(t => t.stage_id && t.stage_id !== currentStageId) || [];

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
            case 'in_progress': return <Clock className="text-indigo-400 animate-pulse" size={20} />;
            default: return <Square className="text-slate-600" size={20} />;
        }
    };

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-indigo-500" /></div>;

    const TaskItem = ({ task }: { task: Task }) => (
        <div className={`bg-[#1E293B] border ${task.status === 'completed' ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-white/5'} rounded-2xl transition-all hover:border-white/10`}>
            <div className="p-4 flex items-center justify-between gap-4">
                <button onClick={() => updateTaskStatus.mutate({ taskId: task.id, status: task.status === 'completed' ? 'pending' : 'completed' })}>
                    {getStatusIcon(task.status)}
                </button>
                <div className="flex-1 min-w-0">
                    <h4 className={`font-bold text-sm truncate ${task.status === 'completed' ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                        {task.title}
                    </h4>
                    <div className="flex items-center gap-3 mt-1 text-[9px] font-black uppercase tracking-widest">
                        <span className={`px-2 py-0.5 rounded border ${getPriorityColor(task.priority)}`}>{task.priority}</span>
                        {task.due_date && <span className="text-slate-500 flex items-center gap-1"><Calendar size={10} /> {new Date(task.due_date).toLocaleDateString()}</span>}
                        {task.required_for_stage_completion && <span className="text-amber-500 flex items-center gap-1"><Flag size={10} /> Required</span>}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => toggleClientVisibility.mutate({ taskId: task.id, visible: !task.is_client_visible })} className={`p-2 rounded-lg ${task.is_client_visible ? 'text-blue-400 bg-blue-400/10' : 'text-slate-600 hover:bg-white/5'}`}>
                        {task.is_client_visible ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                    <button onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)} className="p-2 text-slate-500 hover:text-white">
                        {expandedTaskId === task.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </div>
            </div>
            {expandedTaskId === task.id && (
                <div className="px-12 pb-6 pt-2 border-t border-white/5 bg-white/5 rounded-b-2xl">
                    <p className="text-sm text-slate-400 italic mb-4">{task.description || 'No description provided.'}</p>
                    {task.checklist_items && task.checklist_items.length > 0 && (
                        <div className="space-y-2 mb-4">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><ListTodo size={12} /> Checklist</p>
                            {task.checklist_items.map(item => (
                                <div key={item.id} className="flex items-center gap-3 text-xs text-slate-300">
                                    {item.completed ? <CheckSquare size={14} className="text-emerald-500" /> : <Square size={14} className="text-slate-600" />}
                                    <span>{item.text}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="flex items-center justify-between pt-4 border-t border-white/5 text-[10px] font-black uppercase tracking-widest text-slate-500">
                        <div className="flex items-center gap-2"><User size={12} /> {staff?.find(s => s.id === task.assigned_to_id)?.full_name || 'Unassigned'}</div>
                        {isCaseManager && <button className="text-indigo-400 hover:text-indigo-300">Edit Task</button>}
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Matter Actions</h3>
                    <p className="text-lg font-bold text-white tracking-tight">Strategy Execution Board</p>
                </div>
                <button
                    onClick={() => setIsAddingTask(!isAddingTask)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20"
                >
                    <Plus size={14} /> {isAddingTask ? 'Cancel' : 'New Task'}
                </button>
            </div>

            {isAddingTask && (
                <div className="bg-[#1E293B] border border-indigo-500/20 rounded-2xl p-6 animate-in slide-in-from-top-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="md:col-span-2">
                            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-1">Task Title</label>
                            <input type="text" value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} className="w-full bg-[#0F172A] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:ring-1 focus:ring-indigo-500 outline-none" placeholder="Task Objective..." />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-1">Assignee</label>
                            <select value={newTask.assigned_to_id} onChange={e => setNewTask({ ...newTask, assigned_to_id: e.target.value })} className="w-full bg-[#0F172A] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:ring-1 focus:ring-indigo-500 outline-none appearance-none">
                                <option value="">Select Staff...</option>
                                {staff?.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-1">Workspace Bucket</label>
                            <select value={newTask.stage_id} onChange={e => setNewTask({ ...newTask, stage_id: e.target.value })} className="w-full bg-[#0F172A] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:ring-1 focus:ring-indigo-500 outline-none appearance-none">
                                <option value="">General (Matter-wide)</option>
                                <option value={currentStageId || ''}>Current Stage Context</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <button onClick={() => setNewTask({ ...newTask, is_client_visible: !newTask.is_client_visible })} className={`w-10 h-6 rounded-full transition-all relative ${newTask.is_client_visible ? 'bg-blue-600' : 'bg-slate-700'}`}>
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${newTask.is_client_visible ? 'left-5' : 'left-1'}`} />
                            </button>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Client Visible</span>
                        </label>
                        <button onClick={() => createTask.mutate()} disabled={!newTask.title} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-600/20">Add Task</button>
                    </div>
                </div>
            )}

            {currentStageTasks.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] px-2 flex items-center gap-2"><Target size={12} className="text-indigo-400" /> Active Stage Context</h3>
                    {currentStageTasks.map(t => <TaskItem key={t.id} task={t} />)}
                </div>
            )}

            {generalTasks.length > 0 && (
                <div className="space-y-3 pt-6 border-t border-white/5">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] px-2 flex items-center gap-2"><ListTodo size={12} className="text-emerald-400" /> General Matter Pool</h3>
                    {generalTasks.map(t => <TaskItem key={t.id} task={t} />)}
                </div>
            )}

            {otherTasks.length > 0 && (
                <div className="pt-6">
                    <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-[0.3em] px-2 mb-4">Other Workspace Buckets ({otherTasks.length})</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 opacity-60 hover:opacity-100 transition-opacity">
                        {otherTasks.map(t => (
                            <div key={t.id} className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between">
                                <span className="text-xs text-slate-400 font-bold truncate pr-3">{t.title}</span>
                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border shrink-0 ${getPriorityColor(t.priority)}`}>{t.priority}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
