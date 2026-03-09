import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    CheckCircle2,
    Loader2,
    ChevronRight,
    Lock,
    Square,
    CheckSquare
} from 'lucide-react';

interface Stage {
    id: string;
    name: string;
    description: string;
    order: number;
    is_gate_active: boolean;
}

interface ChecklistItem {
    id: string;
    item_description: string;
    is_required: boolean;
}

interface Progress {
    checklist_item_id: string;
    is_completed: boolean;
}

interface MatterStageTrackerProps {
    matterId: string;
    currentStageId: string | null;
    pipelineId: string | null;
    isCaseManager: boolean;
}

export default function MatterStageTracker({ matterId, currentStageId, pipelineId, isCaseManager }: MatterStageTrackerProps) {
    const queryClient = useQueryClient();
    const [isUpdating, setIsUpdating] = useState(false);

    // 1. Fetch Stages
    const { data: stages, isLoading } = useQuery<Stage[]>({
        queryKey: ['matter_stages', pipelineId],
        enabled: !!pipelineId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('pipeline_stages')
                .select('*')
                .eq('pipeline_id', pipelineId)
                .order('order', { ascending: true });
            if (error) throw error;
            return data;
        }
    });

    // 2. Fetch Checklist for Current Stage
    const { data: checklist } = useQuery<ChecklistItem[]>({
        queryKey: ['stage_checklist', currentStageId],
        enabled: !!currentStageId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('stage_checklists')
                .select('*')
                .eq('stage_id', currentStageId);
            if (error) throw error;
            return data;
        }
    });

    // 3. Fetch Matter Progress on Checklist
    const { data: progressData } = useQuery<Progress[]>({
        queryKey: ['matter_progress', matterId],
        enabled: !!matterId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('matter_stage_progress')
                .select('checklist_item_id, is_completed')
                .eq('matter_id', matterId);
            if (error) throw error;
            return data;
        }
    });

    const toggleItem = useMutation({
        mutationFn: async ({ itemId, completed }: { itemId: string, completed: boolean }) => {
            const { error } = await supabase
                .from('matter_stage_progress')
                .upsert({
                    matter_id: matterId,
                    checklist_item_id: itemId,
                    is_completed: !completed,
                    completed_at: !completed ? new Date().toISOString() : null
                }, { onConflict: 'matter_id,checklist_item_id' });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['matter_progress', matterId] });
        }
    });

    const transitionMutation = useMutation({
        mutationFn: async (newStageId: string) => {
            setIsUpdating(true);
            try {
                const { error } = await supabase
                    .from('matters')
                    .update({ current_pipeline_stage_id: newStageId })
                    .eq('id', matterId);
                if (error) throw error;
            } finally {
                setIsUpdating(false);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['matter', matterId] });
        }
    });

    if (isLoading || !stages) return <div className="h-20 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>;

    const currentIndex = stages.findIndex(s => s.id === currentStageId);
    const safeCurrentIndex = currentIndex === -1 ? 0 : currentIndex;
    const currentStage = stages[safeCurrentIndex];

    // Check if Gate is open
    const requiredItems = checklist?.filter(c => c.is_required) || [];
    const completedRequired = requiredItems.length === 0 || requiredItems.every(r =>
        progressData?.find(p => p.checklist_item_id === r.id)?.is_completed
    );
    const isGateOpen = !currentStage?.is_gate_active || completedRequired;

    return (
        <div className="bg-[#1E293B] border border-white/10 rounded-2xl p-8 mb-8 relative overflow-hidden">
            <div className="flex flex-col lg:flex-row gap-10">
                {/* Pipeline Progress */}
                <div className="lg:w-1/3">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 border-b border-white/5 pb-2">Pipeline Progress</h3>
                    <div className="space-y-4">
                        {stages.map((stage, idx) => (
                            <div key={stage.id} className="flex items-center gap-4 group">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black border transition-all ${idx < safeCurrentIndex ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                                        idx === safeCurrentIndex ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/30' :
                                            'bg-slate-800 border-white/5 text-slate-500'
                                    }`}>
                                    {idx < safeCurrentIndex ? <CheckCircle2 size={14} /> : idx + 1}
                                </div>
                                <div className="flex-1">
                                    <p className={`text-xs font-bold uppercase tracking-tight ${idx === safeCurrentIndex ? 'text-white' : 'text-slate-500'}`}>{stage.name}</p>
                                    {idx === safeCurrentIndex && <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mt-0.5">Active Stage</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Gate Checklist */}
                <div className="flex-1 bg-black/20 rounded-2xl p-6 border border-white/5">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-sm font-bold text-white mb-1">Stage {safeCurrentIndex + 1}: {currentStage?.name}</h3>
                            <p className="text-xs text-slate-500">Complete required tasks to advance to the next phase.</p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border flex items-center gap-2 ${isGateOpen ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                            {isGateOpen ? <CheckCircle2 size={12} /> : <Lock size={12} />}
                            {isGateOpen ? 'Gate Open' : 'Gate Locked'}
                        </div>
                    </div>

                    <div className="space-y-3 mb-8">
                        {checklist?.length === 0 ? (
                            <div className="text-center py-6 bg-white/5 rounded-xl border border-white/5 border-dashed">
                                <p className="text-xs text-slate-600 italic">No checklist items defined for this stage.</p>
                            </div>
                        ) : (
                            checklist?.map(item => {
                                const isCompleted = progressData?.find(p => p.checklist_item_id === item.id)?.is_completed;
                                return (
                                    <button
                                        key={item.id}
                                        disabled={!isCaseManager}
                                        onClick={() => toggleItem.mutate({ itemId: item.id, completed: !!isCompleted })}
                                        className="w-full flex items-center gap-4 p-4 bg-white/5 border border-white/5 rounded-xl hover:border-indigo-500/30 transition-all text-left group"
                                    >
                                        {isCompleted ? <CheckSquare className="text-indigo-400" size={18} /> : <Square className="text-slate-600 group-hover:text-indigo-400" size={18} />}
                                        <div className="flex-1">
                                            <p className={`text-xs font-bold ${isCompleted ? 'text-slate-500 italic' : 'text-slate-200'}`}>{item.item_description}</p>
                                        </div>
                                        {item.is_required && <span className="text-[8px] font-black text-amber-500 uppercase tracking-tighter bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10 whitespace-nowrap">Required</span>}
                                    </button>
                                );
                            })
                        )}
                    </div>

                    <div className="flex justify-end pt-6 border-t border-white/5">
                        {safeCurrentIndex < stages.length - 1 && (
                            <button
                                disabled={!isGateOpen || !isCaseManager || isUpdating}
                                onClick={() => transitionMutation.mutate(stages[safeCurrentIndex + 1].id)}
                                className="flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all shadow-xl shadow-indigo-600/20"
                            >
                                {isUpdating ? <Loader2 className="animate-spin" size={14} /> : <ChevronRight size={14} />}
                                Advance Phase
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
