import type { Metadata } from "next";
import AppRecovery from "@/components/AppRecovery";

export const metadata: Metadata = { title: "העמוד לא נמצא | סטודיו טליה" };

export default function NotFound() {
    return <AppRecovery title="העמוד לא נמצא" message="יכול להיות שהקישור השתנה. אפשר לחזור לבית ולהמשיך משם." />;
}
