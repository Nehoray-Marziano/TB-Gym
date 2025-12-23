import { createClient } from "@/utils/supabase/server";
import UserDashboard from "@/components/home/UserDashboard";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth/login");
    }

    return <UserDashboard user={user} />;
}
