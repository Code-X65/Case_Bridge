import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    CheckSquare,
    Square,
    Clock,
    AlertCircle,
    User,
    Plus,
    ChevronDown,
    ChevronUp,
    MessageSquare,
    Eye,
    EyeOff,
    Loader2,
    Calendar,
    Flag
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
    stage_id: string;
    assigned_to_id: string;
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
        assigned_to_id: ''
    });

    // Fetch tasks for the current matter
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

    // Fetch firm staff for assignment
    const { data: staff } = useQuery({
        queryKey: ['firm_staff_for_tasks'],
        enabled: isAddingTask,
        queryFn: async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return [];

            // Get firm_id from current user's role
            const { data: myRole } = await supabase
                .from('user_firm_roles')
                .select('firm_id')
                .eq('user_id', session.user.id)
                .single();

            if (!myRole) return [];

            const { data, error } = await supabase
                .from('user_firm_roles')
                .select('user_id, profile:profiles(id, full_name)')
                .eq('firm_id', myRole.firm_id)
                .eq('status', 'active');

            if (error) throw error;
            return data.map((d: any) => ({
                id: d.user_id,
                full_name: d.profile.full_name
            }));
        }
    });

    const createTask = useMutation({
        mutationFn: async () => {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError) throw sessionError;

            // Strict sanitization of values to prevent "400 Bad Request"
            const taskPayload = {
                title: newTask.title.trim(),
                description: newTask.description?.trim() || null,
                priority: newTask.priority || 'medium',
                matter_id: matterId, // Guaranteed from prop
                stage_id: (currentStageId && currentStageId !== '') ? currentStageId : null,
                created_by_id: session?.user?.id || null,
                assigned_to_id: (newTask.assigned_to_id && newTask.assigned_to_id !== '') ? newTask.assigned_to_id : null,
                due_date: (newTask.due_date && newTask.due_date !== '') ? newTask.due_date : null,
                is_client_visible: Boolean(newTask.is_client_visible)
            };

            console.log('Sending Task Payload:', taskPayload);

            const { data, error } = await supabase
                .from('matter_tasks')
                .insert(taskPayload)
                .select();

            if (error) {
                console.error('SERVER SIDE TASK ERROR:', error);
                throw new Error(`${error.message} (${error.code}) [${error.hint || ''}]`);
            }
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['matter_tasks', matterId] });
            setIsAddingTask(false);
            setNewTask({
                title: '',
                description: '',
                priority: 'medium',
                due_date: '',
                is_client_visible: false,
                assigned_to_id: ''
            });
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
            queryClient.invalidateQueries({ queryKey: ['matter_tasks', matterId] });
        }
    });

    const toggleClientVisibility = useMutation({
        mutationFn: async ({ taskId, visible }: { taskId: string, visible: boolean }) => {
            const { error } = await supabase
                .from('matter_tasks')
                .update({ is_client_visible: visible })
                .eq('id', taskId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['matter_tasks', matterId] });
        }
    });

    const generateStageTasks = useMutation({
        mutationFn: async () => {
            if (!currentStageId) return;

            // 1. Fetch templates for this stage
            const { data: templates, error: templateError } = await supabase
                .from('task_templates')
                .select('*')
                .eq('stage_id', currentStageId);

            if (templateError) throw templateError;
            if (!templates || templates.length === 0) return;

            // 2. Filter out templates that already have an existing task
            const { data: existingTasks } = await supabase
                .from('matter_tasks')
                .select('title')
                .eq('matter_id', matterId)
                .eq('stage_id', currentStageId);

            const existingTitles = new Set(existingTasks?.map(t => t.title) || []);
            const newTasks = templates
                .filter(tmp => !existingTitles.has(tmp.title))
                .map(tmp => ({
                    matter_id: matterId,
                    stage_id: currentStageId,
                    title: tmp.title,
                    description: tmp.description,
                    priority: tmp.default_priority,
                    is_client_visible: tmp.is_client_visible_by_default,
                    required_for_stage_completion: tmp.required_by_default
                }));

            if (newTasks.length === 0) return;

            // 3. Insert new tasks
            const { error: insertError } = await supabase
                .from('matter_tasks')
                .insert(newTasks);

            if (insertError) throw insertError;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['matter_tasks', matterId] });
            alert('Stage tasks generated from templates.');
        }
    });

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-indigo-500" /></div>;

    const currentStageTasks = tasks?.filter(t => t.stage_id === currentStageId) || [];
    const otherTasks = tasks?.filter(t => t.stage_id !== currentStageId) || [];

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
            case 'under_review': return <Search className="text-amber-400" size={20} />;
            default: return <Square className="text-slate-600" size={20} />;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Active To-Do List</h3>
                    <p className="text-lg font-bold text-white tracking-tight">Stage-Specific Tasks</p>
                </div>
                <div className="flex items-center gap-2">
                    {isCaseManager && (
                        <button
                            onClick={() => generateStageTasks.mutate()}
                            disabled={generateStageTasks.isPending}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                            {generateStageTasks.isPending ? <Loader2 className="animate-spin" size={14} /> : <CheckSquare size={14} />}
                            Sync Templates
                        </button>
                    )}
                    {isCaseManager && (
                        <button
                            onClick={() => setIsAddingTask(!isAddingTask)}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20"
                        >
                            <Plus size={14} /> {isAddingTask ? 'Cancel' : 'New Task'}
                        </button>
                    )}
                </div>
            </div>

            {/* Task Creation Form */}
            {isAddingTask && (
                <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-6 animate-in slide-in-from-top-4 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Task Objective</label>
                            <input
                                type="text"
                                placeholder="E.g. File motion to suppress evidence..."
                                value={newTask.title}
                                onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                                className="w-full bg-[#0F172A] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Detailed Instructions</label>
                            <textarea
                                placeholder="Provide specific context or requirements for this task..."
                                value={newTask.description}
                                onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                                className="w-full bg-[#0F172A] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 h-24 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Assignee</label>
                            <select
                                value={newTask.assigned_to_id}
                                onChange={e => setNewTask({ ...newTask, assigned_to_id: e.target.value })}
                                className="w-full bg-[#0F172A] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 appearance-none"
                            >
                                <option value="">Select Staff...</option>
                                {staff?.map(s => (
                                    <option key={s.id} value={s.id}>{s.full_name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Priority Level</label>
                            <select
                                value={newTask.priority}
                                onChange={e => setNewTask({ ...newTask, priority: e.target.value as any })}
                                className="w-full bg-[#0F172A] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 appearance-none"
                            >
                                <option value="low">Low Priority</option>
                                <option value="medium">Medium Priority</option>
                                <option value="high">High Priority</option>
                                <option value="urgent">Urgent</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Deadline</label>
                            <input
                                type="date"
                                value={newTask.due_date}
                                onChange={e => setNewTask({ ...newTask, due_date: e.target.value })}
                                className="w-full bg-[#0F172A] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all [color-scheme:dark]"
                            />
                        </div>
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-3 cursor-pointer group mt-6">
                                <button
                                    onClick={() => setNewTask({ ...newTask, is_client_visible: !newTask.is_client_visible })}
                                    className={`w-10 h-6 rounded-full transition-all relative ${newTask.is_client_visible ? 'bg-blue-600' : 'bg-slate-700'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${newTask.is_client_visible ? 'left-5' : 'left-1'}`} />
                                </button>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] group-hover:text-blue-400 transition-colors">Visible to Client</span>
                            </label>
                        </div>

                        <div className="md:col-span-2 pt-4 border-t border-white/5 flex gap-3">
                            <button
                                onClick={() => createTask.mutate()}
                                disabled={createTask.isPending || !newTask.title}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black uppercase tracking-widest py-3 rounded-xl shadow-lg shadow-indigo-600/20 transition-all text-xs italic"
                            >
                                {createTask.isPending ? <Loader2 className="animate-spin mx-auto" /> : 'Deploy Task Objective'}
                            </button>
                            <button
                                onClick={() => setIsAddingTask(false)}
                                className="px-6 py-3 border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                            >
                                Abort
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Current Stage Tasks */}
            <div className="space-y-3">
                {currentStageTasks.length > 0 ? (
                    currentStageTasks.map(task => (
                        <div key={task.id} className={`group bg-[#1E293B] border ${task.status === 'completed' ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-white/5'} rounded-2xl transition-all hover:border-white/10`}>
                            <div className="p-4 flex items-center justify-between gap-4">
                                <button
                                    onClick={() => updateTaskStatus.mutate({
                                        taskId: task.id,
                                        status: task.status === 'completed' ? 'pending' : 'completed'
                                    })}
                                    className="shrink-0"
                                >
                                    {getStatusIcon(task.status)}
                                </button>

                                <div className="flex-1 min-w-0 pointer-events-none">
                                    <h4 className={`font-bold text-sm truncate ${task.status === 'completed' ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                                        {task.title}
                                    </h4>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${getPriorityColor(task.priority)}`}>
                                            {task.priority}
                                        </span>
                                        {task.due_date && (
                                            <span className="text-[10px] text-slate-500 flex items-center gap-1 font-bold">
                                                <Calendar size={12} /> {new Date(task.due_date).toLocaleDateString()}
                                            </span>
                                        )}
                                        {task.required_for_stage_completion && (
                                            <span className="text-[9px] text-amber-500 font-black uppercase tracking-tighter flex items-center gap-1">
                                                <Flag size={10} /> Required
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => toggleClientVisibility.mutate({ taskId: task.id, visible: !task.is_client_visible })}
                                        className={`p-2 rounded-lg transition-colors ${task.is_client_visible ? 'text-blue-400 bg-blue-400/10' : 'text-slate-600 hover:bg-white/5'}`}
                                        title={task.is_client_visible ? 'Visible to Client' : 'Internal Only'}
                                    >
                                        {task.is_client_visible ? <Eye size={16} /> : <EyeOff size={16} />}
                                    </button>
                                    <button
                                        onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                                        className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                    >
                                        {expandedTaskId === task.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </button>
                                </div>
                            </div>

                            {expandedTaskId === task.id && (
                                <div className="overflow-hidden bg-white/5 border-t border-white/5 animate-in slide-in-from-top-2 duration-300">
                                    <div className="px-12 pb-4 pt-0 mt-2">
                                        <p className="text-sm text-slate-400 leading-relaxed py-4 italic">
                                            {task.description || 'No detailed description provided for this task.'}
                                        </p>
                                        <div className="flex items-center justify-between border-t border-white/5 pt-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 border border-white/5">
                                                    <User size={14} />
                                                </div>
                                                <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Awaiting Assignment</span>
                                            </div>
                                            <button className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 hover:text-indigo-300 flex items-center gap-2">
                                                <MessageSquare size={12} /> Discussion (0)
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}Group
                        </div>
                    ))
                ) : (
                    <div className="text-center py-10 bg-white/5 rounded-2xl border border-dashed border-white/10 opacity-50">
                        <CheckSquare className="mx-auto text-slate-700 mb-3" size={32} />
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">No active tasks for this stage</p>
                    </div>
                )}
            </div>

            {/* Other Stage Tasks (Minimized Header) */}
            {otherTasks.length > 0 && (
                <div className="pt-6">
                    <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mb-4">Other Matter Tasks ({otherTasks.length})</h3>
                    <div className="space-y-2 opacity-60 hover:opacity-100 transition-opacity">
                        {otherTasks.map(task => (
                            <div key={task.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 text-xs">
                                <span className="text-slate-400 font-bold truncate pr-4">{task.title}</span>
                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border shrink-0 ${getPriorityColor(task.priority)}`}>
                                    {task.priority}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// Needed because we are using standard animations now instead of framer motion hooks for stability
function Search(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
        </svg>
    );
}
