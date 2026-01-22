import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Gavel, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/contexts/AuthContext';

const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
    const { session, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (location.state?.error) {
            setError(location.state.error);
        }
    }, [location.state]);

    // Redirect if already logged in
    useEffect(() => {
        if (!authLoading && session) {
            navigate('/client/dashboard', { replace: true });
        }
    }, [session, authLoading, navigate]);

    const form = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    });

    const onSubmit = async (values: LoginFormValues) => {
        setLoading(true);
        setError(null);
        const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
            email: values.email,
            password: values.password,
        });

        if (authError) {
            setError(authError.message);
            setLoading(false);
            return;
        }

        if (user) {
            // Check if the user is an internal staff member
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('internal_role')
                .eq('id', user.id)
                .single();

            if (!profileError && profile?.internal_role) {
                // Internal staff shouldn't be here
                await supabase.auth.signOut();
                setError('This portal is for clients only. Internal staff should use the internal operations platform.');
                setLoading(false);
                return;
            }

            navigate('/client/dashboard');
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
            <div className="flex items-center gap-2 mb-8 text-primary font-bold text-3xl">
                <Gavel className="h-8 w-8" />
                <span>CaseBridge</span>
            </div>

            <Card className="w-full max-w-md shadow-lg border-slate-200">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold">Login</CardTitle>
                    <CardDescription>
                        Enter your email and password to access your client portal
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                            <Input placeholder="name@example.com" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Password</FormLabel>
                                        <FormControl>
                                            <Input type="password" placeholder="••••••••" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {error && (
                                <div className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md">
                                    {error}
                                </div>
                            )}

                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Sign In
                            </Button>
                        </form>
                    </Form>
                </CardContent>
                <CardFooter className="flex flex-col space-y-4">
                    <div className="text-sm text-center text-slate-600">
                        Don't have an account?{' '}
                        <Link to="/signup" className="text-primary font-semibold hover:underline">
                            Create an account
                        </Link>
                    </div>
                </CardFooter>
            </Card>

            <p className="mt-8 text-sm text-slate-500">
                &copy; {new Date().getFullYear()} CaseBridge Legal Technologies. All rights reserved.
            </p>
        </div>
    );
}
