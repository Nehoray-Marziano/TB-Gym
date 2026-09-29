import BottomNav from "@/components/BottomNav";
import { TraineeIdentity } from "@/components/TraineeIdentity";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function TraineeLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const userId = data?.claims?.sub;
    if (!userId) redirect("/auth/login");

    return <TraineeIdentity userId={userId}>{children}<BottomNav /></TraineeIdentity>;
}
