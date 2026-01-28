import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { useInternalSession } from '@/hooks/useInternalSession';
import { FileText, ChevronRight } from 'lucide-react';
import InternalSidebar from '../../../components/layout/InternalSidebar';

export default function IntakeDashboard() {
    const { session } = useInternalSession();
    const navigate = useNavigate();
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('submitted');

    const isAdminOrCM = session?.role === 'admin_manager' || session?.role === 'case_manager';

    useEffect(() => {
        if (session && !isAdminOrCM) {
            navigate('/auth/unauthorized');
            return;
        }
        fetchReports();
    }, [filterStatus, session]);

    const fetchReports = async () => {
        if (!session?.firm_id) return;
        setLoading(true);

        const { data, error } = await supabase
            .from('case_reports')
            .select(`
                *,
                client:client_id (
                    first_name,
                    last_name,
                    email
                )
            `)
            .or(`preferred_firm_id.eq.${session.firm_id},preferred_firm_id.is.null`)
            .eq('status', filterStatus)
            .order('created_at', { ascending: false });

        if (error) console.error('Error fetching reports:', error);
        else setReports(data || []);

        setLoading(false);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'submitted': return 'bg-blue-100 text-blue-800';
            case 'under_review': return 'bg-yellow-100 text-yellow-800';
            case 'accepted': return 'bg-green-100 text-green-800';
            case 'rejected': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="min-h-screen bg-[#0F172A] text-white">
            <InternalSidebar />

            <main className="ml-64 p-10 min-h-screen max-w-5xl">

                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Intake Dashboard</h1>
                        <p className="text-gray-400">Review and triage incoming case reports.</p>
                    </div>
                    <div className="flex gap-2">
                        <select
                            className="border border-white/10 rounded-md px-3 py-2 bg-[#1E293B] text-white"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="submitted">Submitted</option>
                            <option value="under_review">Under Review</option>
                            <option value="accepted">Accepted</option>
                            <option value="rejected">Rejected</option>
                        </select>
                    </div>
                </div>

                <div className="bg-[#1E293B] border border-white/10 rounded-lg shadow overflow-hidden">
                    {loading ? (
                        <div className="p-12 text-center text-gray-400">Loading...</div>
                    ) : reports.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <FileText className="mx-auto h-12 w-12 text-gray-600 mb-3" />
                            No case reports found with status "{filterStatus}".
                        </div>
                    ) : (
                        <table className="min-w-full divide-y divide-white/10">
                            <thead className="bg-white/5">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Client</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Title / Category</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {reports.map((r) => (
                                    <tr key={r.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                            {new Date(r.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-white">
                                                {r.client?.first_name} {r.client?.last_name}
                                            </div>
                                            <div className="text-sm text-gray-500">{r.client?.email}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-white">{r.title}</div>
                                            <div className="text-sm text-gray-500">{r.category}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(r.status)}`}>
                                                {r.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <Link to={`/intake/${r.id}`} className="text-blue-400 hover:text-blue-300 flex items-center justify-end gap-1">
                                                Review <ChevronRight size={16} />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </main>
        </div>
    );
}
