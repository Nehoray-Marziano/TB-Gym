"use client";

import { createTheme, ThemeProvider } from "@mui/material/styles";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { heIL } from "@mui/x-date-pickers/locales";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { MobileTimePicker } from "@mui/x-date-pickers/MobileTimePicker";
import type { } from '@mui/x-date-pickers/themeAugmentation';
import dayjs, { Dayjs } from "dayjs";
import "dayjs/locale/he"; // Import Hebrew locale
import { Clock } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

// Keep the time dialog aligned with the studio's mobile palette.
const theme = createTheme({
    direction: "rtl", // Fix visual direction
    palette: {
        mode: "dark",
        primary: {
            main: "#dce780",
            contrastText: "#1b251c",
        },
        background: {
            paper: "#202c21",
            default: "#111a12",
        },
        text: {
            primary: "#f6f6ed",
            secondary: "#aebbad",
        },
    },
    typography: {
        fontFamily: "inherit",
    },
    components: {
        MuiDialog: {
            styleOverrides: {
                paper: {
                    borderRadius: "2rem",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    backgroundImage: "none",
                    backgroundColor: "#202c21",
                    direction: "rtl"
                },
            },
        },
        MuiPickersLayout: {
            styleOverrides: {
                root: {
                    backgroundColor: "#202c21",
                    color: "#f6f6ed",
                    direction: "rtl"
                },
                contentWrapper: {
                    backgroundColor: "#202c21",
                }
            }
        },
        MuiClock: {
            styleOverrides: {
                clock: {
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                },
                root: {
                    direction: "ltr", // Enforce LTR for the clock face to ensure alignment
                }
            },
        },
        MuiClockPointer: {
            styleOverrides: {
                thumb: {
                    width: "12px", // Smaller thumb
                    height: "12px",
                    border: "none",
                    backgroundColor: "#dce780",
                    top: "calc(50% - 6px)", // Center adjustment
                    left: "calc(50% - 6px)",
                },
                root: {
                    backgroundColor: "#dce780",
                    width: "2px", // Thinner line
                }
            }
        },
        MuiClockNumber: {
            styleOverrides: {
                root: {
                    color: "rgba(255, 255, 255, 0.6)",
                    "&.Mui-selected": {
                        color: "#1b251c",
                        fontWeight: "bold",
                        backgroundColor: "#dce780",
                    },
                    "&:not(.Mui-selected):hover": {
                        backgroundColor: "rgba(255,255,255,0.1)",
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

    // Convert string "HH:mm" to dayjs object, ensure it parses correctly
    // We use a fixed date to avoid issues, as we only care about time
    const timeValue = value ? dayjs(`2000-01-01T${value}`) : null;

    const handleChange = (newValue: Dayjs | null) => {
        if (newValue) {
            onChange(newValue.format("HH:mm"));
        }
    };

    return (
        <ThemeProvider theme={theme}>
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="he" localeText={heIL.components.MuiLocalizationProvider.defaultProps.localeText}>
                <div className={className}>
                    {/* Trigger opens the native mobile clock dialog. */}
                    <button
                        type="button"
                        onClick={() => setOpen(true)}
                        className={cn(
                            "flex h-14 w-full items-center justify-between rounded-2xl border border-[#1b251c]/20 bg-[var(--studio-card)] px-3 text-sm font-medium text-[var(--studio-ink)] transition-colors focus:border-[var(--studio-accent-text)]",
                            open && "border-[var(--studio-accent-text)]"
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
                            onChange={handleChange}
                            value={timeValue}
                            ampm={false}
                        />
                    </div>
                </div>
            </LocalizationProvider>
        </ThemeProvider>
    );
}
