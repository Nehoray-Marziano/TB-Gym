import TraineeDashboard from "@/components/home/TraineeDashboard";
import { getGymIdentity, getGymBootstrap } from "@/lib/gym-bootstrap";
import { loadUpcomingSession } from "@/lib/gym-data";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
    const { supabase, userId } = await getGymIdentity();
    if (!userId) redirect("/auth/login");
    const [initialData, initialUpcoming] = await Promise.all([
        getGymBootstrap(),
        loadUpcomingSession(supabase, userId)
            .then(session => ({ session, error: false }))
            .catch(() => ({ session: null, error: true })),
    ]);
    return <TraineeDashboard userId={userId} initialData={initialData ?? undefined} initialUpcoming={initialUpcoming} />;
}
