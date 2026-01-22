import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { FileText, Calendar, ArrowRight, Paperclip } from 'lucide-react';
import { format } from 'date-fns';
import { ClientCourtReportDetailsDialog } from './ClientCourtReportDetailsDialog';

interface ClientCourtReportsProps {
    matterId: string;
}

export default function ClientCourtReports({ matterId }: ClientCourtReportsProps) {
    const [selectedReport, setSelectedReport] = useState<any>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const { data: reports, isLoading } = useQuery({
        queryKey: ['client-court-reports', matterId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('court_reports')
                .select(`
                    *,
                    associate:profiles!court_reports_associate_id_fkey(first_name, last_name),
                    attachments:court_report_attachments(*)
                `)
                .eq('matter_id', matterId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        },
        enabled: !!matterId,
    });

    const handleViewReport = (report: any) => {
        setSelectedReport(report);
        setIsDialogOpen(true);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!reports || reports.length === 0) {
        return (
            <div className="text-center py-12 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-slate-100">
                    <FileText className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-2">
                    No Court Reports Yet
                </h3>
                <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto">
                    Your assigned lawyer will submit court reports here as your case progresses.
                </p>
            </div>
        );
    }

    return (
        <>
            <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-widest text-[10px]">Report</th>
                                <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-widest text-[10px]">Date</th>
                                <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-widest text-[10px] text-center">Docs</th>
                                <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-widest text-[10px] text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {reports.map((report, index) => (
                                <tr
                                    key={report.id}
                                    className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                                    onClick={() => handleViewReport(report)}
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                                <FileText className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 text-xs">
                                                    Court Report #{reports.length - index}
                                                </p>
                                                {report.close_case && (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-700 uppercase tracking-wide mt-1">
                                                        Final Report
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                            <span className="text-xs font-medium text-slate-500">
                                                {format(new Date(report.created_at), 'MMM dd, yyyy')}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {report.attachments?.length > 0 ? (
                                            <div className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-md">
                                                <Paperclip className="h-3 w-3 text-slate-500" />
                                                <span className="text-xs font-bold text-slate-600">
                                                    {report.attachments.length}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-slate-300">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleViewReport(report);
                                            }}
                                            className="text-primary hover:text-primary/80 font-bold text-xs inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            View <ArrowRight className="h-3.5 w-3.5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <ClientCourtReportDetailsDialog
                report={selectedReport}
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                reportNumber={selectedReport ? reports.length - reports.findIndex((r: any) => r.id === selectedReport.id) : 0}
            />
        </>
    );
}
