import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useState, useEffect } from 'react';
import { Loader2, ArrowLeft, AlertTriangle, Upload, ShieldCheck, Zap, Star } from 'lucide-react';
import { uploadDocument } from '@/lib/storage';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { usePaystackPayment } from 'react-paystack';
import { toast } from '@/hooks/use-toast';
import { Separator as UISeparator } from '@/components/ui/separator';

const matterSchema = z.object({
    title: z.string().min(5, 'Title too short'),
    description: z.string().min(20, 'Min 20 characters required'),
    matter_type: z.string().min(1, 'Selection required'),
    service_tier: z.string().min(1, 'Selection required'),
});

const SERVICE_TIERS = [
    {
        id: 'Standard',
        name: 'Standard',
        price: 15000,
        description: 'Junior Associate review. 48-hour response.',
        icon: ShieldCheck,
        color: 'blue'
    },
    {
        id: 'Priority',
        name: 'Priority',
        price: 35000,
        description: 'Senior Counsel review. 24-hour response.',
        icon: Zap,
        color: 'amber'
    },
    {
        id: 'Expert',
        name: 'Expert',
        price: 75000,
        description: 'Senior Partner review. Immediate assignment.',
        icon: Star,
        color: 'purple'
    },
];

const MATTER_TYPES = [
    'Corporate & Commercial',
    'Criminal Defense',
    'Civil Litigation',
    'Family Law',
    'Real Estate & Property',
    'Employment & Labor',
    'Intellectual Property',
    'Human Rights',
    'Taxation',
    'Others'
];

type MatterFormValues = z.infer<typeof matterSchema>;

