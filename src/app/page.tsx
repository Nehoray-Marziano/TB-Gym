import LandingPage from "@/components/home/LandingPage";
import { getGymIdentity } from "@/lib/gym-bootstrap";
import { redirect } from "next/navigation";

export default async function Home() {
  const { userId } = await getGymIdentity();

  if (userId) {
    redirect("/dashboard");
  }

  return <LandingPage />;
}
