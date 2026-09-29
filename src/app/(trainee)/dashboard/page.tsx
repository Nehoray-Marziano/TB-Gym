import { createClient } from "@/utils/supabase/server";
import UserDashboard from "@/components/home/UserDashboard";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    if (error) console.error("[Dashboard] Auth Error:", error.message);

    const userId = data?.claims?.sub;
    if (!userId) {
        console.log("[Dashboard] No user found, redirecting to login");
        redirect("/auth/login");
    }

    return <UserDashboard userId={userId} />;
}
