"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Clock, Check } from "lucide-react";

interface TimePickerDialProps {
    value: string; // "HH:mm"
    onChange: (value: string) => void;
    className?: string;
}

export function TimePickerDial({ value, onChange, className }: TimePickerDialProps) {
    // Parse initial value
    const [initialHour, initialMinute] = value.split(":").map(Number);

    // Mode: 'hours' | 'minutes' | 'confirm'
    const [mode, setMode] = useState<'hours' | 'minutes'>('hours');
    const [selectedHour, setSelectedHour] = useState(initialHour || 8);
    const [selectedMinute, setSelectedMinute] = useState(initialMinute || 0);

    const hours = Array.from({ length: 24 }, (_, i) => i);
    const minutes = Array.from({ length: 12 }, (_, i) => i * 5); // 0, 5, 10, ... 55

    // Handle hour selection
    const handleHourSelect = (hour: number) => {
        setSelectedHour(hour);
        const newTime = `${hour.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`;
        onChange(newTime);
        setTimeout(() => setMode('minutes'), 300); // Auto-advance to minutes
    };

    // Handle minute selection
    const handleMinuteSelect = (minute: number) => {
        setSelectedMinute(minute);
        const newTime = `${selectedHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        onChange(newTime);
    };

    // Helper to calculate position on circle
    const getPosition = (index: number, total: number, radius: number) => {
        const angle = (index * (360 / total) - 90) * (Math.PI / 180);
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        return { x, y };
    };

    return (
        <div className={cn("w-full max-w-sm mx-auto", className)}>
            {/* Display / Toggle Mode */}
            <div className="flex items-center justify-center gap-2 mb-8">
                <button
                    onClick={() => setMode('hours')}
                    className={cn(
                        "text-5xl font-bold transition-colors p-2 rounded-xl",
                        mode === 'hours' ? "text-[#E2F163] bg-[#E2F163]/10" : "text-neutral-500 hover:text-white"
                    )}
                >
                    {selectedHour.toString().padStart(2, '0')}
                </button>
                <span className="text-5xl font-bold text-neutral-600 pb-2">:</span>
                <button
                    onClick={() => setMode('minutes')}
                    className={cn(
                        "text-5xl font-bold transition-colors p-2 rounded-xl",
                        mode === 'minutes' ? "text-[#E2F163] bg-[#E2F163]/10" : "text-neutral-500 hover:text-white"
                    )}
                >
                    {selectedMinute.toString().padStart(2, '0')}
                </button>
            </div>

            {/* Dial Container */}
            <div className="relative aspect-square w-full max-w-[280px] mx-auto bg-neutral-900/50 rounded-full border border-white/5 shadow-2xl p-4">
                {/* Center Dot */}
                <div className="absolute inset-0 m-auto w-2 h-2 bg-[#E2F163] rounded-full z-10 box-shadow-[0_0_10px_#E2F163]" />

                <AnimatePresence mode="wait">
                    {mode === 'hours' ? (
                        <motion.div
                            key="hours"
                            initial={{ opacity: 0, scale: 0.9, rotate: -20 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            exit={{ opacity: 0, scale: 0.9, rotate: 20 }}
                            className="w-full h-full relative"
                        >
                            {/* Inner Circle (13-00) often used in 24h clocks, or just 1 circle for simple 24h design. 
                                Let's do a single circle for 0-23 if possible, or two concentric circles.
                                Given 24 numbers, typically 2 circles is better for readability.
                                Outer: 00-11 (AMish), Inner: 13-23? Or standard 1-12 and toggle AM/PM.
                                The requirement says "hour+minute dials", and user likely wants 24h format as per previous code.
                                Let's do two layers for 24h: 00-11 outer, 12-23 inner? Or vice versa.
                                Actually typical android style: 1-12 inner, 13-00 outer sounds crowded.
                                Let's stick to a clean 1-12 outer, and if 24h is needed, usually there's an AM/PM toggle or a 2-ring layout.
                                Let's try a single ring 0-23 using small intervals? No, text is too small.
                                Let's do: Outer ring = Even numbers, Inner ring = Dots?
                                Let's do: 12-hour face with AM/PM toggle?
                                The previous dropdown was 07:00 to 21:00 (approx).Gym hours.
                                Let's do a single ring of available hours for Gym? 
                                07, 08, 09 .... 22. 
                                Let's simply show 06 - 23 in a circle? 18 items. It fits.
                            */}
                            {hours.slice(6, 24).map((hour, i, arr) => {
                                const { x, y } = getPosition(i, arr.length, 100); // 100px radius
                                const isSelected = hour === selectedHour;
                                return (
                                    <button
                                        key={hour}
                                        onClick={() => handleHourSelect(hour)}
                                        className={cn(
                                            "absolute w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg transition-all",
                                            isSelected
                                                ? "bg-[#E2F163] text-black shadow-[0_0_15px_#E2F163] scale-110 z-20"
                                                : "text-neutral-400 hover:text-white hover:bg-white/10"
                                        )}
                                        style={{
                                            left: `calc(50% + ${x}px - 20px)`,
                                            top: `calc(50% + ${y}px - 20px)`,
                                        }}
                                    >
                                        {hour}
                                        {/* Hand connector for selected */}
                                        {isSelected && (
                                            <motion.div
                                                layoutId="hand-hour"
                                                className="absolute inset-0 m-auto w-[2px] h-[100px] bg-[#E2F163] -z-10 origin-bottom"
                                                style={{
                                                    top: '50%',
                                                    left: '50%',
                                                    transform: `translate(-50%, -50%) rotate(${Math.atan2(y, x) * (180 / Math.PI) + 90}deg) translateY(-50px)` // Approx math... CSS rotation is easier from center
                                                }}
                                            />
                                        )}
                                        {/* Simplified Hand: Just draw a line from center (0,0) to button center (x,y) */}
                                        {isSelected && (
                                            <div
                                                className="absolute top-1/2 left-1/2 w-full h-[2px] bg-[#E2F163] -z-10 origin-left pointer-events-none opacity-50"
                                                style={{
                                                    width: '100px', // radius
                                                    transform: `translate(-50%, -50%) rotate(${Math.atan2(y, x) * (180 / Math.PI) - 180}deg) translate(50%, 0)`, // this math is getting tricky interacting with DOM flow.
                                                    // Let's use SVG for the hand if we want a line, otherwise just highlighting the bubble is often enough for "modern" UI.
                                                }}
                                            />
                                        )}
                                    </button>
                                );
                            })}

                            {/* Simple Center Helper Text */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <span className="text-xs font-bold text-neutral-600 tracking-widest uppercase mt-8">Hours</span>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="minutes"
                            initial={{ opacity: 0, scale: 0.9, rotate: 20 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            exit={{ opacity: 0, scale: 0.9, rotate: -20 }}
                            className="w-full h-full relative"
                        >
                            {minutes.map((minute, i) => {
                                const { x, y } = getPosition(i, 12, 100);
                                const isSelected = minute === selectedMinute;
                                return (
                                    <button
                                        key={minute}
                                        onClick={() => handleMinuteSelect(minute)}
                                        className={cn(
                                            "absolute w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg transition-all",
                                            isSelected
                                                ? "bg-[#E2F163] text-black shadow-[0_0_15px_#E2F163] scale-110 z-20"
                                                : "text-neutral-400 hover:text-white hover:bg-white/10"
                                        )}
                                        style={{
                                            left: `calc(50% + ${x}px - 20px)`,
                                            top: `calc(50% + ${y}px - 20px)`,
                                        }}
                                    >
                                        {minute.toString().padStart(2, '0')}
                                    </button>
                                );
                            })}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <span className="text-xs font-bold text-neutral-600 tracking-widest uppercase mt-8">Min</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Helper Caption */}
            <p className="text-center text-neutral-500 text-sm mt-6">
                {mode === 'hours' ? 'בחרי שעת התחלה' : 'בחרי דקות'}
            </p>
        </div>
    );
}
