import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';

export default function EmailVerificationPending() {
    return (
        <div className="page-container">
            <div className="glass-card auth-card text-center">
                <div className="flex-center mb-6">
                    <div className="p-4 rounded-full bg-primary/10 text-primary">
                        <Mail size={48} color="hsl(var(--primary))" />
                    </div>
                </div>

                <h1 className="mb-4">Check your email</h1>
                <p className="text-muted mb-8">
                    We've sent a verification link to your email address.
                    Please click the link to verify your account and continue.
                </p>

                <Link to="/login" className="btn btn-secondary">
                    Return to Login
                </Link>
            </div>
        </div>
    );
}
