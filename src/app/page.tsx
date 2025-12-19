
import { createClient } from "@/utils/supabase/server";
import LandingPage from "@/components/home/LandingPage";
import UserDashboard from "@/components/home/UserDashboard";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <LandingPage />;
  }

  return <UserDashboard user={user} />;
}
