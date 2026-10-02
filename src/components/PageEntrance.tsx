"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getPageEntranceDirection } from "@/lib/navigation";

export default function PageEntrance({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [entrance, setEntrance] = useState({ pathname, direction: "none" });

    // Resolve direction before committing the new keyed page, including Back/Forward.
    // An effect would paint the new page with the previous transition first.
    if (entrance.pathname !== pathname) {
        setEntrance({ pathname, direction: getPageEntranceDirection(entrance.pathname, pathname) });
    }

    useEffect(() => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
    }, [pathname]);

    return <div key={pathname} data-entry={entrance.direction} className="studio-page-enter h-full w-full overflow-hidden">{children}</div>;
}
