import { useEffect, useState, useRef } from 'react';
import ClientLayout from '../components/ClientLayout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { FileText, Clock, PlusCircle, ChevronRight } from 'lucide-react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

export default function MyCases() {
    const { user } = useAuth();
    const [cases, setCases] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCases = async () => {
            const { data } = await supabase
                .from('case_reports')
                .select('*')
                .eq('client_id', user?.id)
                .order('created_at', { ascending: false });

            if (data) setCases(data);
            setLoading(false);
        };

        if (user) fetchCases();
    }, [user]);

    const container = useRef<HTMLDivElement>(null);

    useGSAP(() => {
        if (!loading && cases.length > 0) {
            gsap.from('.case-item', {
                y: 20,
                opacity: 0,
                duration: 0.5,
                stagger: 0.1,
                ease: 'power2.out'
            });
        }
    }, { scope: container, dependencies: [loading, cases] });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'submitted': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
            case 'under_review': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
            case 'accepted': return 'text-green-400 bg-green-400/10 border-green-400/20';
            case 'rejected': return 'text-red-400 bg-red-400/10 border-red-400/20';
            default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
        }
    };

    const getStatusLabel = (status: string) => {
        return status.replace('_', ' ').toUpperCase();
    };

    return (
        <ClientLayout>
            <div className="flex items-end justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400">My Cases</h1>
                    <p className="text-muted-foreground mt-1">Track the status of your reported cases.</p>
                </div>
                <Link to="/cases/new" className="btn btn-primary w-fit flex items-center gap-2">
                    <PlusCircle size={18} />
                    Report New Case
                </Link>
            </div>

            {loading ? (
                <div className="glass-card flex justify-center py-20">
                    <span className="animate-spin h-8 w-8 border-2 border-blue-500 rounded-full border-t-transparent"></span>
                </div>
            ) : cases.length === 0 ? (
                <div className="glass-card flex flex-col items-center justify-center py-20 border-dashed border-white/10">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                        <FileText size={32} className="text-muted-foreground/50" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">No Cases Reported Yet</h3>
                    <p className="text-muted-foreground text-center max-w-sm mb-6">
                        You haven't submitted any cases. Start by reporting a new case securely.
                    </p>
                    <Link to="/cases/new" className="btn btn-secondary w-fit">
                        Report a Case
                    </Link>
                </div>
            ) : (
                <div ref={container} className="space-y-4">
                    {cases.map((c) => (
                        <Link key={c.id} to={`/cases/${c.id}`} className="case-item block glass-card hover:border-blue-500/30 transition-all p-6 group">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                        <FileText size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg mb-1 group-hover:text-blue-300 transition-colors">{c.title}</h3>
                                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                            <span>{c.category}</span>
                                            <span>•</span>
                                            <span className="flex items-center gap-1">
                                                <Clock size={12} />
                                                {new Date(c.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className={`px-3 py-1 rounded-full border text-xs font-bold tracking-wider ${getStatusColor(c.status)}`}>
                                        {getStatusLabel(c.status)}
                                    </div>
                                    <ChevronRight className="text-muted-foreground/30 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" size={20} />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </ClientLayout>
    );
}
