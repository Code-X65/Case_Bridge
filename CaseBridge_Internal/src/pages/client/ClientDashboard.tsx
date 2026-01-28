
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation } from '@tanstack/react-query';
import { LogOut, FileText, Upload, Bell, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ClientDashboard() {
    const navigate = useNavigate();
    const [uploading, setUploading] = useState(false);

    // Get Session (Direct Supabase as hook is for internal)
    const [session, setSession] = useState<any>(null);

    // Initial session check
    useState(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) navigate('/internal/login'); // Or client login
            setSession(session);
        });
    });

    // Fetch Client Profile
    const { data: profile } = useQuery({
        queryKey: ['client_profile', session?.user?.id],
        enabled: !!session?.user?.id,
        queryFn: async () => {
            const { data } = await supabase.from('client_profiles').select('*').eq('id', session.user.id).single();
            return data;
        }
    });

    // Fetch My Matters
    const { data: matters } = useQuery({
        queryKey: ['client_matters', session?.user?.id],
        enabled: !!session?.user?.id,
        queryFn: async () => {
            const { data } = await supabase
                .from('matters')
                .select('*')
                .eq('client_reference_id', session.user.id)
                .order('updated_at', { ascending: false });
            return data || [];
        }
    });

    // Fetch Notifications
    const { data: notifications } = useQuery({
        queryKey: ['client_notifications', session?.user?.id],
        enabled: !!session?.user?.id,
        queryFn: async () => {
            const { data } = await supabase
                .from('client_notifications')
                .select('*')
                .eq('client_id', session.user.id)
                .eq('read', false);
            return data || [];
        }
    });

    // Upload Document Mutation
    const uploadMutation = useMutation({
        mutationFn: async (file: File) => {
            // 1. Upload to Storage (Skipping for V1 demo, strict DB record)
            // 2. Insert into client_documents
            // For V1 we just insert the record
            if (!profile?.firm_id) throw new Error('No firm linked');

            const { error } = await supabase.from('client_documents').insert({
                firm_id: profile.firm_id,
                client_id: session.user.id,
                file_name: file.name,
                file_url: 'https://placeholder.url', // Placeholder
                file_size: file.size
            });

            if (error) throw error;
        },
        onSuccess: () => {
            alert('Document uploaded successfully');
            setUploading(false);
        }
    });

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/internal/login');
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
            {/* Top Bar */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">
                            CB
                        </div>
                        <span className="font-bold text-slate-900 tracking-tight">CaseBridge Client</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Bell className="w-5 h-5 text-slate-500" />
                            {notifications && notifications.length > 0 && (
                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white"></span>
                            )}
                        </div>
                        <div className="h-6 w-px bg-slate-200"></div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-600">{profile?.full_name || session?.user?.email}</span>
                            <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition-colors">
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-10">

                {/* Welcome & Stats */}
                <div className="mb-10">
                    <h1 className="text-3xl font-black text-slate-900 mb-2">My Portal</h1>
                    <p className="text-slate-500">Manage your active legal matters and documents securely.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                        <div className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-1">Active Matters</div>
                        <div className="text-3xl font-black text-indigo-600">{matters?.length || 0}</div>
                    </div>
                    <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                        <div className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-1">Pending Actions</div>
                        <div className="text-3xl font-black text-yellow-500">{notifications?.length || 0}</div>
                    </div>
                    <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex items-center justify-center cursor-pointer hover:border-indigo-500 transition-colors group" onClick={() => setUploading(true)}>
                        <div className="text-center">
                            <Upload className="w-8 h-8 mx-auto mb-2 text-indigo-500 group-hover:scale-110 transition-transform" />
                            <div className="font-bold text-indigo-600">Upload Document</div>
                        </div>
                    </div>
                </div>

                {/* Active Matters */}
                <SectionHeader title="Active Matters" />
                <div className="space-y-4 mb-12">
                    {matters?.length === 0 ? (
                        <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 border-dashed">
                            <p className="text-slate-400">No active matters found.</p>
                        </div>
                    ) : (
                        matters?.map((matter: any) => (
                            <div key={matter.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900 mb-1">{matter.title}</h3>
                                        <p className="text-sm text-slate-500">{matter.description || 'No description provided.'}</p>
                                    </div>
                                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase">
                                        {matter.status}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
                                    <button className="text-sm font-bold text-indigo-600 hover:underline flex items-center gap-1">
                                        <FileText className="w-4 h-4" /> View Details
                                    </button>
                                    <button className="text-sm font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1">
                                        <Download className="w-4 h-4" /> Download Files
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Notifications */}
                <SectionHeader title="Recent Notifications" />
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-12">
                    {notifications?.length === 0 ? (
                        <div className="p-8 text-center">
                            <p className="text-slate-400">You are all caught up.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {notifications?.map((notif: any) => (
                                <div key={notif.id} className="p-4 flex gap-4 hover:bg-slate-50">
                                    <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2"></div>
                                    <div>
                                        <p className="font-medium text-slate-900">{notif.message}</p>
                                        <p className="text-xs text-slate-400">{new Date(notif.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Upload Modal (Simplified) */}
            {uploading && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
                        <h3 className="text-xl font-bold mb-4 text-slate-900">Upload Secure Document</h3>
                        <div className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center mb-6 hover:bg-slate-50 hover:border-indigo-400 transition-colors cursor-pointer">
                            <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                            <p className="text-slate-500 font-medium">Click to select files</p>
                            <p className="text-xs text-slate-400 mt-1">PDF, DOCX, JPG up to 10MB</p>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setUploading(false)} className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
                            <button onClick={() => uploadMutation.mutate({ name: 'Simulated File', size: 1024 } as File)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg">Upload</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function SectionHeader({ title }: { title: string }) {
    return (
        <div className="flex items-center gap-4 mb-6">
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            <div className="h-px bg-slate-200 flex-1"></div>
        </div>
    );
}
