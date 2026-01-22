import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { FileText, Calendar, Paperclip, Download, X, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

interface CourtReportsListProps {
    matterId: string;
}

const ITEMS_PER_PAGE = 3;

export default function CourtReportsList({ matterId }: CourtReportsListProps) {
    const [selectedReport, setSelectedReport] = useState<any>(null);
    const [currentPage, setCurrentPage] = useState(1);

    const { data: reports, isLoading } = useQuery({
        queryKey: ['court-reports', matterId],
        queryFn: async () => {
            // Fetch reports
            const { data: reportData, error: reportError } = await supabase
                .from('court_reports')
                .select(`
                    *,
                    author:profiles!court_reports_associate_id_fkey(first_name, last_name, internal_role)
                `)
                .eq('matter_id', matterId)
                .order('created_at', { ascending: false });

            if (reportError) throw reportError;

            // Fetch attachments for all these reports
            const reportIds = reportData.map(r => r.id);
            if (reportIds.length === 0) return [];

            const { data: attachmentsData, error: attachError } = await supabase
                .from('court_report_attachments')
                .select('*')
                .in('court_report_id', reportIds);

            if (attachError) throw attachError;

            // Group attachments by report
            return reportData.map(report => ({
                ...report,
                attachments: attachmentsData.filter(a => a.court_report_id === report.id) || []
            }));
        },
        enabled: !!matterId
    });

    const handleDownload = async (path: string, fileName: string) => {
        try {
            const { data, error } = await supabase.storage
                .from('court-reports')
                .download(path);

            if (error) throw error;

            const url = URL.createObjectURL(data);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Download error:', error);
        }
    };

    if (isLoading) {
        return (
            <div className="text-center py-8">
                <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-medium">Loading reports...</p>
            </div>
        );
    }

    if (!reports || reports.length === 0) {
        return (
            <div className="text-center py-12 bg-slate-50 rounded-md border border-dashed border-slate-200">
                <div className="w-12 h-12 bg-white rounded-md flex items-center justify-center mx-auto mb-4 border border-slate-100">
                    <FileText className="h-6 w-6 text-slate-300" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-1">
                    No Reports Filed
                </h3>
                <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto">
                    Court reports submitted by the assigned associate lawyer will appear here.
                </p>
            </div>
        );
    }

    // Pagination Logic
    const totalPages = Math.ceil(reports.length / ITEMS_PER_PAGE);
    const paginatedReports = reports.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const handleNextPage = () => {
        if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
    };

    const handlePrevPage = () => {
        if (currentPage > 1) setCurrentPage(prev => prev - 1);
    };

    return (
        <>
            <div className="space-y-4">
                <div className="space-y-3">
                    {paginatedReports.map((report) => (
                        <div
                            key={report.id}
                            onClick={() => setSelectedReport(report)}
                            className="group bg-white rounded-md border border-slate-200 p-4 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-slate-50 group-hover:bg-primary/5 rounded-md flex items-center justify-center transition-colors">
                                        <FileText className="h-5 w-5 text-slate-400 group-hover:text-primary transition-colors" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors mb-0.5">
                                            Court Report
                                        </h3>
                                        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                                            <span>
                                                {report.author?.first_name} {report.author?.last_name}
                                            </span>
                                            <span className="text-slate-300">•</span>
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {format(new Date(report.created_at), 'MMM dd, yyyy')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {report.attachments && report.attachments.length > 0 && (
                                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-400 bg-slate-50 px-2 py-1 rounded-md">
                                            <Paperclip className="h-3 w-3" />
                                            {report.attachments.length}
                                        </span>
                                    )}
                                    <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-primary transition-colors" />
                                </div>
                            </div>
                            <p className="mt-3 text-sm text-slate-600 line-clamp-2 pl-[52px]">
                                {report.report_content}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-2">
                        <p className="text-xs text-slate-500 font-medium">
                            Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, reports.length)} of {reports.length} reports
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handlePrevPage}
                                disabled={currentPage === 1}
                                className="p-2 border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="h-4 w-4 text-slate-600" />
                            </button>
                            <span className="text-xs font-bold text-slate-700">
                                {currentPage} / {totalPages}
                            </span>
                            <button
                                onClick={handleNextPage}
                                disabled={currentPage === totalPages}
                                className="p-2 border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight className="h-4 w-4 text-slate-600" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Report Details Modal */}
            {selectedReport && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-2xl rounded-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white border border-slate-100 rounded-md flex items-center justify-center shadow-sm">
                                    <FileText className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                                        Report Details
                                    </h2>
                                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                                        Submitted on {format(new Date(selectedReport.created_at), 'MMMM dd, yyyy • h:mm a')}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedReport(null)}
                                className="w-8 h-8 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {/* Author Info */}
                            <div className="flex items-center gap-3 mb-6 p-3 bg-slate-50 rounded-md border border-slate-100">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-700">
                                    {selectedReport.author?.first_name[0]}{selectedReport.author?.last_name[0]}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-900">
                                        {selectedReport.author?.first_name} {selectedReport.author?.last_name}
                                    </p>
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                        Associate Lawyer
                                    </p>
                                </div>
                            </div>

                            {/* Report Text */}
                            <div className="prose prose-sm prose-slate max-w-none">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
                                    Report Content
                                </h3>
                                <div className="bg-slate-50 p-4 rounded-md border border-slate-100 text-slate-800 whitespace-pre-wrap leading-relaxed text-sm">
                                    {selectedReport.report_content}
                                </div>
                            </div>

                            {/* Attachments */}
                            {selectedReport.attachments && selectedReport.attachments.length > 0 && (
                                <div className="mt-6 pt-6 border-t border-slate-100">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                                        <Paperclip className="h-3 w-3" />
                                        Attachments ({selectedReport.attachments.length})
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {selectedReport.attachments.map((file: any) => (
                                            <button
                                                key={file.id}
                                                onClick={() => handleDownload(file.file_path, file.file_name)}
                                                className="flex items-center justify-between p-3 bg-white hover:bg-slate-50 rounded-md border border-slate-200 hover:border-primary/30 transition-all group text-left shadow-sm hover:shadow"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-8 h-8 bg-slate-50 rounded-md flex items-center justify-center border border-slate-100 shrink-0 group-hover:bg-white group-hover:border-primary/20 transition-colors">
                                                        <FileText className="h-4 w-4 text-slate-400 group-hover:text-primary" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-slate-700 truncate group-hover:text-slate-900">
                                                            {file.file_name}
                                                        </p>
                                                        <p className="text-[10px] text-slate-400 font-medium">
                                                            Click to download
                                                        </p>
                                                    </div>
                                                </div>
                                                <Download className="h-3.5 w-3.5 text-slate-300 group-hover:text-primary transition-colors" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end shrink-0">
                            <button
                                onClick={() => setSelectedReport(null)}
                                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wide rounded-md hover:bg-slate-50 transition-colors shadow-sm"
                            >
                                Close Report
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
