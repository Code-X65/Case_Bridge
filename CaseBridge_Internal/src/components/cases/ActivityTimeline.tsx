import { Clock, FileText, UserCheck, AlertCircle, CheckCircle2, XCircle, Edit3, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';

interface ActivityTimelineProps {
    logs: any[];
    itemsPerPage?: number;
}

export default function ActivityTimeline({ logs, itemsPerPage = 10 }: ActivityTimelineProps) {
    const [currentPage, setCurrentPage] = useState(1);

    const getActivityIcon = (action: string) => {
        switch (action) {
            case 'status_changed':
                return { icon: CheckCircle2, color: 'text-blue-600', bg: 'bg-blue-100' };
            case 'court_report_submitted':
                return { icon: FileText, color: 'text-green-600', bg: 'bg-green-100' };
            case 'case_assigned':
                return { icon: UserCheck, color: 'text-purple-600', bg: 'bg-purple-100' };
            case 'case_created':
                return { icon: AlertCircle, color: 'text-slate-600', bg: 'bg-slate-100' };
            case 'case_updated':
                return { icon: Edit3, color: 'text-amber-600', bg: 'bg-amber-100' };
            case 'case_closed':
                return { icon: XCircle, color: 'text-slate-600', bg: 'bg-slate-100' };
            default:
                return { icon: Clock, color: 'text-slate-600', bg: 'bg-slate-100' };
        }
    };

    const getActivityTitle = (log: any) => {
        switch (log.action) {
            case 'status_changed':
                return `Status changed to ${log.details?.new_status || 'Unknown'}`;
            case 'court_report_submitted':
                return log.details?.is_first_report ? 'First court report submitted' : 'Court report submitted';
            case 'case_assigned':
                return 'Case assigned to associate lawyer';
            case 'case_created':
                return 'Case created';
            case 'case_updated':
                return 'Case information updated';
            case 'case_closed':
                return 'Case closed';
            default:
                return log.action.replace(/_/g, ' ');
        }
    };

    const getActivityDescription = (log: any) => {
        switch (log.action) {
            case 'status_changed':
                return log.details?.note || `Changed from ${log.details?.previous_status || 'Unknown'} to ${log.details?.new_status || 'Unknown'}`;
            case 'court_report_submitted':
                if (log.details?.close_case) {
                    return 'Final report submitted and case closed';
                }
                return log.details?.is_first_report ? 'Case is now active' : 'New update added to case';
            case 'case_assigned':
                return 'An associate lawyer has been assigned to handle this case';
            default:
                return null;
        }
    };

    if (!logs || logs.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-900 mb-2">
                    No Activity Yet
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                    Case activity will appear here as the case progresses.
                </p>
            </div>
        );
    }

    // Pagination calculations
    const totalPages = Math.ceil(logs.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentLogs = logs.slice(startIndex, endIndex);

    const handlePreviousPage = () => {
        setCurrentPage((prev) => Math.max(prev - 1, 1));
    };

    const handleNextPage = () => {
        setCurrentPage((prev) => Math.min(prev + 1, totalPages));
    };

    const handlePageClick = (page: number) => {
        setCurrentPage(page);
    };

    // Generate page numbers to display
    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxPagesToShow = 5;

        if (totalPages <= maxPagesToShow) {
            // Show all pages if total is small
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Always show first page
            pages.push(1);

            if (currentPage > 3) {
                pages.push('...');
            }

            // Show pages around current page
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }

            if (currentPage < totalPages - 2) {
                pages.push('...');
            }

            // Always show last page
            pages.push(totalPages);
        }

        return pages;
    };

    return (
        <div className="space-y-6">
            {/* Stats Bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-md border border-slate-200">
                <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-400" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                        {logs.length} Total {logs.length === 1 ? 'Activity' : 'Activities'}
                    </span>
                </div>
                <span className="text-xs text-slate-500 font-medium">
                    Showing {startIndex + 1}-{Math.min(endIndex, logs.length)} of {logs.length}
                </span>
            </div>

            {/* Timeline */}
            <div className="relative">
                {/* Timeline Line */}
                <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-100" />

                {/* Activity Items */}
                <div className="space-y-6">
                    {currentLogs.map((log, index) => {
                        const { icon: Icon, color, bg } = getActivityIcon(log.action);
                        const title = getActivityTitle(log);
                        const description = getActivityDescription(log);
                        const isFirstOverall = startIndex + index === 0;

                        return (
                            <div key={log.id} className="relative flex gap-4">
                                {/* Icon */}
                                <div className={`relative z-10 w-10 h-10 ${bg} rounded-full flex items-center justify-center shrink-0 ring-4 ring-white`}>
                                    <Icon className={`h-5 w-5 ${color}`} />
                                </div>

                                {/* Content */}
                                <div className="flex-1 pb-2">
                                    <div className="bg-white rounded-md border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                                        {/* Header */}
                                        <div className="flex items-start justify-between gap-4 mb-2">
                                            <h3 className="text-sm font-semibold text-slate-900 capitalize">
                                                {title}
                                            </h3>
                                            {isFirstOverall && (
                                                <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wide rounded-md">
                                                    Latest
                                                </span>
                                            )}
                                        </div>

                                        {/* Description */}
                                        {description && (
                                            <p className="text-sm text-slate-600 font-medium mb-3">
                                                {description}
                                            </p>
                                        )}

                                        {/* Meta */}
                                        <div className="flex items-center gap-4 text-xs text-slate-500">
                                            <div className="flex items-center gap-1.5">
                                                <User className="h-3.5 w-3.5" />
                                                <span className="font-medium">
                                                    {log.performer?.first_name} {log.performer?.last_name}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="h-3.5 w-3.5" />
                                                <span className="font-medium">
                                                    {format(new Date(log.created_at), 'MMM dd, yyyy • h:mm a')}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Additional Details (if any) */}
                                        {log.details && Object.keys(log.details).length > 0 && (
                                            <details className="mt-3">
                                                <summary className="text-xs font-semibold text-slate-400 uppercase tracking-wide cursor-pointer hover:text-slate-600 transition-colors">
                                                    View Details
                                                </summary>
                                                <div className="mt-2 p-3 bg-slate-50 rounded-md">
                                                    <pre className="text-xs text-slate-600 font-mono overflow-x-auto">
                                                        {JSON.stringify(log.details, null, 2)}
                                                    </pre>
                                                </div>
                                            </details>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                    {/* Previous Button */}
                    <button
                        onClick={handlePreviousPage}
                        disabled={currentPage === 1}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-600"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                    </button>

                    {/* Page Numbers */}
                    <div className="flex items-center gap-1">
                        {getPageNumbers().map((page, index) => {
                            if (page === '...') {
                                return (
                                    <span key={`ellipsis-${index}`} className="px-3 py-2 text-sm text-slate-400">
                                        ...
                                    </span>
                                );
                            }

                            const pageNum = page as number;
                            const isActive = pageNum === currentPage;

                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => handlePageClick(pageNum)}
                                    className={`min-w-[40px] h-10 px-3 text-sm font-semibold rounded-md transition-colors ${isActive
                                        ? 'bg-primary text-white'
                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                        }`}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}
                    </div>

                    {/* Next Button */}
                    <button
                        onClick={handleNextPage}
                        disabled={currentPage === totalPages}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-600"
                    >
                        Next
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            )}
        </div>
    );
}
