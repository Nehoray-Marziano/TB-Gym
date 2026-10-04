"use client";

import { createTheme, ThemeProvider } from "@mui/material/styles";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { heIL } from "@mui/x-date-pickers/locales";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { MobileTimePicker } from "@mui/x-date-pickers/MobileTimePicker";
import type {} from "@mui/x-date-pickers/themeAugmentation";
import dayjs from "dayjs";
import "dayjs/locale/he";
import { Clock } from "lucide-react";
import { useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useStudioModalContainer } from "./StudioModal";

// MUI needs concrete primary colors for alpha calculations; these adapt the
// canonical --studio-brand / --studio-ink values in globals.css.
const theme = createTheme({
    direction: "rtl",
    palette: { mode: "light", primary: { main: "#8b8e6f", contrastText: "#162218" } },
    typography: { fontFamily: "var(--font-varela-round), sans-serif" },
    components: {
        MuiDialog: { styleOverrides: { paper: {
            borderRadius: "28px", backgroundImage: "none", backgroundColor: "var(--studio-sheet)",
            color: "var(--studio-ink)", direction: "rtl", margin: "12px",
            maxHeight: "calc(var(--modal-height, 100dvh) - 24px)",
            border: "1px solid color-mix(in srgb, var(--studio-ink) 15%, transparent)",
        } } },
        MuiPickersLayout: { styleOverrides: { root: { backgroundColor: "var(--studio-sheet)", color: "var(--studio-ink)" } } },
        MuiClock: { styleOverrides: { root: { direction: "ltr" }, clock: { backgroundColor: "var(--studio-neutral-bg)" } } },
        MuiButton: { styleOverrides: { root: { minHeight: "44px", borderRadius: "999px", textTransform: "none", fontWeight: 700, color: "var(--studio-ink)" } } },
    },
});

interface MuiTimePickerWrapperProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
}

export function MuiTimePickerWrapper({ value, onChange, className }: MuiTimePickerWrapperProps) {
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState(value);
    const trigger = useRef<HTMLButtonElement>(null);
    const container = useStudioModalContainer();
    const reduceMotion = useReducedMotion();
    return <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="he" localeText={heIL.components.MuiLocalizationProvider.defaultProps.localeText}>
            <div className={className}>
                <button ref={trigger} type="button" aria-label={`בחירת שעת האימון, ${value}`} aria-haspopup="dialog" aria-expanded={open}
                    onClick={() => { setDraft(value); setOpen(true); }}
                    className={cn("flex h-14 w-full items-center justify-between rounded-2xl border border-[#1b251c]/20 bg-[var(--studio-card)] px-3 text-sm font-medium text-[var(--studio-ink)]", open && "border-[var(--studio-subtle)]")}>
                    <span dir="ltr">{value}</span><Clock aria-hidden="true" className="h-4 w-4 opacity-60" />
                </button>
                <div hidden>
                    <MobileTimePicker open={open} onClose={() => setOpen(false)} value={dayjs(`2000-01-01T${draft}`)} ampm={false}
                        onChange={next => { if (next?.isValid()) setDraft(next.format("HH:mm")); }}
                        onAccept={next => { if (next?.isValid()) onChange(next.format("HH:mm")); }}
                        slotProps={{
                            dialog: { container: container ?? undefined, className: "studio-admin-time-dialog", disableRestoreFocus: true,
                                onKeyDown: event => {
                                    // MUI dismisses its own dialog; prevent the native
                                    // parent dialog's default Escape cancellation.
                                    if (event.key === "Escape") event.preventDefault();
                                    event.stopPropagation();
                                },
                                sx: { "& .MuiBackdrop-root": { backgroundColor: "color-mix(in srgb, var(--studio-deep) 76%, transparent)" } },
                                slotProps: { transition: { timeout: reduceMotion ? 0 : 160, onExited: () => trigger.current?.focus({ preventScroll: true }) } },
                            },
                            toolbar: { hidden: false },
                            actionBar: { actions: ["cancel", "accept"] },
                        }}
                    />
                </div>
            </div>
        </LocalizationProvider>
    </ThemeProvider>;
}
