"use client";

import { useRef } from "react";
import { Search, X } from "lucide-react";
import { CopyableInput } from "@/components/ui/copyable-field";

export function AdminSearch({ value, onChange, dark = false }: { value: string; onChange: (value: string) => void; dark?: boolean }) {
    const input = useRef<HTMLInputElement>(null);
    return <div className="relative">
        <Search aria-hidden="true" className={`pointer-events-none absolute right-4 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 ${dark ? "text-[var(--admin-muted)]" : "text-[var(--studio-muted)]"}`} />
        <CopyableInput ref={input} copyLabel="העתקת החיפוש" type="search" aria-label="חיפוש מתאמנת" placeholder="חיפוש לפי שם, מייל או טלפון" value={value} onChange={event => onChange(event.target.value)} className={`min-h-14 w-full rounded-2xl border py-3 pr-11 pl-[6.5rem] text-sm outline-none [&::-webkit-search-cancel-button]:appearance-none ${dark ? "border-white/15 bg-[var(--admin-surface)] text-[var(--studio-deep-contrast)] placeholder:text-[var(--admin-muted)]" : "border-[#1b251c]/20 bg-[var(--studio-card)] text-[var(--studio-ink)] placeholder:text-[var(--studio-muted)]"}`} />
        {value && <button type="button" aria-label="ניקוי החיפוש" onClick={() => { onChange(""); input.current?.focus(); }} className="absolute left-12 top-1/2 z-[1] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full"><X aria-hidden="true" className="h-4 w-4" /></button>}
    </div>;
}
