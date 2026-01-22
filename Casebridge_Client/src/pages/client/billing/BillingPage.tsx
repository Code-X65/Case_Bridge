import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    CheckCircle2,
    Clock,
    AlertCircle,
    ExternalLink,
    Wallet,
    Receipt,
    History
} from 'lucide-react';
import { usePaystackPayment } from 'react-paystack';
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';

export default function BillingPage() {
    const queryClient = useQueryClient();
    const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);

    const { data: profile } = useQuery({
        queryKey: ['profile'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;
            const { data } = await supabase.from('profiles').select('email, first_name, last_name').eq('id', user.id).single();
            return data;
        },
    });

    const { data: invoices, isLoading } = useQuery({
        queryKey: ['invoices'],
        queryFn: async () => {
            // Get current authenticated user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Fetch only invoices belonging to the current user
            const { data, error } = await supabase
                .from('invoices')
                .select('*')
                .eq('client_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        },
    });

    const { data: payments } = useQuery({
        queryKey: ['payments'],
        queryFn: async () => {
            // Get current authenticated user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Fetch only payments belonging to the current user
            const { data, error } = await supabase
                .from('payments')
                .select('*')
                .eq('client_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        },
    });

    const updateInvoiceMutation = useMutation({
        mutationFn: async ({ invoiceId, reference }: { invoiceId: string, reference: string }) => {
            const { data: invoice } = await supabase.from('invoices').select('amount').eq('id', invoiceId).single();

            await supabase.from('invoices').update({ status: 'Paid' }).eq('id', invoiceId);

            const { data: { user } } = await supabase.auth.getUser();
            await supabase.from('payments').insert({
                invoice_id: invoiceId,
                client_id: user?.id,
                amount: invoice?.amount,
                status: 'Success',
                receipt_url: `https://checkout.paystack.com/${reference}`
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            queryClient.invalidateQueries({ queryKey: ['payments'] });
            setPayingInvoiceId(null);
            toast({
                title: "Payment Successful",
                description: "Your invoice has been marked as paid.",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Payment Failed",
                description: error.message || "An error occurred during payment processing.",
                variant: "destructive"
            });
            setPayingInvoiceId(null);
        }
    });

    const PayButton = ({ invoice }: { invoice: any }) => {
        const config = {
            reference: `INV-${new Date().getTime()}`,
            email: profile?.email || '',
            amount: Math.round(invoice.amount * 100),
            publicKey: (import.meta.env.VITE_PAYSTACK_PUBLIC_KEY as string) || '',
        };

        const initializePayment = usePaystackPayment(config);

        const onSuccess = (reference: any) => {
            updateInvoiceMutation.mutate({ invoiceId: invoice.id, reference: reference.reference });
        };

        const onClose = () => {
            setPayingInvoiceId(null);
        };

        return (
            <Button
                size="sm"
                className="bg-primary hover:bg-primary/90 font-bold text-[10px] uppercase tracking-widest h-8 px-4 rounded-lg"
                onClick={() => {
                    setPayingInvoiceId(invoice.id);
                    // @ts-ignore
                    initializePayment(onSuccess, onClose);
                }}
                disabled={updateInvoiceMutation.isPending && payingInvoiceId === invoice.id}
            >
                {updateInvoiceMutation.isPending && payingInvoiceId === invoice.id ? "Working..." : "Pay Now"}
            </Button>
        );
    };

    const pendingInvoices = invoices?.filter(inv => inv.status === 'Pending') || [];
    const totalOutstanding = pendingInvoices.reduce((acc, inv) => acc + Number(inv.amount), 0);
    const totalPaid = payments?.reduce((acc, p) => acc + Number(p.amount), 0) || 0;

    return (
        <div className="space-y-6 pb-8 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase tracking-tighter">Billing & Payments</h1>
                    <p className="text-slate-500 text-sm font-medium">
                        Manage your legal fee invoices and transaction history.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-slate-900 border-none shadow-sm text-white relative overflow-hidden group rounded-2xl">
                    <div className="absolute right-[-10px] top-[-10px] opacity-10 group-hover:rotate-12 transition-transform duration-500">
                        <Wallet className="h-20 w-20" />
                    </div>
                    <CardHeader className="pb-1 px-5 pt-5">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest opacity-60">Balance Due</CardTitle>
                    </CardHeader>
                    <CardContent className="px-5 pb-5">
                        <div className="text-2xl font-black">
                            ₦{totalOutstanding.toLocaleString()}
                        </div>
                        <p className="text-[9px] mt-1 opacity-50 font-bold uppercase tracking-widest">{pendingInvoices.length} Unpaid</p>
                    </CardContent>
                </Card>

                <Card className="border-none ring-1 ring-slate-100 shadow-sm rounded-2xl">
                    <CardHeader className="pb-1 px-5 pt-5 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Cleared</CardTitle>
                        <div className="bg-green-50 p-1 rounded-lg">
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                        </div>
                    </CardHeader>
                    <CardContent className="px-5 pb-5">
                        <div className="text-2xl font-black text-slate-900">
                            ₦{totalPaid.toLocaleString()}
                        </div>
                        <p className="text-[9px] mt-1 text-slate-400 font-bold uppercase tracking-widest">Lifetime</p>
                    </CardContent>
                </Card>

                <Card className="border-none ring-1 ring-slate-100 shadow-sm rounded-2xl">
                    <CardHeader className="pb-1 px-5 pt-5 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Next Payment</CardTitle>
                        <div className="bg-blue-50 p-1 rounded-lg">
                            <Clock className="h-3.5 w-3.5 text-blue-600" />
                        </div>
                    </CardHeader>
                    <CardContent className="px-5 pb-5">
                        <div className="text-2xl font-black text-slate-900">
                            {pendingInvoices.length > 0 ? `₦${pendingInvoices[0].amount.toLocaleString()}` : "₦0"}
                        </div>
                        <p className="text-[9px] mt-1 text-slate-400 font-bold uppercase tracking-widest">Immediate</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <section className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-base font-black flex items-center gap-2 text-slate-900 uppercase tracking-tight">
                            <Receipt className="h-4 w-4 text-primary" />
                            Pending Bills
                        </h2>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden ring-1 ring-slate-100">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                                    <TableHead className="py-3 pl-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Amount</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</TableHead>
                                    <TableHead className="text-right pr-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Manage</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={5} className="text-center py-12 text-[10px] font-black text-slate-300 uppercase tracking-widest">Scanning records...</TableCell></TableRow>
                                ) : pendingInvoices.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-20">
                                            <div className="flex flex-col items-center gap-2 opacity-20">
                                                <Receipt className="h-8 w-8 text-slate-900" />
                                                <p className="text-[10px] font-black uppercase tracking-widest">Acount is clear</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    pendingInvoices.map((inv) => (
                                        <TableRow key={inv.id} className="hover:bg-slate-50 transition-all border-b border-slate-50">
                                            <TableCell className="py-4 pl-6 text-xs font-bold text-slate-500">{new Date(inv.created_at).toLocaleDateString()}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-black text-slate-900 uppercase tracking-tight">Service Fee</span>
                                                    <span className="text-[9px] text-slate-400 font-mono font-black uppercase">{inv.id.substring(0, 8)}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-black text-slate-900 text-xs">₦{Number(inv.amount).toLocaleString()}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="bg-amber-100/50 text-amber-600 border-amber-100 text-[8px] font-black uppercase tracking-widest h-4 rounded-sm">Unpaid</Badge>
                                            </TableCell>
                                            <TableCell className="text-right pr-6 px-0">
                                                <PayButton invoice={inv} />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </section>

                <section className="space-y-4">
                    <h2 className="text-base font-black flex items-center gap-2 text-slate-900 uppercase tracking-tight px-2">
                        <History className="h-4 w-4 text-green-500" />
                        History
                    </h2>
                    <Card className="border-none ring-1 ring-slate-100 shadow-sm rounded-3xl overflow-hidden p-0">
                        <div className="divide-y divide-slate-50">
                            {isLoading ? (
                                <div className="p-8 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">Syncing History...</div>
                            ) : !payments || payments.length === 0 ? (
                                <div className="p-12 text-center text-slate-200">
                                    <History className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">No activities</p>
                                </div>
                            ) : (
                                payments.slice(0, 5).map((payment) => (
                                    <div key={payment.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="p-1.5 bg-green-50 rounded-lg">
                                                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-slate-900">₦{Number(payment.amount).toLocaleString()}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase">{new Date(payment.created_at).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary transition-colors" asChild>
                                            <a href={payment.receipt_url} target="_blank" rel="noreferrer" title="View Receipt">
                                                <ExternalLink className="h-3.5 w-3.5" />
                                            </a>
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>

                    <Card className="border-none bg-slate-950 bg-gradient-to-br from-slate-950 to-slate-900 text-white p-5 rounded-3xl shadow-xl">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-white/10 rounded-xl border border-white/10 shrink-0">
                                <AlertCircle className="h-4 w-4 text-primary" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-primary uppercase tracking-widest">Billing Desk</p>
                                <p className="text-[10px] font-bold leading-relaxed opacity-80 uppercase tracking-tight">Invoice disputes? Reach out to support@casebridge.com</p>
                            </div>
                        </div>
                    </Card>
                </section>
            </div>
        </div>
    );
}
