import { getGymBootstrap, getGymIdentity } from "@/lib/gym-bootstrap";
import { GymStoreProvider } from "@/providers/GymStoreProvider";

export default async function GymBootstrapProvider({ children }: { children: React.ReactNode }) {
    const { userId, email } = await getGymIdentity();
    const initialData = await getGymBootstrap();
    return <GymStoreProvider initialData={initialData} initialUserId={userId} initialEmail={email}>{children}</GymStoreProvider>;
}
