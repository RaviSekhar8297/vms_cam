"use client";

import { useState, useRef, useEffect } from "react";
import { 
    format, 
    addMonths, 
    subMonths, 
    startOfMonth, 
    endOfMonth, 
    startOfWeek, 
    endOfWeek, 
    isSameMonth, 
    isSameDay, 
    eachDayOfInterval,
    isAfter,
    startOfToday,
    parseISO
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DatePickerProps {
    date?: string;
    onChange: (date: string) => void;
    maxDate?: Date;
    label?: string;
    align?: "left" | "right";
}

export function DatePicker({ date, onChange, maxDate, label, align = "left" }: DatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(date ? parseISO(date) : new Date());
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedDate = date ? parseISO(date) : null;
    const today = startOfToday();

    // Close when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    const handleDateSelect = (d: Date) => {
        if (maxDate && isAfter(d, maxDate)) return;
        onChange(format(d, "yyyy-MM-dd"));
        setIsOpen(false);
    };

    const nextMonth = () => setViewDate(addMonths(viewDate, 1));
    const prevMonth = () => setViewDate(subMonths(viewDate, 1));

    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const calendarDays = eachDayOfInterval({
        start: startDate,
        end: endDate,
    });

    return (
        <div className="relative inline-block" ref={containerRef}>
            {/* Trigger */}
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className="flex flex-col px-3 py-1.5 hover:bg-muted/40 transition-colors cursor-pointer"
            >
                {label && (
                    <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest leading-none mb-1">
                        {label}
                    </span>
                )}
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-foreground uppercase tracking-tight">
                        {date ? format(parseISO(date), "MMM dd, yyyy") : "Select Date"}
                    </span>
                </div>
            </div>

            {/* Popover */}
            {isOpen && (
                <div className={`absolute top-full ${align === "right" ? "right-0" : "left-0"} mt-2 z-[100] bg-card border border-border/50 shadow-2xl rounded-2xl p-4 w-72 animate-in fade-in zoom-in-95 duration-200`}>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4 px-1">
                        <button onClick={prevMonth} className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground">
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <div className="text-sm font-bold text-foreground flex items-center gap-1">
                            {format(viewDate, "MMMM")}
                            <span className="text-muted-foreground font-medium">{format(viewDate, "yyyy")}</span>
                        </div>
                        <button onClick={nextMonth} className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground">
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Weekdays */}
                    <div className="grid grid-cols-7 mb-2">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                            <div key={day} className="text-center text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest py-2">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {calendarDays.map((day, idx) => {
                            const isCurrentMonth = isSameMonth(day, monthStart);
                            const isToday = isSameDay(day, today);
                            const isSelected = selectedDate && isSameDay(day, selectedDate);
                            const isDisabled = maxDate && isAfter(day, maxDate);

                            return (
                                <button
                                    key={idx}
                                    onClick={() => !isDisabled && handleDateSelect(day)}
                                    disabled={isDisabled}
                                    className={`
                                        h-8 w-8 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center
                                        ${!isCurrentMonth ? "text-muted-foreground/20" : "text-foreground"}
                                        ${isSelected ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-110" : "hover:bg-muted"}
                                        ${isToday && !isSelected ? "border-2 border-primary/20 text-primary" : ""}
                                        ${isDisabled ? "opacity-20 cursor-not-allowed grayscale" : "cursor-pointer"}
                                    `}
                                >
                                    {format(day, "d")}
                                </button>
                            );
                        })}
                    </div>

                    {/* Footer / Today Link */}
                    <div className="mt-4 pt-3 border-t border-border/10 flex justify-center">
                        <button 
                            onClick={() => handleDateSelect(today)}
                            className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline"
                        >
                            Jump to Today
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
