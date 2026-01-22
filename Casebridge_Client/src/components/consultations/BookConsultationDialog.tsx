import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogTrigger
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { CalendarIcon, Loader2, Video, MapPin, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';

export function BookConsultationDialog() {
    const [isOpen, setIsOpen] = useState(false);
    const [date, setDate] = useState<Date>();
    const [type, setType] = useState<'Virtual' | 'Physical'>('Virtual');
    const [time, setTime] = useState<string>('09:00');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const queryClient = useQueryClient();

    const timeSlots = [
        '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00'
    ];

    const handleBooking = async () => {
        if (!date || !time) return;

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Authentication required');

            // Combine date and time
            const [hours, minutes] = time.split(':');
            const scheduledAt = new Date(date);
            scheduledAt.setHours(parseInt(hours), parseInt(minutes));

            const { error } = await supabase.from('appointments').insert({
                client_id: user.id,
                appointment_type: type,
                scheduled_at: scheduledAt.toISOString(),
                status: 'Scheduled'
            });

            if (error) throw error;

            setSuccess(true);
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
        } catch (err) {
            console.error('Booking failed', err);
            alert('Failed to book consultation');
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setIsOpen(false);
        setSuccess(false);
        setDate(undefined);
        setType('Virtual');
        setTime('09:00');
    };

    return (
        <Dialog open={isOpen} onOpenChange={(val) => {
            if (!val) reset();
            setIsOpen(val);
        }}>
            <DialogTrigger asChild>
                <Button size="lg" className="bg-primary hover:bg-primary/90">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    Book Consultation
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                {success ? (
                    <div className="py-12 flex flex-col items-center text-center space-y-4">
                        <div className="bg-green-100 p-3 rounded-full">
                            <CheckCircle2 className="h-12 w-12 text-green-600" />
                        </div>
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold text-slate-900">Consultation Booked!</DialogTitle>
                            <DialogDescription className="text-base">
                                Your {type.toLowerCase()} consultation has been scheduled for {date && format(date, 'PPP')} at {time}.
                            </DialogDescription>
                        </DialogHeader>
                        <Button onClick={reset} className="w-full mt-6">
                            Done
                        </Button>
                    </div>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold">Book a Consultation</DialogTitle>
                            <DialogDescription>
                                Select your preferred type, date, and time for the legal consultation.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-6 py-6">
                            <div className="space-y-3">
                                <Label className="text-sm font-semibold uppercase tracking-wider text-slate-500">Consultation Type</Label>
                                <RadioGroup
                                    defaultValue="Virtual"
                                    value={type}
                                    onValueChange={(val: any) => setType(val)}
                                    className="grid grid-cols-2 gap-4"
                                >
                                    <div>
                                        <RadioGroupItem value="Virtual" id="virtual" className="peer sr-only" />
                                        <Label
                                            htmlFor="virtual"
                                            className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-slate-50 peer-data-[state=checked]:border-primary transition-all cursor-pointer"
                                        >
                                            <Video className="mb-2 h-6 w-6" />
                                            <span className="text-sm font-bold">Virtual</span>
                                        </Label>
                                    </div>
                                    <div>
                                        <RadioGroupItem value="Physical" id="physical" className="peer sr-only" />
                                        <Label
                                            htmlFor="physical"
                                            className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-slate-50 peer-data-[state=checked]:border-primary transition-all cursor-pointer"
                                        >
                                            <MapPin className="mb-2 h-6 w-6" />
                                            <span className="text-sm font-bold">Physical</span>
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </div>

                            <div className="space-y-3">
                                <Label className="text-sm font-semibold uppercase tracking-wider text-slate-500">Select Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal h-12 rounded-xl",
                                                !date && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {date ? format(date, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={date}
                                            onSelect={setDate}
                                            initialFocus
                                            disabled={(date) => date < new Date() || date.getDay() === 0 || date.getDay() === 6}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="space-y-3">
                                <Label className="text-sm font-semibold uppercase tracking-wider text-slate-500">Select Time</Label>
                                <div className="grid grid-cols-4 gap-2">
                                    {timeSlots.map((t) => (
                                        <Button
                                            key={t}
                                            variant={time === t ? 'default' : 'outline'}
                                            className={cn(
                                                "h-10 text-xs rounded-lg",
                                                time === t && "bg-primary text-white"
                                            )}
                                            onClick={() => setTime(t)}
                                        >
                                            {t}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                className="w-full h-12 text-base font-semibold rounded-xl"
                                disabled={!date || !time || loading}
                                onClick={handleBooking}
                            >
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Confirm Booking
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
