import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { uploadDocument } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, Loader2, FileUp, AlertTriangle } from 'lucide-react';

const ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];
const MAX_SIZE_MB = 10;

export function UploadDocumentDialog() {
    const [isOpen, setIsOpen] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [matterId, setMatterId] = useState<string>('');
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const queryClient = useQueryClient();

    const { data: matters } = useQuery({
        queryKey: ['matters-simple'],
        queryFn: async () => {
            // Get current authenticated user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];

            // Fetch only matters belonging to the current user
            const { data } = await supabase
                .from('matters')
                .select('id, title, matter_number')
                .eq('client_id', user.id);
            return data;
        },
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        if (!ALLOWED_TYPES.includes(selectedFile.type)) {
            setError('Invalid file type. Only PDF, DOCX, JPG, and PNG are allowed.');
            setFile(null);
            return;
        }

        if (selectedFile.size > MAX_SIZE_MB * 1024 * 1024) {
            setError(`File size exceeds ${MAX_SIZE_MB}MB limit.`);
            setFile(null);
            return;
        }

        setError(null);
        setFile(selectedFile);
    };

    const handleUpload = async () => {
        if (!file || !matterId) return;

        setIsUploading(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Authentication required');

            await uploadDocument(file, matterId, user.id);

            queryClient.invalidateQueries({ queryKey: ['documents'] });
            setIsOpen(false);
            setFile(null);
            setMatterId('');
        } catch (err: any) {
            setError(err.message || 'Upload failed. Ensure the storage bucket "documents" exists and RLS is configured.');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Document
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Upload Document</DialogTitle>
                    <DialogDescription>
                        Attach a document to one of your legal cases.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="matter">Select Case</Label>
                        <Select onValueChange={setMatterId} value={matterId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Choose a case..." />
                            </SelectTrigger>
                            <SelectContent>
                                {matters?.map((m) => (
                                    <SelectItem key={m.id} value={m.id}>
                                        {m.matter_number} - {m.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="file">File</Label>
                        <div className="flex items-center justify-center w-full">
                            <label
                                htmlFor="file-upload"
                                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors"
                            >
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    {file ? (
                                        <>
                                            <FileUp className="w-10 h-10 mb-3 text-blue-500" />
                                            <p className="text-sm text-slate-700 font-medium truncate max-w-[250px]">{file.name}</p>
                                            <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-10 h-10 mb-3 text-slate-300" />
                                            <p className="text-sm text-slate-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                            <p className="text-xs text-slate-400">PDF, DOCX, JPG or PNG (MAX. 10MB)</p>
                                        </>
                                    )}
                                </div>
                                <Input
                                    id="file-upload"
                                    type="file"
                                    className="hidden"
                                    onChange={handleFileChange}
                                    accept=".pdf,.docx,.jpg,.png"
                                />
                            </label>
                        </div>
                    </div>
                    {error && (
                        <div className="flex gap-2 text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button
                        type="submit"
                        onClick={handleUpload}
                        disabled={!file || !matterId || isUploading}
                        className="w-full"
                    >
                        {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isUploading ? 'Uploading...' : 'Upload Now'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
