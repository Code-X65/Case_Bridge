import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, X, FileText, ImageIcon, Download, Loader2 } from "lucide-react";
import { getDocumentUrl } from "@/lib/storage";
import { useState, useEffect } from "react";

interface DocumentPreviewDialogProps {
    isOpen: boolean;
    onClose: () => void;
    document: {
        id: string;
        file_name: string;
        file_path: string;
        file_type: string;
    } | null;
}

export function DocumentPreviewDialog({ isOpen, onClose, document }: DocumentPreviewDialogProps) {
    const [url, setUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && document) {
            const fetchUrl = async () => {
                setLoading(true);
                try {
                    const signedUrl = await getDocumentUrl(document.file_path);
                    setUrl(signedUrl || null);
                } catch (error) {
                    console.error("Error fetching preview URL:", error);
                } finally {
                    setLoading(false);
                }
            };
            fetchUrl();
        } else {
            setUrl(null);
        }
    }, [isOpen, document]);

    if (!document) return null;

    const isImage = document.file_type.startsWith('image/');
    const isPdf = document.file_type === 'application/pdf';

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden bg-slate-950 border-slate-800">
                <DialogHeader className="p-4 border-b border-slate-800 flex flex-row items-center justify-between bg-slate-900 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-800 rounded-lg">
                            {isImage ? <ImageIcon className="h-5 w-5 text-blue-400" /> : <FileText className="h-5 w-5 text-blue-400" />}
                        </div>
                        <div>
                            <DialogTitle className="text-white text-sm font-medium">{document.file_name}</DialogTitle>
                            <p className="text-slate-400 text-xs">{document.file_type}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {url && (
                            <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white" asChild>
                                <a href={url} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Open in New Tab
                                </a>
                            </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-white">
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                </DialogHeader>

                <div className="flex-1 bg-slate-900/50 relative overflow-hidden flex items-center justify-center">
                    {loading ? (
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="h-8 w-8 text-primary animate-spin" />
                            <p className="text-slate-400 text-sm">Loading preview...</p>
                        </div>
                    ) : url ? (
                        <>
                            {isImage && (
                                <img
                                    src={url}
                                    alt={document.file_name}
                                    className="max-w-full max-h-full object-contain shadow-2xl"
                                />
                            )}
                            {isPdf && (
                                <iframe
                                    src={`${url}#toolbar=0`}
                                    className="w-full h-full border-none shadow-inner"
                                    title="PDF Preview"
                                />
                            )}
                            {!isImage && !isPdf && (
                                <div className="flex flex-col items-center gap-6 p-12 text-center max-w-sm">
                                    <div className="w-20 h-20 rounded-2xl bg-slate-800 flex items-center justify-center">
                                        <FileText className="h-10 w-10 text-slate-500" />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-semibold text-lg">No preview available</h3>
                                        <p className="text-slate-400 text-sm mt-1">This file type cannot be previewed directly in the browser.</p>
                                    </div>
                                    <Button variant="default" className="w-full" asChild>
                                        <a href={url} download={document.file_name}>
                                            <Download className="h-4 w-4 mr-2" />
                                            Download instead
                                        </a>
                                    </Button>
                                </div>
                            )}
                        </>
                    ) : (
                        <p className="text-slate-500">Failed to load preview.</p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
