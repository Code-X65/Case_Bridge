import { supabase } from '../../lib/supabase';
import { useQuery } from '@tanstack/react-query';
import {
    CheckCircle2,
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
    Shield
} from 'lucide-react';

interface Stage {
    id: string;
    name: string;
    description: string;
    order_index: number;
    color_code: string;
    icon_name: string;
}

interface ClientStageTrackerProps {
    matterId: string;
    currentStageId: string | null;
    pipelineId: string | null;
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

export default function ClientStageTracker({ currentStageId, pipelineId }: ClientStageTrackerProps) {

    // Fetch pipeline stages
    const { data: stages, isLoading } = useQuery<Stage[]>({
        queryKey: ['client_matter_stages', pipelineId],
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

    if (isLoading || !stages || !pipelineId) return (
        <div className="h-2 p-4 flex items-center justify-center opacity-30">
            <Loader2 className="animate-spin text-blue-500" size={12} />
        </div>
    );

    const currentIndex = stages.findIndex(s => s.id === currentStageId);
    const safeCurrentIndex = currentIndex === -1 ? 0 : currentIndex;
    const progress = ((safeCurrentIndex + 1) / stages.length) * 100;

    return (
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8 sm:p-12 mb-10 relative overflow-hidden group">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16 relative z-10">
                <div>
                    <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-3">Live Case Journey</h3>
                    <p className="text-3xl font-black text-white italic uppercase tracking-tighter leading-none">Your Path to Justice</p>
                </div>

                <div className="flex items-center gap-6 bg-white/5 p-4 rounded-3xl border border-white/5 shadow-2xl">
                    <div className="text-right">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Current Milestone</p>
                        <p className="text-lg font-black text-white italic uppercase tracking-tighter">
                            {stages[safeCurrentIndex]?.name || 'Initializing...'}
                        </p>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
                        <Shield size={28} />
                    </div>
                </div>
            </div>

            <div className="relative mb-16 px-4">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-white/5 -translate-y-1/2 rounded-full" />

                <div
                    style={{ width: `${progress}%` }}
                    className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-400 -translate-y-1/2 rounded-full shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all duration-1000 ease-out"
                />

                <div className="flex justify-between items-center relative z-10">
                    {stages.map((stage, idx) => {
                        const isCompleted = idx < safeCurrentIndex;
                        const isActive = idx === safeCurrentIndex;
                        const Icon = IconMap[stage.icon_name] || FilePlus;

                        return (
                            <div key={stage.id} className="relative flex flex-col items-center">
                                <div className={`
                                    w-10 h-10 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center transition-all duration-700 border relative
                                    ${isCompleted ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                                        isActive ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_30px_rgba(59,130,246,0.5)] scale-110' :
                                            'bg-[#0F172A] border-white/5 text-slate-700'}
                                `}>
                                    {isCompleted ? <CheckCircle2 size={24} /> : <Icon size={24} />}
                                    {isActive && (
                                        <div className="absolute inset-0 rounded-2xl animate-pulse bg-blue-400/20" />
                                    )}
                                </div>

                                <div className="absolute top-12 sm:top-20 whitespace-nowrap text-center">
                                    <p className={`text-[8px] sm:text-[9px] font-black uppercase tracking-widest ${isActive ? 'text-blue-400' : 'text-slate-600'}`}>
                                        {isActive ? 'Current Phase' : isCompleted ? 'Completed' : `Upcoming`}
                                    </p>
                                    <p className={`text-[9px] sm:text-[11px] font-bold uppercase tracking-[0.15em] mt-1 ${isActive ? 'text-white' : 'text-slate-500'}`}>
                                        {stage.name}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="mt-20 pt-10 border-t border-white/5 transition-all">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                        <Loader2 size={16} className="animate-spin" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Legal Team Status Update</p>
                        <p className="text-sm text-slate-400 leading-relaxed font-medium italic">
                            {stages[safeCurrentIndex]?.description || 'Your legal team is actively working on internal triage. Stay tuned for updates.'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

