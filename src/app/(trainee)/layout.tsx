import BottomNav from "@/components/BottomNav";
import { TraineeIdentity } from "@/components/TraineeIdentity";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import PageEntrance from "@/components/PageEntrance";

export default async function TraineeLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const userId = data?.claims?.sub;
    if (!userId) redirect("/auth/login");

    return (
        <TraineeIdentity userId={userId}>
            <div className="studio-app-shell">
                <div className="relative flex-1 h-full w-full overflow-hidden">
                    <PageEntrance>{children}</PageEntrance>
                </div>
                <BottomNav />
            </div>
        </TraineeIdentity>
    );
}