export default function CreateMatterPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [fileError, setFileError] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState('');

    const form = useForm<MatterFormValues>({
        resolver: zodResolver(matterSchema),
        defaultValues: {
            title: '',
            description: '',
            matter_type: '',
            service_tier: 'Standard',
        },
    });

    const selectedTier = form.watch('service_tier');
    const tierData = SERVICE_TIERS.find(t => t.id === selectedTier) || SERVICE_TIERS[0];

    useEffect(() => {
        async function getEmail() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.email) setUserEmail(user.email);
        }
        getEmail();
    }, []);

    const config = {
        reference: `MAT-${new Date().getTime()}`,
        email: userEmail,
        amount: tierData.price * 100,
        publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '',
    };

    const initializePayment = usePaystackPayment(config);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        const ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];
        if (!ALLOWED_TYPES.includes(selectedFile.type)) {
            setFileError('Invalid format (PDF/DOCX/JPG/PNG only)');
            setFile(null);
            return;
        }

        if (selectedFile.size > 10 * 1024 * 1024) {
            setFileError('Exceeds 10MB limit');
            setFile(null);
            return;
        }

        setFileError(null);
        setFile(selectedFile);
    };

    const generateMatterNumber = () => {
        return `CB-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    };

    const finalizeMatterCreation = async (values: MatterFormValues, reference: string) => {
        setLoading(true);
        console.log("Finalizing matter creation with reference:", reference);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user found');

            // 1. Create the Matter record
            const { data: matter, error: matterError } = await supabase.from('matters').insert({
                client_id: user.id,
                matter_number: generateMatterNumber(),
                title: values.title,
                description: values.description,
                matter_type: values.matter_type,
                service_tier: values.service_tier,
                status: 'Pending Review',
            }).select().single();

            if (matterError) {
                console.error("Matter insertion error:", matterError);
                throw matterError;
            }
            console.log("Matter created:", matter.id);

            // 2. Create the associated Invoice (marked as Paid)
            const { data: invoice, error: invoiceError } = await supabase.from('invoices').insert({
                client_id: user.id,
                amount: tierData.price,
                status: 'Paid',
            }).select().single();

            if (invoiceError) {
                console.error("Invoice creation error:", invoiceError);
                throw invoiceError;
            }
            console.log("Invoice created:", invoice.id);

            // 3. Record the Payment linked to the Invoice
            const { error: paymentError } = await supabase.from('payments').insert({
                invoice_id: invoice.id,
                client_id: user.id,
                amount: tierData.price,
                status: 'Success',
                receipt_url: `https://checkout.paystack.com/${reference}`,
            });

            if (paymentError) {
                console.error("Payment recording error:", paymentError);
                throw paymentError;
            }
            console.log("Payment recorded.");

            // 4. Upload document if provided
            if (file && matter) {
                console.log("Uploading document for matter:", matter.id);
                await uploadDocument(file, matter.id, user.id);
            }

            toast({
                title: "Case Successfully Filed",
                description: "Your case is now waiting for legal review.",
            });

            navigate('/client/matters');
        } catch (error: any) {
            console.error('Finalization error:', error);
            toast({
                title: "Processing Error",
                description: error.message || "Case was not saved properly. Please contact support.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const onSubmit = (values: MatterFormValues) => {
        console.log("Submitting form, values:", values);
        if (!import.meta.env.VITE_PAYSTACK_PUBLIC_KEY) {
            toast({
                title: "Configuration Error",
                description: "Paystack key is missing. Please check .env file.",
                variant: "destructive"
            });
            return;
        }

        // @ts-ignore
        initializePayment({
            onSuccess: (response: any) => {
                console.log("Paystack Success:", response);
                finalizeMatterCreation(values, response.reference);
            },
            onClose: () => {
                console.log("Paystack Modal Closed.");
                toast({
                    title: "Payment Cancelled",
                    description: "A retainer payment is required to file a case.",
                    variant: "destructive"
                });
            }
        });
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-2">
                <div>
                    <Button variant="ghost" size="sm" asChild className="h-7 px-2 -ml-2 mb-2 text-slate-400 hover:text-slate-900 group">
                        <Link to="/client/matters">
                            <ArrowLeft className="mr-1.5 h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Back</span>
                        </Link>
                    </Button>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase tracking-tighter">New Case Filing</h1>
                    <p className="text-slate-500 text-sm font-medium">Submit your legal case for professional review.</p>
                </div>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6 text-slate-900">
                            <Card className="border-none ring-1 ring-slate-100 shadow-sm rounded-2xl overflow-hidden">
                                <CardHeader className="bg-slate-50/50 border-b border-slate-50/50 py-4 px-6">
                                    <CardTitle className="text-xs font-black uppercase tracking-widest">Case Particulars</CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 space-y-5">
                                    <FormField
                                        control={form.control}
                                        name="title"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">Case Subject</FormLabel>
                                                <FormControl>
                                                    <Input className="h-10 rounded-lg bg-slate-50/50 border-transparent focus:bg-white focus:border-primary transition-all text-sm font-bold" placeholder="Short descriptive title" {...field} />
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="matter_type"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">Legal Category</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="h-10 rounded-lg bg-slate-50/50 border-transparent focus:bg-white focus:border-primary transition-all text-sm font-bold">
                                                            <SelectValue placeholder="Select type" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {MATTER_TYPES.map(type => (
                                                            <SelectItem key={type} value={type} className="text-xs font-bold">{type}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="description"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">Detailed Brief</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Provide comprehensive details about your situation..."
                                                        className="min-h-[120px] rounded-lg bg-slate-50/50 border-transparent focus:bg-white focus:border-primary transition-all text-sm font-medium resize-none"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                            Evidence & Documentation (Optional)
                                        </Label>
                                        <div className={`relative border-2 border-dashed rounded-xl p-6 transition-colors text-center ${file ? 'border-primary bg-primary/5 border-solid' : 'border-slate-100 hover:border-slate-200 bg-slate-50/30'}`}>
                                            <input type="file" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                            <div className="space-y-1.5">
                                                <Upload className={`h-6 w-6 mx-auto ${file ? 'text-primary' : 'text-slate-300'}`} />
                                                <p className="text-[10px] font-black uppercase tracking-tight text-slate-900">{file ? file.name : 'Select file to include'}</p>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">MAX 10MB • PDF, JPG, PNG</p>
                                                {file && (
                                                    <Button variant="ghost" size="sm" type="button" className="h-6 px-2 text-[9px] font-black uppercase text-red-500 hover:text-red-600 hover:bg-red-50 mt-1" onClick={(e) => { e.stopPropagation(); setFile(null); }}>Discard</Button>
                                                )}
                                            </div>
                                        </div>
                                        {fileError && (
                                            <div className="flex items-center gap-2 text-destructive text-[9px] font-black uppercase tracking-widest bg-destructive/5 p-2 rounded-lg">
                                                <AlertTriangle className="h-3 w-3" />
                                                {fileError}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="space-y-6">
                            <Card className="border-none ring-1 ring-slate-100 shadow-sm rounded-2xl overflow-hidden">
                                <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-6">
                                    <CardTitle className="text-xs font-black uppercase tracking-widest">Select Tier</CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 space-y-3">
                                    <FormField
                                        control={form.control}
                                        name="service_tier"
                                        render={({ field }) => (
                                            <div className="space-y-2">
                                                {SERVICE_TIERS.map((tier) => {
                                                    const Icon = tier.icon;
                                                    const isSelected = field.value === tier.id;
                                                    return (
                                                        <div
                                                            key={tier.id}
                                                            onClick={() => field.onChange(tier.id)}
                                                            className={`relative p-3 rounded-xl border-2 transition-all cursor-pointer ${isSelected
                                                                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                                                : 'border-slate-50 hover:border-slate-100'
                                                                }`}
                                                        >
                                                            <div className="flex items-start gap-3">
                                                                <div className={`p-1.5 rounded-lg shrink-0 ${isSelected ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                                    <Icon className="h-3.5 w-3.5" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center justify-between">
                                                                        <p className={`text-[10px] font-black uppercase tracking-widest ${isSelected ? 'text-primary' : 'text-slate-900'}`}>{tier.name}</p>
                                                                        <p className="font-black text-xs">₦{tier.price.toLocaleString()}</p>
                                                                    </div>
                                                                    <p className="text-[9px] text-slate-400 font-bold mt-0.5 leading-snug truncate">{tier.description}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    />
                                </CardContent>
                            </Card>

                            <Card className="bg-slate-950 text-white border-none shadow-2xl rounded-3xl overflow-hidden relative">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16" />
                                <CardContent className="p-6 space-y-4 relative">
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest opacity-40">
                                            <span>Retainer Fee</span>
                                            <span>₦{tierData.price.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest opacity-40">
                                            <span>Processing</span>
                                            <span>₦0.00</span>
                                        </div>
                                        <UISeparator className="bg-white/10" />
                                        <div className="flex justify-between items-center pt-1">
                                            <span className="text-xs font-black uppercase tracking-widest">Total Pay</span>
                                            <span className="text-2xl font-black text-primary tracking-tighter">₦{tierData.price.toLocaleString()}</span>
                                        </div>
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full bg-primary hover:bg-primary/90 h-11 text-xs font-black uppercase tracking-widest shadow-xl shadow-primary/20"
                                        disabled={loading}
                                    >
                                        {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                                        Submit Case
                                    </Button>

                                    <div className="flex justify-center items-center gap-2 opacity-30">
                                        <Zap className="h-3 w-3" />
                                        <span className="text-[8px] uppercase tracking-widest font-black">Escrow Protected</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </form>
            </Form>
        </div>
    );
}
