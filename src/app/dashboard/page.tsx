import { createClient } from "@/utils/supabase/server";
import UserDashboard from "@/components/home/UserDashboard";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        console.log("[Dashboard] No user found, redirecting to login");
        redirect("/auth/login");
    } else {
        console.log("[Dashboard] User found:", user.id);
    }

    return <UserDashboard user={user} />;
}
