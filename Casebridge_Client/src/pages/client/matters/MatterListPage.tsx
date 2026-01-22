import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Search, Filter, ArrowUpRight, Zap, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

export default function MatterListPage() {
    const [searchTerm, setSearchTerm] = useState('');

    const { data: matters, isLoading } = useQuery({
        queryKey: ['matters'],
        queryFn: async () => {
            // Get current authenticated user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Fetch only matters belonging to the current user
            const { data, error } = await supabase
                .from('matters')
                .select('*')
                .eq('client_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        },
    });

    const filteredMatters = matters?.filter(matter =>
        matter.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        matter.matter_number.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusStyles = (status: string) => {
        switch (status.toLowerCase()) {
            case 'pending review':
                return 'bg-amber-50 text-amber-700 border-amber-100';
            case 'active':
                return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'closed':
                return 'bg-slate-50 text-slate-700 border-slate-100';
            default:
                return 'bg-slate-50 text-slate-700 border-slate-100';
        }
    };

    const getTierBadge = (tier: string) => {
        switch (tier?.toLowerCase()) {
            case 'standard':
                return <Badge variant="secondary" className="bg-slate-50 text-slate-400 border-none font-black text-[8px] uppercase tracking-tighter h-5 px-2">Standard</Badge>;
            case 'priority':
                return <Badge className="bg-blue-600 text-white border-none font-black text-[8px] uppercase tracking-tighter shadow-sm h-5 px-2"><Zap className="h-2 w-2 mr-1" /> Priority</Badge>;
            case 'expert':
                return <Badge className="bg-slate-900 text-amber-500 border-none font-black text-[8px] uppercase tracking-tighter shadow-sm h-5 px-2"><Star className="h-2 w-2 mr-1 fill-amber-500" /> Expert</Badge>;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6 pb-8 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase tracking-tighter">Legal Cases</h1>
                    <p className="text-slate-500 text-sm font-medium">
                        Comprehensive overview of your active and historical legal cases.
                    </p>
                </div>
                <Button asChild size="sm" className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/10 h-10 px-5 rounded-xl font-bold group">
                    <Link to="/client/matters/create">
                        <Plus className="mr-2 h-4 w-4 group-hover:rotate-90 transition-transform" />
                        Create New Case
                    </Link>
                </Button>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 justify-between bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
                <div className="relative w-full sm:max-w-xs px-2">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300" />
                    <Input
                        placeholder="Search cases..."
                        className="pl-9 h-9 bg-slate-50/50 border-transparent focus:bg-white focus:ring-primary rounded-xl text-xs font-semibold transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button variant="ghost" className="h-9 px-4 rounded-xl border-slate-100 text-slate-500 font-bold hover:bg-slate-50 text-[10px] uppercase tracking-widest">
                    <Filter className="mr-2 h-3.5 w-3.5" />
                    Filter Results
                </Button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden ring-1 ring-slate-100">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 h-12">
                            <TableHead className="w-[120px] pl-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Case ID</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Title & Category</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Assignment</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date Filed</TableHead>
                            <TableHead className="text-right pr-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-48 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="h-6 w-6 border-2 border-slate-100 border-t-primary rounded-full animate-spin" />
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fetching file vault...</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredMatters?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-48 text-center">
                                    <div className="flex flex-col items-center gap-2 opacity-30">
                                        <Search className="h-10 w-10 text-slate-200" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">No matching cases</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredMatters?.map((matter) => (
                                <TableRow key={matter.id} className="group hover:bg-slate-50 transition-all border-b border-slate-50 cursor-pointer" onClick={() => window.location.href = `/client/matters/${matter.id}`}>
                                    <TableCell className="pl-6 py-4">
                                        <span className="font-mono text-[10px] font-black uppercase text-slate-400 tracking-tighter">{matter.matter_number}</span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col max-w-[250px]">
                                            <span className="text-sm font-bold text-slate-900 line-clamp-1 group-hover:text-primary transition-colors uppercase tracking-tight">{matter.title}</span>
                                            <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-0.5">{matter.matter_type}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {getTierBadge(matter.service_tier)}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={`${getStatusStyles(matter.status)} px-2 py-0 border font-black uppercase text-[8px] tracking-widest h-4 rounded-sm`}>
                                            {matter.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-slate-500 text-[11px] font-bold">
                                        {new Date(matter.created_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <Button variant="ghost" size="sm" className="h-8 px-3 rounded-lg font-black text-[9px] uppercase tracking-widest group-hover:bg-primary group-hover:text-white transition-all">
                                            View <ArrowUpRight className="ml-1 h-3 w-3" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

