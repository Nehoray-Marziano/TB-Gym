import BottomNav from "@/components/BottomNav";
import { TraineeIdentity } from "@/components/TraineeIdentity";
import { getGymIdentity, getTraineeOnboardingStatus } from "@/lib/gym-bootstrap";
import { redirect } from "next/navigation";
import PageEntrance from "@/components/PageEntrance";
import TraineeShell from "@/components/TraineeShell";

export default async function TraineeLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    const { userId } = await getGymIdentity();
    if (!userId) redirect("/auth/login");
    const status = await getTraineeOnboardingStatus(userId);
    if (status?.role === "trainee" && status.onboarding_completed === false) {
        redirect("/onboarding");
    }

    return (
        <TraineeIdentity userId={userId}>
            <TraineeShell>
                <div className="relative min-h-0 flex-1 w-full overflow-hidden">
                    <PageEntrance>{children}</PageEntrance>
                </div>
                <BottomNav />
            </TraineeShell>
        </TraineeIdentity>
    );
}
