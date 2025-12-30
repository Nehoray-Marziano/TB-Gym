"use client";

import { createTheme, ThemeProvider } from "@mui/material/styles";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { MobileTimePicker } from "@mui/x-date-pickers/MobileTimePicker";
import type { } from '@mui/x-date-pickers/themeAugmentation';
import dayjs, { Dayjs } from "dayjs";
import { Clock } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

// Create a custom MUI theme to match the app's dark neon aesthetics
const theme = createTheme({
    palette: {
        mode: "dark",
        primary: {
            main: "#E2F163", // Neon Yellow
            contrastText: "#000000",
        },
        background: {
            paper: "#1A1C19", // Dark background
            default: "#000000",
        },
        text: {
            primary: "#ffffff",
            secondary: "#a3a3a3",
        },
    },
    typography: {
        fontFamily: "inherit",
    },
    components: {
        MuiDialog: {
            styleOverrides: {
                paper: {
                    borderRadius: "2.5rem", // Match app rounded corners
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    backgroundImage: "none",
                    backgroundColor: "#1A1C19",
                },
            },
        },
        MuiPickersLayout: {
            styleOverrides: {
                root: {
                    backgroundColor: "#1A1C19",
                    color: "#ffffff",
                },
                contentWrapper: {
                    backgroundColor: "#1A1C19",
                }
            }
        },
        MuiClock: {
            styleOverrides: {
                clock: {
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                },
            },
        },
        MuiClockPointer: {
            styleOverrides: {
                thumb: {
                    border: "2px solid #E2F163",
                    backgroundColor: "#000000",
                },
                root: {
                    backgroundColor: "#E2F163",
                }
            }
        },
        MuiClockNumber: {
            styleOverrides: {
                root: {
                    "&.Mui-selected": {
                        color: "#000000",
                        fontWeight: "bold",
                    }
                }
            }
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: "1rem",
                    textTransform: "none",
                    fontWeight: "bold",
                }
            }
        }
    },
});

interface MuiTimePickerWrapperProps {
    value: string; // "HH:mm"
    onChange: (value: string) => void;
    className?: string;
}

export function MuiTimePickerWrapper({ value, onChange, className }: MuiTimePickerWrapperProps) {
    const [open, setOpen] = useState(false);

    // Convert string "HH:mm" to dayjs object
    const timeValue = value ? dayjs(`2000-01-01T${value}`) : null;

    const handleAccept = (newValue: Dayjs | null) => {
        if (newValue) {
            onChange(newValue.format("HH:mm"));
        }
        setOpen(false);
    };

    return (
        <ThemeProvider theme={theme}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <div className={className}>
                    {/* Trigger Button - Mimicking the existing button style */}
                    <button
                        type="button"
                        onClick={() => setOpen(true)}
                        className={cn(
                            "w-full h-14 bg-neutral-900 border border-neutral-800 rounded-2xl text-base font-medium px-4 text-white hover:bg-neutral-800 focus:ring-1 focus:ring-[#E2F163] flex items-center justify-between transition-all",
                            open && "ring-1 ring-[#E2F163]"
                        )}
                    >
                        <span>{value}</span>
                        <Clock className="w-4 h-4 opacity-50" />
                    </button>

                    {/* Hidden Picker - controlled via 'open' state */}
                    <div style={{ display: 'none' }}>
                        <MobileTimePicker
                            open={open}
                            onClose={() => setOpen(false)}
                            onAccept={handleAccept}
                            value={timeValue}
                            ampm={false}
                        />
                    </div>
                </div>
            </LocalizationProvider>
        </ThemeProvider>
    );
}
