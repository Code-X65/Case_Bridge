import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from '@/components/ui/form';
import {
    Loader2,
    User,
    Mail,
    Phone,
    ShieldCheck,
    Bell,
    Lock,
    LogOut,
    AlertCircle
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

const profileSchema = z.object({
    first_name: z.string().min(2, 'Too short'),
    last_name: z.string().min(2, 'Too short'),
    phone: z.string().optional(),
});

const passwordSchema = z.object({
    password: z.string().min(8, 'Minimum 8 characters'),
    confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
    message: "Mismatch",
    path: ["confirmPassword"],
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
    const [loading, setLoading] = useState(true);
    const [updatingProfile, setUpdatingProfile] = useState(false);
    const [updatingPassword, setUpdatingPassword] = useState(false);
    const [userEmail, setUserEmail] = useState('');
    const [activeTab, setActiveTab] = useState<'general' | 'security'>('general');

    const profileForm = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            first_name: '',
            last_name: '',
            phone: '',
        },
    });

    const passwordForm = useForm<PasswordFormValues>({
        resolver: zodResolver(passwordSchema),
        defaultValues: {
            password: '',
            confirmPassword: '',
        },
    });

    useEffect(() => {
        async function loadProfile() {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    setUserEmail(user.email || '');
                    const { data, error } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', user.id)
                        .single();

                    if (error) throw error;
                    if (data) {
                        profileForm.reset({
                            first_name: data.first_name || '',
                            last_name: data.last_name || '',
                            phone: data.phone || '',
                        });
                    }
                }
            } catch (error) {
                console.error('Error loading profile:', error);
            } finally {
                setLoading(false);
            }
        }
        loadProfile();
    }, [profileForm]);

    const onProfileSubmit = async (values: ProfileFormValues) => {
        setUpdatingProfile(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user found');

            const { error } = await supabase
                .from('profiles')
                .update({
                    first_name: values.first_name,
                    last_name: values.last_name,
                    phone: values.phone,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user.id);

            if (error) throw error;
            toast({
                title: "Profile Updated",
                description: "Settings saved successfully.",
            });
        } catch (error: any) {
            toast({
                title: "Update Failed",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setUpdatingProfile(false);
        }
    };

    const onPasswordSubmit = async (values: PasswordFormValues) => {
        setUpdatingPassword(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: values.password
            });

            if (error) throw error;
            passwordForm.reset();
            toast({
                title: "Internal Error",
                description: "Security credentials updated.",
            });
        } catch (error: any) {
            toast({
                title: "Operation Failed",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setUpdatingPassword(false);
        }
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        window.location.href = '/login';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-2">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase tracking-tighter">Account Center</h1>
                    <p className="text-slate-500 text-sm font-medium">Manage your digital identity and security.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                <div className="lg:col-span-1 flex flex-col gap-1 sticky top-24">
                    <Button
                        variant={activeTab === 'general' ? 'default' : 'ghost'}
                        className={`justify-start h-10 px-3 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'general' ? 'shadow-lg shadow-primary/10 bg-slate-950 hover:bg-slate-900' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                        onClick={() => setActiveTab('general')}
                    >
                        <User className="mr-2.5 h-3.5 w-3.5" />
                        Identity
                    </Button>
                    <Button
                        variant={activeTab === 'security' ? 'default' : 'ghost'}
                        className={`justify-start h-10 px-3 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'security' ? 'shadow-lg shadow-primary/10 bg-slate-950 hover:bg-slate-900' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                        onClick={() => setActiveTab('security')}
                    >
                        <Lock className="mr-2.5 h-3.5 w-3.5" />
                        Security
                    </Button>
                    <Separator className="my-2 opacity-50" />
                    <Button variant="ghost" disabled className="justify-start h-10 px-3 rounded-lg font-black text-[10px] uppercase tracking-widest text-slate-300 opacity-50">
                        <Bell className="mr-2.5 h-3.5 w-3.5" />
                        Preference
                    </Button>
                </div>

                <div className="lg:col-span-3 space-y-6">
                    {activeTab === 'general' && (
                        <Card className="border-none ring-1 ring-slate-100 shadow-sm rounded-2xl overflow-hidden">
                            <CardHeader className="bg-slate-50/30 border-b border-slate-50 py-5 px-6">
                                <CardTitle className="text-xs font-black text-slate-950 uppercase tracking-widest">General Information</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <Form {...profileForm}>
                                    <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormField
                                                control={profileForm.control}
                                                name="first_name"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">Given Name</FormLabel>
                                                        <FormControl>
                                                            <Input className="h-10 rounded-lg bg-slate-50/50 border-transparent focus:bg-white focus:border-primary transition-all text-sm font-bold" placeholder="First Name" {...field} />
                                                        </FormControl>
                                                        <FormMessage className="text-[10px]" />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={profileForm.control}
                                                name="last_name"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">Surname</FormLabel>
                                                        <FormControl>
                                                            <Input className="h-10 rounded-lg bg-slate-50/50 border-transparent focus:bg-white focus:border-primary transition-all text-sm font-bold" placeholder="Last Name" {...field} />
                                                        </FormControl>
                                                        <FormMessage className="text-[10px]" />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Linked Account</Label>
                                            <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                <div className="h-8 w-8 bg-white rounded-lg flex items-center justify-center border border-slate-100">
                                                    <Mail className="h-4 w-4 text-slate-300" />
                                                </div>
                                                <span className="text-xs font-bold text-slate-700">{userEmail}</span>
                                                <Badge className="ml-auto bg-slate-900/5 text-slate-400 border-none font-black uppercase text-[8px] h-4">System ID</Badge>
                                            </div>
                                        </div>

                                        <FormField
                                            control={profileForm.control}
                                            name="phone"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contact Number</FormLabel>
                                                    <FormControl>
                                                        <div className="relative">
                                                            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300" />
                                                            <Input className="pl-10 h-10 rounded-lg bg-slate-50/50 border-transparent focus:bg-white focus:border-primary transition-all text-sm font-bold" placeholder="Optional" {...field} />
                                                        </div>
                                                    </FormControl>
                                                    <FormMessage className="text-[10px]" />
                                                </FormItem>
                                            )}
                                        />

                                        <Button type="submit" className="h-10 px-6 rounded-lg font-black text-[10px] uppercase tracking-widest bg-primary hover:bg-primary/90 shadow-lg shadow-primary/10" disabled={updatingProfile}>
                                            {updatingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                                            Commit Changes
                                        </Button>
                                    </form>
                                </Form>
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'security' && (
                        <Card className="border-none ring-1 ring-slate-100 shadow-sm rounded-2xl overflow-hidden">
                            <CardHeader className="bg-slate-50/30 border-b border-slate-50 py-5 px-6">
                                <CardTitle className="text-xs font-black text-slate-950 uppercase tracking-widest">Credential Guard</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <Form {...passwordForm}>
                                    <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
                                        <div className="grid gap-4">
                                            <FormField
                                                control={passwordForm.control}
                                                name="password"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">New Password</FormLabel>
                                                        <FormControl>
                                                            <Input type="password" placeholder="••••••••" className="h-10 rounded-lg bg-slate-50/50 border-transparent focus:bg-white focus:border-primary transition-all text-sm font-bold" {...field} />
                                                        </FormControl>
                                                        <FormMessage className="text-[10px]" />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={passwordForm.control}
                                                name="confirmPassword"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">Verify Password</FormLabel>
                                                        <FormControl>
                                                            <Input type="password" placeholder="••••••••" className="h-10 rounded-lg bg-slate-50/50 border-transparent focus:bg-white focus:border-primary transition-all text-sm font-bold" {...field} />
                                                        </FormControl>
                                                        <FormMessage className="text-[10px]" />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100/50 flex items-start gap-3">
                                            <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                                            <p className="text-[9px] font-bold text-amber-700 uppercase leading-snug tracking-tighter">Security note: Always use unique passwords. Minimum 8 characters required.</p>
                                        </div>

                                        <Button type="submit" variant="default" className="h-10 px-6 rounded-lg font-black text-[10px] uppercase tracking-widest bg-slate-950 hover:bg-slate-900 shadow-xl shadow-slate-100" disabled={updatingPassword}>
                                            {updatingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                                            Rotate Keys
                                        </Button>
                                    </form>
                                </Form>
                            </CardContent>
                            <CardFooter className="bg-slate-50/20 px-6 py-5 border-t border-slate-50">
                                <Button variant="ghost" onClick={handleSignOut} className="text-red-500 hover:text-red-600 hover:bg-red-50 font-black text-[10px] uppercase tracking-widest h-9 px-4 rounded-lg">
                                    <LogOut className="mr-2 h-3.5 w-3.5" />
                                    End Session
                                </Button>
                            </CardFooter>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
