"use client";

import { usePathname } from "next/navigation";

export default function PageEntrance({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    return <div key={pathname} className="studio-page-enter">{children}</div>;
}
