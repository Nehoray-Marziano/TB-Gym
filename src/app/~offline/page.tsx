import { Metadata } from "next";
import OfflineFallback from "@/components/OfflineFallback";

export const metadata: Metadata = {
    title: "אין חיבור | סטודיו טליה",
};

export default function OfflinePage() {
    return <OfflineFallback />;
}
