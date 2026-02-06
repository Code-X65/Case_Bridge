import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    CheckCircle2,
    Circle,
    Gavel,
    Search,
    UserCheck,
    ClipboardList,
    Scale,
    FilePlus,
    Edit3,
    Users,
    Handshake,
    Award,
    Loader2,
    ChevronRight,
    ArrowRight
} from 'lucide-react';

interface Stage {
    id: string;
    name: string;
    description: string;
    order_index: number;
    color_code: string;
    icon_name: string;
}

interface MatterStageTrackerProps {
    matterId: string;
    currentStageId: string | null;
    pipelineId: string | null;
    isCaseManager: boolean;
}

const IconMap: Record<string, any> = {
    UserCheck,
    Search,
    Gavel,
    ClipboardList,
    Scale,
    FilePlus,
    Edit3,
    Users,
    Handshake,
    Award
};

export default function MatterStageTracker({ matterId, currentStageId, pipelineId, isCaseManager }: MatterStageTrackerProps) {
    const queryClient = useQueryClient();
    const [isUpdating, setIsUpdating] = useState(false);

    // Fetch pipeline stages
    const { data: stages, isLoading } = useQuery<Stage[]>({
        queryKey: ['matter_stages', pipelineId],
        enabled: !!pipelineId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('case_stages')
                .select('*')
                .eq('pipeline_id', pipelineId)
                .order('order_index', { ascending: true });

            if (error) throw error;
            return data;
        }
    });

    // Mutation to transition stage
    const transitionMutation = useMutation({
        mutationFn: async (newStageId: string) => {
            setIsUpdating(true);
            try {
                const { error: matterError } = await supabase
                    .from('matters')
                    .update({ current_stage_id: newStageId })
                    .eq('id', matterId);

                if (matterError) throw matterError;

                const { error: historyError } = await supabase
                    .from('matter_stage_history')
                    .insert({
                        matter_id: matterId,
                        stage_id: newStageId,
                        notes: 'Manual stage transition'
                    });

                if (historyError) throw historyError;
            } finally {
                setIsUpdating(false);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['matter', matterId] });
            queryClient.invalidateQueries({ queryKey: ['matter_stage_history', matterId] });
        }
    });

    if (isLoading || !stages) return (
        <div className="h-4 p-4 flex items-center justify-center opacity-50">
            <Loader2 className="animate-spin text-white" size={16} />
        </div>
    );

    const currentIndex = stages.findIndex(s => s.id === currentStageId);
    const safeCurrentIndex = currentIndex === -1 ? 0 : currentIndex;
    const progress = ((safeCurrentIndex + 1) / stages.length) * 100;

    return (
        <div className="bg-[#1E293B]/50 backdrop-blur-xl border border-white/5 rounded-3xl p-8 mb-8 relative overflow-hidden group">
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-indigo-500/20 transition-all duration-1000" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 relative z-10">
                <div>
                    <h3 className="text-xs font-black text-indigo-400 uppercase tracking-[0.3em] mb-1">Matter Progress</h3>
                    <p className="text-2xl font-black text-white italic lowercase tracking-tight">Case Lifecycle Journey</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Current Milestone</p>
                        <p className="text-sm font-bold text-white uppercase tracking-tighter">
                            {stages[safeCurrentIndex]?.name || 'Not Started'}
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 border border-indigo-500/30">
                        <Scale size={24} />
                    </div>
                </div>
            </div>

            <div className="relative mb-12 px-4">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-white/5 -translate-y-1/2 rounded-full" />
                <div
                    style={{ width: `${progress}%` }}
                    className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-emerald-500 via-indigo-500 to-indigo-400 -translate-y-1/2 rounded-full shadow-[0_0_20px_rgba(99,102,241,0.5)] transition-all duration-1000 ease-out"
                />

                <div className="flex justify-between items-center relative z-10">
                    {stages.map((stage, idx) => {
                        const isCompleted = idx < safeCurrentIndex;
                        const isActive = idx === safeCurrentIndex;
                        const Icon = IconMap[stage.icon_name] || FilePlus;

                        return (
                            <div key={stage.id} className="relative flex flex-col items-center">
                                <button
                                    disabled={!isCaseManager || isUpdating}
                                    onClick={() => transitionMutation.mutate(stage.id)}
                                    className={`
                                        w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 border-2 relative
                                        ${isCompleted ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]' :
                                            isActive ? 'bg-indigo-600 border-indigo-400 text-white shadow-[0_0_25px_rgba(99,102,241,0.5)] scale-110' :
                                                'bg-slate-800 border-white/5 text-slate-500 hover:border-white/20 hover:bg-slate-700'}
                                        ${isCaseManager ? 'hover:-translate-y-1 active:scale-95' : 'cursor-default'}
                                    `}
                                >
                                    {isCompleted ? <CheckCircle2 size={24} /> : <Icon size={24} />}
                                    {isActive && <div className="absolute inset-0 rounded-2xl animate-pulse bg-indigo-400/20" />}
                                </button>

                                <div className="absolute top-16 whitespace-nowrap text-center">
                                    <p className={`text-[9px] font-black uppercase tracking-tighter mb-0.5 ${isActive ? 'text-indigo-400' : isCompleted ? 'text-emerald-500' : 'text-slate-600'}`}>
                                        Stage {idx + 1}
                                    </p>
                                    <p className={`text-[10px] font-bold uppercase tracking-widest ${isActive ? 'text-white' : 'text-slate-500'}`}>
                                        {stage.name}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 transition-all">
                <div className="flex-1">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Operational Guidelines</p>
                    <p className="text-sm text-slate-400 leading-relaxed max-w-2xl italic font-medium">
                        {stages[safeCurrentIndex]?.description || 'No stage instructions available for this phase.'}
                    </p>
                </div>

                {isCaseManager && safeCurrentIndex < stages.length - 1 && (
                    <button
                        onClick={() => transitionMutation.mutate(stages[safeCurrentIndex + 1].id)}
                        disabled={isUpdating}
                        className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl shadow-xl shadow-indigo-600/20 uppercase tracking-widest text-[10px] transition-all flex items-center gap-3 active:scale-95 disabled:opacity-50 group"
                    >
                        {isUpdating ? <Loader2 className="animate-spin" size={16} /> : <ChevronRight size={16} />}
                        {isUpdating ? 'Transitioning...' : 'Next Stage'}
                        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                )}
            </div>
        </div>
    );
}

