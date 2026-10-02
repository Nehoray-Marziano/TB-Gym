"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function PageEntrance({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    useEffect(() => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
    }, [pathname]);

    return <div key={pathname} className="studio-page-enter h-full w-full overflow-hidden">{children}</div>;
}
