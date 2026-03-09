import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useInternalSession } from '@/hooks/useInternalSession';
import InternalSidebar from '@/components/layout/InternalSidebar';
import {
    format, addDays, startOfWeek, endOfWeek, eachDayOfInterval,
    startOfMonth, endOfMonth, isSameMonth, isSameDay, addMonths, subMonths,
    setHours, getHours, isWithinInterval
} from 'date-fns';
import {
    ChevronLeft, ChevronRight, Search, Plus,
    Check, X, Calendar as CalendarIcon,
    ChevronDown, User, CheckCircle2, Clock,
    Copy, ShieldCheck, Globe, AlertCircle, Video
} from 'lucide-react';
import { useToast } from '@/components/common/ToastService';

export default function InternalCalendar() {
    const { session } = useInternalSession();
    const { toast } = useToast();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode] = useState<'week' | 'month' | 'day'>('week');
    const [isTaskPanelOpen, setIsTaskPanelOpen] = useState(true);
    const [isGlobalView, setIsGlobalView] = useState(false);
    const [showSyncModal, setShowSyncModal] = useState(false);

    const [newTask, setNewTask] = useState('');

    const isAdmin = session?.role === 'admin_manager' || session?.role === 'admin';

    // Fetch Sync Connections
    const { data: connections } = useQuery({
        queryKey: ['calendar_connections', session?.user_id],
        enabled: !!session?.user_id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('user_calendar_connections')
                .select('*')
                .eq('user_id', session!.user_id);
            if (error) throw error;
            return data;
        }
    });

    const { data: profile } = useQuery({
        queryKey: ['my_profile_sync', session?.user_id],
        enabled: !!session?.user_id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('calendar_sync_token, preferences, primary_calendar_provider')
                .eq('id', session!.user_id)
                .single();
            if (error) throw error;
            return data;
        }
    });

    // Fetch Tasks from DB
    const { data: dbTasks, refetch: refetchTasks } = useQuery({
        queryKey: ['internal_tasks', session?.firm_id, session?.user_id, isGlobalView],
        enabled: !!session,
        queryFn: async () => {
            let query = supabase
                .from('matter_tasks')
                .select('*');

            if (!isGlobalView && session!.role !== 'admin_manager' && session!.role !== 'case_manager') {
                query = query.eq('assigned_to_id', session!.user_id);
            }

            const { data, error } = await query.order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        }
    });

    // Fetch Deadlines
    const { data: deadlines } = useQuery({
        queryKey: ['calendar_deadlines', session?.firm_id, session?.user_id, isGlobalView],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('matter_deadlines')
                .select(`
                    *,
                    matter:matters!inner(title, firm_id)
                `)
                .eq('matter.firm_id', session!.firm_id)
                .order('deadline_date', { ascending: true });

            if (error) throw error;
            return data || [];
        }
    });

    // Fetch Meetings
    const { data: meetings } = useQuery({
        queryKey: ['calendar_meetings', session?.firm_id, session?.user_id, isGlobalView],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('case_meetings')
                .select(`
                    *,
                    matter:matters!inner(title, firm_id),
                    client:external_users(first_name, last_name)
                `)
                .eq('matter.firm_id', session!.firm_id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (!isGlobalView && (session!.role === 'associate_lawyer')) {
                return data.filter((m: any) => m.lawyer_user_id === session!.user_id);
            }

            return data || [];
        }
    });

    // Calendar Navigation Helpers
    const nextPeriod = () => {
        if (viewMode === 'week') setCurrentDate(addDays(currentDate, 7));
        else if (viewMode === 'day') setCurrentDate(addDays(currentDate, 1));
        else setCurrentDate(addMonths(currentDate, 1));
    };

    const prevPeriod = () => {
        if (viewMode === 'week') setCurrentDate(addDays(currentDate, -7));
        else if (viewMode === 'day') setCurrentDate(addDays(currentDate, -1));
        else setCurrentDate(subMonths(currentDate, 1));
    };

    const resetToToday = () => setCurrentDate(new Date());

    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
    const weekDays = eachDayOfInterval({
        start: weekStart,
        end: endOfWeek(currentDate, { weekStartsOn: 0 })
    });

    const timeSlots = Array.from({ length: 24 }, (_, i) => i);

    const miniCalStart = startOfWeek(startOfMonth(currentDate));
    const miniCalEnd = endOfWeek(endOfMonth(currentDate));
    const miniCalDays = eachDayOfInterval({ start: miniCalStart, end: miniCalEnd });

    // Task Handlers
    const addTask = async (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && newTask.trim() && session) {
            const { error } = await supabase
                .from('matter_tasks')
                .insert({
                    assigned_to_id: session.user_id,
                    created_by: session.user_id,
                    title: newTask.trim(),
                    status: 'pending'
                });

            if (!error) {
                setNewTask('');
                refetchTasks();
            }
        }
    };

    const toggleTask = async (task: any) => {
        const newStatus = task.status === 'completed' ? 'pending' : 'completed';
        const { error } = await supabase
            .from('matter_tasks')
            .update({ status: newStatus })
            .eq('id', task.id);

        if (!error) {
            refetchTasks();
        }
    };

    return (
        <div className="flex h-screen bg-[#0F172A] text-white overflow-hidden font-sans">
            <InternalSidebar />

            <div className="flex-1 flex flex-col min-w-0 ml-64 transition-all duration-300">
                {/* Header Section */}
                <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-[#0F172A] relative z-20">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-500/10 rounded-lg">
                                <CalendarIcon className="w-5 h-5 text-indigo-400" />
                            </div>
                            <h1 className="text-xl font-bold tracking-tight text-white">
                                Calendar
                            </h1>
                        </div>

                        <div className="flex items-center gap-4 bg-white/5 p-1 rounded-lg border border-white/5">
                            <button onClick={resetToToday} className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider hover:bg-white/5 rounded-md transition-colors text-slate-300 hover:text-white">
                                Today
                            </button>
                            <div className="flex items-center gap-1">
                                <button onClick={prevPeriod} className="p-1 hover:bg-white/5 rounded-full text-slate-400 hover:text-white"><ChevronLeft size={18} /></button>
                                <button onClick={nextPeriod} className="p-1 hover:bg-white/5 rounded-full text-slate-400 hover:text-white"><ChevronRight size={18} /></button>
                            </div>
                        </div>

                        <h2 className="text-xl font-medium text-slate-200">
                            {format(currentDate, 'MMMM yyyy')}
                        </h2>

                        {(isAdmin || session?.role === 'case_manager') && (
                            <div className="flex items-center gap-2 ml-6 bg-white/5 p-1 rounded-xl border border-white/5">
                                <button
                                    onClick={() => setIsGlobalView(false)}
                                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${!isGlobalView ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    Personal
                                </button>
                                <button
                                    onClick={() => setIsGlobalView(true)}
                                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${isGlobalView ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    Firm-Wide
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setShowSyncModal(true)}
                            className="flex items-center gap-3 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                            <CalendarIcon size={14} />
                            {connections && connections.length > 0 ? 'Sync Active' : 'Connect Calendar'}
                        </button>
                        <div className="relative hidden md:block group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search schedule..."
                                className="bg-white/5 hover:bg-white/10 focus:bg-white/10 focus:ring-1 focus:ring-indigo-500/50 border border-transparent focus:border-indigo-500/50 rounded-xl py-2 pl-10 pr-4 text-sm w-64 transition-all outline-none"
                            />
                        </div>
                        <div className="h-4 w-px bg-white/10 mx-2" />
                        <div className="relative">
                            <button className="flex items-center gap-2 border border-white/10 bg-white/5 rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider hover:bg-white/10 text-slate-300">
                                {viewMode}
                                <ChevronDown size={14} />
                            </button>
                        </div>
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-full flex items-center justify-center text-sm font-bold shadow-lg shadow-indigo-500/20">
                            {session?.email?.charAt(0).toUpperCase()}
                        </div>
                    </div>
                </header>

                <div className="flex flex-1 overflow-hidden">
                    <aside className="w-64 flex-shrink-0 border-r border-white/5 flex flex-col bg-[#0F172A] overflow-y-auto hidden md:flex">
                        <div className="p-6">
                            <button className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 transition-all rounded-xl px-6 py-3 shadow-lg shadow-indigo-600/20 active:scale-95 group">
                                <Plus className="w-5 h-5 text-white" />
                                <span className="font-bold text-sm tracking-wide">Schedule Event</span>
                            </button>
                        </div>

                        <div className="px-6 py-2">
                            <div className="flex items-center justify-between mb-4 pl-1">
                                <span className="text-sm font-bold text-slate-200">{format(currentDate, 'MMMM yyyy')}</span>
                                <div className="flex gap-1">
                                    <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-1 hover:bg-white/5 rounded text-slate-400 hover:text-white"><ChevronLeft size={16} /></button>
                                    <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-1 hover:bg-white/5 rounded text-slate-400 hover:text-white"><ChevronRight size={16} /></button>
                                </div>
                            </div>
                            <div className="grid grid-cols-7 text-center mb-2">
                                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                                    <div key={`${d}-${i}`} className="text-[10px] text-slate-500 font-bold py-1">{d}</div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 text-center gap-y-1">
                                {miniCalDays.map((day, i) => (
                                    <div
                                        key={i}
                                        className={`
                                            h-7 w-7 text-xs flex items-center justify-center rounded-full cursor-pointer transition-all
                                            ${!isSameMonth(day, currentDate) ? 'text-slate-700' : 'text-slate-400 hover:text-white'}
                                            ${isSameDay(day, new Date()) ? 'bg-indigo-600 !text-white font-bold shadow-lg shadow-indigo-600/30' : 'hover:bg-white/10'}
                                            ${isSameDay(day, currentDate) && !isSameDay(day, new Date()) ? 'bg-white/10 text-white' : ''}
                                        `}
                                        onClick={() => setCurrentDate(day)}
                                    >
                                        {format(day, 'd')}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-8 px-6">
                            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest mb-4 text-slate-500">
                                <span>Calendars</span>
                                <ChevronDown size={14} />
                            </div>
                            <div className="space-y-3">
                                {[
                                    { label: session?.full_name || 'My Calendar', color: 'bg-indigo-500', checked: true },
                                    { label: 'Firm Events', color: 'bg-cyan-500', checked: true },
                                    { label: 'Court Dates', color: 'bg-rose-500', checked: true },
                                    { label: 'Deadlines', color: 'bg-yellow-500', checked: false }
                                ].map((cal, idx) => (
                                    <label key={idx} className="flex items-center gap-3 text-sm text-slate-400 hover:text-slate-200 hover:bg-white/5 p-2 -mx-2 rounded-lg cursor-pointer transition-colors">
                                        <div className={`relative flex items-center justify-center w-4 h-4 rounded border border-white/20 ${cal.checked ? cal.color : 'bg-transparent'}`}>
                                            {cal.checked && <Check size={10} className="text-white" />}
                                        </div>
                                        <span className="font-medium">{cal.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </aside>

                    <main className="flex-1 flex flex-col bg-[#0F172A] overflow-hidden relative">
                        <div className="flex border-b border-white/5 pr-4 ml-14">
                            {weekDays.map((day, i) => (
                                <div key={i} className="flex-1 py-4 text-center border-l border-white/5">
                                    <div className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isSameDay(day, new Date()) ? 'text-indigo-400' : 'text-slate-500'}`}>
                                        {format(day, 'EEE')}
                                    </div>
                                    <div className={`
                                       w-9 h-9 mx-auto flex items-center justify-center rounded-full text-xl font-medium transition-all
                                       ${isSameDay(day, new Date()) ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-300'}
                                   `}>
                                        {format(day, 'd')}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <div className="relative min-h-[1440px]">
                                {timeSlots.map((hour) => (
                                    <div key={hour} className="group flex h-[60px] relative">
                                        <div className="w-14 text-right pr-3 text-[10px] font-medium text-slate-500 -mt-2 transform -translate-y-1">
                                            {hour === 0 ? '' : format(setHours(new Date(), hour), 'ha')}
                                        </div>
                                        <div className="flex-1 border-t border-white/5 relative">
                                            <div className="absolute inset-0 flex">
                                                {weekDays.map((_, colIdx) => (
                                                    <div key={colIdx} className="flex-1 border-l border-white/5 h-full hover:bg-white/[0.02] transition-colors"></div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Meetings Overlay */}
                                {meetings?.map((m: any) => {
                                    const eventDate = new Date(m.confirmed_start || m.proposed_start);
                                    if (!isWithinInterval(eventDate, { start: weekStart, end: endOfWeek(weekStart) })) return null;
                                    const dayIndex = weekDays.findIndex(d => isSameDay(d, eventDate));
                                    if (dayIndex === -1) return null;
                                    const startHour = getHours(eventDate);
                                    const minutes = eventDate.getMinutes();
                                    const topOffset = (startHour * 60) + minutes;
                                    const height = 60;
                                    return (
                                        <div
                                            key={m.id}
                                            className="absolute p-2 rounded-lg text-xs font-semibold overflow-hidden hover:z-50 hover:scale-[1.02] hover:shadow-xl transition-all border-l-2 border-indigo-400 bg-indigo-500/20 backdrop-blur-sm text-indigo-100 ring-1 ring-inset ring-indigo-500/30 cursor-pointer"
                                            style={{
                                                top: `${topOffset}px`,
                                                left: `calc(56px + ${(dayIndex * (100 / 7))}%)`,
                                                width: `calc((100% - 56px) / 7 - 6px)`,
                                                height: `${height}px`,
                                                marginLeft: '3px'
                                            }}
                                        >
                                            <div className="flex items-center gap-1 mb-0.5">
                                                <Video size={10} className="text-indigo-400" />
                                                <span className="text-[10px] font-black uppercase tracking-wider">Meeting</span>
                                            </div>
                                            <div className="truncate font-bold">{m.matter?.title || 'Meeting'}</div>
                                            <div className="text-[10px] opacity-80 flex items-center gap-1">
                                                <Clock size={10} />
                                                {format(eventDate, 'h:mm a')}
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Deadlines Overlay */}
                                {deadlines?.map((d: any) => {
                                    const eventDate = new Date(d.deadline_date);
                                    if (!isWithinInterval(eventDate, { start: weekStart, end: endOfWeek(weekStart) })) return null;
                                    const dayIndex = weekDays.findIndex(day => isSameDay(day, eventDate));
                                    if (dayIndex === -1) return null;
                                    const startHour = getHours(eventDate);
                                    const minutes = eventDate.getMinutes();
                                    const topOffset = (startHour * 60) + minutes;
                                    const height = 50;
                                    const isCritical = d.priority === 'critical' || d.priority === 'emergency';
                                    return (
                                        <div
                                            key={d.id}
                                            className={`absolute p-2 rounded-lg text-xs font-semibold overflow-hidden hover:z-50 hover:scale-[1.02] hover:shadow-xl transition-all border-l-2 ${isCritical ? 'border-rose-500 bg-rose-500/20 text-rose-100 ring-rose-500/30' : 'border-amber-500 bg-amber-500/20 text-amber-100 ring-amber-500/30'} backdrop-blur-sm ring-1 ring-inset cursor-pointer`}
                                            style={{
                                                top: `${topOffset}px`,
                                                left: `calc(56px + ${(dayIndex * (100 / 7))}%)`,
                                                width: `calc((100% - 56px) / 7 - 6px)`,
                                                height: `${height}px`,
                                                marginLeft: '3px'
                                            }}
                                        >
                                            <div className="flex items-center gap-1 mb-0.5">
                                                <AlertCircle size={10} className={isCritical ? 'text-rose-400' : 'text-amber-400'} />
                                                <span className="text-[10px] font-black uppercase tracking-wider">{d.category}</span>
                                            </div>
                                            <div className="truncate font-bold">{d.title}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </main>

                    {isTaskPanelOpen && (
                        <aside className="w-80 bg-[#0F172A] border-l border-white/5 flex flex-col flex-shrink-0 shadow-2xl">
                            <div className="h-16 flex items-center justify-between px-6 border-b border-white/5">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                        <Check size={14} className="text-emerald-500" />
                                    </div>
                                    <span className="font-bold text-lg text-white">Tasks</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => setIsTaskPanelOpen(false)} className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors">
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 flex-1 overflow-y-auto">
                                <button className="flex items-center gap-3 text-slate-300 hover:text-white w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all mb-6 group">
                                    <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20 group-hover:scale-110 transition-transform">
                                        <Plus size={16} className="text-white" />
                                    </div>
                                    <span className="font-bold text-sm">Add New Task</span>
                                </button>

                                <div className="mb-6">
                                    <input
                                        type="text"
                                        value={newTask}
                                        onChange={(e) => setNewTask(e.target.value)}
                                        onKeyDown={addTask}
                                        placeholder="Type task and press Enter..."
                                        className="w-full bg-white/5 rounded-xl border border-white/5 hover:border-white/10 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder-slate-500"
                                    />
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Incoming</h3>
                                    {dbTasks?.map(task => (
                                        <div key={task.id} className="group flex items-start gap-4 p-3 hover:bg-white/5 rounded-xl cursor-pointer transition-colors" onClick={() => toggleTask(task)}>
                                            <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${task.status === 'completed' ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600 group-hover:border-slate-400'}`}>
                                                {task.status === 'completed' && <Check size={12} className="text-white" />}
                                            </div>
                                            <div className={task.status === 'completed' ? 'text-slate-500 line-through' : 'text-slate-200'}>
                                                <div className="text-sm font-bold">{task.title}</div>
                                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">
                                                    {task.due_date ? format(new Date(task.due_date), 'MMM d') : 'No due date'}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {(!dbTasks || dbTasks.length === 0) && (
                                        <div className="text-center py-10">
                                            <CheckCircle2 size={32} className="mx-auto text-slate-700 opacity-20 mb-3" />
                                            <p className="text-xs text-slate-500 font-medium">All caught up!</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </aside>
                    )}

                    <div className="w-14 border-l border-white/5 flex flex-col items-center py-4 bg-[#0F172A]">
                        <div className="space-y-4">
                            <div className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center cursor-pointer text-indigo-400 transition-colors tooltip" title="Tasks">
                                <CheckCircle2 size={18} />
                            </div>
                            <div className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center cursor-pointer text-cyan-400 transition-colors" title="Contacts">
                                <User size={18} />
                            </div>
                            <div className="w-8 h-px bg-white/10 my-2"></div>
                            <div className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center cursor-pointer text-white transition-colors">
                                <Plus size={18} />
                            </div>
                        </div>
                        <div className="mt-auto">
                            <button onClick={() => setIsTaskPanelOpen(!isTaskPanelOpen)} className="w-9 h-9 hover:bg-white/10 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                                <ChevronLeft size={16} className={`transition-transform duration-300 ${isTaskPanelOpen ? 'rotate-180' : ''}`} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {showSyncModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#1E293B] w-full max-w-lg rounded-3xl border border-white/10 shadow-2xl p-8 overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-6">
                            <button onClick={() => setShowSyncModal(false)} className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-indigo-600/20 rounded-2xl flex items-center justify-center border border-indigo-500/30">
                                <ShieldCheck className="w-6 h-6 text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">External Calendar Sync</h3>
                                <p className="text-xs text-slate-500 uppercase tracking-widest font-black mt-1">iCal Secure Channel</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-4">
                                <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
                                    <p className="text-sm text-slate-300 leading-relaxed italic">
                                        "Establish a persistent link between your professional CaseBridge dossier and external scheduling platforms."
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 gap-3">
                                    {['google', 'outlook'].map((provider) => {
                                        const conn = connections?.find(c => c.provider === provider);
                                        return (
                                            <div key={provider} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl hover:border-indigo-500/30 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${provider === 'google' ? 'bg-red-500/10' : 'bg-blue-500/10'}`}>
                                                        <Globe className={`w-5 h-5 ${provider === 'google' ? 'text-red-400' : 'text-blue-400'}`} />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-bold text-white capitalize">{provider} Workspace</h4>
                                                        <p className="text-[10px] text-slate-500 font-bold uppercase">{conn ? `Synced: ${conn.provider_email}` : 'Not Connected'}</p>
                                                    </div>
                                                </div>
                                                {conn ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest">Active</span>
                                                        <button className="p-2 text-slate-500 hover:text-red-400 transition-colors"><X size={14} /></button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => toast(`Redirecting to ${provider} OAuth...`, 'info')}
                                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all"
                                                    >
                                                        Connect
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="py-2">
                                    <div className="h-px bg-white/5 w-full my-4" />
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Universal iCal Token (Legacy Sync)</label>
                                    <div className="flex gap-2 mt-2">
                                        <input
                                            type="text"
                                            readOnly
                                            value={`https://api.casebridge.com/v1/sync/calendar/${profile?.calendar_sync_token || 'uuid'}.ics`}
                                            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-mono text-indigo-300 outline-none"
                                        />
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(`https://api.casebridge.com/v1/sync/calendar/${profile?.calendar_sync_token}.ics`);
                                                toast("iCal Token Copied!", 'success');
                                            }}
                                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 rounded-xl transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
                                        >
                                            <Copy size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-white/5 text-[10px] text-slate-500 italic text-center">
                            Note: Do not share this link. It provides read-only access to your session schedule.
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
