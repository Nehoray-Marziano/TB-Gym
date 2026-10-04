import BottomNav from "@/components/BottomNav";
import { TraineeIdentity } from "@/components/TraineeIdentity";
import { getGymIdentity } from "@/lib/gym-bootstrap";
import { redirect } from "next/navigation";
import PageEntrance from "@/components/PageEntrance";
export default async function TraineeLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    const { userId } = await getGymIdentity();
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
