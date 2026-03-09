import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'rect' | 'circle';
}

export default function Skeleton({ className, variant = 'rect' }: SkeletonProps) {
    return (
        <motion.div
            initial={{ opacity: 0.3 }}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
            }}
            className={cn(
                "bg-white/5",
                variant === 'circle' ? "rounded-full" : "rounded-xl",
                className
            )}
        />
    );
}

// Pre-composed Layouts

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number, cols?: number }) {
    return (
        <div className="w-full bg-[#1E293B] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
            <div className="border-b border-white/5 p-4 grid gap-4 items-center" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
                {Array.from({ length: cols }).map((_, i) => (
                    <Skeleton key={i} className="h-4 w-24" />
                ))}
            </div>
            {Array.from({ length: rows }).map((_, r) => (
                <div key={r} className="p-4 border-b border-white/5 last:border-0 grid gap-4 items-center" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
                    <div className="flex items-center gap-3">
                        <Skeleton variant="circle" className="w-8 h-8 shrink-0" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                    {Array.from({ length: cols - 1 }).map((_, c) => (
                        <Skeleton key={c} className="h-4 w-full max-w-[120px]" />
                    ))}
                </div>
            ))}
        </div>
    );
}

export function CardSkeleton() {
    return (
        <div className="bg-[#1E293B] p-6 rounded-2xl border border-white/5 shadow-xl flex flex-col gap-4">
            <div className="flex justify-between items-start mb-2">
                <div className="flex gap-3 items-center">
                    <Skeleton variant="circle" className="w-12 h-12" />
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-3 w-20" />
                    </div>
                </div>
                <Skeleton className="h-8 w-24 rounded-full" />
            </div>
            <Skeleton className="h-20 w-full" />
            <div className="flex gap-3 mt-auto pt-4 border-t border-white/5">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-24" />
            </div>
        </div>
    );
}

export function ProfileSkeleton() {
    return (
        <div className="space-y-8 max-w-2xl">
            <div className="flex items-center gap-6">
                <Skeleton variant="circle" className="w-24 h-24" />
                <div className="space-y-3">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-8 w-24 rounded-full mt-2" />
                </div>
            </div>
            <div className="space-y-6 pt-6 border-t border-white/10">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-12 w-full" />
                </div>
            </div>
        </div>
    );
}

export function MatterCardSkeleton() {
    return (
        <div className="bg-[#1E293B] p-6 rounded-2xl border border-white/5 relative overflow-hidden">
            <div className="flex justify-between items-start mb-6 z-10 relative">
                <div className="space-y-3 flex-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton variant="circle" className="w-10 h-10 shrink-0" />
            </div>

            <div className="space-y-4 z-10 relative">
                <div>
                    <div className="flex justify-between mb-2">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-3 w-12" />
                    </div>
                    <Skeleton className="h-2 w-full rounded-full" />
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/5">
                    <div className="flex items-center gap-3">
                        <Skeleton variant="circle" className="w-8 h-8 shrink-0" />
                        <div className="space-y-2">
                            <Skeleton className="h-3 w-16" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 items-end justify-center">
                        <Skeleton className="h-8 w-24" />
                    </div>
                </div>
            </div>
        </div>
    );
}
