import { Metadata } from "next";
import OfflineFallback from "@/components/OfflineFallback";

export const metadata: Metadata = {
    title: "Offline - Talia Gym",
};

export default function OfflinePage() {
    return <OfflineFallback />;
}
