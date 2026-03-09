import { WifiOff, CloudOff, RefreshCcw } from 'lucide-react';
import { useConnectivity } from '../contexts/ConnectivityContext';

export default function ConnectivityBanner() {
    const { isOnline, isRealtimeConnected, lastError } = useConnectivity();

    if (isOnline && isRealtimeConnected) return null;

    return (
        <div className="sticky top-16 lg:top-0 z-50 w-full animate-in slide-in-from-top duration-500 overflow-hidden">
            <div className={`p-4 flex items-center justify-between gap-4 backdrop-blur-xl border-b transition-colors duration-500 ${!isOnline ? 'bg-rose-500/10 border-rose-500/20' : 'bg-amber-500/10 border-amber-500/20'
                }`}>
                
                <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${!isOnline ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                        {!isOnline ? <WifiOff size={20} /> : <CloudOff size={20} />}
                    </div>
                    
                    <div>
                        <p className={`text-sm font-black uppercase tracking-tight ${!isOnline ? 'text-rose-400' : 'text-amber-400'
                            }`}>
                            {!isOnline ? 'Network Connectivity Lost' : 'Realtime Sync Interrupted'}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
                            {!isOnline
                                ? 'Your browser is currently offline. Some features may be limited.'
                                : lastError || 'Live updates are suspended. Retrying connection...'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-input/50 border border-border">
                        <div className={`w-2 h-2 rounded-full animate-pulse ${!isOnline ? 'bg-rose-500' : 'bg-amber-500'}`} />
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                            {!isOnline ? 'Offline' : 'Reconnecting'}
                        </span>
                    </div>
                    
                    {!isOnline && (
                        <button
                            onClick={() => window.location.reload()}
                            className="bg-rose-500 text-white p-2 rounded-lg hover:bg-rose-600 transition-all active:scale-95 shadow-lg shadow-rose-500/20"
                            title="Force Refresh"
                        >
                            <RefreshCcw size={16} />
                        </button>
                    )}
                </div>
            </div>
            
            {/* Ambient indicator across the bottom */}
            <div className={`h-[1px] w-full bg-gradient-to-r from-transparent via-current to-transparent opacity-20 ${!isOnline ? 'text-rose-500' : 'text-amber-500'
                }`} />
        </div>
    );
}
