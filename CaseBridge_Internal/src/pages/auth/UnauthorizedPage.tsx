import { ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export default function UnauthorizedPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0F172A] p-6">
            <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-[2.5rem] p-10 text-center relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(239,68,68,0.1),transparent_50%)]" />

                <div className="relative">
                    <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-6" />
                    <h1 className="text-2xl font-black text-white mb-2 uppercase italic tracking-tighter">Access Denied</h1>
                    <p className="text-slate-400 mb-8 font-medium">
                        You do not have sufficient permissions to access this resource. This event has been logged.
                    </p>
                    <div className="space-y-3">
                        <button
                            onClick={() => navigate('/internal/dashboard')}
                            className="w-full h-14 bg-white text-slate-900 font-black uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-colors"
                        >
                            Return to Dashboard
                        </button>
                        <button
                            onClick={() => supabase.auth.signOut().then(() => navigate('/internal/login'))}
                            className="w-full h-14 bg-white/5 border border-white/10 text-slate-400 font-black uppercase tracking-widest rounded-2xl hover:bg-white/10 transition-colors"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
