import { useNavigate } from 'react-router-dom';
import InternalSidebar from '@/components/layout/InternalSidebar';
import { ArrowLeft, Construction } from 'lucide-react';

export default function ComingSoonPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#0F172A] text-white">
            <InternalSidebar />

            <main className="ml-64 p-10 min-h-screen flex flex-col items-center justify-center text-center">
                <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-6 border border-white/5">
                    <Construction className="w-10 h-10 text-slate-500" />
                </div>

                <h1 className="text-3xl font-black mb-2 text-white">Module Not Yet Available</h1>

                <p className="text-slate-400 max-w-md mb-8">
                    This feature is currently under development and will be available in a future release.
                </p>

                <button
                    onClick={() => navigate('/internal/staff-management')}
                    className="flex items-center gap-2 text-indigo-400 font-bold hover:text-indigo-300 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Manage your team from Staff Management
                </button>
            </main>
        </div>
    );
}
