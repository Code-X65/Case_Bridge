import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Star, X, Loader2, Send, ShieldCheck } from 'lucide-react';

interface ReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    matterId: string;
    onSuccess?: () => void;
}

export default function ReviewModal({ isOpen, onClose, matterId, onSuccess }: ReviewModalProps) {
    const { user } = useAuth();
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [feedback, setFeedback] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!user || rating === 0) return;

        setIsSubmitting(true);
        try {
            const { error } = await supabase
                .from('matter_reviews')
                .insert({
                    matter_id: matterId,
                    client_id: user.id,
                    rating,
                    feedback
                });

            if (error) throw error;
            
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            console.error("Error submitting review:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-card border border-border rounded-[2.5rem] w-full max-w-xl overflow-hidden shadow-neumorph-lg animate-in zoom-in-95 duration-500">
                <div className="p-8 border-b border-border bg-gradient-to-br from-primary/5 to-transparent relative">
                    <button 
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-input transition-all"
                    >
                        <X size={20} />
                    </button>
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6 shadow-sm border border-primary/20">
                        <Star size={32} className="fill-primary" />
                    </div>
                    <h2 className="text-2xl font-black text-foreground tracking-tight">Case Feedback</h2>
                    <p className="text-muted-foreground text-sm mt-1 uppercase tracking-widest font-bold">Share Your Experience</p>
                </div>

                <div className="p-8 space-y-8">
                    <div>
                        <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4 block text-center">Your Rating</label>
                        <div className="flex justify-center gap-3">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    onMouseEnter={() => setHoverRating(star)}
                                    onMouseLeave={() => setHoverRating(0)}
                                    onClick={() => setRating(star)}
                                    className="transition-all duration-300 active:scale-90"
                                >
                                    <Star
                                        size={40}
                                        className={`transition-all duration-300 ${
                                            (hoverRating || rating) >= star 
                                            ? 'fill-primary text-primary drop-shadow-[0_0_8px_rgba(201,162,77,0.4)]' 
                                            : 'text-border fill-transparent'
                                        }`}
                                    />
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] block">Comments (Optional)</label>
                        <textarea
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="Help us improve our service by sharing your thoughts..."
                            className="w-full bg-input border border-border rounded-2xl p-5 text-sm text-foreground min-h-[140px] focus:ring-2 focus:ring-primary shadow-neumorph-inset outline-none transition-all resize-none"
                        />
                    </div>

                    <div className="flex items-center justify-between pt-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <ShieldCheck size={14} className="text-primary/70" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Secure & Confidential</span>
                        </div>
                        <button
                            onClick={handleSubmit}
                            disabled={rating === 0 || isSubmitting}
                            className="px-10 py-4 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-black rounded-2xl transition-all shadow-neumorph flex items-center gap-3 group active:scale-95"
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <span>Submit Review</span>
                                    <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
