import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    BookOpen,
    Plus,
    Save,
    Trash2,
    Pin,
    Clock,
    FileText,
    MessageCircle,
    Target,
    Loader2,
    Search,
    ShieldCheck
} from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { useConfirm } from '@/components/common/ConfirmDialogProvider';

interface ResearchNote {
    id: string;
    category: 'legal_research' | 'case_strategy' | 'meeting_notes' | 'internal_memo';
    title: string;
    content: string;
    is_pinned: boolean;
    created_at: string;
    author_id: string;
}

interface MatterNotesHubProps {
    matterId: string;
    isCaseManager: boolean;
}

export default function MatterNotesHub({ matterId, isCaseManager }: MatterNotesHubProps) {
    const queryClient = useQueryClient();
    const { confirm } = useConfirm();
    const [isAdding, setIsAdding] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'legal_research' | 'case_strategy' | 'meeting_notes' | 'internal_memo'>('all');

    const [newNote, setNewNote] = useState({
        title: '',
        content: '',
        category: 'legal_research' as const,
        is_pinned: false
    });

    const { data: notes, isLoading } = useQuery<ResearchNote[]>({
        queryKey: ['matter_research_notes', matterId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('matter_research_notes')
                .select('*')
                .eq('matter_id', matterId)
                .order('is_pinned', { ascending: false })
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        }
    });

    const addNote = useMutation({
        mutationFn: async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const { error } = await supabase
                .from('matter_research_notes')
                .insert({
                    ...newNote,
                    matter_id: matterId,
                    author_id: session?.user?.id
                });
            if (error) throw error;

            // Audit Log
            await supabase.rpc('log_audit_event', {
                p_action: 'research_note_created',
                p_matter_id: matterId,
                p_metadata: { category: newNote.category, title: newNote.title }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['matter_research_notes', matterId] });
            setIsAdding(false);
            setNewNote({ title: '', content: '', category: 'legal_research', is_pinned: false });
        }
    });

    const deleteNote = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('matter_research_notes')
                .delete()
                .eq('id', id);
            if (error) throw error;

            // Audit Log
            await supabase.rpc('log_audit_event', {
                p_action: 'research_note_deleted',
                p_matter_id: matterId,
                p_metadata: { note_id: id }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['matter_research_notes', matterId] });
        }
    });

    const togglePin = useMutation({
        mutationFn: async ({ id, pinned }: { id: string, pinned: boolean }) => {
            const { error } = await supabase
                .from('matter_research_notes')
                .update({ is_pinned: !pinned })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['matter_research_notes', matterId] });
        }
    });

    const categories = [
        { id: 'legal_research', label: 'Legal Research', icon: <BookOpen size={14} />, color: 'indigo' },
        { id: 'case_strategy', label: 'Case Strategy', icon: <Target size={14} />, color: 'emerald' },
        { id: 'meeting_notes', label: 'Meeting Notes', icon: <MessageCircle size={14} />, color: 'blue' },
        { id: 'internal_memo', label: 'Internal Memos', icon: <FileText size={14} />, color: 'amber' },
    ];

    const filteredNotes = notes?.filter(note => {
        const matchesTab = activeTab === 'all' || note.category === activeTab;
        const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            note.content.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesTab && matchesSearch;
    });

    if (isLoading) return <div className="h-40 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                        <BookOpen size={14} className="text-indigo-400" /> Internal Notes & Research
                    </h3>
                    <p className="text-lg font-bold text-white tracking-tight">Privileged Case Documentation</p>
                </div>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20"
                >
                    <Plus size={14} /> {isAdding ? 'Close Editor' : 'Create New Note'}
                </button>
            </div>

            {isAdding && (
                <div className="bg-[#1E293B] border border-indigo-500/20 rounded-2xl p-8 animate-in slide-in-from-top-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div className="md:col-span-2">
                            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-2">Note Title</label>
                            <input
                                type="text"
                                placeholder="E.g. Analysis of Section 402 Evidence Rules..."
                                value={newNote.title}
                                onChange={e => setNewNote({ ...newNote, title: e.target.value })}
                                className="w-full bg-[#0F172A] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-2">Category</label>
                            <select
                                value={newNote.category}
                                onChange={e => setNewNote({ ...newNote, category: e.target.value as any })}
                                className="w-full bg-[#0F172A] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                            >
                                {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="bg-[#0F172A] rounded-xl overflow-hidden border border-white/5 mb-6 quill-dark">
                        <ReactQuill
                            theme="snow"
                            value={newNote.content}
                            onChange={val => setNewNote({ ...newNote, content: val })}
                            placeholder="Draft your analysis, research, or notes here..."
                            modules={{
                                toolbar: [
                                    [{ 'header': [1, 2, false] }],
                                    ['bold', 'italic', 'underline', 'strike'],
                                    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                    ['link', 'clean']
                                ],
                            }}
                        />
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-white/5">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <button
                                onClick={() => setNewNote({ ...newNote, is_pinned: !newNote.is_pinned })}
                                className={`w-10 h-6 rounded-full transition-all relative ${newNote.is_pinned ? 'bg-amber-600' : 'bg-slate-700'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${newNote.is_pinned ? 'left-5' : 'left-1'}`} />
                            </button>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-amber-400 transition-colors">Pin to Top</span>
                        </label>

                        <button
                            onClick={() => addNote.mutate()}
                            disabled={addNote.isPending || !newNote.title || !newNote.content}
                            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black uppercase tracking-widest rounded-xl text-xs transition-all flex items-center gap-2"
                        >
                            {addNote.isPending ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Save privileged Note
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-[#1E293B]/50 border border-white/5 rounded-2xl p-4 flex flex-col md:flex-row gap-4">
                <div className="flex-1 flex gap-2">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'all' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                    >
                        All Notes
                    </button>
                    {categories.map(c => (
                        <button
                            key={c.id}
                            onClick={() => setActiveTab(c.id as any)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === c.id ? 'bg-white/10 text-white border border-white/10' : 'bg-white/5 text-slate-500 hover:text-white'}`}
                        >
                            {c.icon} {c.label}
                        </button>
                    ))}
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                    <input
                        type="text"
                        placeholder="Search Research..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="bg-[#0F172A] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white w-full md:w-64 focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredNotes?.length === 0 ? (
                    <div className="md:col-span-2 py-20 text-center border border-dashed border-white/5 rounded-3xl opacity-50">
                        <BookOpen size={48} className="mx-auto text-slate-700 mb-4" />
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">No matching research notes found.</p>
                    </div>
                ) : (
                    filteredNotes?.map(note => {
                        const cat = categories.find(c => c.id === note.category);
                        return (
                            <div key={note.id} className="bg-[#1E293B] border border-white/10 rounded-2xl p-6 group hover:border-indigo-500/30 transition-all flex flex-col h-full ring-1 ring-white/5 ring-inset">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`px-2 py-1 rounded-lg bg-${cat?.color}-500/10 text-${cat?.color}-400 border border-${cat?.color}-500/20 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest`}>
                                        {cat?.icon} {cat?.label}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => togglePin.mutate({ id: note.id, pinned: note.is_pinned })}
                                            className={`p-2 rounded-lg transition-colors ${note.is_pinned ? 'text-amber-400 bg-amber-400/10' : 'text-slate-600 hover:text-slate-400'}`}
                                        >
                                            <Pin size={14} fill={note.is_pinned ? 'currentColor' : 'none'} />
                                        </button>
                                        {isCaseManager && (
                                            <button
                                                onClick={async () => { if (await confirm({ title: 'Delete Note', message: 'Delete this research note permanently?', confirmText: 'Delete', isDangerous: true })) deleteNote.mutate(note.id); }}
                                                className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <h4 className="text-lg font-black text-white mb-2 group-hover:text-indigo-400 transition-colors">{note.title}</h4>
                                <div
                                    className="text-slate-400 text-xs leading-relaxed mb-6 overflow-hidden max-h-40 relative prose prose-invert prose-sm"
                                    dangerouslySetInnerHTML={{ __html: note.content }}
                                />
                                <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-500">
                                    <span className="flex items-center gap-1.5">
                                        <Clock size={10} /> {new Date(note.created_at).toLocaleDateString()}
                                        {!note.author_id && <span className="ml-2 text-indigo-400 flex items-center gap-1"><ShieldCheck size={10} /> System Intelligence</span>}
                                    </span>
                                    <span>Privileged Information</span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
